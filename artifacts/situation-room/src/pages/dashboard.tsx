import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useListTrips } from "@workspace/api-client-react";
import type { Trip } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle, CheckCircle2, AlertTriangle, MessageSquare, Clock,
  MapPin, X, Users, ChevronDown,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";

// ── Types ────────────────────────────────────────────────────────
interface MapMember {
  id: number;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  homeLat: string | null;
  homeLon: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
}

// ── Constants ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  completed: "#3b82f6",
};
const RADIUS_OPTIONS = [0.5, 1, 2, 3, 5, 10, 20, 50];

// ── Helpers ──────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolatePosition(coords: [number, number][], progress: number): [number, number] {
  if (coords.length === 0) return [-29.0, 25.0];
  if (progress <= 0) return [coords[0][1], coords[0][0]];
  if (progress >= 1) return [coords[coords.length - 1][1], coords[coords.length - 1][0]];
  const idx = progress * (coords.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(Math.ceil(idx), coords.length - 1);
  const f = idx - lo;
  return [coords[lo][1] + (coords[hi][1] - coords[lo][1]) * f, coords[lo][0] + (coords[hi][0] - coords[lo][0]) * f];
}

function estimateProgress(trip: Trip): number {
  if (!trip.routeEtaMinutes || trip.routeEtaMinutes <= 0) return 0;
  return Math.min((Date.now() - new Date(trip.createdAt).getTime()) / 60000 / trip.routeEtaMinutes, 1.0);
}

