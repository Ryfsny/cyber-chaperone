import { db, tripsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface Coords {
  lat: string;
  lon: string;
}

interface Checkpoint {
  label: string;
  minutesFromStart: number;
  fraction: number;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const UA = "CyberChaperone-eblockwatch/1.0 (https://eblockwatch.com)";

async function geocodeAddress(query: string): Promise<Coords | null> {
  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=za`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: data[0].lat, lon: data[0].lon };
  } catch {
    return null;
  }
}

function buildCheckpoints(durationMinutes: number): Checkpoint[] {
  if (durationMinutes <= 15) return [];
  if (durationMinutes <= 45) {
    return [
      {
        label: "Midpoint check-in",
        minutesFromStart: Math.round(durationMinutes * 0.5),
        fraction: 0.5,
      },
    ];
  }
  return [
    {
      label: "First checkpoint",
      minutesFromStart: Math.round(durationMinutes * 0.33),
      fraction: 0.33,
    },
    {
      label: "Second checkpoint",
      minutesFromStart: Math.round(durationMinutes * 0.67),
      fraction: 0.67,
    },
  ];
}

function minutesToSastTime(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  const h = (d.getUTCHours() + 2) % 24;
  const m = d.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function getOsrmRoute(
  startLat: string,
  startLon: string,
  destLat: string,
  destLon: string,
): Promise<{ polylineGeoJson: string; durationMinutes: number } | null> {
  try {
    const url = `${OSRM_BASE}/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code: string;
      routes: Array<{
        duration: number;
        geometry: { type: string; coordinates: number[][] };
      }>;
    };
    if (data.code !== "Ok" || !data.routes.length) return null;
    const route = data.routes[0];
    return {
      polylineGeoJson: JSON.stringify(route.geometry),
      durationMinutes: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

export async function enrichTripWithRoute(
  tripId: number,
  startLocation: string,
  destination: string,
  log: {
    info: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
  },
): Promise<void> {
  try {
    const [startCoords, destCoords] = await Promise.all([
      geocodeAddress(startLocation),
      geocodeAddress(destination),
    ]);

    if (!startCoords || !destCoords) {
      log.info(
        { tripId, startLocation, destination },
        "Route enrichment: geocoding failed for one or both addresses",
      );
      if (startCoords || destCoords) {
        await db
          .update(tripsTable)
          .set({
            startLat: startCoords?.lat ?? null,
            startLon: startCoords?.lon ?? null,
            destLat: destCoords?.lat ?? null,
            destLon: destCoords?.lon ?? null,
          })
          .where(eq(tripsTable.id, tripId));
      }
      return;
    }

    const osrm = await getOsrmRoute(
      startCoords.lat,
      startCoords.lon,
      destCoords.lat,
      destCoords.lon,
    );

    if (!osrm) {
      log.info({ tripId }, "Route enrichment: OSRM route not found — storing coords only");
      await db
        .update(tripsTable)
        .set({
          startLat: startCoords.lat,
          startLon: startCoords.lon,
          destLat: destCoords.lat,
          destLon: destCoords.lon,
        })
        .where(eq(tripsTable.id, tripId));
      return;
    }

    const checkpoints = buildCheckpoints(osrm.durationMinutes);
    const routeEtaTime = minutesToSastTime(osrm.durationMinutes);

    await db
      .update(tripsTable)
      .set({
        startLat: startCoords.lat,
        startLon: startCoords.lon,
        destLat: destCoords.lat,
        destLon: destCoords.lon,
        routePolyline: osrm.polylineGeoJson,
        routeEtaMinutes: osrm.durationMinutes,
        routeEtaTime,
        checkpointList: JSON.stringify(checkpoints),
      })
      .where(eq(tripsTable.id, tripId));

    log.info(
      {
        tripId,
        durationMinutes: osrm.durationMinutes,
        routeEtaTime,
        checkpoints: checkpoints.length,
        startCoords,
        destCoords,
      },
      "Route enrichment: complete",
    );
  } catch (err) {
    log.error({ err, tripId }, "Route enrichment: unexpected error");
  }
}
