import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Incident {
  id: number;
  category: string;
  description: string;
  location: string | null;
  lat: string | null;
  lon: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  memberId: number;
  memberName: string | null;
  memberSuburb: string | null;
  memberCity: string | null;
  memberProvince: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Crime & Security Threat": "#dc2626",
  "Suspicious Activity": "#f97316",
  "Road & Traffic Hazard": "#f59e0b",
  "Personal Safety Concern": "#8b5cf6",
  "Neighbourhood Watch Alert": "#3b82f6",
  "Cyber Safety Concern": "#06b6d4",
  "Other": "#6b7280",
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  received:    { bg: "#dbeafe", color: "#1d4ed8", label: "Received" },
  reviewing:   { bg: "#fef3c7", color: "#92400e", label: "Reviewing" },
  actioned:    { bg: "#dcfce7", color: "#166534", label: "Actioned" },
  closed:      { bg: "#f3f4f6", color: "#6b7280", label: "Closed" },
};

function catColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#6b7280";
}

export default function IncidentMap() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Incident | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [adminNote, setAdminNote] = useState("");

  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    queryFn: async () => {
      const r = await fetch("/api/incidents", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const patch = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status?: string; adminNotes?: string }) => {
      const r = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!r.ok) throw new Error("Failed to update");
      return r.json();
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["/api/incidents"] }); },
  });

  const filtered = incidents.filter(i => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterCat !== "all" && i.category !== filterCat) return false;
    return true;
  });

  const mapped = filtered.filter(i => i.lat && i.lon);
  const unmapped = filtered.filter(i => !i.lat || !i.lon);

  const cats = Array.from(new Set(incidents.map(i => i.category)));

  return (
    <div style={{ padding: "24px", maxWidth: "1200px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>
            🔒 Confidential Incident Map
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>
            Member reports — visible only to operators in their jurisdiction
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 10px", color: "#374151" }}
          >
            <option value="all">All statuses</option>
            <option value="received">Received</option>
            <option value="reviewing">Reviewing</option>
            <option value="actioned">Actioned</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            style={{ fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 10px", color: "#374151" }}
          >
            <option value="all">All categories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
        {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
          <span key={cat} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#374151" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: col, display: "inline-block" }} />
            {cat}
          </span>
        ))}
      </div>

      {/* Map */}
      {isLoading ? (
        <div style={{ height: "420px", background: "#f9fafb", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
          Loading incidents…
        </div>
      ) : (
        <div style={{ height: "420px", borderRadius: "14px", overflow: "hidden", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
          <MapContainer
            center={[-29.0, 25.0]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapped.map(inc => (
              <CircleMarker
                key={inc.id}
                center={[parseFloat(inc.lat!), parseFloat(inc.lon!)]}
                radius={8}
                pathOptions={{ color: catColor(inc.category), fillColor: catColor(inc.category), fillOpacity: 0.8, weight: 2 }}
                eventHandlers={{ click: () => setSelected(inc) }}
              >
                <Popup>
                  <strong>{inc.category}</strong><br />
                  {inc.memberCity ?? inc.memberSuburb ?? "Unknown area"}<br />
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    {formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}
                  </span>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Inline detail panel when an incident is selected */}
      {selected && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px 24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <span style={{ background: catColor(selected.category), color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
                {selected.category}
              </span>
              {" "}
              <span style={{ ...STATUS_BADGE[selected.status] ? { background: STATUS_BADGE[selected.status].bg, color: STATUS_BADGE[selected.status].color } : {}, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
                {STATUS_BADGE[selected.status]?.label ?? selected.status}
              </span>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#9ca3af" }}>×</button>
          </div>
          <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, marginBottom: "10px" }}>
            <strong>Description:</strong> {selected.description}
          </div>
          {selected.location && (
            <div style={{ fontSize: "13px", color: "#374151", marginBottom: "6px" }}>
              <strong>Location:</strong> {selected.location}
            </div>
          )}
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
            Reported by <strong>{selected.memberName ?? "Unknown"}</strong> · {selected.memberCity ?? selected.memberSuburb ?? selected.memberProvince ?? "—"} · {formatDistanceToNow(new Date(selected.createdAt), { addSuffix: true })}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {["received", "reviewing", "actioned", "closed"].map(s => (
              <button
                key={s}
                onClick={() => { void patch.mutateAsync({ id: selected.id, status: s }); setSelected(p => p ? { ...p, status: s } : p); }}
                style={{ fontSize: "12px", fontWeight: 600, padding: "5px 12px", borderRadius: "8px", cursor: "pointer", border: "1px solid #d1d5db", background: selected.status === s ? "#1db954" : "#f9fafb", color: selected.status === s ? "#fff" : "#374151" }}
              >
                {STATUS_BADGE[s]?.label ?? s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="Add admin note…"
              style={{ flex: 1, fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "7px 10px" }}
            />
            <button
              onClick={() => { void patch.mutateAsync({ id: selected.id, adminNotes: adminNote }); setSelected(p => p ? { ...p, adminNotes: adminNote } : p); setAdminNote(""); }}
              style={{ background: "#1a1f2e", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Incidents without coordinates */}
      {unmapped.length > 0 && (
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#374151", marginBottom: "12px" }}>
            📋 Reports without map coordinates ({unmapped.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {unmapped.map(inc => (
              <div
                key={inc.id}
                onClick={() => setSelected(inc)}
                style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", cursor: "pointer", display: "flex", gap: "12px", alignItems: "flex-start" }}
              >
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: catColor(inc.category), flexShrink: 0, marginTop: "4px", display: "inline-block" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>{inc.category}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.description}</div>
                  {inc.location && <div style={{ fontSize: "11px", color: "#9ca3af" }}>📍 {inc.location}</div>}
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0 }}>
                  {formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: "60px 20px", fontSize: "14px" }}>
          No incidents match the current filters.
        </div>
      )}
    </div>
  );
}
