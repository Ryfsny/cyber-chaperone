import { db, tripsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface Coords {
  lat: string;
  lon: string;
}

export interface Checkpoint {
  label: string;
  minutesFromStart: number;
  fraction: number;
}

export interface RouteInfo {
  durationMinutes: number;
  etaTime: string;
  checkpoints: Checkpoint[];
  startCoords: Coords;
  destCoords: Coords;
  polylineGeoJson: string;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_BASE = "https://nominatim.openstreetmap.org/reverse";
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

export async function reverseGeocodeCoords(lat: string, lon: string): Promise<string | null> {
  try {
    const url = `${NOMINATIM_REVERSE_BASE}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        suburb?: string;
        neighbourhood?: string;
        city_district?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
      };
    };
    const addr = data.address;
    if (addr) {
      const name =
        addr.suburb ??
        addr.neighbourhood ??
        addr.city_district ??
        addr.city ??
        addr.town ??
        addr.village ??
        addr.county ??
        addr.state;
      if (name) return name;
    }
    return data.display_name?.split(",")[0]?.trim() ?? null;
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

export function minutesToSastTime(minutesFromNow: number): string {
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

export async function calculateRouteInfo(
  startLocation: string,
  destination: string,
  startCoordsOverride?: { lat: string; lon: string },
): Promise<RouteInfo | null> {
  try {
    const [startCoords, destCoords] = await Promise.all([
      startCoordsOverride ? Promise.resolve(startCoordsOverride) : geocodeAddress(startLocation),
      geocodeAddress(destination),
    ]);
    if (!startCoords || !destCoords) return null;
    const osrm = await getOsrmRoute(startCoords.lat, startCoords.lon, destCoords.lat, destCoords.lon);
    if (!osrm) return null;
    const checkpoints = buildCheckpoints(osrm.durationMinutes);
    const etaTime = minutesToSastTime(osrm.durationMinutes);
    return {
      durationMinutes: osrm.durationMinutes,
      etaTime,
      checkpoints,
      startCoords,
      destCoords,
      polylineGeoJson: osrm.polylineGeoJson,
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
  startCoordsOverride?: { lat: string; lon: string },
): Promise<void> {
  try {
    const info = await calculateRouteInfo(startLocation, destination, startCoordsOverride);

    if (!info) {
      log.info({ tripId, startLocation, destination }, "Route enrichment: failed");
      return;
    }

    await db
      .update(tripsTable)
      .set({
        startLat: info.startCoords.lat,
        startLon: info.startCoords.lon,
        destLat: info.destCoords.lat,
        destLon: info.destCoords.lon,
        routePolyline: info.polylineGeoJson,
        routeEtaMinutes: info.durationMinutes,
        routeEtaTime: info.etaTime,
        checkpointList: JSON.stringify(info.checkpoints),
      })
      .where(eq(tripsTable.id, tripId));

    log.info(
      {
        tripId,
        durationMinutes: info.durationMinutes,
        routeEtaTime: info.etaTime,
        checkpoints: info.checkpoints.length,
        startCoords: info.startCoords,
        destCoords: info.destCoords,
      },
      "Route enrichment: complete",
    );
  } catch (err) {
    log.error({ err, tripId }, "Route enrichment: unexpected error");
  }
}
