import { useState } from "react";
import { WA_LINK_HI } from "../wa-config";
import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const FB_MESSENGER_URL = "https://m.me/eblockwatch";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ flexShrink: 0 }}>
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/>
    </svg>
  );
}

type LoginMode = "otp" | "password" | "forgot";
type OtpMethod = "phone" | "email";

export default function MemberLogin() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<LoginMode>("otp");
  // OTP mode no longer uses a separate "step" — phone + code shown together
  const [codeSent, setCodeSent] = useState(false);

  // OTP login state
  const [otpMethod, setOtpMethod] = useState<OtpMethod>("phone");
  const [phone, setPhone] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Password login state
  const [pwIdentifier, setPwIdentifier] = useState("");

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
    setCodeSent(false); setOtp(""); setForgotStep("request");
    setForgotCode(""); setNewPassword(""); setConfirmPassword("");
  }

  // ── OTP flow ──────────────────────────────────────────────────────────────
  async function sendCode() {
    setError(""); setInfo(""); setLoading(true);
    try {
      const body = otpMethod === "phone" ? { whatsappNumber: phone } : { email: otpEmail };
      const res = await fetch(`${BASE}/api/member-portal/request-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send code.");
      setCodeSent(true);
      setInfo(otpMethod === "phone" ? "Code sent to your WhatsApp." : "Code sent to your email.");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const body = otpMethod === "phone"
        ? { whatsappNumber: phone, code: otp }
        : { email: otpEmail, code: otp };
      const res = await fetch(`${BASE}/api/member-portal/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      navigate("/my-account");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  // ── Password flow ─────────────────────────────────────────────────────────
  function isEmail(val: string) { return val.includes("@"); }

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const body = isEmail(pwIdentifier)
        ? { email: pwIdentifier.trim(), password }
        : { whatsappNumber: pwIdentifier.trim(), password };
      const res = await fetch(`${BASE}/api/member-portal/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
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
      setInfo(data.message ?? "Code sent to your phone.");
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
      setForgotStep("set"); setInfo("");
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
  const methodTab = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "7px", fontSize: "12px", fontWeight: active ? 700 : 500,
    background: active ? "#0d1117" : "none", color: active ? "#fff" : "#6b7280",
    border: "none", borderRadius: "6px", cursor: "pointer", transition: "all 0.15s",
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

            {/* Mode tabs */}
            {mode !== "forgot" && (
              <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", marginBottom: "24px" }}>
                <button style={tabStyle(mode === "otp")} onClick={() => { setMode("otp"); resetAll(); }}>
                  Login Code
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

            {/* ── OTP login — single screen ──────────────────────────────── */}
            {mode === "otp" && (
              <form onSubmit={(e) => void verifyOtp(e)}>
                {/* Hint banner */}
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#166534", marginBottom: "18px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>💬</span>
                  <span>Got a code from WhatsApp? Enter your number and paste it below — no need to request a new one.</span>
                </div>

                {/* Phone / Email sub-toggle */}
                <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", borderRadius: "8px", padding: "3px", marginBottom: "14px" }}>
                  <button type="button" style={methodTab(otpMethod === "phone")} onClick={() => { setOtpMethod("phone"); setError(""); setInfo(""); }}>
                    📱 Cell Phone
                  </button>
                  <button type="button" style={methodTab(otpMethod === "email")} onClick={() => { setOtpMethod("email"); setError(""); setInfo(""); }}>
                    ✉️ Email
                  </button>
                </div>

                {otpMethod === "phone" ? (
                  <>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Cell Phone Number</label>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                      <div style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#374151", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                        🇿🇦 +27
                      </div>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="82 561 1065" required style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </>
                ) : (
                  <>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Email Address</label>
                    <input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} placeholder="you@example.com" required style={{ ...inputStyle, marginBottom: "14px" }} />
                  </>
                )}

                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>6-Digit Login Code</label>
                <input
                  type="text" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" maxLength={6} inputMode="numeric" autoFocus
                  style={{ ...inputStyle, fontSize: "22px", letterSpacing: "8px", textAlign: "center", marginBottom: "6px" }}
                />
                <div style={{ textAlign: "right", marginBottom: "20px" }}>
                  <button
                    type="button"
                    disabled={loading || (otpMethod === "phone" ? !phone : !otpEmail)}
                    onClick={() => void sendCode()}
                    style={{ background: "none", border: "none", color: "#1db954", fontSize: "12px", cursor: "pointer", fontWeight: 600, padding: "2px 0" }}>
                    {loading && !otp ? "Sending…" : codeSent ? "Code sent ✓ — resend?" : "Don't have a code? Send one to my WhatsApp"}
                  </button>
                </div>

                <button type="submit" disabled={loading || otp.length !== 6 || (otpMethod === "phone" ? !phone : !otpEmail)}
                  style={{ ...btnPrimary, opacity: loading || otp.length !== 6 || (otpMethod === "phone" ? !phone : !otpEmail) ? 0.6 : 1 }}>
                  {loading && otp.length === 6 ? "Verifying…" : "Log In"}
                </button>
                <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                  Not registered?{" "}
                  <a href={`${BASE}/`} style={{ color: "#1db954", textDecoration: "none", fontWeight: 600 }}>Register for free</a>
                </p>
              </form>
            )}

            {/* ── Password login ────────────────────────────────────────── */}
            {mode === "password" && (
              <form onSubmit={(e) => void loginWithPassword(e)}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Cell Phone Number or Email</label>
                <input
                  type="text"
                  value={pwIdentifier}
                  onChange={(e) => setPwIdentifier(e.target.value)}
                  placeholder="082 561 1065 or you@example.com"
                  required
                  style={{ ...inputStyle, marginBottom: "16px" }}
                />
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required style={{ ...inputStyle, marginBottom: "6px" }} />
                <div style={{ textAlign: "right", marginBottom: "20px" }}>
                  <button type="button" onClick={() => { setMode("forgot"); resetAll(); }}
                    style={{ background: "none", border: "none", color: "#1db954", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={loading || !pwIdentifier || !password} style={{ ...btnPrimary, opacity: loading || !pwIdentifier || !password ? 0.6 : 1 }}>
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            )}

            {/* ── Forgot password ───────────────────────────────────────── */}
            {mode === "forgot" && forgotStep === "request" && (
              <form onSubmit={(e) => void sendForgotOtp(e)}>
                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: 0, marginBottom: "16px" }}>
                  Enter your cell phone number and we'll send a reset code.
                </p>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Cell Phone Number</label>
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

          {/* ── Fallback options ─────────────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px 24px" }}>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 14px", textAlign: "center" }}>
              Can't get in? Reach us directly:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a href={WA_LINK_HI} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "10px", background: "#25d366", color: "#fff", textDecoration: "none", borderRadius: "10px", padding: "12px 18px", fontSize: "14px", fontWeight: 700, fontFamily: "Montserrat, sans-serif" }}>
                <WhatsAppIcon />
                WhatsApp Andre
              </a>
              <a href={FB_MESSENGER_URL} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "10px", background: "#0084ff", color: "#fff", textDecoration: "none", borderRadius: "10px", padding: "12px 18px", fontSize: "14px", fontWeight: 700, fontFamily: "Montserrat, sans-serif" }}>
                <MessengerIcon />
                Message us on Facebook
              </a>
            </div>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "12px 0 0", textAlign: "center" }}>
              Update your details, start a trip, or get help — all from WhatsApp or Messenger
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
