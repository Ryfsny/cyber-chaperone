import { useState } from "react";
import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

export default function MemberLogin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ whatsappNumber: phone }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP.");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ whatsappNumber: phone, code: otp }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      navigate("/member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Open Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ background: "#0d1117", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href={`${BASE}/`} style={{ textDecoration: "none" }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: "36px", objectFit: "contain" }} />
        </a>
        <a href={`${BASE}/`} style={{ color: "#9ca3af", fontSize: "13px", textDecoration: "none" }}>← Back to site</a>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Card */}
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
            padding: "40px 36px",
            border: "1px solid #e5e7eb",
            marginBottom: "16px",
          }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{
                width: "56px", height: "56px", background: "#0d1117", borderRadius: "14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", border: "2px solid #1db954",
              }}>
                <span style={{ fontSize: "26px" }}>🛡️</span>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0d1117", fontFamily: "Montserrat, sans-serif", margin: "0 0 6px" }}>
                Member Portal
              </h1>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                {step === "phone"
                  ? "Enter your WhatsApp number to receive a login code."
                  : `We've sent a 6-digit code to WhatsApp ${phone}`}
              </p>
            </div>

            {step === "phone" ? (
              <form onSubmit={(e) => void requestOtp(e)}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  WhatsApp Number
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                  <div style={{
                    background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px",
                    padding: "10px 12px", fontSize: "14px", color: "#374151", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    🇿🇦 +27
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="82 561 1065"
                    required
                    style={{
                      flex: 1, border: "1px solid #d1d5db", borderRadius: "8px",
                      padding: "10px 14px", fontSize: "14px", outline: "none", color: "#111827",
                    }}
                  />
                </div>

                {error && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !phone}
                  style={{
                    width: "100%", background: "#1db954", color: "#fff", border: "none",
                    borderRadius: "10px", padding: "13px", fontSize: "15px", fontWeight: 700,
                    cursor: loading || !phone ? "not-allowed" : "pointer",
                    opacity: loading || !phone ? 0.6 : 1, fontFamily: "Montserrat, sans-serif",
                    marginBottom: "12px",
                  }}
                >
                  {loading ? "Sending…" : "Send WhatsApp Code"}
                </button>

                <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", margin: "0 0 0" }}>
                  Not registered yet?{" "}
                  <a href={`${BASE}/`} style={{ color: "#1db954", textDecoration: "none", fontWeight: 600 }}>
                    Register for free
                  </a>
                </p>
              </form>
            ) : (
              <form onSubmit={(e) => void verifyOtp(e)}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  6-Digit Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  required
                  autoFocus
                  style={{
                    width: "100%", border: "1px solid #d1d5db", borderRadius: "8px",
                    padding: "12px 14px", fontSize: "22px", letterSpacing: "8px",
                    textAlign: "center", outline: "none", color: "#111827", marginBottom: "20px",
                    boxSizing: "border-box",
                  }}
                />

                {error && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  style={{
                    width: "100%", background: "#1db954", color: "#fff", border: "none",
                    borderRadius: "10px", padding: "13px", fontSize: "15px", fontWeight: 700,
                    cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer",
                    opacity: loading || otp.length !== 6 ? 0.6 : 1, fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {loading ? "Verifying…" : "Verify & Log In"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  style={{ width: "100%", background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer", marginTop: "12px", padding: "4px" }}
                >
                  ← Try a different number
                </button>
              </form>
            )}
          </div>

          {/* WhatsApp alternative */}
          <div style={{
            background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb",
            padding: "20px 24px", textAlign: "center",
          }}>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 14px" }}>
              Prefer to do everything on your phone?
            </p>
            <a
              href="https://wa.me/27825611065?text=Hi"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                background: "#25d366", color: "#fff", textDecoration: "none",
                borderRadius: "10px", padding: "12px 22px", fontSize: "14px",
                fontWeight: 700, fontFamily: "Montserrat, sans-serif",
              }}
            >
              <WhatsAppIcon />
              Chat with Andre on WhatsApp
            </a>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "12px 0 0" }}>
              Update your details, start a trip, or get help — all from WhatsApp
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
