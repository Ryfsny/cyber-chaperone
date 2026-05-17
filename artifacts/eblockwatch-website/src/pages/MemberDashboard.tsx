import { useState, useEffect } from "react";
import { WA_LINK_HI } from "../wa-config";
import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const SA_INDUSTRIES = [
  "Agriculture & Farming",
  "Automotive & Motor Trade",
  "Aviation & Aerospace",
  "Banking & Financial Services",
  "Broadcasting & Media",
  "Building & Construction",
  "Chemical & Petrochemical",
  "Civil Engineering & Infrastructure",
  "Cleaning & Facilities Management",
  "Defence & Military",
  "Domestic / Home Duties",
  "Education & Training",
  "Electrical & Electronics",
  "Emergency Services (Fire / Ambulance / Rescue)",
  "Energy & Utilities (Eskom / Renewables)",
  "Environmental & Conservation",
  "Events & Entertainment",
  "Fashion & Clothing",
  "Food & Beverage Manufacturing",
  "Forestry & Timber",
  "Funeral & Mortuary Services",
  "Government & Public Sector",
  "Healthcare & Medical",
  "Hospitality & Hotels",
  "Human Resources & Recruitment",
  "Information Technology (IT)",
  "Insurance",
  "Legal Services",
  "Logistics & Supply Chain",
  "Manufacturing & Industrial",
  "Marketing & Advertising",
  "Mining & Resources",
  "NGO & Non-profit",
  "Performing Arts & Creative",
  "Pharmaceuticals & Life Sciences",
  "Photography & Film",
  "Plumbing & HVAC",
  "Policing & Law Enforcement",
  "Printing & Publishing",
  "Property & Real Estate",
  "Religious & Faith-based",
  "Restaurant & Food Service",
  "Retail & Wholesale",
  "Retired",
  "Science & Research",
  "Security & Private Investigations",
  "Social Work & Community Services",
  "Sport & Recreation",
  "Student",
  "Telecommunications",
  "Tourism & Travel",
  "Transport & Freight",
  "Veterinary & Animal Care",
  "Waste Management & Recycling",
  "Other",
];

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
  email: string | null;
  mobile: string | null;
  homeAddress: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  industry: string | null;
  paystackSubscriptionCode: string | null;
  paystackStatus: string | null;
  paystackPlanCode: string | null;
  paystackPaidAt: string | null;
  hasPassword?: boolean;
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
  if (!tier) return { label: "Entry Plan", icon: "🆓" };
  const t = tier.toLowerCase();
  if (t.includes("family")) return { label: "Family Plan", icon: "🏠" };
  if (t.includes("single") || t.includes("individual")) return { label: "Individual Plan", icon: "👤" };
  if (t.includes("entry") || t.includes("free")) return { label: "Entry Plan", icon: "🆓" };
  return { label: tier, icon: "📋" };
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
}

function paystackStatusBadge(status: string | null): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active: { label: "Active", bg: "#dcfce7", color: "#166534" },
    cancelled: { label: "Cancelled", bg: "#fef2f2", color: "#dc2626" },
    non_renewing: { label: "Not renewing", bg: "#fffbeb", color: "#92400e" },
    attention: { label: "Needs attention", bg: "#fef2f2", color: "#dc2626" },
    completed: { label: "Completed", bg: "#f3f4f6", color: "#6b7280" },
  };
  return map[status ?? ""] ?? { label: status ?? "Unknown", bg: "#f3f4f6", color: "#6b7280" };
}

