import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

interface ScareBeaSighting {
  id: number;
  lat: string | null;
  lon: string | null;
  areaName: string | null;
  type: string;
  description: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  expiresAt: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  traffic_officer_bribe: "Traffic Officer (Bribe)",
  scary_character:       "Scary Character",
  suspicious_vehicle:    "Suspicious Vehicle",
  roadblock:             "Illegal Roadblock",
  other:                 "Other",
};

const TYPE_COLOR: Record<string, string> = {
  traffic_officer_bribe: "#f59e0b",
  scary_character:       "#ef4444",
  suspicious_vehicle:    "#f97316",
  roadblock:             "#7c3aed",
  other:                 "#6b7280",
};

function makeIcon(type: string) {
  const color = TYPE_COLOR[type] ?? "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      border:2px solid white;
      border-radius:50%;
      width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      cursor:pointer;
    ">🐻</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ScareBearsPage() {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<ScareBeaSighting | null>(null);
  const [filterType, setFilterType] = useState("all");

  const { data: sightings = [], isLoading, refetch } = useQuery<ScareBeaSighting[]>({
    queryKey: ["/api/scare-bears", showAll],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/scare-bears${showAll ? "?all=1" : ""}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const filtered = sightings.filter(s => filterType === "all" || s.type === filterType);
  const mapped   = filtered.filter(s => s.lat && s.lon);
  const unmapped = filtered.filter(s => !s.lat || !s.lon);

  const activeCt  = sightings.filter(s => new Date(s.expiresAt) > new Date()).length;
  const expiredCt = sightings.length - activeCt;

  const types = Array.from(new Set(sightings.map(s => s.type)));

  return (
    <div style={{ padding: "24px", maxWidth: "1200px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111827", fontFamily: "Montserrat, sans-serif", display: "flex", alignItems: "center", gap: "10px" }}>
            🐻 Scare Bear Map
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", background: "#f3f4f6", borderRadius: "999px", padding: "2px 10px" }}>
              OPERATOR ONLY
            </span>
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
            Community road safety alerts — anonymous reports, no identities stored
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
            <span style={{ color: "#16a34a", fontWeight: 700 }}>{activeCt} active</span>
            {showAll && <span style={{ color: "#9ca3af" }}>{expiredCt} expired</span>}
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 10px", color: "#374151" }}
          >
            <option value="all">All types</option>
            {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151", cursor: "pointer" }}>
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Show expired
          </label>
          <button
            onClick={() => void refetch()}
            style={{ fontSize: "12px", padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#f9fafb", color: "#374151", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <span key={key} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#374151" }}>
            <span style={{ background: TYPE_COLOR[key] ?? "#6b7280", width: "10px", height: "10px", borderRadius: "50%", display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      {/* Map */}
      {isLoading ? (
        <div style={{ height: "420px", background: "#f9fafb", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "14px" }}>
          Loading sightings…
        </div>
      ) : (
        <div style={{ height: "420px", borderRadius: "14px", overflow: "hidden", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
          <MapContainer center={[-29.0, 25.0]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapped.map(s => (
              <Marker
                key={s.id}
                position={[parseFloat(s.lat!), parseFloat(s.lon!)]}
                icon={makeIcon(s.type)}
                eventHandlers={{ click: () => setSelected(s) }}
              >
                <Popup>
                  <div style={{ minWidth: "180px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
                      🐻 {TYPE_LABELS[s.type] ?? s.type}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                      {s.areaName ?? "Unknown area"} · {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                    </div>
                    {s.description && (
                      <div style={{ fontSize: "12px", color: "#374151", marginBottom: "4px", borderTop: "1px solid #e5e7eb", paddingTop: "4px" }}>
                        {s.description}
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: new Date(s.expiresAt) > new Date() ? "#16a34a" : "#9ca3af" }}>
                      {timeLeft(s.expiresAt)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Two-column layout: detail panel + sightings list */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: "16px" }}>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "14px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#92400e" }}>
                🐻 {TYPE_LABELS[selected.type] ?? selected.type}
              </h2>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "18px" }}>×</button>
            </div>
            <div style={{ fontSize: "13px", color: "#374151", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div><span style={{ color: "#6b7280" }}>Area:</span> {selected.areaName ?? "Not specified"}</div>
              <div><span style={{ color: "#6b7280" }}>Reported:</span> {format(new Date(selected.createdAt), "d MMM yyyy, HH:mm")}</div>
              <div><span style={{ color: new Date(selected.expiresAt) > new Date() ? "#16a34a" : "#9ca3af" }}>Status:</span> {timeLeft(selected.expiresAt)}</div>
              {selected.lat && selected.lon && (
                <div>
                  <span style={{ color: "#6b7280" }}>Coords:</span>{" "}
                  <a
                    href={`https://www.google.com/maps?q=${selected.lat},${selected.lon}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: "#2563eb", textDecoration: "underline" }}
                  >
                    Open in Google Maps
                  </a>
                </div>
              )}
              {selected.description && (
                <div style={{ background: "white", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px", fontSize: "13px", color: "#374151", marginTop: "4px" }}>
                  {selected.description}
                </div>
              )}
              {selected.mediaUrl && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                    {selected.mediaType === "video" ? "📹 Video evidence" : selected.mediaType === "voice" ? "🎤 Voice report" : "📷 Image"}
                  </div>
                  {selected.mediaType === "video" ? (
                    <video src={selected.mediaUrl} controls style={{ width: "100%", borderRadius: "8px", maxHeight: "200px" }} />
                  ) : selected.mediaType === "image" ? (
                    <img src={selected.mediaUrl} alt="Scare bear evidence" style={{ width: "100%", borderRadius: "8px", maxHeight: "200px", objectFit: "cover" }} />
                  ) : (
                    <audio src={selected.mediaUrl} controls style={{ width: "100%" }} />
                  )}
                </div>
              )}
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px", borderTop: "1px solid #fde68a", paddingTop: "8px" }}>
                🔒 Reporter identity not stored. No plates, no names.
              </div>
            </div>
          </div>
        )}

        {/* Sightings list */}
        <div>
          <h2 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#111827" }}>
            {filtered.length === 0 ? "No sightings" : `${filtered.length} sighting${filtered.length === 1 ? "" : "s"}`}
          </h2>

          {filtered.length === 0 && !isLoading && (
            <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "14px", background: "#f9fafb", borderRadius: "12px" }}>
              No active Scare Bear reports right now. All clear! 🟢
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
            {filtered.map(s => {
              const expired = new Date(s.expiresAt) <= new Date();
              const isSelected = selected?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(isSelected ? null : s)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: isSelected ? `2px solid ${TYPE_COLOR[s.type] ?? "#6b7280"}` : "1px solid #e5e7eb",
                    background: expired ? "#f9fafb" : "white",
                    cursor: "pointer",
                    opacity: expired ? 0.6 : 1,
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "20px", lineHeight: 1 }}>🐻</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: TYPE_COLOR[s.type] ?? "#374151" }}>
                        {TYPE_LABELS[s.type] ?? s.type}
                      </span>
                      <span style={{ fontSize: "11px", color: expired ? "#9ca3af" : "#16a34a", flexShrink: 0 }}>
                        {timeLeft(s.expiresAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                      {s.areaName ?? (s.lat ? `${s.lat}, ${s.lon}` : "No location")} · {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                    </div>
                    {s.description && (
                      <div style={{ fontSize: "12px", color: "#374151", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.description}
                      </div>
                    )}
                    {(s.mediaUrl) && (
                      <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px", display: "inline-block" }}>
                        {s.mediaType === "video" ? "📹 Video" : s.mediaType === "voice" ? "🎤 Voice" : "📷 Image"} attached
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {unmapped.length > 0 && (
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
              {unmapped.length} sighting{unmapped.length === 1 ? "" : "s"} with no map pin (text location only)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
