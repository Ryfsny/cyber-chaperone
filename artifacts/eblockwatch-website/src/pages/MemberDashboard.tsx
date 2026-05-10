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
  membershipTier: string | null;
  role: string;
  notes: string | null;
  iceContactName: string | null;
  iceContactPhone: string | null;
  familyGroupId: number | null;
  createdAt: string;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    verified: { label: "Verified Member", bg: "#dcfce7", color: "#166534" },
    active: { label: "Active Member", bg: "#dbeafe", color: "#1d4ed8" },
    inactive: { label: "Inactive", bg: "#f3f4f6", color: "#6b7280" },
  };
  const s = map[status] ?? map["inactive"]!;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function tierLabel(tier: string | null): { label: string; icon: string } {
  if (!tier) return { label: "Free Member", icon: "🆓" };
  const t = tier.toLowerCase();
  if (t.includes("family")) return { label: "Family Plan", icon: "🏠" };
  if (t.includes("single") || t.includes("individual")) return { label: "Individual Plan", icon: "👤" };
  return { label: tier, icon: "📋" };
}

export default function MemberDashboard() {
  const [, navigate] = useLocation();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", displayName: "", notes: "", iceContactName: "", iceContactPhone: "" });

  useEffect(() => { void fetchMe(); }, []);

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
    } catch { navigate("/login"); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg("");
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
    } finally { setSaving(false); }
  }

  async function handleLogout() {
    await fetch(`${BASE}/api/member-portal/logout`, { method: "POST", credentials: "include" });
    navigate("/login");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Open Sans', sans-serif" }}>
      <div style={{ textAlign: "center", color: "#6b7280" }}>Loading your profile…</div>
    </div>
  );
  if (!member) return null;

  const displayPhone = member.whatsappNumber.replace("whatsapp:", "");
  const isFamilyPlan = (member.membershipTier ?? "").toLowerCase().includes("family");
  const isPaidPlan = !!(member.membershipTier && member.membershipTier !== "Entry Level");
  const { label: tierLabelStr, icon: tierIcon } = tierLabel(member.membershipTier);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Open Sans', sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#0d1117", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href={`${BASE}/`} style={{ textDecoration: "none" }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: "36px", objectFit: "contain" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#9ca3af", fontSize: "13px" }}>Hi, {member.firstName}</span>
          <button
            onClick={() => void handleLogout()}
            style={{ background: "none", border: "1px solid #374151", color: "#9ca3af", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", cursor: "pointer" }}
          >Log Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 20px" }}>
        {/* Hero card */}
        <div style={{ background: "#0d1117", borderRadius: "16px", padding: "28px 32px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "60px", height: "60px", background: "#1db954", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>
            🛡️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800, fontFamily: "Montserrat, sans-serif" }}>
              {member.displayName || `${member.firstName} ${member.lastName}`}
            </div>
            <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "4px" }}>{displayPhone}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            {statusBadge(member.memberStatus)}
            <span style={{ color: "#6b7280", fontSize: "12px" }}>{tierIcon} {tierLabelStr}</span>
          </div>
        </div>

        {/* Save message */}
        {saveMsg && (
          <div style={{
            background: saveMsg.includes("success") ? "#dcfce7" : "#fef2f2",
            border: `1px solid ${saveMsg.includes("success") ? "#86efac" : "#fecaca"}`,
            color: saveMsg.includes("success") ? "#166534" : "#dc2626",
            borderRadius: "10px", padding: "12px 16px", fontSize: "14px", marginBottom: "20px",
          }}>{saveMsg}</div>
        )}

        {/* ── UPSELL SECTION ────────────────────────────────────────────── */}
        {!isPaidPlan && (
          <div style={{
            background: "linear-gradient(135deg, #0d1117 0%, #1a2332 100%)",
            borderRadius: "14px", border: "2px solid #1db954",
            padding: "24px 28px", marginBottom: "20px",
          }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "17px", fontFamily: "Montserrat, sans-serif", marginBottom: "6px" }}>
              🛡️ Upgrade to Full Cyber Chaperone Protection
            </div>
            <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "20px", lineHeight: 1.5 }}>
              You're on the free plan. Upgrade to get real-time trip monitoring, ETA tracking, ICE escalation, and 24/7 operator coverage by Andre.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <a href="https://paystack.shop/pay/cyber-chaperone" target="_blank" rel="noopener noreferrer"
                style={{ display: "block", background: "#1db954", color: "#fff", borderRadius: "10px", padding: "16px", textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "20px", fontFamily: "Montserrat, sans-serif" }}>R150<span style={{ fontSize: "12px", fontWeight: 400 }}>/mo</span></div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "2px" }}>👤 Individual</div>
                <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px" }}>Just you, fully covered</div>
              </a>
              <a href="https://paystack.shop/pay/family-cyber-chaperone" target="_blank" rel="noopener noreferrer"
                style={{ display: "block", background: "#fff", color: "#0d1117", borderRadius: "10px", padding: "16px", textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "20px", fontFamily: "Montserrat, sans-serif" }}>R250<span style={{ fontSize: "12px", fontWeight: 400 }}>/mo</span></div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "2px" }}>🏠 Family (up to 5)</div>
                <div style={{ fontSize: "11px", opacity: 0.65, marginTop: "4px" }}>Everyone covered together</div>
              </a>
            </div>
          </div>
        )}

        {isPaidPlan && !isFamilyPlan && (
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "14px",
            padding: "18px 22px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px",
          }}>
            <span style={{ fontSize: "24px", flexShrink: 0 }}>🏠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#92400e" }}>Upgrade to Family Plan for R100 more</div>
              <div style={{ fontSize: "12px", color: "#b45309", marginTop: "3px" }}>Cover up to 5 family members — each one is the other's ICE contact. R250/month total.</div>
            </div>
            <a href="https://paystack.shop/pay/family-cyber-chaperone" target="_blank" rel="noopener noreferrer"
              style={{ background: "#d97706", color: "#fff", textDecoration: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
              Upgrade →
            </a>
          </div>
        )}

        {/* Profile card */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>My Details</h2>
            {!editing && (
              <button onClick={() => setEditing(true)}
                style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", color: "#374151", cursor: "pointer", fontWeight: 600 }}>
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

                {/* ICE contact — shown for individual plans (family members are each other's ICE) */}
                {!isFamilyPlan && (
                  <>
                    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "20px 0" }} />
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "#166534", marginBottom: "4px" }}>🆘 ICE Contact — In Case of Emergency</div>
                      <div style={{ fontSize: "12px", color: "#4b7c55" }}>
                        This person will be contacted by Andre if we can't reach you. For a family plan, your family members automatically become each other's ICE contacts.
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <Field label="ICE Contact Name" value={form.iceContactName} onChange={(v) => setForm(f => ({ ...f, iceContactName: v }))} placeholder="e.g. Johan Smit" />
                      <Field label="ICE WhatsApp Number" value={form.iceContactPhone} onChange={(v) => setForm(f => ({ ...f, iceContactPhone: v }))} placeholder="+27 82 000 0000" />
                    </div>
                  </>
                )}

                {isFamilyPlan && (
                  <>
                    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "20px 0" }} />
                    <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "#1d4ed8", marginBottom: "4px" }}>🏠 Family Plan — ICE contacts are automatic</div>
                      <div style={{ fontSize: "12px", color: "#3b5fc0" }}>
                        Your family members on this plan are automatically set as each other's ICE contacts. No separate contact needed.
                      </div>
                    </div>
                  </>
                )}

                <div style={{ marginBottom: "20px" }}>
                  <Field label="Notes (optional)" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Any info for the operator…" textarea />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="submit" disabled={saving}
                    style={{ background: "#1db954", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                    style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 22px", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                <InfoRow label="Full Name" value={`${member.firstName} ${member.lastName}`} />
                <InfoRow label="Display Name" value={member.displayName} />
                <InfoRow label="WhatsApp" value={displayPhone} />
                <InfoRow label="Plan" value={`${tierIcon} ${tierLabelStr}`} />
                {isFamilyPlan && member.familyGroupId && (
                  <InfoRow label="Family Group" value={`Group #${member.familyGroupId} — family members are each other's ICE contacts`} />
                )}
                {!isFamilyPlan && (
                  <>
                    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6" }} />
                    <InfoRow label="ICE Contact" value={member.iceContactName ?? "—"} />
                    <InfoRow label="ICE WhatsApp" value={member.iceContactPhone ? member.iceContactPhone.replace("whatsapp:", "") : "—"} />
                  </>
                )}
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
            <a href="https://wa.me/27825611065?text=Hi" target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "14px 16px", textDecoration: "none", color: "#166534" }}>
              <WhatsAppIcon />
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>Open WhatsApp Safety Menu</div>
                <div style={{ fontSize: "12px", color: "#4b7c55" }}>Start a trip, check in, or get help — all via WhatsApp</div>
              </div>
            </a>
            {!isFamilyPlan && (
              <a href="https://paystack.shop/pay/family-cyber-chaperone" target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px 16px", textDecoration: "none", color: "#92400e" }}>
                <span style={{ fontSize: "18px" }}>🏠</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Add Your Family — R250/month</div>
                  <div style={{ fontSize: "12px", color: "#b45309" }}>Up to 5 members, all covered, all each other's ICE contacts</div>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", textarea = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const shared = { border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 12px", fontSize: "14px", color: "#111827", outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "'Open Sans', sans-serif" };
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...shared, resize: "vertical" }} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={shared} />
      }
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
