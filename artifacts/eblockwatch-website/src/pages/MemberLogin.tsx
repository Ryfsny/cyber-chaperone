import { useState } from "react";
import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

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
        <a
          href={`${BASE}/`}
          style={{ color: "#9ca3af", fontSize: "13px", textDecoration: "none" }}
        >← Back to site</a>
      </nav>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          padding: "40px 36px",
          width: "100%",
          maxWidth: "420px",
          border: "1px solid #e5e7eb",
        }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              width: "56px",
              height: "56px",
              background: "#0d1117",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              border: "2px solid #1db954",
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
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  color: "#374151",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
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
                    flex: 1,
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "14px",
                    outline: "none",
                    color: "#111827",
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
                  width: "100%",
                  background: "#1db954",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loading || !phone ? "not-allowed" : "pointer",
                  opacity: loading || !phone ? 0.6 : 1,
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {loading ? "Sending…" : "Send WhatsApp Code"}
              </button>

              <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", marginTop: "16px" }}>
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
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontSize: "22px",
                  letterSpacing: "8px",
                  textAlign: "center",
                  outline: "none",
                  color: "#111827",
                  marginBottom: "20px",
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
                  width: "100%",
                  background: "#1db954",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer",
                  opacity: loading || otp.length !== 6 ? 0.6 : 1,
                  fontFamily: "Montserrat, sans-serif",
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
      </div>
    </div>
  );
}
