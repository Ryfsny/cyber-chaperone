import { useEffect } from "react";
import { Link } from "wouter";

const LOGO = "/eblockwatch-logo.png";

export default function TermsAndConditions() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#1a1f2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: "14px" }}>
        <Link href="/">
          <img src={LOGO} alt="eblockwatch" style={{ height: "36px", cursor: "pointer" }} />
        </Link>
        <span style={{ color: "#9ca3af", fontSize: "13px", marginLeft: "auto" }}>
          <Link href="/" style={{ color: "#22c55e", textDecoration: "none" }}>← Back to home</Link>
        </span>
      </header>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Founder's Pledge */}
        <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "40px 48px", marginBottom: "36px", boxShadow: "0 4px 24px rgba(34,197,94,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
            <img src={LOGO} alt="eblockwatch" style={{ height: "44px" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>
                The Founder's Pledge
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>
                A personal statement by André Snyman — Founder of eblockwatch
              </p>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", borderLeft: "4px solid #22c55e", borderRadius: "0 12px 12px 0", padding: "20px 24px", marginBottom: "28px" }}>
            <p style={{ margin: 0, fontSize: "15px", fontStyle: "italic", color: "#166534", lineHeight: 1.8 }}>
              "I will always do my best to look after each member as one of my own."
            </p>
          </div>

          <div style={{ fontSize: "15px", color: "#374151", lineHeight: 1.9 }}>
            <p>
              I will treat every situation with integrity and use my best judgement to make decisions that I genuinely believe serve the best interests of my members.
            </p>
            <p>
              I will be the first to admit when I am wrong — but I ask my members to understand that I am human. Every decision I make is made without malice or vindictiveness, and my intentions have always been, and will always remain, good.
            </p>
            <p>
              There are times when I go to great lengths to help a member. I ask my members to recognise that the decisions I have made, even those made quickly or under pressure, have rarely had a negative impact on the member concerned. Every decision I make is my sole responsibility. I own them — the good and the not-so-good.
            </p>
            <p>
              Some decisions are made under life-threatening pressure. They are always made using the experience I have built over many years of doing this work. The final call is mine and mine alone.
            </p>
            <p>
              I also want to be absolutely clear: <strong>I have never sold, traded, or shared your personal information for any nefarious purpose — and I never will.</strong>
            </p>
          </div>

          <div style={{ background: "#1a1f2e", borderRadius: "14px", padding: "20px 24px", marginTop: "28px" }}>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>Signed</div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "#22c55e", fontFamily: "Montserrat, sans-serif" }}>André Snyman</div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Founder — eblockwatch</div>
          </div>
        </div>

        {/* What this means for members */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px 32px", marginBottom: "28px" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: "17px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>
            What this means for you as a member
          </h2>
          {[
            { icon: "🛡️", title: "You are treated as a person", desc: "Not a policy number. Not a database entry. André knows the value of every name in our network." },
            { icon: "🤝", title: "Your safety is personally important to me", desc: "Every call I make is made with your wellbeing as the primary consideration. That has never changed." },
            { icon: "🔒", title: "Your information is held in strictest confidence", desc: "Your personal details, your home, your family — none of it has ever been sold, traded, or exploited. None of it ever will be." },
            { icon: "📞", title: "When you need us most, we will be there", desc: "This is not a marketing promise. It is the foundation on which eblockwatch was built — real people, real relationships, real backup when it counts." },
          ].map(row => (
            <div key={row.title} style={{ display: "flex", gap: "14px", marginBottom: "16px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "22px", flexShrink: 0 }}>{row.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", marginBottom: "3px" }}>{row.title}</div>
                <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>{row.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Terms */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px 32px", marginBottom: "28px" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: "17px", fontWeight: 700, color: "#111827", fontFamily: "Montserrat, sans-serif" }}>
            Platform Terms & Conditions
          </h2>
          <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.8 }}>
            <p><strong style={{ color: "#374151" }}>Service:</strong> eblockwatch provides a community safety network and travel monitoring service via WhatsApp and the member portal. Access to services is subject to active membership status.</p>
            <p><strong style={{ color: "#374151" }}>Membership:</strong> Entry level membership is free. Individual and Family plans are billed monthly via Paystack. You may cancel at any time from your member portal. Cancellation takes effect at the end of the current billing period.</p>
            <p><strong style={{ color: "#374151" }}>Emergency services:</strong> eblockwatch is a community monitoring and support service. It does not replace emergency services. Always contact SAPS (10111) or EMS (10177) for life-threatening emergencies.</p>
            <p><strong style={{ color: "#374151" }}>Data:</strong> Your personal information is used solely to provide the eblockwatch service. It is stored securely and is never sold or shared with third parties for commercial purposes. See the Founder's Pledge above.</p>
            <p><strong style={{ color: "#374151" }}>Limitation of liability:</strong> eblockwatch and André Snyman act in good faith at all times. While every effort is made to respond promptly and effectively, eblockwatch cannot guarantee outcomes in all situations. Members use the service understanding that response times and outcomes depend on network availability and real-world conditions.</p>
            <p><strong style={{ color: "#374151" }}>Governing law:</strong> These terms are governed by the laws of the Republic of South Africa.</p>
          </div>
        </div>

        {/* Last updated */}
        <div style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
          <p>Last updated: May 2026 · eblockwatch — South Africa</p>
          <Link href="/" style={{ color: "#22c55e", textDecoration: "none", fontWeight: 600 }}>← Back to eblockwatch</Link>
        </div>
      </main>
    </div>
  );
}
