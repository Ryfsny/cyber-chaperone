import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Download, Search, UserCheck, UserX, Clock, HelpCircle, Map, List, MapPin, ChevronLeft, ChevronRight, Tag, Copy, AlertTriangle, ExternalLink, Pencil, Check, X, RefreshCw, CreditCard } from "lucide-react";
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
  return raw.replace(/^whatsapp:/, "");
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
        {syncing ? "Syncing…" : "Sync Paystack"}
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

  const { data: mapMembers = [], isLoading } = useQuery<MapMember[]>({
    queryKey: ["/api/members/map"],
    queryFn: () => fetch("/api/members/map", { credentials: "include" }).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const withGps = Array.isArray(mapMembers)
    ? mapMembers.filter((m) => m.homeLat && m.homeLon && !isNaN(parseFloat(m.homeLat)) && !isNaN(parseFloat(m.homeLon)))
    : [];

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, { center: [-26.2041, 28.0473], zoom: 9, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || withGps.length === 0) return;

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count < 50 ? 34 : count < 200 ? 40 : 48;
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(34,197,94,0.85);border:2px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:11px;font-weight:bold;color:#fff;">${count.toLocaleString()}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    const bounds: [number, number][] = [];
    for (const m of withGps) {
      const lat = parseFloat(m.homeLat!);
      const lon = parseFloat(m.homeLon!);
      bounds.push([lat, lon]);
      const color = m.memberStatus === "active" || m.memberStatus === "verified" ? "#22c55e" : "#f59e0b";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
        iconSize: [10, 10], iconAnchor: [5, 5],
      });
      const marker = L.marker([lat, lon], { icon });
      const locationLine = [m.suburb, m.city, m.province].filter(Boolean).join(", ");
      marker.bindPopup(`
        <div style="font-family:monospace;font-size:12px;min-width:160px;">
          <div style="font-weight:bold;margin-bottom:2px;">${m.displayName}</div>
          ${locationLine ? `<div style="color:#aaa;margin-bottom:2px;">${locationLine}</div>` : ""}
          ${m.homeAddress ? `<div style="color:#888;font-size:11px;margin-bottom:4px;">${m.homeAddress}</div>` : ""}
          <div style="color:#aaa;">${formatPhone(m.whatsappNumber)}</div>
          ${m.email ? `<div style="color:#aaa;">${m.email}</div>` : ""}
        </div>
      `);
      clusterGroup.addLayer(marker);
    }

    clusterGroup.addTo(map);
    if (bounds.length > 0) map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
    return () => { clusterGroup.remove(); };
  }, [withGps]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-2 border-b border-border shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        {isLoading ? "Loading GPS data…" : `${withGps.length} members with GPS coordinates`}
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div ref={mapDivRef} className="absolute inset-0" />
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
                                <StatusBadge status={m.memberStatus} />
                                {m.membershipTier && <span className="text-xs text-muted-foreground border border-border px-1">{m.membershipTier}</span>}
                                <SourceBadge source={m.sourceBatch} />
                              </div>
                              {m.homeAddress && (
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />{m.homeAddress}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                <span className="text-xs text-muted-foreground font-mono">{formatPhone(m.whatsappNumber)}</span>
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

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [sourceFilter, statusFilter]);

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
    return `/api/members?${params.toString()}`;
  };

  const { data, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ["/api/members/paginated", page, debouncedSearch, sourceFilter, statusFilter],
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
          {/* Search */}
          <div className="px-6 py-3 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, surname, email, cellphone, address, suburb, city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="px-6 py-2 border-b border-border shrink-0 flex items-center gap-3 flex-wrap">
            {/* Status filter */}
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

            {/* Divider */}
            <div className="h-4 w-px bg-border shrink-0" />

            {/* Source filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Source:</span>
              <button
                onClick={() => setSourceFilter("")}
                className={`px-2 py-0.5 text-[10px] border rounded-sm transition-colors ${sourceFilter === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                All
              </button>
              <button
                onClick={() => setSourceFilter("none")}
                className={`px-2 py-0.5 text-[10px] border rounded-sm transition-colors ${sourceFilter === "none" ? "bg-zinc-700 text-white border-zinc-500" : "border-border text-muted-foreground hover:text-foreground"}`}>
                Legacy
              </button>
              {sources.filter((s) => s.source).map((s) => (
                <button
                  key={s.source}
                  onClick={() => setSourceFilter(sourceFilter === s.source! ? "" : s.source!)}
                  className={`px-2 py-0.5 text-[10px] border rounded-sm transition-colors flex items-center gap-1 ${sourceFilter === s.source ? "bg-blue-800 text-blue-100 border-blue-600" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <Tag className="w-2 h-2" />
                  {s.source}
                  <span className="opacity-60">({Number(s.count).toLocaleString()})</span>
                </button>
              ))}
            </div>
          </div>
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