function makeTripIcon(color: string, pulse: boolean) {
  const size = 18;
  const ring = pulse
    ? `<div style="position:absolute;top:-6px;left:-6px;width:${size + 12}px;height:${size + 12}px;border-radius:50%;border:2px solid ${color};opacity:0.6;animation:sr-pulse 1.4s ease-out infinite;"></div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">${ring}<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.5);"></div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── KanbanColumn ─────────────────────────────────────────────────
const COLUMN_CFG = {
  red: {
    label: "Critical", dotCls: "bg-red-600 animate-pulse",
    hdrCls: "bg-red-50 border-red-200", textCls: "text-red-700 font-extrabold",
    borderCls: "border-red-200", emptyText: "No critical incidents",
  },
  amber: {
    label: "Caution", dotCls: "bg-amber-500",
    hdrCls: "bg-amber-50 border-amber-200", textCls: "text-amber-700 font-extrabold",
    borderCls: "border-amber-200", emptyText: "No caution alerts",
  },
  green: {
    label: "All Clear", dotCls: "bg-green-600",
    hdrCls: "bg-green-50 border-green-200", textCls: "text-green-700 font-extrabold",
    borderCls: "border-green-200", emptyText: "No active trips",
  },
} as const;

function KanbanColumn({ status, trips, isLoading }: { status: "red" | "amber" | "green"; trips: Trip[]; isLoading: boolean }) {
  const cfg = COLUMN_CFG[status];
  return (
    <div className={`flex-1 flex flex-col overflow-hidden border-r last:border-r-0 ${cfg.borderCls}`}>
      <div className={`shrink-0 px-4 py-2.5 border-b ${cfg.hdrCls} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotCls}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${cfg.textCls}`}>{cfg.label}</span>
        </div>
        <span className={`text-base font-mono font-bold leading-none ${cfg.textCls}`}>{trips.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading
          ? [1, 2].map((i) => <div key={i} className="h-24 border border-border bg-card animate-pulse" />)
          : trips.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                <CheckCircle2 className="w-5 h-5 mb-1.5" />
                <p className="text-[10px] uppercase tracking-widest">{cfg.emptyText}</p>
              </div>
            )
            : trips.map((t) => <TripCard key={t.id} trip={t} />)}
      </div>
    </div>
  );
}

// ── TripCard ─────────────────────────────────────────────────────
function TripCard({ trip }: { trip: Trip }) {
  const StatusIcon = trip.status === "red" ? AlertCircle : trip.status === "amber" ? AlertTriangle : CheckCircle2;
  const isCompleted = trip.status === "completed";
  return (
    <Link href={`/trips/${trip.id}`} className="block group">
      <div className={cn(
        "border transition-colors h-full bg-card hover:bg-secondary",
        trip.status === "red" ? "border-status-red" :
        trip.status === "amber" ? "border-status-amber" :
        isCompleted ? "border-border opacity-60" : "border-status-green/30"
      )}>
        <div className={cn(
          "px-4 py-2 border-b flex justify-between items-center",
          trip.status === "red" ? "bg-status-red/10 border-status-red" :
          trip.status === "amber" ? "bg-status-amber/10 border-status-amber" :
          isCompleted ? "bg-muted/30 border-border" : "bg-status-green/10 border-status-green/30"
        )}>
          <div className="flex items-center gap-2">
            {isCompleted
              ? <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              : <StatusIcon className={cn("w-4 h-4",
                  trip.status === "red" ? "text-status-red" :
                  trip.status === "amber" ? "text-status-amber" : "text-status-green"
                )} />}
            <span className={cn("uppercase text-xs font-bold tracking-widest",
              trip.status === "red" ? "text-status-red" :
              trip.status === "amber" ? "text-status-amber" :
              isCompleted ? "text-muted-foreground" : "text-status-green"
            )}>{trip.status}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-xs uppercase tracking-wider">
            <div className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /><span>{trip.messageCount}</span></div>
            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{format(new Date(trip.updatedAt), "HH:mm")}</span></div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{trip.title}</h3>
            <p className="text-sm text-muted-foreground">{trip.travelerName} · {trip.travelerPhone}</p>
          </div>
          {(trip.nextAction || trip.operatorNotes) && (
            <div className="pt-3 border-t border-border space-y-2">
              {trip.nextAction && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Next Action</span>
                  <p className="text-sm text-foreground line-clamp-2">{trip.nextAction}</p>
                </div>
              )}
              {trip.operatorNotes && !trip.nextAction && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Notes</span>
                  <p className="text-sm text-foreground line-clamp-2">{trip.operatorNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  // Map refs
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tripLayersRef = useRef<L.Layer[]>([]);
  const memberClusterRef = useRef<L.Layer | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const radiusDotRef = useRef<L.CircleMarker | null>(null);

  // Navigation
  const [, navigate] = useLocation();

  // Filter state
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [suburb, setSuburb] = useState("");
  const [radiusMode, setRadiusMode] = useState(false);
  const [radiusKm, setRadiusKm] = useState(2);
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [membersInRadius, setMembersInRadius] = useState<MapMember[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  // Data fetching
  const { data: trips = [], isLoading: tripsLoading } = useListTrips();
  const { data: allMembers = [] } = useQuery<MapMember[]>({
    queryKey: ["/api/members/map"],
    queryFn: () =>
      fetch("/api/members/map", { credentials: "include" })
        .then((r) => r.json().then((d) => (Array.isArray(d) ? d : []))),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60_000,
  });

  // All GPS-valid members
  const withGps = useMemo(
    () => allMembers.filter((m) => m.homeLat && m.homeLon && !isNaN(parseFloat(m.homeLat)) && !isNaN(parseFloat(m.homeLon))),
    [allMembers]
  );

  // Cascade dropdown options derived entirely from member data (no extra API calls)
  const provinces = useMemo(
    () => [...new Set(withGps.map((m) => m.province).filter(Boolean) as string[])].sort(),
    [withGps]
  );
  const cities = useMemo(
    () => [...new Set(withGps.filter((m) => !province || m.province === province).map((m) => m.city).filter(Boolean) as string[])].sort(),
    [withGps, province]
  );
  const suburbs = useMemo(
    () => [...new Set(
      withGps
        .filter((m) => (!province || m.province === province) && (!city || m.city === city))
        .map((m) => m.suburb).filter(Boolean) as string[]
    )].sort(),
    [withGps, province, city]
  );

  // Members filtered by location dropdowns
  const locationFiltered = useMemo(
    () => (province || city || suburb)
      ? withGps.filter((m) =>
          (!province || m.province === province) &&
          (!city || m.city === city) &&
          (!suburb || m.suburb === suburb)
        )
      : withGps,
    [withGps, province, city, suburb]
  );

  // What actually shows on the map
  const displayedMembers = radiusCenter ? membersInRadius : locationFiltered;
  const hasFilter = !!(province || city || suburb || radiusCenter);

  // Stable refs for callbacks
  const withGpsRef = useRef<MapMember[]>([]);
  withGpsRef.current = withGps;
  const radiusKmRef = useRef(radiusKm);
  radiusKmRef.current = radiusKm;

  // ── Pulse animation CSS ───────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "sr-map-styles";
    style.textContent = `
      @keyframes sr-pulse { 0% { transform:scale(0.8);opacity:0.8; } 80%,100% { transform:scale(1.8);opacity:0; } }
      .sr-radius-cursor { cursor: crosshair !important; }
    `;
    if (!document.getElementById("sr-map-styles")) document.head.appendChild(style);
    return () => { document.getElementById("sr-map-styles")?.remove(); };
  }, []);

  // ── Map init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [-29.0, 25.0],
      zoom: 6,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Radius computation ────────────────────────────────────────
  const computeRadius = useCallback((lat: number, lon: number, km: number) => {
    const map = mapRef.current;
    if (!map) return;
    radiusCircleRef.current?.remove(); radiusCircleRef.current = null;
    radiusDotRef.current?.remove(); radiusDotRef.current = null;
    radiusCircleRef.current = L.circle([lat, lon], {
      radius: km * 1000,
      color: "#f97316", fillColor: "#f97316", fillOpacity: 0.07, weight: 2, dashArray: "6 4",
    }).addTo(map);
    radiusDotRef.current = L.circleMarker([lat, lon], {
      radius: 5, color: "#fff", fillColor: "#f97316", fillOpacity: 1, weight: 2,
    }).addTo(map);
    setMembersInRadius(
      withGpsRef.current.filter((m) =>
        m.homeLat && m.homeLon &&
        haversineKm(lat, lon, parseFloat(m.homeLat), parseFloat(m.homeLon)) <= km
      )
    );
  }, []);

  // ── Radius click handler ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      if (!radiusMode) return;
      const { lat, lng } = e.latlng;
      setRadiusCenter({ lat, lon: lng });
      computeRadius(lat, lng, radiusKmRef.current);
    };
    map.getContainer().classList.toggle("sr-radius-cursor", radiusMode);
    map.on("click", onClick);
    return () => { map.off("click", onClick); map.getContainer().classList.remove("sr-radius-cursor"); };
  }, [radiusMode, computeRadius]);

  // Recompute on radius slider change
  useEffect(() => {
    if (radiusCenter && radiusMode) computeRadius(radiusCenter.lat, radiusCenter.lon, radiusKm);
  }, [radiusKm]); // eslint-disable-line

  // Clear radius when mode is toggled off
  useEffect(() => {
    if (!radiusMode) {
      radiusCircleRef.current?.remove(); radiusCircleRef.current = null;
      radiusDotRef.current?.remove(); radiusDotRef.current = null;
      setRadiusCenter(null);
      setMembersInRadius([]);
    }
  }, [radiusMode]);

  // ── Trip markers ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tripLayersRef.current.forEach((l) => l.remove());
    tripLayersRef.current = [];

    for (const trip of trips.filter((t) => t.status !== "completed")) {
      const color = STATUS_COLORS[trip.status] ?? "#6b7280";
      let coords: [number, number][] = [];
      if (trip.routePolyline) { try { coords = JSON.parse(trip.routePolyline).coordinates ?? []; } catch {} }

      if (coords.length > 1) {
        const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);
        tripLayersRef.current.push(L.polyline(latLngs, { color, weight: 3, opacity: 0.65 }).addTo(map));
      }

      let pos: [number, number] | null = null;
      if (coords.length > 1) pos = interpolatePosition(coords, estimateProgress(trip));
      else if (trip.startLat && trip.startLon) pos = [parseFloat(trip.startLat), parseFloat(trip.startLon)];

      if (pos) {
        const icon = makeTripIcon(color, trip.status === "red");
        const marker = L.marker(pos, { icon }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:monospace;font-size:12px;min-width:160px;">
            <div style="font-weight:bold;color:${color};margin-bottom:3px;">${trip.status.toUpperCase()}</div>
            <div style="font-weight:bold;">${trip.travelerName}</div>
            <div style="color:#aaa;margin-bottom:6px;">${trip.title}</div>
            <button id="sr-goto-${trip.id}" style="background:#1e293b;color:#fff;border:1px solid #334155;padding:4px 8px;font-size:11px;cursor:pointer;font-family:monospace;width:100%;">View Trip →</button>
          </div>`
        );
        marker.on("popupopen", () => {
          document.getElementById(`sr-goto-${trip.id}`)?.addEventListener("click", () => navigate(`/trips/${trip.id}`));
        });
        tripLayersRef.current.push(marker);
      }
    }
  }, [trips, navigate]);

  // ── Member cluster ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (memberClusterRef.current) { (memberClusterRef.current as any).remove(); memberClusterRef.current = null; }
    if (displayedMembers.length === 0) return;

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count < 50 ? 32 : count < 200 ? 38 : 44;
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(249,115,22,0.85);border:2px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:11px;font-weight:bold;color:#fff;">${count.toLocaleString()}</div>`,
          className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        });
      },
    });

    const bounds: [number, number][] = [];
    for (const m of displayedMembers) {
      const lat = parseFloat(m.homeLat!);
      const lon = parseFloat(m.homeLon!);
      bounds.push([lat, lon]);
      const color = m.memberStatus === "active" || m.memberStatus === "verified" ? "#f97316" : "#6b7280";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:9px;height:9px;border-radius:50%;background:${color};border:1.5px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.4);opacity:0.9;"></div>`,
        iconSize: [9, 9], iconAnchor: [4.5, 4.5],
      });
      const marker = L.marker([lat, lon], { icon });
      marker.bindTooltip(
        `${m.displayName}${[m.suburb, m.city].filter(Boolean).length ? ` — ${[m.suburb, m.city].filter(Boolean).join(", ")}` : ""}`,
        { permanent: false, direction: "top" }
      );
      clusterGroup.addLayer(marker);
    }

    clusterGroup.addTo(map);
    memberClusterRef.current = clusterGroup;

    // Zoom to filter area when a filter is active
    if (hasFilter && bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
    }
  }, [displayedMembers]); // eslint-disable-line

  // ── Sorted trip lists ─────────────────────────────────────────
  const activeTrips = useMemo(
    () =>
      [...trips]
        .filter((t) => t.status !== "completed")
        .sort((a, b) => {
          const ord: Record<string, number> = { red: 0, amber: 1, green: 2 };
          return (ord[a.status] ?? 3) - (ord[b.status] ?? 3) ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    [trips]
  );
  const completedTrips = useMemo(
    () =>
      [...trips]
        .filter((t) => t.status === "completed")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [trips]
  );
  const redTrips = useMemo(() => activeTrips.filter((t) => t.status === "red"), [activeTrips]);
  const amberTrips = useMemo(() => activeTrips.filter((t) => t.status === "amber"), [activeTrips]);
  const greenTrips = useMemo(() => activeTrips.filter((t) => t.status === "green"), [activeTrips]);

  function clearFilters() {
    setProvince(""); setCity(""); setSuburb(""); setRadiusMode(false);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-border bg-card">
        <div>
          <h1 className="text-sm uppercase tracking-widest font-bold text-foreground">Situation Room</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {activeTrips.length} active trip{activeTrips.length !== 1 ? "s" : ""}
            {" · "}
            <span className="text-orange-400">
              {displayedMembers.length.toLocaleString()} member{displayedMembers.length !== 1 ? "s" : ""}{hasFilter ? " in view" : " on map"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />Green</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />Amber</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />Red</span>
          <span className="flex items-center gap-1 ml-1 border-l border-border pl-3"><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 opacity-80" />Members</span>
        </div>
      </header>

      {/* ── Map ────────────────────────────────────────────────── */}
      <div className="shrink-0 relative" style={{ height: "50vh" }}>
        <div ref={mapDivRef} className="absolute inset-0" />
      </div>

      {/* ── Filter toolbar ──────────────────────────────────────── */}
      <div className="shrink-0 border-b border-t border-border bg-card px-4 py-2.5 flex items-center gap-2.5 flex-wrap">

        {/* Hierarchical location dropdowns */}
        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

        <select
          value={province}
          onChange={(e) => { setProvince(e.target.value); setCity(""); setSuburb(""); setRadiusMode(false); }}
          className="bg-secondary border border-border text-foreground text-xs rounded-sm px-2 py-1.5 focus:outline-none focus:border-primary min-w-[130px]"
        >
          <option value="">South Africa — All</option>
          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={city}
          onChange={(e) => { setCity(e.target.value); setSuburb(""); setRadiusMode(false); }}
          disabled={!province}
          className="bg-secondary border border-border text-foreground text-xs rounded-sm px-2 py-1.5 focus:outline-none focus:border-primary disabled:opacity-35 min-w-[120px]"
        >
          <option value="">{province ? "All cities" : "— city —"}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={suburb}
          onChange={(e) => { setSuburb(e.target.value); setRadiusMode(false); }}
          disabled={!city}
          className="bg-secondary border border-border text-foreground text-xs rounded-sm px-2 py-1.5 focus:outline-none focus:border-primary disabled:opacity-35 min-w-[120px]"
        >
          <option value="">{city ? "All suburbs" : "— suburb —"}</option>
          {suburbs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-0.5 shrink-0" />

        {/* Radius mode toggle */}
        <button
          onClick={() => {
            const next = !radiusMode;
            setRadiusMode(next);
            if (next) { setProvince(""); setCity(""); setSuburb(""); }
          }}
          className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 border rounded-sm transition-colors flex items-center gap-1.5 ${
            radiusMode
              ? "border-orange-500/70 text-orange-400 bg-orange-500/10"
              : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
          }`}
        >
          ◎ Radius {radiusMode ? "ON" : ""}
        </button>

        {/* Radius size buttons */}
        {radiusMode && (
          <div className="flex items-center gap-1 flex-wrap">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                onClick={() => setRadiusKm(km)}
                className={`text-[10px] px-2 py-1 border rounded-sm transition-colors ${
                  radiusKm === km
                    ? "border-orange-500 text-orange-400 bg-orange-500/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {km < 1 ? `${km * 1000}m` : `${km}km`}
              </button>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1.5 flex items-center gap-1">
              {radiusCenter
                ? <><Users className="w-3 h-3" />{membersInRadius.length.toLocaleString()} in radius</>
                : <span className="italic">Click map to set centre</span>}
            </span>
          </div>
        )}

        {/* Clear button */}
        {hasFilter && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 px-2 py-1 rounded-sm"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Status board (kanban) ───────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* 3-column kanban */}
        <div className="flex-1 flex overflow-hidden">
          <KanbanColumn status="red"   trips={redTrips}   isLoading={tripsLoading} />
          <KanbanColumn status="amber" trips={amberTrips} isLoading={tripsLoading} />
          <KanbanColumn status="green" trips={greenTrips} isLoading={tripsLoading} />
        </div>

        {/* Completed strip */}
        {completedTrips.length > 0 && (
          <div className="shrink-0 border-t border-border">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="w-full px-6 py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-between transition-colors"
            >
              <span>Completed — {completedTrips.length}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showCompleted ? "rotate-180" : ""}`} />
            </button>
            {showCompleted && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 p-3 max-h-72 overflow-y-auto border-t border-border">
                {completedTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
