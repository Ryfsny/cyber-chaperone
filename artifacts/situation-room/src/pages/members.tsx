import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { Download, Search, UserCheck, UserX, Clock, HelpCircle, Map, List, MapPin, ChevronLeft, ChevronRight, Tag, Copy, AlertTriangle, ExternalLink, Pencil, Check, X, RefreshCw, CreditCard, CalendarDays, SlidersHorizontal } from "lucide-react";
import { SA_GEO, citiesForProvince, suburbsForCity } from "@/lib/sa-geodata";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  membershipTier: string | null;
  role: string | null;
  notes: string | null;
  iceContactName: string | null;
  iceContactPhone: string | null;
  email: string | null;
  mobile: string | null;
  industry: string | null;
  homeLat: string | null;
  homeLon: string | null;
  homeAddress: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  sourceBatch: string | null;
  importStatus: string | null;
  paystackCustomerId: string | null;
  paystackSubscriptionCode: string | null;
  paystackStatus: string | null;
  paystackPlanCode: string | null;
  paystackPaidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MapMember {
  id: number;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  homeLat: string | null;
  homeLon: string | null;
  homeAddress: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  email: string | null;
  mobile: string | null;
  industry: string | null;
}

interface PaginatedResponse {
  data: Member[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface SourceRow {
  source: string | null;
  count: number;
}

interface DuplicatesResponse {
  byPhone: Array<{ whatsapp_number: string; cnt: string }>;
  byName: Array<{ name_key: string; cnt: string; ids: number[] }>;
  summary: { duplicatePhones: number; duplicateNames: number };
}

function formatPhone(raw: string): string {
  if (raw.startsWith("fb:")) return "via Messenger";
  return raw.replace(/^whatsapp:/, "");
}

function isFacebookMember(m: Member): boolean {
  return m.whatsappNumber?.startsWith("fb:");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Colour each source batch distinctly
const SOURCE_COLOURS: Record<string, string> = {
  gas: "bg-blue-900 text-blue-200 border-blue-700",
  gass: "bg-blue-900 text-blue-200 border-blue-700",
  webflow: "bg-purple-900 text-purple-200 border-purple-700",
  paystack: "bg-emerald-900 text-emerald-200 border-emerald-700",
  facebook: "bg-blue-800 text-blue-100 border-blue-500",
  legacy: "bg-zinc-800 text-zinc-300 border-zinc-600",
  manual: "bg-orange-900 text-orange-200 border-orange-700",
};

function sourceBadgeClass(source: string): string {
  const key = source.toLowerCase();
  return SOURCE_COLOURS[key] ?? "bg-zinc-800 text-zinc-300 border-zinc-600";
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  return (
    <Badge className={`${sourceBadgeClass(source)} flex items-center gap-1 font-mono text-[10px] uppercase`}>
      <Tag className="w-2.5 h-2.5" />{source}
    </Badge>
  );
}

function ChannelBadge({ member }: { member: Member }) {
  if (isFacebookMember(member)) {
    return (
      <Badge className="bg-blue-900 text-blue-200 border-blue-500 flex items-center gap-1 text-[10px] font-bold">
        <span style={{ fontSize: "9px" }}>💬</span> Messenger
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-900 text-green-300 border-green-700 flex items-center gap-1 text-[10px] font-bold">
      <span style={{ fontSize: "9px" }}>📱</span> WhatsApp
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
    case "verified":
      return (
        <Badge className="bg-green-900 text-green-300 border-green-700 flex items-center gap-1">
          <UserCheck className="w-3 h-3" /> {status}
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-900 text-yellow-300 border-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> pending
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="bg-red-900 text-red-300 border-red-700 flex items-center gap-1">
          <UserX className="w-3 h-3" /> inactive
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
          <HelpCircle className="w-3 h-3" /> {status}
        </Badge>
      );
  }
}

function exportCsv(members: Member[]) {
  const headers = [
    "ID", "Display Name", "First Name", "Last Name", "WhatsApp", "Mobile", "Email",
    "Status", "Tier", "Role", "Industry",
    "Street Address", "Suburb", "City", "Province", "Postal Code", "Country",
    "GPS Lat", "GPS Lon", "ICE Contact", "ICE Phone", "Source Batch", "Joined",
  ];
  const rows = members.map((m) => [
    m.id, m.displayName, m.firstName, m.lastName,
    formatPhone(m.whatsappNumber), m.mobile ?? "", m.email ?? "",
    m.memberStatus, m.membershipTier ?? "", m.role ?? "", m.industry ?? "",
    m.homeAddress ?? "", m.suburb ?? "", m.city ?? "", m.province ?? "",
    m.postalCode ?? "", m.country ?? "",
    m.homeLat ?? "", m.homeLon ?? "",
    m.iceContactName ?? "", formatPhone(m.iceContactPhone ?? ""),
    m.sourceBatch ?? "", formatDate(m.createdAt),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eblockwatch-members-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PaystackSyncButton() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ synced: number; errorCount: number } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/paystack/sync", { method: "POST", credentials: "include" });
      const data = await res.json() as { synced: number; errorCount: number };
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ["/api/members/paginated"] });
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 6000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-2 text-xs uppercase tracking-wider border-emerald-600 text-emerald-700 hover:bg-emerald-50"
        onClick={() => void handleSync()}
        disabled={syncing}
        title="Sync all Paystack subscribers into member records"
      >
        {syncing
          ? <RefreshCw className="w-3 h-3 animate-spin" />
          : <CreditCard className="w-3 h-3" />
        }
        {syncing ? "Syncing…" : "Sync Payments"}
      </Button>
      {result && (
        <span className="text-xs text-emerald-700 font-medium">
          ✓ {result.synced} synced{result.errorCount > 0 ? `, ${result.errorCount} errors` : ""}
        </span>
      )}
    </div>
  );
}

function groupByLocation(members: Member[]) {
  const tree: Record<string, Record<string, Record<string, Member[]>>> = {};
  for (const m of members) {
    const province = m.province || "Unknown Province";
    const city = m.city || "Unknown City";
    const suburb = m.suburb || "—";
    if (!tree[province]) tree[province] = {};
    if (!tree[province][city]) tree[province][city] = {};
    if (!tree[province][city][suburb]) tree[province][city][suburb] = [];
    tree[province][city][suburb].push(m);
  }
  return tree;
}

function DuplicatesView() {
  const { data, isLoading } = useQuery<DuplicatesResponse>({
    queryKey: ["/api/members/duplicates"],
    queryFn: () => fetch("/api/members/duplicates", { credentials: "include" }).then((r) => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">Scanning for duplicates…</div>;
  if (!data) return null;

  const { byPhone, byName, summary } = data;
  const noDupes = summary.duplicatePhones === 0 && summary.duplicateNames === 0;

  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-4">
        <div className="border border-border px-4 py-3 flex-1">
          <div className="text-2xl font-bold font-mono text-amber-400">{summary.duplicatePhones}</div>
          <div className="text-xs text-muted-foreground mt-1">Duplicate WhatsApp numbers</div>
        </div>
        <div className="border border-border px-4 py-3 flex-1">
          <div className="text-2xl font-bold font-mono text-amber-400">{summary.duplicateNames}</div>
          <div className="text-xs text-muted-foreground mt-1">Duplicate display names</div>
        </div>
      </div>

      {noDupes ? (
        <div className="p-6 text-center text-green-400 text-sm border border-green-900">
          <UserCheck className="w-5 h-5 mx-auto mb-2" />
          No duplicates found — member database is clean.
        </div>
      ) : (
        <>
          {byPhone.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> Same WhatsApp number ({byPhone.length})
              </div>
              <div className="space-y-1">
                {byPhone.map((row) => (
                  <div key={row.whatsapp_number} className="bg-card border border-amber-900/40 px-4 py-2 flex items-center justify-between text-xs">
                    <span className="font-mono text-foreground">{formatPhone(row.whatsapp_number)}</span>
                    <span className="text-amber-400">{row.cnt} records</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {byName.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                <Copy className="w-3 h-3" /> Same display name ({byName.length})
              </div>
              <div className="space-y-1">
                {byName.slice(0, 50).map((row) => (
                  <div key={row.name_key} className="bg-card border border-amber-900/30 px-4 py-2 flex items-center justify-between text-xs">
                    <span className="text-foreground capitalize">{row.name_key}</span>
                    <span className="text-amber-400">{row.cnt} records · IDs: {row.ids.slice(0, 5).join(", ")}{row.ids.length > 5 ? "…" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberMapView() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<any>(null);

  // Filters
  const [mapSearch, setMapSearch] = useState("");
  const [mapProvince, setMapProvince] = useState("");
  const [mapCity, setMapCity] = useState("");
  const [mapSuburb, setMapSuburb] = useState("");

  // Contact panel
  const [selected, setSelected] = useState<MapMember | null>(null);
  const [channel, setChannel] = useState<"whatsapp" | "messenger" | "email" | "sms">("whatsapp");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Cluster member list panel
  const [clusterMembers, setClusterMembers] = useState<MapMember[] | null>(null);

  const { data: mapMembers = [], isLoading } = useQuery<MapMember[]>({
    queryKey: ["/api/members/map"],
    queryFn: () => fetch("/api/members/map", { credentials: "include" }).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const withGps = useMemo(() =>
    Array.isArray(mapMembers)
      ? mapMembers.filter((m) => m.homeLat && m.homeLon && !isNaN(parseFloat(m.homeLat!)) && !isNaN(parseFloat(m.homeLon!)))
      : [],
  [mapMembers]);

  const mapCities = mapProvince ? citiesForProvince(mapProvince) : [];
  const mapSuburbs = (mapProvince && mapCity) ? suburbsForCity(mapProvince, mapCity) : [];

  const filtered = useMemo(() => {
    let r = withGps;
    const s = mapSearch.trim().toLowerCase();
    if (s) r = r.filter((m) =>
      m.displayName.toLowerCase().includes(s) ||
      (m.homeAddress ?? "").toLowerCase().includes(s) ||
      (m.suburb ?? "").toLowerCase().includes(s) ||
      (m.city ?? "").toLowerCase().includes(s) ||
      formatPhone(m.whatsappNumber).includes(s) ||
      (m.mobile ?? "").replace(/\D/g, "").includes(s.replace(/\D/g, ""))
    );
    if (mapProvince) r = r.filter((m) => (m.province ?? "").toLowerCase() === mapProvince.toLowerCase());
    if (mapCity)     r = r.filter((m) => (m.city ?? "").toLowerCase().includes(mapCity.toLowerCase()));
    if (mapSuburb)   r = r.filter((m) => (m.suburb ?? "").toLowerCase().includes(mapSuburb.toLowerCase()));
    return r;
  }, [withGps, mapSearch, mapProvince, mapCity, mapSuburb]);

  // Init map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, { center: [-28.5, 25.5], zoom: 5, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Rebuild markers + zoom when filtered changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) { clusterRef.current.remove(); clusterRef.current = null; }
    if (filtered.length === 0) return;

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      iconCreateFunction: (c: any) => {
        const n = c.getChildCount();
        const sz = n < 50 ? 34 : n < 200 ? 40 : 48;
        return L.divIcon({
          html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(34,197,94,0.9);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#fff;">${n}</div>`,
          className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
        });
      },
    });

    // Cluster click → show member list panel
    cluster.on("clusterclick", (e: any) => {
      const childMarkers: any[] = e.layer.getAllChildMarkers();
      const members: MapMember[] = childMarkers
        .map((mk: any) => mk._ebw_member as MapMember)
        .filter(Boolean);
      setClusterMembers(members);
      setSelected(null);
      setSendResult(null);
    });

    const bounds: [number, number][] = [];
    for (const m of filtered) {
      const lat = parseFloat(m.homeLat!);
      const lon = parseFloat(m.homeLon!);
      bounds.push([lat, lon]);
      const isActive = m.memberStatus === "active" || m.memberStatus === "verified";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${isActive ? "#22c55e" : "#f59e0b"};border:2px solid #fff;box-shadow:0 0 5px rgba(0,0,0,0.4);cursor:pointer;transition:transform .1s;"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      const marker = L.marker([lat, lon], { icon });
      // Store member data on marker so cluster click can retrieve it
      (marker as any)._ebw_member = m;
      marker.on("click", () => {
        setClusterMembers(null);
        setSelected(m);
        setMsg("");
        setSendResult(null);
        // Auto-pick best channel
        if (m.whatsappNumber.startsWith("fb:")) setChannel("messenger");
        else setChannel("whatsapp");
      });
      cluster.addLayer(marker);
    }

    cluster.addTo(map);
    clusterRef.current = cluster;

    const maxZoom = filtered.length === 1 ? 16 : mapSuburb ? 14 : mapCity ? 12 : mapProvince ? 9 : 8;
    map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [60, 60], maxZoom });

    return () => { if (clusterRef.current) { clusterRef.current.remove(); clusterRef.current = null; } };
  }, [filtered, mapProvince, mapCity, mapSuburb]);

  async function handleSend() {
    if (!selected || !msg.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/members/${selected.id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channel, message: msg.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) {
        setSendResult({ ok: true, text: "Message sent." });
        setMsg("");
      } else {
        setSendResult({ ok: false, text: data.error ?? "Failed to send." });
      }
    } catch {
      setSendResult({ ok: false, text: "Network error." });
    } finally {
      setSending(false);
    }
  }

  const isFb = selected?.whatsappNumber.startsWith("fb:");
  const hasEmail = !!(selected?.email);
  const hasMobile = !!(selected?.mobile);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="px-4 py-2 border-b border-border shrink-0 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, suburb, street…"
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-border bg-background text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <select
          value={mapProvince}
          onChange={(e) => { setMapProvince(e.target.value); setMapCity(""); setMapSuburb(""); }}
          className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary min-w-[130px]"
        >
          <option value="">All Provinces</option>
          {SA_GEO.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <select
          value={mapCity}
          onChange={(e) => { setMapCity(e.target.value); setMapSuburb(""); }}
          disabled={!mapProvince}
          className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary min-w-[130px] disabled:opacity-40"
        >
          <option value="">All Cities</option>
          {mapCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select
          value={mapSuburb}
          onChange={(e) => setMapSuburb(e.target.value)}
          disabled={!mapCity}
          className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary min-w-[130px] disabled:opacity-40"
        >
          <option value="">All Suburbs</option>
          {mapSuburbs.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        {(mapSearch || mapProvince || mapCity || mapSuburb) && (
          <button
            onClick={() => { setMapSearch(""); setMapProvince(""); setMapCity(""); setMapSuburb(""); }}
            className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 shrink-0"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
          {isLoading ? "Loading…" : `${filtered.length} / ${withGps.length} members`}
        </span>
      </div>

      {/* Map + contact panel */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={mapDivRef} className="absolute inset-0" />

        {/* Contact panel */}
        {selected && (
          <div className="absolute top-3 right-3 w-72 bg-card border border-border shadow-2xl z-[1000] flex flex-col"
               style={{ maxHeight: "calc(100% - 24px)" }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border bg-secondary">
              <div>
                <div className="font-bold text-sm text-foreground">{selected.displayName}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {[selected.suburb, selected.city, selected.province].filter(Boolean).join(", ") || "No location"}
                </div>
                {selected.homeAddress && (
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />{selected.homeAddress}
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Channel selector */}
            <div className="px-4 pt-3 pb-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Send via</div>
              <div className="flex gap-1.5 flex-wrap">
                {!isFb && (
                  <button
                    onClick={() => setChannel("whatsapp")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] border rounded-sm transition-colors ${channel === "whatsapp" ? "bg-green-800 text-green-200 border-green-600" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    📱 WhatsApp
                  </button>
                )}
                {isFb && (
                  <button
                    onClick={() => setChannel("messenger")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] border rounded-sm transition-colors ${channel === "messenger" ? "bg-blue-800 text-blue-200 border-blue-600" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    💬 Messenger
                  </button>
                )}
                {hasEmail && (
                  <button
                    onClick={() => setChannel("email")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] border rounded-sm transition-colors ${channel === "email" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    ✉️ Email
                  </button>
                )}
                {hasMobile && (
                  <button
                    onClick={() => setChannel("sms")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] border rounded-sm transition-colors ${channel === "sms" ? "bg-amber-800 text-amber-200 border-amber-600" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    📨 SMS
                  </button>
                )}
              </div>
              {/* Contact details */}
              <div className="mt-2 space-y-0.5">
                {!isFb && <div className="text-[10px] text-muted-foreground font-mono">{formatPhone(selected.whatsappNumber)}</div>}
                {hasMobile && <div className="text-[10px] text-muted-foreground font-mono">{selected.mobile}</div>}
                {hasEmail && <div className="text-[10px] text-muted-foreground">{selected.email}</div>}
              </div>
            </div>

            {/* Message compose */}
            <div className="px-4 pb-3 flex-1 flex flex-col gap-2">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={`Type a ${channel} message…`}
                rows={4}
                className="w-full border border-border bg-background text-foreground text-xs px-3 py-2 focus:outline-none focus:border-primary resize-none transition-colors"
              />
              {sendResult && (
                <div className={`text-[11px] px-2 py-1.5 rounded-sm ${sendResult.ok ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
                  {sendResult.text}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || !msg.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  {sending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {sending ? "Sending…" : "Send"}
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1.5 border border-border text-muted-foreground text-xs hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cluster member list panel */}
        {clusterMembers && !selected && (
          <div className="absolute top-3 left-3 w-72 bg-card border border-border shadow-2xl z-[1000] flex flex-col"
               style={{ maxHeight: "calc(100% - 24px)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary shrink-0">
              <div>
                <div className="font-bold text-sm text-foreground">
                  {clusterMembers.length} member{clusterMembers.length !== 1 ? "s" : ""} in this area
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Click a name to message them</div>
              </div>
              <button onClick={() => setClusterMembers(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Member list */}
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {clusterMembers.map((m) => {
                const isActive = m.memberStatus === "active" || m.memberStatus === "verified";
                const isFbMember = m.whatsappNumber.startsWith("fb:");
                const phone = m.whatsappNumber.replace(/^whatsapp:\+?/, "");
                const waLink = isFbMember ? null : `https://wa.me/${phone}`;
                const smsPhone = m.mobile ?? (isFbMember ? null : `+${phone}`);
                const smsLink = smsPhone ? `sms:${smsPhone}` : null;
                const area = [m.suburb, m.city].filter(Boolean).join(", ");
                return (
                  <div key={m.id} className="px-4 py-2.5 hover:bg-secondary/60 transition-colors">
                    <div className="flex items-start gap-2.5">
                      {/* Status dot */}
                      <span
                        className="mt-1 shrink-0 rounded-full"
                        style={{ width: 8, height: 8, background: isActive ? "#22c55e" : "#f59e0b", display: "inline-block" }}
                      />
                      <div className="flex-1 min-w-0">
                        {/* Clickable name → open full contact panel */}
                        <button
                          className="text-left font-semibold text-xs text-foreground hover:text-primary transition-colors truncate w-full"
                          onClick={() => {
                            setClusterMembers(null);
                            setSelected(m);
                            setMsg("");
                            setSendResult(null);
                            if (isFbMember) setChannel("messenger");
                            else setChannel("whatsapp");
                          }}
                        >
                          {m.displayName}
                        </button>
                        {area && <div className="text-[10px] text-muted-foreground truncate">{area}</div>}
                        {/* Quick contact buttons */}
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-green-900/60 text-green-300 border border-green-700/60 rounded-sm hover:bg-green-800/80 transition-colors"
                              title={`WhatsApp ${m.displayName}`}
                            >
                              📱 WhatsApp
                            </a>
                          )}
                          {isFbMember && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-900/60 text-blue-300 border border-blue-700/60 rounded-sm">
                              💬 Messenger
                            </span>
                          )}
                          {smsLink && (
                            <a
                              href={smsLink}
                              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-900/60 text-amber-300 border border-amber-700/60 rounded-sm hover:bg-amber-800/80 transition-colors"
                              title={`SMS ${m.displayName}`}
                            >
                              📨 SMS
                            </a>
                          )}
                          <button
                            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground border border-border rounded-sm hover:text-foreground transition-colors"
                            onClick={() => {
                              setClusterMembers(null);
                              setSelected(m);
                              setMsg("");
                              setSendResult(null);
                              if (isFbMember) setChannel("messenger");
                              else setChannel("whatsapp");
                            }}
                            title="Open full message panel"
                          >
                            ✉️ Message
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No GPS members notice */}
        {!isLoading && filtered.length === 0 && withGps.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border px-4 py-2 text-xs text-muted-foreground shadow-lg z-[999]">
            No members match this filter in GPS range.
          </div>
        )}
        {!isLoading && withGps.length === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border px-4 py-2 text-xs text-muted-foreground shadow-lg z-[999]">
            No members with GPS coordinates yet.
          </div>
        )}
      </div>
    </div>
  );
}

type EditForm = {
  firstName: string; lastName: string; displayName: string;
  memberStatus: string; email: string; mobile: string;
  iceContactName: string; iceContactPhone: string; notes: string;
};

function MemberListView({ members, search }: { members: Member[]; search: string }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: "", lastName: "", displayName: "", memberStatus: "active", email: "", mobile: "", iceContactName: "", iceContactPhone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const grouped = groupByLocation(members);
  const provinces = Object.keys(grouped).sort();

  function startEdit(e: React.MouseEvent, m: Member) {
    e.stopPropagation();
    setEditingId(m.id);
    setEditForm({
      firstName: m.firstName, lastName: m.lastName, displayName: m.displayName,
      memberStatus: m.memberStatus, email: m.email ?? "", mobile: m.mobile ?? "",
      iceContactName: m.iceContactName ?? "", iceContactPhone: m.iceContactPhone ?? "",
      notes: m.notes ?? "",
    });
    setSaveError("");
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(null);
    setSaveError("");
  }

  async function saveEdit(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      await queryClient.invalidateQueries({ queryKey: ["/api/members/paginated"] });
      setEditingId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function f(key: keyof EditForm, val: string) {
    setEditForm((prev) => ({ ...prev, [key]: val }));
  }

  if (members.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        {search ? "No members match your search." : "No members on this page."}
      </div>
    );
  }

  const inputCls = "w-full border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary transition-colors";
  const labelCls = "block text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-bold";

  return (
    <div className="p-4 space-y-6">
      {provinces.map((province) => (
        <div key={province}>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{province}</div>
            <div className="flex-1 h-px bg-border" />
            <div className="text-xs text-muted-foreground">
              {Object.values(grouped[province]).flatMap(Object.values).flat().length} members
            </div>
          </div>
          {Object.keys(grouped[province]).sort().map((city) => (
            <div key={city} className="ml-4 mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">{city}</div>
              {Object.keys(grouped[province][city]).sort().map((suburb) => (
                <div key={suburb} className="ml-4 mb-3">
                  {suburb !== "—" && (
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {suburb}
                    </div>
                  )}
                  <div className="space-y-1">
                    {grouped[province][city][suburb].map((m) => (
                      <div key={m.id} className="ml-4">
                        {/* ── View row ── */}
                        {editingId !== m.id && (
                          <div
                            onClick={() => navigate(`/members/${m.id}`)}
                            className="bg-card border border-border/50 px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 cursor-pointer hover:bg-secondary hover:border-border transition-colors group"
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">{m.displayName}</span>
                                <ChannelBadge member={m} />
                                <StatusBadge status={m.memberStatus} />
                                {m.membershipTier && <span className="text-xs text-muted-foreground border border-border px-1">{m.membershipTier}</span>}
                                {m.sourceBatch && m.sourceBatch !== "facebook" && <SourceBadge source={m.sourceBatch} />}
                              </div>
                              {m.homeAddress && (
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />{m.homeAddress}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                <span className={`text-xs font-mono ${isFacebookMember(m) ? "text-blue-400" : "text-muted-foreground"}`}>{formatPhone(m.whatsappNumber)}</span>
                                {m.mobile && <span className="text-xs text-muted-foreground font-mono">{m.mobile}</span>}
                                {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                                {m.industry && <span className="text-xs text-muted-foreground/60 italic">{m.industry}</span>}
                              </div>
                            </div>
                            <div className="text-right text-xs text-muted-foreground shrink-0 flex flex-col items-end gap-1">
                              <div>{formatDate(m.createdAt)}</div>
                              {m.iceContactName && <div className="text-amber-600/80">ICE: {m.iceContactName}</div>}
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  onClick={(e) => startEdit(e, m)}
                                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary border border-border hover:border-primary px-2 py-0.5 transition-colors"
                                  title="Edit member"
                                >
                                  <Pencil className="w-2.5 h-2.5" /> Edit
                                </button>
                                <div className="flex items-center gap-1 text-primary/60 group-hover:text-primary transition-colors">
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span className="text-[10px]">View profile</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Edit panel ── */}
                        {editingId === m.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-secondary border border-primary/40 px-4 py-4 space-y-3"
                          >
                            {/* Name row */}
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className={labelCls}>First Name</label>
                                <input className={inputCls} value={editForm.firstName} onChange={(e) => f("firstName", e.target.value)} />
                              </div>
                              <div>
                                <label className={labelCls}>Last Name</label>
                                <input className={inputCls} value={editForm.lastName} onChange={(e) => f("lastName", e.target.value)} />
                              </div>
                              <div>
                                <label className={labelCls}>Display Name</label>
                                <input className={inputCls} value={editForm.displayName} onChange={(e) => f("displayName", e.target.value)} />
                              </div>
                            </div>

                            {/* Status + Contact row */}
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className={labelCls}>Status</label>
                                <select className={inputCls} value={editForm.memberStatus} onChange={(e) => f("memberStatus", e.target.value)}>
                                  {["active", "verified", "pending", "inactive", "unknown"].map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className={labelCls}>Email</label>
                                <input className={inputCls} value={editForm.email} onChange={(e) => f("email", e.target.value)} placeholder="email@example.com" />
                              </div>
                              <div>
                                <label className={labelCls}>Mobile</label>
                                <input className={inputCls} value={editForm.mobile} onChange={(e) => f("mobile", e.target.value)} placeholder="+27 82 000 0000" />
                              </div>
                            </div>

                            {/* ICE row */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={labelCls}>ICE Contact Name</label>
                                <input className={inputCls} value={editForm.iceContactName} onChange={(e) => f("iceContactName", e.target.value)} placeholder="e.g. Johan Smit" />
                              </div>
                              <div>
                                <label className={labelCls}>ICE WhatsApp Number</label>
                                <input className={inputCls} value={editForm.iceContactPhone} onChange={(e) => f("iceContactPhone", e.target.value)} placeholder="+27 82 000 0000" />
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <label className={labelCls}>Notes</label>
                              <textarea
                                className={`${inputCls} resize-none`}
                                rows={2}
                                value={editForm.notes}
                                onChange={(e) => f("notes", e.target.value)}
                                placeholder="Operator notes…"
                              />
                            </div>

                            {/* Error */}
                            {saveError && (
                              <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-1.5">{saveError}</div>
                            )}

                            {/* Buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={(e) => void saveEdit(e, m.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-1.5 border border-border text-muted-foreground text-xs uppercase tracking-wider hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                              <span className="text-[10px] text-muted-foreground ml-2">{m.displayName} · #{m.id}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const LIMIT = 50;
const STATUS_OPTIONS = ["active", "verified", "pending", "inactive"];

export default function Members() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [view, setView] = useState<"list" | "map" | "duplicates">("list");
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [suburbFilter, setSuburbFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableCities = provinceFilter ? citiesForProvince(provinceFilter) : [];
  const availableSuburbs = (provinceFilter && cityFilter) ? suburbsForCity(provinceFilter, cityFilter) : [];

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [sourceFilter, statusFilter, provinceFilter, cityFilter, suburbFilter, dateFrom, dateTo]);

  const hasActiveFilters = !!(sourceFilter || statusFilter || provinceFilter || cityFilter || suburbFilter || dateFrom || dateTo);

  function clearAllFilters() {
    setSourceFilter(""); setStatusFilter("");
    setProvinceFilter(""); setCityFilter(""); setSuburbFilter("");
    setDateFrom(""); setDateTo("");
  }

  const { data: sourcesData } = useQuery<SourceRow[]>({
    queryKey: ["/api/members/sources"],
    queryFn: () => fetch("/api/members/sources", { credentials: "include" }).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const sources = Array.isArray(sourcesData) ? sourcesData : [];

  const buildUrl = (p: number, s: string) => {
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (s) params.set("search", s);
    if (sourceFilter) params.set("source", sourceFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (provinceFilter) params.set("province", provinceFilter);
    if (cityFilter) params.set("city", cityFilter);
    if (suburbFilter) params.set("suburb", suburbFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/members?${params.toString()}`;
  };

  const { data, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ["/api/members/paginated", page, debouncedSearch, sourceFilter, statusFilter, provinceFilter, cityFilter, suburbFilter, dateFrom, dateTo],
    queryFn: () =>
      fetch(buildUrl(page, debouncedSearch), { credentials: "include" }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load");
        return json as PaginatedResponse;
      }),
    placeholderData: (prev) => prev,
    enabled: view !== "duplicates",
  });

  const members = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Member Directory</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : pagination ? `${pagination.total.toLocaleString()} members${sourceFilter ? ` · source: ${sourceFilter}` : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-sm overflow-hidden">
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="w-3 h-3" /> List
            </button>
            <button onClick={() => setView("map")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Map className="w-3 h-3" /> Map
            </button>
            <button onClick={() => setView("duplicates")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "duplicates" ? "bg-amber-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
              <Copy className="w-3 h-3" /> Duplicates
            </button>
          </div>
          <div className="flex items-center gap-2">
            <PaystackSyncButton />
            <Button size="sm" variant="outline" className="gap-2 text-xs uppercase tracking-wider"
              onClick={() => exportCsv(members)} disabled={members.length === 0 || view === "duplicates"}>
              <Download className="w-3 h-3" />Export page
            </Button>
          </div>
        </div>
      </div>

      {/* Filter + Search bar */}
      {view !== "duplicates" && (
        <>
          {/* Search row */}
          <div className="px-6 py-3 border-b border-border shrink-0 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, surname, email, cell, WhatsApp, street, suburb, city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-sm transition-colors shrink-0 ${showAdvanced || hasActiveFilters ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filters{hasActiveFilters ? ` (active)` : ""}
            </button>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors shrink-0 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Advanced filters panel */}
          {showAdvanced && (
            <div className="px-6 py-3 border-b border-border shrink-0 bg-secondary/40 space-y-3">

              {/* Row 1: Status + Channel */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Status:</span>
                  {["", ...STATUS_OPTIONS].map((s) => (
                    <button
                      key={s || "all"}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2 py-0.5 text-[10px] border rounded-sm transition-colors capitalize ${
                        statusFilter === s
                          ? s === "" ? "bg-primary text-primary-foreground border-primary"
                            : s === "active" || s === "verified" ? "bg-green-800 text-green-200 border-green-600"
                            : s === "pending" ? "bg-yellow-800 text-yellow-200 border-yellow-600"
                            : "bg-red-800 text-red-200 border-red-600"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s || "All"}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-border shrink-0" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Channel:</span>
                  <button
                    onClick={() => setSourceFilter("")}
                    className={`px-2 py-0.5 text-[10px] border rounded-sm transition-colors ${sourceFilter === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    All
                  </button>
                  <button
                    onClick={() => setSourceFilter(sourceFilter === "facebook" ? "" : "facebook")}
                    className={`px-2 py-0.5 text-[10px] border rounded-sm transition-colors flex items-center gap-1 ${sourceFilter === "facebook" ? "bg-blue-800 text-blue-100 border-blue-500" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    💬 Messenger only
                  </button>
                </div>
              </div>

              {/* Row 2: Province → City → Suburb */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Location:</span>
                <select
                  value={provinceFilter}
                  onChange={(e) => { setProvinceFilter(e.target.value); setCityFilter(""); setSuburbFilter(""); }}
                  className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary transition-colors min-w-[160px]"
                >
                  <option value="">All Provinces</option>
                  {SA_GEO.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <select
                  value={cityFilter}
                  onChange={(e) => { setCityFilter(e.target.value); setSuburbFilter(""); }}
                  disabled={!provinceFilter}
                  className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary transition-colors min-w-[160px] disabled:opacity-40"
                >
                  <option value="">All Cities</option>
                  {availableCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select
                  value={suburbFilter}
                  onChange={(e) => setSuburbFilter(e.target.value)}
                  disabled={!cityFilter}
                  className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary transition-colors min-w-[160px] disabled:opacity-40"
                >
                  <option value="">All Suburbs</option>
                  {availableSuburbs.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {/* Row 3: Date of registration range */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Joined:
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear dates
                  </button>
                )}
              </div>

            </div>
          )}
        </>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {view === "duplicates" ? (
          <DuplicatesView />
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">Failed to load members.</div>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading members…</div>
        ) : view === "map" ? (
          <MemberMapView />
        ) : (
          <MemberListView members={members} search={debouncedSearch} />
        )}
      </div>

      {/* Pagination */}
      {view === "list" && pagination && pagination.pages > 1 && (
        <div className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span>
            Page {pagination.page} of {pagination.pages.toLocaleString()}
            {" · "}showing {members.length} of {pagination.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 border border-border rounded-sm disabled:opacity-30 hover:text-foreground">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 border border-border rounded-sm disabled:opacity-30 hover:text-foreground flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />Prev
            </button>
            <span className="px-3">{page}</span>
            <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
              className="px-2 py-1 border border-border rounded-sm disabled:opacity-30 hover:text-foreground flex items-center gap-1">
              Next<ChevronRight className="w-3 h-3" />
            </button>
            <button onClick={() => setPage(pagination.pages)} disabled={page === pagination.pages}
              className="px-2 py-1 border border-border rounded-sm disabled:opacity-30 hover:text-foreground">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