export default function MemberDashboard() {
  const [, navigate] = useLocation();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "subscription">("profile");

  // Password management
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Unsubscribe
  const [unsubConfirm, setUnsubConfirm] = useState(false);
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubMsg, setUnsubMsg] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", displayName: "", notes: "",
    iceContactName: "", iceContactPhone: "",
    email: "", mobile: "", homeAddress: "", suburb: "", city: "", province: "", postalCode: "", country: "South Africa",
    industry: "",
  });

  useEffect(() => { void fetchMe(); }, []);

  async function fetchMe() {
    setLoading(true);
    try {
      const res = await fetch(`/api/member-portal/me`, { credentials: "include" });
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
        email: data.member.email ?? "",
        mobile: data.member.mobile ?? "",
        homeAddress: data.member.homeAddress ?? "",
        suburb: data.member.suburb ?? "",
        city: data.member.city ?? "",
        province: data.member.province ?? "",
        postalCode: data.member.postalCode ?? "",
        country: data.member.country ?? "South Africa",
        industry: data.member.industry ?? "",
      });
    } catch { navigate("/login"); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaveMsg("");
    try {
      const res = await fetch(`/api/member-portal/me`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(form),
      });
      const data = await res.json() as { member: Member; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setMember(data.member); setEditing(false);
      setSaveMsg("Details updated."); setTimeout(() => setSaveMsg(""), 4000);
    } catch (err) { setSaveMsg(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(""); setPwSaving(true);
    if (pwForm.next !== pwForm.confirm) { setPwMsg("Passwords do not match."); setPwSaving(false); return; }
    if (pwForm.next.length < 8) { setPwMsg("Password must be at least 8 characters."); setPwSaving(false); return; }
    try {
      const res = await fetch(`/api/member-portal/set-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: pwForm.next, currentPassword: pwForm.current || undefined }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setPwMsg("Password saved successfully."); setPwForm({ current: "", next: "", confirm: "" });
      setMember(m => m ? { ...m, hasPassword: true } : m);
    } catch (err) { setPwMsg(err instanceof Error ? err.message : "Failed."); }
    finally { setPwSaving(false); }
  }

  async function handleCancelSubscription() {
    setUnsubLoading(true); setUnsubMsg("");
    try {
      const res = await fetch(`/api/member-portal/cancel-subscription`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel.");
      setUnsubMsg(data.message ?? "Subscription cancelled.");
      setUnsubConfirm(false);
      void fetchMe();
    } catch (err) { setUnsubMsg(err instanceof Error ? err.message : "Failed."); }
    finally { setUnsubLoading(false); }
  }

  async function handleLogout() {
    await fetch(`/api/member-portal/logout`, { method: "POST", credentials: "include" });
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
  const isPaidPlan = !!(member.membershipTier && !["entry", "free", "entry level"].includes(member.membershipTier.toLowerCase()));
  const { label: tierLabelStr, icon: tierIcon } = tierLabel(member.membershipTier);
  const hasActiveSub = !!(member.paystackSubscriptionCode && member.paystackStatus === "active");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 18px", fontSize: "13px", fontWeight: active ? 700 : 500,
    borderBottom: active ? "2px solid #1db954" : "2px solid transparent",
    color: active ? "#1db954" : "#6b7280", background: "none", border: "none",
    cursor: "pointer", whiteSpace: "nowrap",
  });
  const inputStyle: React.CSSProperties = {
    border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 12px", fontSize: "14px",
    color: "#111827", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "'Open Sans', sans-serif",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Open Sans', sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#0d1117", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href={`${BASE}/`} style={{ textDecoration: "none" }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: "36px", objectFit: "contain" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#9ca3af", fontSize: "13px" }}>Hi, {member.firstName}</span>
          <button onClick={() => void handleLogout()}
            style={{ background: "none", border: "1px solid #374151", color: "#9ca3af", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", cursor: "pointer" }}>
            Log Out
          </button>
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

        {saveMsg && (
          <div style={{ background: saveMsg.includes("updated") ? "#dcfce7" : "#fef2f2", border: `1px solid ${saveMsg.includes("updated") ? "#86efac" : "#fecaca"}`, color: saveMsg.includes("updated") ? "#166534" : "#dc2626", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", marginBottom: "20px" }}>
            {saveMsg}
          </div>
        )}

        {/* Upsell */}
        {!isPaidPlan && (
          <div style={{ background: "linear-gradient(135deg, #0d1117 0%, #1a2332 100%)", borderRadius: "14px", border: "2px solid #1db954", padding: "24px 28px", marginBottom: "20px" }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "17px", fontFamily: "Montserrat, sans-serif", marginBottom: "6px" }}>🛡️ Upgrade to Full Cyber Chaperone Protection</div>
            <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "20px", lineHeight: 1.5 }}>
              You're on the free plan. Upgrade to get real-time trip monitoring, ETA tracking, ICE escalation, and 24/7 operator coverage.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <a href={`${BASE}/upgrade`} style={{ display: "block", background: "#1db954", color: "#fff", borderRadius: "10px", padding: "16px", textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "20px", fontFamily: "Montserrat, sans-serif" }}>R150<span style={{ fontSize: "12px", fontWeight: 400 }}>/mo</span></div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "2px" }}>👤 Individual</div>
              </a>
              <a href={`${BASE}/upgrade`} style={{ display: "block", background: "#fff", color: "#0d1117", borderRadius: "10px", padding: "16px", textDecoration: "none", textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "20px", fontFamily: "Montserrat, sans-serif" }}>R250<span style={{ fontSize: "12px", fontWeight: 400 }}>/mo</span></div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "2px" }}>🏠 Family (up to 5)</div>
              </a>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ background: "#fff", borderRadius: "14px 14px 0 0", border: "1px solid #e5e7eb", borderBottom: "none", display: "flex", overflowX: "auto" }}>
          <button style={tabStyle(activeTab === "profile")} onClick={() => setActiveTab("profile")}>My Details</button>
          <button style={tabStyle(activeTab === "subscription")} onClick={() => setActiveTab("subscription")}>Subscription</button>
          <button style={tabStyle(activeTab === "security")} onClick={() => setActiveTab("security")}>Security</button>
        </div>

        {/* Tab content */}
        <div style={{ background: "#fff", borderRadius: "0 0 14px 14px", border: "1px solid #e5e7eb", padding: "24px", marginBottom: "20px" }}>

          {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>My Details</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", color: "#374151", cursor: "pointer", fontWeight: 600 }}>
                    Edit
                  </button>
                )}
              </div>

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
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#374151", marginBottom: "12px" }}>📬 Contact Information</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <Field label="Email Address" value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} placeholder="you@example.com" />
                    <Field label="Cell Number" value={form.mobile} onChange={(v) => setForm(f => ({ ...f, mobile: v }))} placeholder="+27 82 000 0000" />
                  </div>
                  <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "20px 0" }} />
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#374151", marginBottom: "12px" }}>🏠 Home Address</div>
                  <div style={{ marginBottom: "14px" }}>
                    <Field label="Street Address" value={form.homeAddress} onChange={(v) => setForm(f => ({ ...f, homeAddress: v }))} placeholder="12 Oak Avenue" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                    <Field label="Suburb" value={form.suburb} onChange={(v) => setForm(f => ({ ...f, suburb: v }))} placeholder="Sandton" />
                    <Field label="City" value={form.city} onChange={(v) => setForm(f => ({ ...f, city: v }))} placeholder="Johannesburg" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <Field label="Province" value={form.province} onChange={(v) => setForm(f => ({ ...f, province: v }))} placeholder="Gauteng" />
                    <Field label="Postal Code" value={form.postalCode} onChange={(v) => setForm(f => ({ ...f, postalCode: v }))} placeholder="2196" />
                    <Field label="Country" value={form.country} onChange={(v) => setForm(f => ({ ...f, country: v }))} placeholder="South Africa" />
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Industry</label>
                    <select
                      value={form.industry}
                      onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", color: "#111827", background: "#fff", appearance: "auto" }}
                    >
                      <option value="">Select your industry</option>
                      {SA_INDUSTRIES.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  {!isFamilyPlan && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "20px 0" }} />
                      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#166534", marginBottom: "4px" }}>🆘 ICE Contact — In Case of Emergency</div>
                        <div style={{ fontSize: "12px", color: "#4b7c55" }}>This person will be contacted if we can't reach you.</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        <Field label="ICE Contact Name" value={form.iceContactName} onChange={(v) => setForm(f => ({ ...f, iceContactName: v }))} placeholder="e.g. Johan Smit" />
                        <Field label="ICE WhatsApp Number" value={form.iceContactPhone} onChange={(v) => setForm(f => ({ ...f, iceContactPhone: v }))} placeholder="+27 82 000 0000" />
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
                  {member.email && <InfoRow label="Email" value={member.email} />}
                  {member.mobile && <InfoRow label="Cell" value={member.mobile} />}
                  {!isFamilyPlan && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6" }} />
                      <InfoRow label="ICE Contact" value={member.iceContactName ?? "—"} />
                      <InfoRow label="ICE WhatsApp" value={member.iceContactPhone ? member.iceContactPhone.replace("whatsapp:", "") : "—"} />
                    </>
                  )}
                  {isFamilyPlan && member.familyGroupId && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6" }} />
                      <InfoRow label="Family Group" value={`Group #${member.familyGroupId} — members are each other's ICE contacts`} />
                    </>
                  )}
                  {(member.homeAddress || member.suburb || member.city) && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6" }} />
                      {member.homeAddress && <InfoRow label="Address" value={member.homeAddress} />}
                      {(member.suburb || member.city) && (
                        <InfoRow label="Area" value={[member.suburb, member.city, member.province, member.postalCode].filter(Boolean).join(", ")} />
                      )}
                    </>
                  )}
                  {member.industry && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6" }} />
                      <InfoRow label="Industry" value={member.industry} />
                    </>
                  )}
                  {member.notes && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6" }} />
                      <InfoRow label="Notes" value={member.notes} />
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── SUBSCRIPTION TAB ─────────────────────────────────────────── */}
          {activeTab === "subscription" && (
            <>
              <h2 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>Subscription & Billing</h2>

              <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                <InfoRow label="Plan" value={`${tierIcon} ${tierLabelStr}`} />
                <InfoRow label="Status" value={(() => { const b = paystackStatusBadge(member.paystackStatus); return b.label; })()} />
                {member.paystackPaidAt && <InfoRow label="Last Payment" value={formatDate(member.paystackPaidAt)} />}
                {member.paystackSubscriptionCode && <InfoRow label="Reference" value={member.paystackSubscriptionCode} />}
              </div>

              {/* Paystack status badge */}
              {member.paystackStatus && (
                <div style={{ marginBottom: "20px" }}>
                  {(() => {
                    const b = paystackStatusBadge(member.paystackStatus);
                    return (
                      <span style={{ background: b.bg, color: b.color, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
                        {b.label}
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* Payment history notice */}
              {!member.paystackSubscriptionCode && (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px", marginBottom: "20px", fontSize: "13px", color: "#6b7280" }}>
                  No paid subscription on record. <a href={`${BASE}/upgrade`} style={{ color: "#1db954", fontWeight: 600, textDecoration: "none" }}>Upgrade your plan →</a>
                </div>
              )}

              {/* Upgrade to family CTA */}
              {isPaidPlan && !isFamilyPlan && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "22px" }}>🏠</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#92400e" }}>Upgrade to Family Plan for R100 more</div>
                    <div style={{ fontSize: "12px", color: "#b45309", marginTop: "3px" }}>Up to 5 family members — R250/month total.</div>
                  </div>
                  <a href="https://paystack.shop/pay/family-cyber-chaperone" target="_blank" rel="noopener noreferrer"
                    style={{ background: "#d97706", color: "#fff", textDecoration: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    Upgrade →
                  </a>
                </div>
              )}

              {/* Unsubscribe */}
              {hasActiveSub && (
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "20px" }}>
                  {unsubMsg && (
                    <div style={{ background: unsubMsg.includes("cancelled") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${unsubMsg.includes("cancelled") ? "#86efac" : "#fecaca"}`, borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: unsubMsg.includes("cancelled") ? "#166534" : "#dc2626", marginBottom: "14px" }}>
                      {unsubMsg}
                    </div>
                  )}
                  {!unsubConfirm ? (
                    <button onClick={() => setUnsubConfirm(true)}
                      style={{ background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                      Cancel Subscription
                    </button>
                  ) : (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "16px" }}>
                      <p style={{ fontSize: "14px", color: "#dc2626", fontWeight: 600, margin: "0 0 8px" }}>Are you sure?</p>
                      <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px" }}>
                        You'll retain access until the end of the current billing period. This cannot be undone from the portal.
                      </p>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => void handleCancelSubscription()} disabled={unsubLoading}
                          style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: unsubLoading ? "not-allowed" : "pointer", opacity: unsubLoading ? 0.6 : 1 }}>
                          {unsubLoading ? "Cancelling…" : "Yes, cancel my subscription"}
                        </button>
                        <button onClick={() => setUnsubConfirm(false)} disabled={unsubLoading}
                          style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", color: "#6b7280", cursor: "pointer" }}>
                          Keep my subscription
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── SECURITY TAB ─────────────────────────────────────────────── */}
          {activeTab === "security" && (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>
                {member.hasPassword ? "Change Password" : "Set a Password"}
              </h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px" }}>
                {member.hasPassword
                  ? "You can log in with your WhatsApp number and this password as an alternative to the OTP code."
                  : "Add a password so you can log in without waiting for a WhatsApp code."}
              </p>

              {pwMsg && (
                <div style={{ background: pwMsg.includes("success") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${pwMsg.includes("success") ? "#86efac" : "#fecaca"}`, borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: pwMsg.includes("success") ? "#166534" : "#dc2626", marginBottom: "16px" }}>
                  {pwMsg}
                </div>
              )}

              <form onSubmit={(e) => void handleSetPassword(e)}>
                {member.hasPassword && (
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Password</label>
                    <input type="password" value={pwForm.current} onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))} placeholder="Your current password" required style={inputStyle} />
                  </div>
                )}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>New Password</label>
                  <input type="password" value={pwForm.next} onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))} placeholder="At least 8 characters" required style={inputStyle} />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Confirm Password</label>
                  <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat your password" required style={inputStyle} />
                </div>
                <button type="submit" disabled={pwSaving}
                  style={{ background: "#1db954", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "14px", fontWeight: 700, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.6 : 1 }}>
                  {pwSaving ? "Saving…" : member.hasPassword ? "Update Password" : "Set Password"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px 24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>Quick Actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <a href={WA_LINK_HI} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "14px 16px", textDecoration: "none", color: "#166534" }}>
              <WhatsAppIcon />
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>Open WhatsApp Safety Menu</div>
                <div style={{ fontSize: "12px", color: "#4b7c55" }}>Start a trip, check in, or get help — all via WhatsApp</div>
              </div>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", textarea = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const shared: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 12px", fontSize: "14px", color: "#111827", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "'Open Sans', sans-serif" };
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
