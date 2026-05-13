/**
 * Google Maps Directions API integration.
 * Used for trip route calculation with named checkpoint towns every ~90 minutes.
 * Requires GOOGLE_MAPS_API_KEY environment variable.
 * Gracefully returns null if the key is not set or the API call fails,
 * allowing the caller to fall back to the OSRM-based route service.
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export interface GmapRouteResult {
  durationMinutes: number;
  distanceKm: number;
  etaTime: string;
  checkpointTowns: string[];
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Calculate route from origin to destination using Google Maps Directions API.
 * Returns checkpoint town names at ~90-minute intervals along the route.
 * Returns null if GOOGLE_MAPS_API_KEY is not set or the request fails.
 */
export async function calculateGoogleMapsRoute(
  origin: string,
  destination: string,
): Promise<GmapRouteResult | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("region", "za");
    url.searchParams.set("language", "en");
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json() as DirectionsResponse;
    if (data.status !== "OK" || !data.routes.length) return null;

    const leg = data.routes[0].legs[0];
    if (!leg) return null;

    const durationMinutes = Math.round(leg.duration.value / 60);
    const distanceKm = Math.round(leg.distance.value / 1000);

    // Calculate ETA in SAST
    const etaMs = Date.now() + leg.duration.value * 1000;
    const etaTime = new Date(etaMs).toLocaleTimeString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Find checkpoint towns at ~90-minute intervals
    const CHECKPOINT_INTERVAL_SEC = 90 * 60;
    const checkpointTowns: string[] = [];
    let cumulativeSec = 0;
    let nextCheckpointAt = CHECKPOINT_INTERVAL_SEC;

    for (const step of leg.steps) {
      cumulativeSec += step.duration.value;

      // Only create a checkpoint if there's enough trip left (at least 15 min remaining)
      if (
        cumulativeSec >= nextCheckpointAt &&
        nextCheckpointAt < leg.duration.value - 900
      ) {
        const town = await reverseGeocodeTown(
          step.end_location.lat,
          step.end_location.lng,
        );
        if (town) checkpointTowns.push(town);
        nextCheckpointAt += CHECKPOINT_INTERVAL_SEC;
      }
    }

    return { durationMinutes, distanceKm, etaTime, checkpointTowns };
  } catch {
    return null;
  }
}

// ── Reverse geocode a lat/lng to a town/city name ─────────────────────────────

async function reverseGeocodeTown(lat: number, lng: number): Promise<string | null> {
  try {
    for (const resultType of ["locality", "sublocality", "administrative_area_level_2"]) {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${lat},${lng}`);
      url.searchParams.set("result_type", resultType);
      url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

      const res = await fetch(url.toString());
      if (!res.ok) continue;

      const data = await res.json() as GeocodeResponse;
      if (data.status === "OK" && data.results.length > 0) {
        const name = data.results[0].address_components.find(
          (c) => c.types.includes(resultType),
        )?.long_name;
        if (name) return name;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Google Maps API response types ────────────────────────────────────────────

interface DirectionsResponse {
  status: string;
  routes: Array<{
    legs: Array<{
      duration: { value: number; text: string };
      distance: { value: number; text: string };
      steps: Array<{
        duration: { value: number };
        end_location: { lat: number; lng: number };
      }>;
    }>;
  }>;
}

interface GeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
}
