import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const PLANS = [
  {
    id: "individual",
    name: "Cyber Chaperone",
    subtitle: "Individual",
    price: 150,
    planCode: "PLN_rnn4nj61oh0zy0c",
    paystackSlug: "cyber-chaperone",
    color: "#1db954",
    features: [
      "Real-time WhatsApp trip monitoring",
      "ETA alerts & check-in reminders",
      "ICE contact escalation",
      "Route tracking & checkpoints",
      "Priority operator response",
      "Dedicated safety specialist",
    ],
    popular: true,
  },
  {
    id: "family",
    name: "Cyber Chaperone",
    subtitle: "Family",
    price: 250,
    planCode: "PLN_wopagttz7e5quyw",
    paystackSlug: "family-cyber-chaperone",
    color: "#2563eb",
    features: [
      "Everything in Individual",
      "Up to 5 family members covered",
      "ICE contacts for all members",
      "Grouped trip monitoring",
      "Family safety dashboard",
      "Priority operator response",
    ],
    popular: false,
  },
];

interface Member {
  firstName: string;
  lastName: string;
  email: string | null;
  membershipTier: string | null;
  memberStatus: string;
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="#dcfce7" />
      <path d="M5 8l2 2 4-4" stroke="#166534" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QRCodeDisplay({ url, label }: { url: string; label: string }) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  return (
    <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
      <img src={qrSrc} alt="QR code" style={{ width: 140, height: 140, borderRadius: 8, border: "1px solid #e5e7eb" }} />
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>{label}</div>
    </div>
  );
}

