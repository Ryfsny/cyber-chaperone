import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Download, Search, UserCheck, UserX, Clock, HelpCircle, Map, List, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
  createdAt: string;
  updatedAt: string;
}

function formatPhone(raw: string): string {
  return raw.replace(/^whatsapp:/, "");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
  });
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

function MemberMapView({ members }: { members: Member[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const withGps = members.filter(
    (m) => m.homeLat && m.homeLon && !isNaN(parseFloat(m.homeLat)) && !isNaN(parseFloat(m.homeLon))
  );

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [-26.2041, 28.0473],
      zoom: 9,
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
    if (!map || withGps.length === 0) return;

    const markers: L.Layer[] = [];
    const bounds: [number, number][] = [];

    for (const m of withGps) {
      const lat = parseFloat(m.homeLat!);
      const lon = parseFloat(m.homeLon!);
      bounds.push([lat, lon]);

      const color = m.memberStatus === "active" || m.memberStatus === "verified"
        ? "#22c55e" : "#f59e0b";

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([lat, lon], { icon }).addTo(map);
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
      markers.push(marker);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
    }

    return () => {
      markers.forEach((mk) => mk.remove());
    };
  }, [withGps]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-2 border-b border-border shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        {withGps.length} of {members.length} members have GPS coordinates
        {members.length - withGps.length > 0 && (
          <span className="text-border ml-1">
            · {members.length - withGps.length} without GPS not shown
          </span>
        )}
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div ref={mapDivRef} className="absolute inset-0" />
      </div>
    </div>
  );
}

function MemberListView({ members, search }: { members: Member[]; search: string }) {
  const grouped = groupByLocation(members);
  const provinces = Object.keys(grouped).sort();

  if (members.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        {search ? "No members match your search." : "No members registered yet."}
      </div>
    );
  }

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
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
                {city}
              </div>

              {Object.keys(grouped[province][city]).sort().map((suburb) => (
                <div key={suburb} className="ml-4 mb-3">
                  {suburb !== "—" && (
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {suburb}
                    </div>
                  )}
                  <div className="space-y-1">
                    {grouped[province][city][suburb].map((m) => (
                      <div
                        key={m.id}
                        className="ml-4 bg-card border border-border/50 px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-xs text-foreground">{m.displayName}</span>
                            <StatusBadge status={m.memberStatus} />
                            {m.membershipTier && (
                              <span className="text-xs text-muted-foreground border border-border px-1">{m.membershipTier}</span>
                            )}
                          </div>

                          {m.homeAddress && (
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              {m.homeAddress}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatPhone(m.whatsappNumber)}
                            </span>
                            {m.mobile && m.mobile !== formatPhone(m.whatsappNumber).replace(/\+27/, "0") && (
                              <span className="text-xs text-muted-foreground font-mono">{m.mobile}</span>
                            )}
                            {m.email && (
                              <span className="text-xs text-muted-foreground">{m.email}</span>
                            )}
                          </div>

                          {(m.homeLat && m.homeLon) && (
                            <div className="text-xs text-muted-foreground/50 font-mono mt-0.5">
                              {parseFloat(m.homeLat).toFixed(5)}, {parseFloat(m.homeLon).toFixed(5)}
                            </div>
                          )}
                        </div>

                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <div>{formatDate(m.createdAt)}</div>
                          {m.iceContactName && (
                            <div className="mt-1 text-amber-500/70">ICE: {m.iceContactName}</div>
                          )}
                        </div>
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

export default function Members() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "map">("list");

  const { data: members = [], isLoading, error } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: () => fetch("/api/members", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 30000,
  });

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.whatsappNumber.includes(q) ||
      (m.role ?? "").toLowerCase().includes(q) ||
      (m.membershipTier ?? "").toLowerCase().includes(q) ||
      m.memberStatus.toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q) ||
      (m.mobile ?? "").includes(q) ||
      (m.suburb ?? "").toLowerCase().includes(q) ||
      (m.city ?? "").toLowerCase().includes(q) ||
      (m.province ?? "").toLowerCase().includes(q) ||
      (m.homeAddress ?? "").toLowerCase().includes(q)
    );
  });

  const withGps = members.filter((m) => m.homeLat && m.homeLon);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Member Directory</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${members.length} members · ${withGps.length} with GPS`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-sm overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-3 h-3" /> List
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Map className="w-3 h-3" /> Map
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs uppercase tracking-wider"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, number, email, suburb, city, province…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {error ? (
          <div className="p-8 text-center text-destructive text-sm">Failed to load members.</div>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading members…</div>
        ) : view === "map" ? (
          <MemberMapView members={filtered} />
        ) : (
          <MemberListView members={filtered} search={search} />
        )}
      </div>
    </div>
  );
}
