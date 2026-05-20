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

interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
}

async function nominatimReverse(lat: string, lon: string): Promise<{ display_name?: string; address?: NominatimAddress } | null> {
  try {
    const url = `${NOMINATIM_REVERSE_BASE}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return (await res.json()) as { display_name?: string; address?: NominatimAddress };
  } catch {
    return null;
  }
}

/**
 * Returns a real town/city name for checkpoint labelling.
 * Prefers proper town names over ward/suburb administrative labels.
 */
export async function reverseGeocodeCoords(lat: string, lon: string): Promise<string | null> {
  const data = await nominatimReverse(lat, lon);
  if (!data) return null;
  const addr = data.address;
  if (addr) {
    const name =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.municipality ??
      addr.county ??
      addr.suburb ??
      addr.neighbourhood ??
      addr.city_district ??
      addr.state;
    if (name) return name;
  }
  return data.display_name?.split(",")[0]?.trim() ?? null;
}

/**
 * Returns a full street address for a GPS pin start location.
 * Format: "Road Name, Town" or "Town" if no road available.
 */
export async function reverseGeocodeStreetAddress(lat: string, lon: string): Promise<string | null> {
  const data = await nominatimReverse(lat, lon);
  if (!data) return null;
  const addr = data.address;
  if (addr) {
    const road = addr.road;
    const number = addr.house_number;
    const locality = addr.suburb ?? addr.neighbourhood ?? addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county;
    if (road && locality) {
      const streetPart = number ? `${number} ${road}` : road;
      return `${streetPart}, ${locality}`;
    }
    if (road) return road;
    if (locality) return locality;
  }
  return data.display_name?.split(",").slice(0, 2).join(",").trim() ?? null;
}

// ── Polyline sampling ─────────────────────────────────────────────────────────

/**
 * Linearly interpolates along a GeoJSON LineString and returns [lon, lat]
 * at the given fraction (0–1) of the total route distance.
 */
function samplePolylineAtFraction(coords: number[][], fraction: number): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (fraction <= 0) return coords[0] as [number, number];
  if (fraction >= 1) return coords[coords.length - 1] as [number, number];

  // Calculate cumulative segment lengths
  const lengths: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = lengths[lengths.length - 1];
  const target = fraction * total;

  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= target) {
      const segFraction = (target - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
      const lon = coords[i - 1][0] + segFraction * (coords[i][0] - coords[i - 1][0]);
      const lat = coords[i - 1][1] + segFraction * (coords[i][1] - coords[i - 1][1]);
      return [lon, lat];
    }
  }
  return coords[coords.length - 1] as [number, number];
}

/**
 * For checkpoints that are not PRE_ARRIVAL, reverse geocode the polyline point
 * at their fraction to produce a real town name label.
 */
async function labelCheckpointsWithTowns(
  checkpoints: Checkpoint[],
  polylineGeoJson: string,
): Promise<Checkpoint[]> {
  let coords: number[][] = [];
  try {
    const geo = JSON.parse(polylineGeoJson) as { coordinates: number[][] };
    coords = geo.coordinates;
  } catch {
    return checkpoints;
  }

  return Promise.all(
    checkpoints.map(async (cp) => {
      if (cp.label === "PRE_ARRIVAL") return cp;
      const [lon, lat] = samplePolylineAtFraction(coords, cp.fraction);
      const town = await reverseGeocodeCoords(String(lat), String(lon));
      return { ...cp, label: town ?? cp.label };
    }),
  );
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
      {
        label: "PRE_ARRIVAL",
        minutesFromStart: Math.round(durationMinutes * 0.88),
        fraction: 0.88,
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
    {
      label: "PRE_ARRIVAL",
      minutesFromStart: Math.round(durationMinutes * 0.88),
      fraction: 0.88,
    },
  ];
}

export function minutesToSastTime(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  // Use IANA timezone to handle SAST (UTC+2) correctly regardless of server locale
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
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
    const rawCheckpoints = buildCheckpoints(osrm.durationMinutes);
    const checkpoints = await labelCheckpointsWithTowns(rawCheckpoints, osrm.polylineGeoJson);
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
  sendFollowUp?: (msg: string) => Promise<void>,
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

    // Send follow-up WhatsApp once ETA is confirmed
    if (sendFollowUp) {
      try {
        const hours = Math.floor(info.durationMinutes / 60);
        const mins = info.durationMinutes % 60;
        const durationStr = hours > 0
          ? `${hours}h ${mins}min`
          : `${mins} min`;

        const GENERIC_LABELS = new Set(["First checkpoint", "Second checkpoint", "PRE_ARRIVAL"]);
        const towns = info.checkpoints
          .map((cp) => cp.label)
          .filter((l) => l && !GENERIC_LABELS.has(l));

        const checkpointLine = towns.length > 0
          ? `\n\nWe will check in with you at *${towns.join(", ")}* along the way.`
          : "";

        const msg = [
          `🛡️ *Route calculated.*`,
          ``,
          `Your drive is about *${durationStr}*. Expected arrival: *${info.etaTime}*.${checkpointLine}`,
          ``,
          `Road looks clear ahead. If you run into any delays or trouble on the road, let us know — we will update your monitoring.`,
          ``,
          `Reply *5* when you arrive safely. Reply *10* for emergency. 🆘`,
        ].join("\n");

        await sendFollowUp(msg);
        log.info({ tripId, durationMinutes: info.durationMinutes, etaTime: info.etaTime }, "Route follow-up sent to member");
      } catch (followUpErr) {
        log.error({ followUpErr, tripId }, "Route follow-up send failed");
      }
    }
  } catch (err) {
    log.error({ err, tripId }, "Route enrichment: unexpected error");
  }
}
