import { useState } from "react";
import { WA_LINK_HI } from "../wa-config";
import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const FB_MESSENGER_URL = "https://m.me/eblockwatch";

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ flexShrink: 0 }}>
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

export default function MemberLogin() {
  const [, navigate] = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #d1d5db", borderRadius: "8px",
    padding: "11px 14px", fontSize: "15px", outline: "none", color: "#111827",
    boxSizing: "border-box", fontFamily: "'Open Sans', sans-serif",
  };

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const body = isEmail
        ? { email: identifier.trim(), password }
        : { whatsappNumber: identifier.trim(), password };
      const res = await fetch(`/api/member-portal/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Login failed.");
      navigate("/my-account");
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
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Login card */}
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", padding: "36px 32px", border: "1px solid #e5e7eb" }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ width: "52px", height: "52px", background: "#0d1117", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", border: "2px solid #1db954" }}>
                <span style={{ fontSize: "24px" }}>🛡️</span>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0d1117", fontFamily: "Montserrat, sans-serif", margin: "0 0 5px" }}>Member Portal</h1>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Sign in to your eblockwatch account</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            {/* Password form */}
            <form onSubmit={(e) => void loginWithPassword(e)}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Cell Phone Number or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="082 561 1065 or you@example.com"
                required autoFocus
                style={{ ...inputStyle, marginBottom: "12px" }}
              />
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                style={{ ...inputStyle, marginBottom: "20px" }}
              />
              {password ? (
                <button
                  type="submit"
                  disabled={loading || !identifier || !password}
                  style={{
                    width: "100%", background: "#1db954", color: "#fff", border: "none",
                    borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: 700,
                    cursor: loading || !identifier || !password ? "not-allowed" : "pointer",
                    opacity: loading || !identifier || !password ? 0.6 : 1,
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              ) : (
                <a
                  href={WA_LINK_HI}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                    background: "#25d366", color: "#fff", textDecoration: "none",
                    borderRadius: "10px", padding: "14px 18px", fontSize: "15px", fontWeight: 800,
                    fontFamily: "Montserrat, sans-serif", boxShadow: "0 4px 16px rgba(37,211,102,0.25)",
                  }}
                >
                  <WhatsAppIcon size={20} />
                  Send us a WhatsApp
                </a>
              )}
            </form>

            {/* Hint — only shown when password is empty */}
            {!password && (
              <p style={{ margin: "14px 0 0", fontSize: "13px", color: "#6b7280", lineHeight: 1.6, textAlign: "center" }}>
                No password yet? Tap the button above — it opens WhatsApp with a message ready to send. Hit send and your menu comes straight back.
              </p>
            )}
          </div>

          {/* Help panel */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px 24px" }}>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 14px", textAlign: "center" }}>
              Need more help? Reach us directly:
            </p>
            <a
              href={FB_MESSENGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: "#0084ff", color: "#fff", textDecoration: "none",
                borderRadius: "10px", padding: "12px 18px", fontSize: "14px", fontWeight: 700,
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              <MessengerIcon />
              Message us on Facebook
            </a>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "12px 0 0", textAlign: "center" }}>
              Not registered yet?{" "}
              <a href={`${BASE}/`} style={{ color: "#1db954", textDecoration: "none", fontWeight: 600 }}>Register for free →</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