export default function UpgradePage() {
  const [, navigate] = useLocation();
  const [member, setMember] = useState<Member | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/member-portal/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<Member> : Promise.reject())
      .then(m => setMember(m))
      .catch(() => {})
      .finally(() => setLoadingMember(false));
  }, []);

  async function handleSelectPlan(planId: string) {
    setSelectedPlan(planId);
    setPayLink(null);
    setShowQr(false);
    setGeneratingLink(true);

    const plan = PLANS.find(p => p.id === planId)!;
    try {
      const res = await fetch(`${BASE}/api/paystack/payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planCode: plan.planCode,
          email: member?.email ?? "",
          firstName: member?.firstName ?? "",
          lastName: member?.lastName ?? "",
          tier: planId,
        }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        setPayLink(data.url);
      } else {
        // Fall back to static Paystack page
        setPayLink(`https://paystack.com/pay/${plan.paystackSlug}`);
      }
    } catch {
      setPayLink(`https://paystack.com/pay/${plan.paystackSlug}`);
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyLink() {
    if (!payLink) return;
    void navigator.clipboard.writeText(payLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const currentTier = member?.membershipTier?.toLowerCase() ?? "";
  const isAlreadyPaid = currentTier.includes("family") || currentTier.includes("individual") || currentTier.includes("premium") || currentTier.includes("single");

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif", color: "#111827", minHeight: "100vh", background: "#f9fafb" }}>

      {/* Nav */}
      <nav style={{ background: "#0d1117", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: 38, objectFit: "contain", cursor: "pointer" }} onClick={() => navigate("/")} />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {member
              ? <span style={{ color: "#9ca3af", fontSize: 14 }}>Hi, {member.firstName}</span>
              : <a href={`${BASE}/login`} style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none" }}>Member Login</a>
            }
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: "#0d1117", color: "#fff", textAlign: "center", padding: "56px 24px 48px" }}>
        <div style={{ display: "inline-block", background: "#1db95420", border: "1px solid #1db95440", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, color: "#1db954", letterSpacing: "0.08em", marginBottom: 20, textTransform: "uppercase" }}>
          Upgrade Your Protection
        </div>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.2 }}>
          Add Another Layer of Security
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 17, maxWidth: 560, margin: "0 auto 0", lineHeight: 1.7 }}>
          Upgrade from free to a monitored membership — someone is actively watching over every trip you take.
        </p>
      </div>

      {/* Already subscribed banner */}
      {!loadingMember && isAlreadyPaid && (
        <div style={{ background: "#dcfce7", borderBottom: "1px solid #86efac", padding: "14px 24px", textAlign: "center" }}>
          <span style={{ color: "#166534", fontSize: 14, fontWeight: 600 }}>
            ✓ You already have an active {member?.membershipTier ?? "paid"} membership. Thank you for being a protected member!
          </span>
        </div>
      )}

      {/* Plans */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "52px 24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
          {PLANS.map(plan => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                style={{
                  background: "#fff",
                  border: `2px solid ${isSelected ? plan.color : plan.popular ? "#e5e7eb" : "#e5e7eb"}`,
                  borderRadius: 16,
                  padding: "36px 32px",
                  position: "relative",
                  boxShadow: isSelected ? `0 0 0 4px ${plan.color}22` : plan.popular ? "0 8px 30px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {plan.popular && (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#fff", padding: "4px 18px", borderRadius: 20, fontSize: 11, fontWeight: 800, fontFamily: "Montserrat, sans-serif", whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                    MOST POPULAR
                  </div>
                )}

                <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>{plan.name}</div>
                <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, margin: "0 0 4px", color: "#0d1117" }}>{plan.subtitle}</h2>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "16px 0 8px" }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: plan.color, fontFamily: "Montserrat, sans-serif" }}>R{plan.price}</span>
                  <span style={{ color: "#9ca3af", fontSize: 14 }}>/month</span>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#374151" }}>
                      <CheckIcon />{f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => void handleSelectPlan(plan.id)}
                  disabled={generatingLink && selectedPlan === plan.id}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 8, border: "none",
                    background: plan.color, color: "#fff",
                    fontSize: 15, fontWeight: 800, fontFamily: "Montserrat, sans-serif",
                    cursor: "pointer", transition: "opacity 0.15s",
                    opacity: generatingLink && selectedPlan === plan.id ? 0.7 : 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  {generatingLink && selectedPlan === plan.id ? "Preparing…" : `Upgrade — R${plan.price}/month`}
                </button>

                {/* Payment options panel */}
                {isSelected && payLink && (
                  <div style={{ marginTop: 20, borderTop: "1px solid #f3f4f6", paddingTop: 20 }}>
                    {/* Pay now button */}
                    <a
                      href={payLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block", textAlign: "center", padding: "13px",
                        background: plan.color, color: "#fff", borderRadius: 8,
                        fontSize: 14, fontWeight: 700, textDecoration: "none",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Pay Now with Paystack →
                    </a>

                    {/* Share / QR options */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        onClick={copyLink}
                        style={{ flex: 1, padding: "9px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", fontSize: 12, fontWeight: 600, cursor: "pointer", color: copied ? "#166534" : "#374151" }}
                      >
                        {copied ? "✓ Copied!" : "📋 Copy Link"}
                      </button>
                      <button
                        onClick={() => setShowQr(v => !v)}
                        style={{ flex: 1, padding: "9px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151" }}
                      >
                        {showQr ? "Hide QR" : "📱 Show QR Code"}
                      </button>
                    </div>

                    {showQr && (
                      <QRCodeDisplay url={payLink} label="Scan to pay on your phone" />
                    )}

                    <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: "12px 0 0" }}>
                      Secured by Paystack · Your membership activates automatically after payment
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Free tier reminder */}
      <div style={{ maxWidth: 860, margin: "0 auto 48px", padding: "0 24px" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ fontSize: 32 }}>🆓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0d1117", marginBottom: 4 }}>Stay on the Free Plan</div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>Free members still get WhatsApp trip monitoring, community alerts, and access to the eblockwatch network. Upgrade anytime.</div>
          </div>
          <button
            onClick={() => navigate("/")}
            style={{ padding: "10px 20px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151", whiteSpace: "nowrap" }}
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Trust footer */}
      <div style={{ background: "#0d1117", padding: "36px 24px", textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
          Trusted by thousands of South Africans · Advocate for community safety since 2001 · Payments secured by Paystack
        </p>
      </div>
    </div>
  );
}
