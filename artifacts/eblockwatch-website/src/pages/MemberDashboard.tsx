import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  role: string;
  notes: string | null;
  iceContactName: string | null;
  iceContactPhone: string | null;
  createdAt: string;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    verified: { label: "Verified Member", bg: "#dcfce7", color: "#166534" },
    active: { label: "Active", bg: "#dbeafe", color: "#1d4ed8" },
    inactive: { label: "Inactive", bg: "#f3f4f6", color: "#6b7280" },
  };
  const s = map[status] ?? map["inactive"]!;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

export default function MemberDashboard() {
  const [, navigate] = useLocation();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", displayName: "", notes: "", iceContactName: "", iceContactPhone: "" });

  useEffect(() => {
    void fetchMe();
  }, []);

  async function fetchMe() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/me`, { credentials: "include" });
      if (res.status === 401) { navigate("/login"); return; }
      const data = await res.json() as { member: Member };
      setMember(data.member);
      setForm({
        firstName: data.member.firstName ?? "",
        lastName: data.member.lastName ?? "",
        displayName: data.member.displayName ?? "",
        notes: data.member.notes ?? "",
        iceContactName: data.member.iceContactName ?? "",
        iceContactPhone: data.member.iceContactPhone ?? "",
      });
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`${BASE}/api/member-portal/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json() as { member: Member; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setMember(data.member);
      setEditing(false);
      setSaveMsg("Details updated successfully.");
      setTimeout(() => setSaveMsg(""), 4000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch(`${BASE}/api/member-portal/logout`, { method: "POST", credentials: "include" });
    navigate("/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Open Sans', sans-serif" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading your profile…</div>
      </div>
    );
  }

  if (!member) return null;

  const displayPhone = member.whatsappNumber.replace("whatsapp:", "");

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Open Sans', sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#0d1117", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href={`${BASE}/`} style={{ textDecoration: "none" }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: "36px", objectFit: "contain" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#9ca3af", fontSize: "13px" }}>
            Hi, {member.firstName}
          </span>
          <button
            onClick={() => void handleLogout()}
            style={{ background: "none", border: "1px solid #374151", color: "#9ca3af", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", cursor: "pointer" }}
          >
            Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 20px" }}>
        {/* Header card */}
        <div style={{ background: "#0d1117", borderRadius: "16px", padding: "28px 32px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            width: "60px", height: "60px",
            background: "#1db954",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px", flexShrink: 0,
          }}>
            🛡️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800, fontFamily: "Montserrat, sans-serif" }}>
              {member.displayName || `${member.firstName} ${member.lastName}`}
            </div>
            <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "4px" }}>{displayPhone}</div>
          </div>
          <div>{statusBadge(member.memberStatus)}</div>
        </div>

        {saveMsg && (
          <div style={{
            background: saveMsg.includes("success") ? "#dcfce7" : "#fef2f2",
            border: `1px solid ${saveMsg.includes("success") ? "#86efac" : "#fecaca"}`,
            color: saveMsg.includes("success") ? "#166534" : "#dc2626",
            borderRadius: "10px", padding: "12px 16px", fontSize: "14px", marginBottom: "20px",
          }}>
            {saveMsg}
          </div>
        )}

        {/* Profile card */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>
              My Details
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", color: "#374151", cursor: "pointer", fontWeight: 600 }}
              >
                Edit
              </button>
            )}
          </div>

          <div style={{ padding: "24px" }}>
            {editing ? (
              <form onSubmit={(e) => void handleSave(e)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <Field label="First Name" value={form.firstName} onChange={(v) => setForm(f => ({ ...f, firstName: v }))} />
                  <Field label="Last Name" value={form.lastName} onChange={(v) => setForm(f => ({ ...f, lastName: v }))} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <Field label="Display Name" value={form.displayName} onChange={(v) => setForm(f => ({ ...f, displayName: v }))} />
                </div>
                <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "20px 0" }} />
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
                  <strong>ICE Contact</strong> — In Case of Emergency. This person will be contacted by eblockwatch if we can't reach you.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <Field label="ICE Contact Name" value={form.iceContactName} onChange={(v) => setForm(f => ({ ...f, iceContactName: v }))} placeholder="e.g. Johan Smit" />
                  <Field label="ICE WhatsApp Number" value={form.iceContactPhone} onChange={(v) => setForm(f => ({ ...f, iceContactPhone: v }))} placeholder="+27 82 000 0000" />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <Field label="Notes (optional)" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Any info for the operator…" textarea />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ background: "#1db954", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 22px", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                <InfoRow label="Full Name" value={`${member.firstName} ${member.lastName}`} />
                <InfoRow label="Display Name" value={member.displayName} />
                <InfoRow label="WhatsApp" value={displayPhone} />
                <InfoRow label="Role" value={member.role} />
                <hr style={{ border: "none", borderTop: "1px solid #f3f4f6" }} />
                <InfoRow label="ICE Contact" value={member.iceContactName ?? "—"} />
                <InfoRow label="ICE WhatsApp" value={member.iceContactPhone ?? "—"} />
                {member.notes && <InfoRow label="Notes" value={member.notes} />}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px 24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>
            Quick Actions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <a
              href={`https://wa.me/27825611065?text=Hi`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px",
                padding: "14px 16px", textDecoration: "none", color: "#166534",
              }}
            >
              <span style={{ fontSize: "20px" }}>💬</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>Start a Trip via WhatsApp</div>
                <div style={{ fontSize: "12px", color: "#4b7c55" }}>Message Andre directly to begin Cyber Chaperone monitoring</div>
              </div>
            </a>
            <a
              href="https://paystack.shop/pay/cyber-chaperone"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px",
                padding: "14px 16px", textDecoration: "none", color: "#0d1117",
              }}
            >
              <span style={{ fontSize: "20px" }}>⬆️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>Upgrade Membership</div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>Individual R150/month · Family R250/month</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder = "", textarea = false,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const shared = {
    border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 12px",
    fontSize: "14px", color: "#111827", outline: "none", width: "100%", boxSizing: "border-box" as const,
    fontFamily: "'Open Sans', sans-serif",
  };
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...shared, resize: "vertical" }} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={shared} />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "16px" }}>
      <div style={{ minWidth: "140px", fontSize: "12px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", paddingTop: "1px" }}>{label}</div>
      <div style={{ fontSize: "14px", color: "#111827" }}>{value}</div>
    </div>
  );
}
