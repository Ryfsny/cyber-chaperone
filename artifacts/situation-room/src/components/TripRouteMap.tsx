import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngBoundsExpression } from "leaflet";

interface TripForMap {
  status: string;
  startLat?: string | null;
  startLon?: string | null;
  destLat?: string | null;
  destLon?: string | null;
  routePolyline?: string | null;
  routeEtaMinutes?: number | null;
  routeEtaTime?: string | null;
  checkpointList?: string | null;
}

interface GeoJsonLineString {
  type: string;
  coordinates: number[][];
}

interface Checkpoint {
  label: string;
  minutesFromStart: number;
  fraction: number;
}

function parsePolyline(raw: string | null | undefined): [number, number][] {
  if (!raw) return [];
  try {
    const geojson = JSON.parse(raw) as GeoJsonLineString;
    return geojson.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
  } catch {
    return [];
  }
}

function parseCheckpoints(raw: string | null | undefined): Checkpoint[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Checkpoint[];
  } catch {
    return [];
  }
}

function getCheckpointCoord(
  positions: [number, number][],
  fraction: number,
): [number, number] | null {
  if (positions.length < 2) return null;
  const targetIdx = (positions.length - 1) * fraction;
  const idx = Math.floor(targetIdx);
  const t = targetIdx - idx;
  const a = positions[idx];
  const b = positions[Math.min(idx + 1, positions.length - 1)];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    try {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    } catch {
    }
  }, [map, bounds]);
  return null;
}

export function TripRouteMap({ trip }: { trip: TripForMap }) {
  const positions = parsePolyline(trip.routePolyline);
  const checkpoints = parseCheckpoints(trip.checkpointList);

  const startPos: [number, number] | null =
    trip.startLat && trip.startLon
      ? [parseFloat(trip.startLat), parseFloat(trip.startLon)]
      : positions.length > 0
        ? positions[0]
        : null;

  const destPos: [number, number] | null =
    trip.destLat && trip.destLon
      ? [parseFloat(trip.destLat), parseFloat(trip.destLon)]
      : positions.length > 0
        ? positions[positions.length - 1]
        : null;

  const allPoints: [number, number][] =
    positions.length > 0
      ? positions
      : [startPos, destPos].filter((p): p is [number, number] => p !== null);

  const bounds: LatLngBoundsExpression | null = allPoints.length >= 2 ? allPoints : null;

  const defaultCenter: [number, number] = startPos ?? destPos ?? [-26.2041, 28.0473];

  const routeColor =
    trip.status === "red" ? "#ef4444" : trip.status === "amber" ? "#f59e0b" : "#22c55e";

  const hasData = startPos !== null || positions.length > 0;

  if (!hasData) {
    return (
      <div className="w-full h-[260px] bg-muted/10 border-b border-border flex flex-col items-center justify-center gap-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Route calculating…
        </p>
        <p className="text-xs text-muted-foreground/60 font-sans">
          Geocoding and routing run after trip creation
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] border-b border-border overflow-hidden relative">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {bounds && <FitBounds bounds={bounds} />}

        {positions.length > 1 && (
          <Polyline positions={positions} color={routeColor} weight={5} opacity={0.85} />
        )}

        {startPos && (
          <CircleMarker
            center={startPos}
            radius={9}
            pathOptions={{ color: "#fff", fillColor: "#22c55e", fillOpacity: 1, weight: 2.5 }}
          />
        )}

        {destPos && (
          <CircleMarker
            center={destPos}
            radius={9}
            pathOptions={{ color: "#fff", fillColor: "#ef4444", fillOpacity: 1, weight: 2.5 }}
          />
        )}

        {checkpoints.map((cp, i) => {
          const coord = getCheckpointCoord(positions, cp.fraction);
          if (!coord) return null;
          return (
            <CircleMarker
              key={i}
              center={coord}
              radius={7}
              pathOptions={{ color: "#fff", fillColor: "#f59e0b", fillOpacity: 1, weight: 2 }}
            />
          );
        })}
      </MapContainer>

      <div className="absolute bottom-2 left-2 z-[1000] flex items-center gap-3 bg-background/92 border border-border px-3 py-1.5 text-xs font-mono pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
          Start
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
          Dest
        </span>
        {checkpoints.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
            {checkpoints.length} checkpoint{checkpoints.length > 1 ? "s" : ""}
          </span>
        )}
        {trip.routeEtaTime && (
          <span className="text-muted-foreground">
            · ETA {trip.routeEtaTime} SAST ({trip.routeEtaMinutes}min drive)
          </span>
        )}
      </div>
    </div>
  );
}
