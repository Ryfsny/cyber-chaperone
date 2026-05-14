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

type LoginMode = "otp" | "password" | "forgot";

export default function MemberLogin() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<LoginMode>("otp");
  const [step, setStep] = useState<"phone" | "otp-code">("phone");

  // OTP login state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // Password login state
  const [pwPhone, setPwPhone] = useState("");
  const [password, setPassword] = useState("");

  // Forgot password state
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "verify" | "set">("request");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  function resetAll() {
    setError(""); setInfo(""); setLoading(false);
    setStep("phone"); setOtp(""); setForgotStep("request"); setForgotCode(""); setNewPassword(""); setConfirmPassword("");
  }

  // ── OTP flow ──────────────────────────────────────────────────────────────
  async function requestOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/request-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ whatsappNumber: phone }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP.");
      setStep("otp-code");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ whatsappNumber: phone, code: otp }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      navigate("/my-account");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  // ── Password flow ─────────────────────────────────────────────────────────
  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ whatsappNumber: pwPhone, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Login failed.");
      navigate("/my-account");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  // ── Forgot password flow ──────────────────────────────────────────────────
  async function sendForgotOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setInfo(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ whatsappNumber: forgotPhone }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setInfo(data.message ?? "Code sent to your WhatsApp.");
      setForgotStep("verify");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function verifyForgotOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/member-portal/verify-reset-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ whatsappNumber: forgotPhone, code: forgotCode }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      setForgotStep("set");
      setInfo("");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function setNewPasswordFn(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); setLoading(false); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); setLoading(false); return; }
    try {
      const res = await fetch(`${BASE}/api/member-portal/set-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to set password.");
      navigate("/my-account");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #d1d5db", borderRadius: "8px",
    padding: "10px 14px", fontSize: "14px", outline: "none", color: "#111827",
    boxSizing: "border-box", fontFamily: "'Open Sans', sans-serif",
  };
  const btnPrimary: React.CSSProperties = {
    width: "100%", background: "#1db954", color: "#fff", border: "none",
    borderRadius: "10px", padding: "13px", fontSize: "15px", fontWeight: 700,
    cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
    fontFamily: "Montserrat, sans-serif", marginBottom: "12px",
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px", fontSize: "13px", fontWeight: active ? 700 : 500,
    background: active ? "#1db954" : "none", color: active ? "#fff" : "#6b7280",
    border: "none", borderRadius: "8px", cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Open Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <nav style={{ background: "#0d1117", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href={`${BASE}/`} style={{ textDecoration: "none" }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: "36px", objectFit: "contain" }} />
        </a>
        <a href={`${BASE}/`} style={{ color: "#9ca3af", fontSize: "13px", textDecoration: "none" }}>← Back to site</a>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", padding: "40px 36px", border: "1px solid #e5e7eb", marginBottom: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ width: "56px", height: "56px", background: "#0d1117", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "2px solid #1db954" }}>
                <span style={{ fontSize: "26px" }}>🛡️</span>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0d1117", fontFamily: "Montserrat, sans-serif", margin: "0 0 6px" }}>Member Portal</h1>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                {mode === "forgot" ? "Reset your password" : "Sign in to your account"}
              </p>
            </div>

            {/* Mode tabs — OTP vs Password (not shown in forgot mode) */}
            {mode !== "forgot" && (
              <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", marginBottom: "24px" }}>
                <button style={tabStyle(mode === "otp")} onClick={() => { setMode("otp"); resetAll(); }}>
                  WhatsApp Code
                </button>
                <button style={tabStyle(mode === "password")} onClick={() => { setMode("password"); resetAll(); }}>
                  Password
                </button>
              </div>
            )}

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" }}>
                {error}
              </div>
            )}
            {info && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#166534", marginBottom: "16px" }}>
                {info}
              </div>
            )}

            {/* ── OTP login ─────────────────────────────────────────────── */}
            {mode === "otp" && step === "phone" && (
              <form onSubmit={(e) => void requestOtp(e)}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>WhatsApp Number</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                  <div style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#374151", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                    🇿🇦 +27
                  </div>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="82 561 1065" required style={{ ...inputStyle, flex: 1 }} />
                </div>
                <button type="submit" disabled={loading || !phone} style={btnPrimary}>
                  {loading ? "Sending…" : "Send WhatsApp Code"}
                </button>
                <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                  Not registered?{" "}
                  <a href={`${BASE}/`} style={{ color: "#1db954", textDecoration: "none", fontWeight: 600 }}>Register for free</a>
                </p>
              </form>
            )}

            {mode === "otp" && step === "otp-code" && (
              <form onSubmit={(e) => void verifyOtp(e)}>
                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: 0, marginBottom: "14px" }}>
                  We've sent a 6-digit code to WhatsApp <strong>{phone}</strong>
                </p>
                <input
                  type="text" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" maxLength={6} required autoFocus
                  style={{ ...inputStyle, fontSize: "22px", letterSpacing: "8px", textAlign: "center", marginBottom: "20px" }}
                />
                <button type="submit" disabled={loading || otp.length !== 6} style={{ ...btnPrimary, opacity: loading || otp.length !== 6 ? 0.6 : 1 }}>
                  {loading ? "Verifying…" : "Verify & Log In"}
                </button>
                <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  style={{ width: "100%", background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer", padding: "4px" }}>
                  ← Try a different number
                </button>
              </form>
            )}

            {/* ── Password login ────────────────────────────────────────── */}
            {mode === "password" && (
              <form onSubmit={(e) => void loginWithPassword(e)}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>WhatsApp Number</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#374151", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                    🇿🇦 +27
                  </div>
                  <input type="tel" value={pwPhone} onChange={(e) => setPwPhone(e.target.value)} placeholder="82 561 1065" required style={{ ...inputStyle, flex: 1 }} />
                </div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required style={{ ...inputStyle, marginBottom: "6px" }} />
                <div style={{ textAlign: "right", marginBottom: "20px" }}>
                  <button type="button" onClick={() => { setMode("forgot"); resetAll(); }}
                    style={{ background: "none", border: "none", color: "#1db954", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={loading || !pwPhone || !password} style={{ ...btnPrimary, opacity: loading || !pwPhone || !password ? 0.6 : 1 }}>
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            )}

            {/* ── Forgot password ───────────────────────────────────────── */}
            {mode === "forgot" && forgotStep === "request" && (
              <form onSubmit={(e) => void sendForgotOtp(e)}>
                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: 0, marginBottom: "16px" }}>
                  Enter your WhatsApp number and we'll send a reset code.
                </p>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>WhatsApp Number</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                  <div style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#374151", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                    🇿🇦 +27
                  </div>
                  <input type="tel" value={forgotPhone} onChange={(e) => setForgotPhone(e.target.value)} placeholder="82 561 1065" required style={{ ...inputStyle, flex: 1 }} />
                </div>
                <button type="submit" disabled={loading || !forgotPhone} style={{ ...btnPrimary, opacity: loading || !forgotPhone ? 0.6 : 1 }}>
                  {loading ? "Sending…" : "Send Reset Code"}
                </button>
                <button type="button" onClick={() => { setMode("otp"); resetAll(); }}
                  style={{ width: "100%", background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer", padding: "4px" }}>
                  ← Back to login
                </button>
              </form>
            )}

            {mode === "forgot" && forgotStep === "verify" && (
              <form onSubmit={(e) => void verifyForgotOtp(e)}>
                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: 0, marginBottom: "14px" }}>
                  Enter the 6-digit code sent to WhatsApp <strong>{forgotPhone}</strong>
                </p>
                <input
                  type="text" value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" maxLength={6} required autoFocus
                  style={{ ...inputStyle, fontSize: "22px", letterSpacing: "8px", textAlign: "center", marginBottom: "20px" }}
                />
                <button type="submit" disabled={loading || forgotCode.length !== 6} style={{ ...btnPrimary, opacity: loading || forgotCode.length !== 6 ? 0.6 : 1 }}>
                  {loading ? "Verifying…" : "Verify Code"}
                </button>
              </form>
            )}

            {mode === "forgot" && forgotStep === "set" && (
              <form onSubmit={(e) => void setNewPasswordFn(e)}>
                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: 0, marginBottom: "16px" }}>
                  Choose a new password for your account.
                </p>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" required style={{ ...inputStyle, marginBottom: "12px" }} />
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required style={{ ...inputStyle, marginBottom: "20px" }} />
                <button type="submit" disabled={loading || !newPassword || !confirmPassword} style={{ ...btnPrimary, opacity: loading || !newPassword || !confirmPassword ? 0.6 : 1 }}>
                  {loading ? "Saving…" : "Set New Password"}
                </button>
              </form>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px 24px", textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 14px" }}>Prefer to do everything on your phone?</p>
            <a href="https://wa.me/27825611065?text=Hi" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#25d366", color: "#fff", textDecoration: "none", borderRadius: "10px", padding: "12px 22px", fontSize: "14px", fontWeight: 700, fontFamily: "Montserrat, sans-serif" }}>
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
