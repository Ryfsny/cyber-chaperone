import { useLocation } from "wouter";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "27825611065";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const FEATURES = [
  {
    icon: "🛡️",
    title: "Cyber Chaperone",
    desc: "Tell AI Command where you're going. We watch your route and ping your family if anything looks wrong.",
  },
  {
    icon: "📍",
    title: "Share your location",
    desc: "Drop a WhatsApp location pin — we log it instantly. No app to download. Works with Waze and Google Maps too.",
  },
  {
    icon: "🆘",
    title: "One-message emergency",
    desc: "Say \u2018Help\u2019 on WhatsApp. AI Command alerts your emergency contact and the Situation Room immediately.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Family plan included",
    desc: "One subscription covers your whole household. Every family member gets their own Cyber Chaperone.",
  },
];

const STEPS = [
  { num: "1", text: "Save *+27 82 561 1065* in your contacts as *eblockwatch*" },
  { num: "2", text: 'Send *"Hi"* on WhatsApp — AI Command answers immediately' },
  { num: "3", text: "Follow the 3-step setup — under 2 minutes" },
];

export default function JoinPage() {
  const [, setLocation] = useLocation();

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Header */}
      <header style={{ background: "#1a1f2e", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={LOGO} alt="eblockwatch" style={{ height: 36, objectFit: "contain" }} />
        <button
          onClick={() => setLocation("/register")}
          style={{ background: "transparent", border: "1px solid #22c55e", color: "#22c55e", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Register
        </button>
      </header>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f172a 100%)", padding: "48px 20px 56px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#22c55e22", border: "1px solid #22c55e55", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: "#22c55e", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>
          EBLOCKWATCH CYBER CHAPERONE
        </div>
        <h1 style={{ color: "#fff", fontSize: "clamp(28px, 6vw, 44px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.15 }}>
          Travel safer.<br />
          <span style={{ color: "#22c55e" }}>Family stays informed.</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "clamp(15px, 3.5vw, 18px)", margin: "0 auto 36px", maxWidth: 480, lineHeight: 1.6 }}>
          South Africa's WhatsApp-first personal safety platform. No app to download.
          Works with the tools you already use — WhatsApp, Waze, Google Maps.
        </p>

        {/* Primary CTA — WhatsApp */}
        <a
          href={`https://wa.me/${WA_NUMBER}?text=Hi`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#22c55e", color: "#fff",
            borderRadius: 10, padding: "16px 32px",
            fontSize: 18, fontWeight: 800, textDecoration: "none",
            boxShadow: "0 4px 24px #22c55e55",
            transition: "background 0.2s",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.523 5.855L0 24l6.29-1.508A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.372l-.359-.213-3.732.894.937-3.642-.234-.374A9.771 9.771 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/></svg>
          Activate on WhatsApp — it's free
        </a>

        <p style={{ color: "#64748b", fontSize: 13, marginTop: 14 }}>
          Already a member?{" "}
          <a href={`${BASE}/login`} style={{ color: "#22c55e", textDecoration: "underline" }}>Sign in here</a>
        </p>
      </section>

      {/* How it works */}
      <section style={{ background: "#fff", padding: "48px 20px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ color: "#1a1f2e", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
            Get started in 2 minutes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {STEPS.map((s) => (
              <div key={s.num} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#22c55e", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 16, flexShrink: 0,
                }}>
                  {s.num}
                </div>
                <p style={{ color: "#374151", fontSize: 16, lineHeight: 1.5, margin: 0 }}
                   dangerouslySetInnerHTML={{ __html: s.text.replace(/\*(.*?)\*/g, "<strong>$1</strong>") }} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, textAlign: "center" }}>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=Hi`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "#22c55e", color: "#fff",
                borderRadius: 8, padding: "14px 28px",
                fontSize: 16, fontWeight: 700, textDecoration: "none",
              }}
            >
              Start now on WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: "#f8fafc", padding: "48px 20px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ color: "#1a1f2e", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
            What eblockwatch Cyber Chaperone does
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                background: "#fff", borderRadius: 12,
                border: "1px solid #e2e8f0",
                padding: "24px 20px",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ color: "#1a1f2e", fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{f.title}</h3>
                <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ background: "#1a1f2e", padding: "48px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            Simple, honest pricing
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 32 }}>
            Less than a cup of coffee a week. Cancel any time.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "Individual", price: "R150", period: "/month", desc: "One member, full protection" },
              { label: "Family", price: "R250", period: "/month", desc: "Whole household covered", highlight: true },
            ].map((p) => (
              <div key={p.label} style={{
                background: p.highlight ? "#22c55e" : "#ffffff15",
                border: p.highlight ? "none" : "1px solid #ffffff20",
                borderRadius: 12, padding: "24px 16px",
              }}>
                <div style={{ color: p.highlight ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
                  {p.label.toUpperCase()}
                </div>
                <div style={{ color: "#fff", fontSize: 32, fontWeight: 800 }}>
                  {p.price}<span style={{ fontSize: 14, fontWeight: 400 }}>{p.period}</span>
                </div>
                <div style={{ color: p.highlight ? "#f0fdf4" : "#64748b", fontSize: 13, marginTop: 8 }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32 }}>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=Hi`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "#22c55e", color: "#fff",
                borderRadius: 10, padding: "14px 32px",
                fontSize: 16, fontWeight: 700, textDecoration: "none",
                boxShadow: "0 4px 20px #22c55e44",
              }}
            >
              Activate free on WhatsApp
            </a>
            <p style={{ color: "#475569", fontSize: 13, marginTop: 12 }}>
              Upgrade to paid from inside WhatsApp — AI Command guides you through it.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0f172a", padding: "24px 20px", textAlign: "center" }}>
        <img src={LOGO} alt="eblockwatch" style={{ height: 28, marginBottom: 12, objectFit: "contain" }} />
        <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
          eblockwatch: A safer you · <a href="https://www.eblockwatch.co.za" style={{ color: "#22c55e", textDecoration: "none" }}>eblockwatch.co.za</a>
        </p>
      </footer>

    </div>
  );
}
