import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useListTrips,
  useListResponders,
  useDispatchResponder,
  getListTripsQueryKey,
  getListRespondersQueryKey,
} from "@workspace/api-client-react";
import type { Trip, Responder } from "@workspace/api-client-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const STATUS_COLORS: Record<string, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  completed: "#3b82f6",
};

const STATUS_LABELS: Record<string, string> = {
  green: "ACTIVE",
  amber: "AMBER",
  red: "RED ALERT",
  completed: "COMPLETED",
};

function interpolatePosition(
  coords: [number, number][],
  progress: number
): [number, number] {
  if (coords.length === 0) return [-26.2041, 28.0473];
  if (progress <= 0) return [coords[0][1], coords[0][0]];
  if (progress >= 1) return [coords[coords.length - 1][1], coords[coords.length - 1][0]];
  const idx = progress * (coords.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(Math.ceil(idx), coords.length - 1);
  const f = idx - lo;
  const lat = coords[lo][1] + (coords[hi][1] - coords[lo][1]) * f;
  const lon = coords[lo][0] + (coords[hi][0] - coords[lo][0]) * f;
  return [lat, lon];
}

function estimateProgress(trip: Trip): number {
  if (!trip.routeEtaMinutes || trip.routeEtaMinutes <= 0) return 0;
  const start = new Date(trip.createdAt).getTime();
  const elapsedMin = (Date.now() - start) / 60000;
  return Math.min(elapsedMin / trip.routeEtaMinutes, 1.0);
}

function makeTripIcon(color: string, pulse: boolean) {
  const size = 18;
  const pulseRing = pulse
    ? `<div style="position:absolute;top:-6px;left:-6px;width:${size + 12}px;height:${size + 12}px;border-radius:50%;border:2px solid ${color};opacity:0.6;animation:pulse-ring 1.4s ease-out infinite;"></div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${pulseRing}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeResponderIcon(active: boolean) {
  const color = active ? "#818cf8" : "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;transform:rotate(45deg);background:${color};border:2px solid #fff;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

interface DispatchModalProps {
  trip: Trip;
  responders: Responder[];
  onClose: () => void;
}

function DispatchModal({ trip, responders, onClose }: DispatchModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const dispatch = useDispatchResponder();

  const activeResponders = responders.filter((r) => r.active);

  const handleSend = () => {
    if (!selectedId) return;
    dispatch.mutate(
      {
        data: { tripId: trip.id, responderId: selectedId, customNote: note || null },
      },
      {
        onSuccess: (data) => {
          setSent(true);
          setPreview(data.preview);
        },
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-sm p-5 w-[480px] max-w-[95vw] font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Dispatch Responder
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">
            ×
          </button>
        </div>

        {sent ? (
          <div className="space-y-3">
            <div className="text-green-400 text-xs font-bold uppercase tracking-wider">
              ✓ Dispatch sent
            </div>
            {preview && (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-secondary p-3 rounded-sm max-h-64 overflow-y-auto">
                {preview}
              </pre>
            )}
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary p-3 rounded-sm text-xs space-y-1">
              <div className="text-muted-foreground">Trip</div>
              <div className="font-bold text-foreground">{trip.title}</div>
              <div className="text-muted-foreground">{trip.travelerName}</div>
              {trip.routeEtaTime && (
                <div className="text-muted-foreground">ETA {trip.routeEtaTime}</div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Select Responder
              </label>
              {activeResponders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active responders configured.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeResponders.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-sm border transition-colors ${
                        selectedId === r.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      <span className="font-bold">{r.name}</span>
                      <span className="ml-2 text-muted-foreground">{r.areaName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Operator note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Additional context for the responder..."
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!selectedId || dispatch.isPending}
              className="w-full bg-red-700 text-white py-2 text-xs uppercase tracking-widest font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {dispatch.isPending ? "Sending…" : "Send WhatsApp Dispatch"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Radar() {
  const mapRef = useRef<L.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const polylinesRef = useRef<L.Layer[]>([]);
  const [, navigate] = useLocation();
  const [dispatchTrip, setDispatchTrip] = useState<Trip | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: trips = [] } = useListTrips({
    query: { queryKey: getListTripsQueryKey(), refetchInterval: 30000 },
  });
  const { data: responders = [] } = useListResponders({
    query: { queryKey: getListRespondersQueryKey(), refetchInterval: 60000 },
  });

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 0.8; }
        80%, 100% { transform: scale(1.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [-26.2041, 28.0473],
      zoom: 10,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    polylinesRef.current.forEach((p) => p.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    const activeTrips = trips.filter(
      (t) => t.status !== "completed" || t.startLat
    );

    for (const trip of activeTrips) {
      const color = STATUS_COLORS[trip.status] ?? "#6b7280";
      const isRed = trip.status === "red";
      const isCompleted = trip.status === "completed";

      let coords: [number, number][] = [];
      if (trip.routePolyline) {
        try {
          const geojson = JSON.parse(trip.routePolyline);
          coords = geojson.coordinates ?? [];
        } catch {}
      }

      if (coords.length > 1) {
        const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);
        const line = L.polyline(latLngs, {
          color,
          weight: 3,
          opacity: isCompleted ? 0.4 : 0.7,
          dashArray: isCompleted ? "6 4" : undefined,
        }).addTo(map);
        polylinesRef.current.push(line);

        const [startLat, startLon] = [coords[0][1], coords[0][0]];
        const [endLat, endLon] = [coords[coords.length - 1][1], coords[coords.length - 1][0]];

        L.circleMarker([startLat, startLon], {
          radius: 5,
          color: "#fff",
          fillColor: color,
          fillOpacity: 0.9,
          weight: 1.5,
        }).addTo(map).bindTooltip(`Start: ${trip.title}`, { permanent: false });
        polylinesRef.current.push(L.circleMarker([endLat, endLon], {
          radius: 5,
          color: "#fff",
          fillColor: color,
          fillOpacity: 0.9,
          weight: 1.5,
        }).addTo(map));
      }

      let markerPos: [number, number] | null = null;
      if (coords.length > 1 && !isCompleted) {
        const progress = estimateProgress(trip);
        markerPos = interpolatePosition(coords, progress);
      } else if (trip.startLat && trip.startLon) {
        markerPos = [parseFloat(trip.startLat), parseFloat(trip.startLon)];
      }

      if (markerPos) {
        const icon = makeTripIcon(color, isRed);
        const marker = L.marker(markerPos, { icon }).addTo(map);
        const statusLabel = STATUS_LABELS[trip.status] ?? trip.status.toUpperCase();
        const etaLine = trip.routeEtaTime ? `<br>ETA ${trip.routeEtaTime}` : "";
        const popup = L.popup({ className: "radar-popup" }).setContent(`
          <div style="font-family:monospace;font-size:12px;min-width:180px;">
            <div style="font-weight:bold;color:${color};margin-bottom:4px;">${statusLabel}</div>
            <div style="font-weight:bold;">${trip.travelerName}</div>
            <div style="color:#aaa;margin-bottom:6px;">${trip.title}${etaLine}</div>
            <div style="display:flex;gap:6px;">
              <button id="view-${trip.id}" style="flex:1;background:#1e293b;color:#fff;border:1px solid #334155;padding:4px;font-size:11px;cursor:pointer;font-family:monospace;">
                View Trip
              </button>
              <button id="dispatch-${trip.id}" style="flex:1;background:#7f1d1d;color:#fff;border:none;padding:4px;font-size:11px;cursor:pointer;font-family:monospace;">
                Dispatch
              </button>
            </div>
          </div>
        `);
        marker.bindPopup(popup);
        marker.on("popupopen", () => {
          document.getElementById(`view-${trip.id}`)?.addEventListener("click", () => {
            navigate(`/trips/${trip.id}`);
          });
          document.getElementById(`dispatch-${trip.id}`)?.addEventListener("click", () => {
            setDispatchTrip(trip);
            marker.closePopup();
          });
        });
        markersRef.current.push(marker);
      }
    }

    for (const responder of responders) {
      const lat = parseFloat(responder.homeLat);
      const lon = parseFloat(responder.homeLon);
      if (isNaN(lat) || isNaN(lon)) continue;
      const icon = makeResponderIcon(responder.active);
      const marker = L.marker([lat, lon], { icon }).addTo(map);
      marker.bindTooltip(
        `${responder.name} — ${responder.areaName}${responder.active ? "" : " (inactive)"}`,
        { permanent: false, direction: "top" }
      );
      markersRef.current.push(marker);
    }

    setLastRefresh(new Date());
  }, [trips, responders, navigate]);

  const activeCount = trips.filter((t) => t.status !== "completed").length;
  const redCount = trips.filter((t) => t.status === "red").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Live Radar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeCount} active trip{activeCount !== 1 ? "s" : ""}
            {redCount > 0 && (
              <span className="ml-2 text-red-400 font-bold">
                {redCount} RED ALERT{redCount !== 1 ? "S" : ""}
              </span>
            )}
            {" · "}
            {responders.filter((r) => r.active).length} responder{responders.filter((r) => r.active).length !== 1 ? "s" : ""} online
            {" · "}
            <span className="text-muted-foreground/60">
              updated {lastRefresh.toLocaleTimeString("en-ZA")}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
            Amber
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
            Red
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
            Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rotate-45 bg-indigo-400" />
            Responder
          </span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div ref={mapDivRef} className="absolute inset-0" />
      </div>

      {dispatchTrip && (
        <DispatchModal
          trip={dispatchTrip}
          responders={responders}
          onClose={() => setDispatchTrip(null)}
        />
      )}
    </div>
  );
}
