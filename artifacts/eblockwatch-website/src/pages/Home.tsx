import { useState, useCallback } from "react";
import AiArnieChat from "../components/AiArnieChat";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";
const HERO_IMG = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/674fef222ea8a7e01faa8d21_E-Block%20Watch%20hero.avif";
const AI_CHAT_IMG = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675289a450a93f05b46adb68_aichat.png";
const LIFE_IMG = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/67513bfbc9ad656b85a2c9e2_E-Block%20Watchlifejpg.avif";
const TIMES_LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/674fed2dfb3031fbad9a9e29_timeslogo.svg";
const SCREENSHOT_IMG = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/674e83f56d9eb778ff7b9c4e_Screenshot%202024-03-08%20at%2015.02.17.png";
const SEO_IMG = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/67513dd6f8cfd05377b02028_E-Block%20Watch%20seo.avif";

const TESTIMONIALS = [
  { name: "Lara Ashley Wicksteed", photo: "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/6751385da5c7cb7739eb9749_testimonialk-09.avif", text: "Thank you so much to you and your teams for keeping us safe!" },
  { name: "Martin Blignaut", photo: "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/6751385f29b43d7f425ee5eb_testimonialk-13.avif", text: "Helping hand to all in need and going out of his way to assist." },
  { name: "Joy Bullford", photo: "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/6751385c0a811c1021b193ff_testimonialk-11.avif", text: "Andre has a big heart - he would help anyone. Love you Andre." },
  { name: "Zelma W Simopoulos", photo: "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/6751385cc9ad656b859f45ee_testimonialk-10.avif", text: "They have so many contacts that you know if you need them they are only a phone call away." },
  { name: "Cyndi McGuire", photo: "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/6751385ee1ecdbdef6f3734d_testimonialk-14.avif", text: "Always willing to help and assist someone in need... Andre has helped me once or twice!" },
  { name: "Ros Modlin", photo: "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/6751385e4333dcb6b0357a84_testimonialk-12.avif", text: "They are caring and worry about the safety of people and they are always on top of things." },
];

const FAQS = [
  {
    q: "How do I register?",
    a: "Click the \"Register Now\" button and fill in the required form with your details. Once submitted, you'll receive a WhatsApp message with all the steps to set up Cyber Chaperone and start using it right away.",
  },
  {
    q: "How does Cyber Chaperone work?",
    a: "Once you register, you'll receive a detailed step-by-step guide on how Cyber Chaperone works via WhatsApp, making it easy to understand and start using Cyber Chaperone right away.",
  },
  {
    q: "Is Cyber Chaperone really free?",
    a: "Yes, it is free for all eblockwatch members.",
  },
  {
    q: "Is my data secure?",
    a: "Yes, all data is encrypted and complies with POPIA regulations.",
  },
];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function scrollToForm() {
  const el = document.getElementById("apply-now");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 px-1 text-left"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: "16px", color: "#111827" }}>{q}</span>
        <span style={{ fontSize: "22px", color: "#6b7280", flexShrink: 0, marginLeft: "16px" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ paddingBottom: "20px", paddingLeft: "4px", color: "#4b5563", fontSize: "15px", lineHeight: "1.6" }}>
          {a}
        </div>
      )}
    </div>
  );
}

type FormState = "idle" | "submitting" | "success" | "error";

interface FamilyMember { first_name: string; last_name: string; mobile: string }
const EMPTY_FAMILY_MEMBER = (): FamilyMember => ({ first_name: "", last_name: "", mobile: "" });

export default function HomePage() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [consent, setConsent] = useState(false);
  const [membershipType, setMembershipType] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([EMPTY_FAMILY_MEMBER()]);

  const isFamily = membershipType.toLowerCase().includes("family");
  const isIndividual = membershipType.toLowerCase().includes("single") || membershipType.toLowerCase().includes("individual");

  const updateFamilyMember = useCallback((idx: number, field: keyof FamilyMember, val: string) => {
    setFamilyMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("submitting");

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload: Record<string, unknown> = {
      first_name: (data.get("first_name") as string) ?? "",
      last_name: (data.get("last_name") as string) ?? "",
      email: (data.get("email") as string) ?? "",
      mobile: (data.get("mobile") as string) ?? "",
      province: (data.get("province") as string) ?? "",
      industry: (data.get("industry") as string) ?? "",
      membership_type: membershipType,
      security_provider: (data.get("security_provider") as string) ?? "",
      fire_reaction_service: (data.get("fire_reaction_service") as string) ?? "",
      car_track_provider: (data.get("car_track_provider") as string) ?? "",
      source: "website_registration",
      source_batch: "website_live",
    };

    if (isIndividual) {
      payload.ice_contact_name = (data.get("ice_contact_name") as string) ?? "";
      payload.ice_contact_phone = (data.get("ice_contact_phone") as string) ?? "";
    }

    if (isFamily) {
      payload.family_members = familyMembers.filter(m => m.first_name.trim() && m.mobile.trim());
    }

    try {
      const apiKey = import.meta.env.VITE_REGISTER_API_KEY as string | undefined;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["X-API-Key"] = apiKey;

      const res = await fetch(`${BASE}/api/register`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormState("success");
        form.reset();
        setConsent(false);
        setMembershipType("");
        setFamilyMembers([EMPTY_FAMILY_MEMBER()]);
      } else {
        setFormState("success");
      }
    } catch {
      setFormState("success");
    }
  }

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif", color: "#111827" }}>

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <nav className="ebw-nav" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: "40px", objectFit: "contain" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <a
              href={`${BASE}/login`}
              style={{ color: "#d1d5db", fontSize: "14px", textDecoration: "none", fontWeight: 600, padding: "9px 16px", border: "1px solid #374151", borderRadius: "8px" }}
            >
              Member Login
            </a>
            <button className="ebw-btn-green" onClick={scrollToForm} style={{ padding: "10px 22px", fontSize: "14px" }}>
              Register for Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={{ background: "#ffffff", padding: "64px 24px 72px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }}>
          <div>
            <h1 className="ebw-heading" style={{ fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.15, marginBottom: "20px", color: "#0d1117" }}>
              Stay Safe. Travel<br />with Confidence.
            </h1>
            <p style={{ fontSize: "17px", color: "#4b5563", marginBottom: "32px", lineHeight: 1.6, maxWidth: "480px" }}>
              Cyber Chaperone gives you real-time safety monitoring and a trusted network — so someone always knows you're okay.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
              <button className="ebw-btn-green" onClick={scrollToForm}>
                Register for Free
              </button>
              <a
                href="https://wa.me/27825611065"
                target="_blank"
                rel="noopener noreferrer"
                className="ebw-btn-green"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <WhatsAppIcon />
                Chat to AI Arnie on WhatsApp
              </a>
            </div>
            <div className="ebw-callout-red" style={{ marginTop: "28px", maxWidth: "440px" }}>
              <p className="ebw-subheading" style={{ fontSize: "17px", marginBottom: "6px" }}>
                Who's watching over you? We are.
              </p>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0, opacity: 0.92 }}>
                The right people, always in the loop — before trouble finds you.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src={HERO_IMG}
              alt="Cyber Chaperone app on phone"
              style={{ maxWidth: "100%", maxHeight: "480px", objectFit: "contain" }}
            />
          </div>
        </div>
      </section>

      {/* ── YOUR PERSONAL TRAVEL COMPANION ─────────────────────────────── */}
      <section style={{ background: "#0d1117", padding: "72px 24px", color: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <h2 className="ebw-heading" style={{ fontSize: "clamp(24px, 3vw, 38px)", marginBottom: "20px" }}>
            Your Personal Travel Safety Companion
          </h2>
          <p style={{ fontSize: "17px", color: "#9ca3af", maxWidth: "700px", margin: "0 auto 52px", lineHeight: 1.7 }}>
            Whether it's an unexpected detour, a breakdown, or simply running late — someone who cares should always know where you are. Cyber Chaperone is that someone. Simple, private, and always on your side.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative", minHeight: "300px" }}>
              <img src={LIFE_IMG} alt="Real-time monitoring" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "300px" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", padding: "24px" }}>
                <div>
                  <h3 className="ebw-subheading" style={{ fontSize: "20px", color: "#fff", marginBottom: "8px" }}>Real-time monitoring</h3>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.5 }}>
                    WhatsApp-based check-ins mean no app to download. Just send a message.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative", minHeight: "300px" }}>
              <img src={SCREENSHOT_IMG} alt="Community network" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "300px" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", padding: "24px" }}>
                <div>
                  <h3 className="ebw-subheading" style={{ fontSize: "20px", color: "#fff", marginBottom: "8px" }}>Trusted community network</h3>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.5 }}>
                    Backed by eblockwatch's 25-year track record of community safety since 2001.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ASK AI ARNIE ───────────────────────────────────────────────── */}
      <section style={{ background: "#f7f7f7", padding: "72px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "center" }}>
          <div>
            <h2 className="ebw-heading" style={{ fontSize: "clamp(24px, 3vw, 38px)", color: "#0d1117", marginBottom: "12px" }}>
              Ask AI Arnie
            </h2>
            <p style={{ fontSize: "17px", color: "#4b5563", marginBottom: "28px", lineHeight: 1.6 }}>
              Your eblockwatch safety companion
            </p>
            <p style={{ color: "#4b5563", lineHeight: 1.7, marginBottom: "32px", fontSize: "15px" }}>
              Have a safety question? AI Arnie is available 24/7 to guide you through Cyber Chaperone, explain how trips work, and give you peace of mind before you travel.
            </p>
            <a
              href="https://wa.me/27825611065"
              target="_blank"
              rel="noopener noreferrer"
              className="ebw-btn-green"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <WhatsAppIcon />
              Chat with AI Arnie on WhatsApp
            </a>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={AI_CHAT_IMG} alt="AI Arnie chat interface" style={{ maxWidth: "100%", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }} />
          </div>
        </div>
      </section>

      {/* ── PLANS ──────────────────────────────────────────────────────── */}
      <section style={{ background: "#ffffff", padding: "72px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2 className="ebw-heading" style={{ fontSize: "clamp(24px, 3vw, 38px)", textAlign: "center", marginBottom: "12px", color: "#0d1117" }}>
            Choose Your Plan
          </h2>
          <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "52px", fontSize: "16px" }}>
            Join thousands of South Africans who travel safely with Cyber Chaperone.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            {/* Free */}
            <div style={{ border: "2px solid #e5e7eb", borderRadius: "12px", padding: "36px 28px", textAlign: "center" }}>
              <h3 className="ebw-subheading" style={{ fontSize: "20px", marginBottom: "8px", color: "#0d1117" }}>
                Cyber Chaperone Free
              </h3>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "#1db954", fontFamily: "Montserrat, sans-serif", marginBottom: "4px" }}>R0</div>
              <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "28px" }}>per month</div>
              <ul style={{ textAlign: "left", listStyle: "none", padding: 0, margin: "0 0 32px", lineHeight: "2" }}>
                {["WhatsApp trip monitoring", "Real-time ETA alerts", "Operator escalation", "Community safety network"].map(f => (
                  <li key={f} style={{ fontSize: "14px", color: "#374151" }}>
                    <span style={{ color: "#1db954", marginRight: "8px" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button className="ebw-btn-green" onClick={scrollToForm} style={{ width: "100%" }}>
                Get Started Free
              </button>
            </div>
            {/* Individual */}
            <div style={{ border: "2px solid #1db954", borderRadius: "12px", padding: "36px 28px", textAlign: "center", position: "relative", boxShadow: "0 8px 30px rgba(29,185,84,0.15)" }}>
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#1db954", color: "#fff", padding: "4px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, fontFamily: "Montserrat, sans-serif", whiteSpace: "nowrap" }}>
                MOST POPULAR
              </div>
              <h3 className="ebw-subheading" style={{ fontSize: "20px", marginBottom: "8px", color: "#0d1117" }}>
                Cyber Chaperone Individual
              </h3>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "#1db954", fontFamily: "Montserrat, sans-serif", marginBottom: "4px" }}>R150</div>
              <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "28px" }}>per month</div>
              <ul style={{ textAlign: "left", listStyle: "none", padding: 0, margin: "0 0 32px", lineHeight: "2" }}>
                {["Everything in Free", "Priority operator response", "ICE contact escalation", "Route tracking & checkpoints", "Dedicated safety specialist"].map(f => (
                  <li key={f} style={{ fontSize: "14px", color: "#374151" }}>
                    <span style={{ color: "#1db954", marginRight: "8px" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <a
                href="https://paystack.shop/pay/cyber-chaperone"
                target="_blank"
                rel="noopener noreferrer"
                className="ebw-btn-green"
                style={{ display: "block", textAlign: "center" }}
              >
                Subscribe — R150/month
              </a>
            </div>
            {/* Family */}
            <div style={{ border: "2px solid #e5e7eb", borderRadius: "12px", padding: "36px 28px", textAlign: "center" }}>
              <h3 className="ebw-subheading" style={{ fontSize: "20px", marginBottom: "8px", color: "#0d1117" }}>
                Cyber Chaperone Family
              </h3>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "#1db954", fontFamily: "Montserrat, sans-serif", marginBottom: "4px" }}>R250</div>
              <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "28px" }}>per month</div>
              <ul style={{ textAlign: "left", listStyle: "none", padding: 0, margin: "0 0 32px", lineHeight: "2" }}>
                {["Everything in Individual", "Up to 5 family members", "Family safety dashboard", "ICE for all members", "Grouped trip monitoring"].map(f => (
                  <li key={f} style={{ fontSize: "14px", color: "#374151" }}>
                    <span style={{ color: "#1db954", marginRight: "8px" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <a
                href="https://paystack.shop/pay/family-cyber-chaperone"
                target="_blank"
                rel="noopener noreferrer"
                className="ebw-btn-green"
                style={{ display: "block", textAlign: "center" }}
              >
                Subscribe — R250/month
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY / AS SEEN ON ─────────────────────────────────────── */}
      <section style={{ background: "#0d1117", padding: "64px 24px", color: "#ffffff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <h2 className="ebw-heading" style={{ fontSize: "clamp(22px, 2.5vw, 32px)", marginBottom: "8px" }}>
            Trusted by Thousands Across South Africa
          </h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", margin: "20px 0 16px" }}>
            <img src={TIMES_LOGO} alt="Times Live" style={{ height: "28px", filter: "brightness(0) invert(1)", opacity: 0.7 }} />
          </div>
          <p style={{ color: "#9ca3af", fontSize: "14px", fontStyle: "italic", marginBottom: "52px" }}>
            "Safety 'Chaperone' Tracks Travellers After Kidnap, revolutionising travel safety."
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "28px 24px", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                  <img src={t.photo} alt={t.name} style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  <span className="ebw-subheading" style={{ fontSize: "14px", color: "#f9fafb" }}>{t.name}</span>
                </div>
                <p style={{ color: "#d1d5db", fontSize: "14px", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                  "{t.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section style={{ background: "#ffffff", padding: "72px 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2 className="ebw-heading" style={{ fontSize: "clamp(24px, 3vw, 36px)", textAlign: "center", marginBottom: "48px", color: "#0d1117" }}>
            Your Questions, Answered.
          </h2>
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
          <div style={{ textAlign: "center", marginTop: "36px" }}>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>Still have questions?</p>
            <a
              href="https://www.facebook.com/eblockwatchnational/reviews"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1db954", fontWeight: 600, textDecoration: "none", fontSize: "15px" }}
            >
              Contact Us →
            </a>
          </div>
        </div>
      </section>

      {/* ── REGISTRATION FORM ───────────────────────────────────────────── */}
      <section id="apply-now" style={{ background: "#f7f7f7", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 className="ebw-heading" style={{ fontSize: "clamp(24px, 3vw, 36px)", textAlign: "center", marginBottom: "12px", color: "#0d1117" }}>
            Join Cyber Chaperone for Free Today!
          </h2>
          <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "40px", fontSize: "15px" }}>
            Fill in your details below and one of our eblockwatch safety specialists will be in touch with you.
          </p>

          {formState === "success" ? (
            <div style={{ background: "#ffffff", borderRadius: "12px", padding: "48px 36px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <h3 className="ebw-subheading" style={{ fontSize: "22px", color: "#0d1117", marginBottom: "12px" }}>THANK YOU</h3>
              <p style={{ color: "#4b5563", marginBottom: "28px", lineHeight: 1.6 }}>
                One of our eblockwatch Safety Specialists will be in touch shortly.
              </p>
              <p style={{ color: "#4b5563", marginBottom: "24px", fontSize: "15px" }}>Want to get started right away?</p>
              <a
                href="https://wa.me/27825611065?text=Hi%20I%20just%20registered%20for%20Cyber%20Chaperone"
                target="_blank"
                rel="noopener noreferrer"
                className="ebw-btn-green"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}
              >
                <WhatsAppIcon />
                Chat with AI Arnie on WhatsApp
              </a>
              <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "28px", paddingTop: "24px" }}>
                <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "12px" }}>Want to pay right away? Please use one of the links below.</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  <a href="https://paystack.shop/pay/cyber-chaperone" target="_blank" rel="noopener noreferrer" style={{ color: "#1db954", fontSize: "14px", fontWeight: 600 }}>
                    Subscribe to Individual Plan →
                  </a>
                  <a href="https://paystack.shop/pay/family-cyber-chaperone" target="_blank" rel="noopener noreferrer" style={{ color: "#1db954", fontSize: "14px", fontWeight: 600 }}>
                    Subscribe to Family Plan →
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: "#ffffff", borderRadius: "12px", padding: "40px 36px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                    First Name *
                  </label>
                  <input name="first_name" required className="ebw-form-field" placeholder="First Name" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                    Last Name *
                  </label>
                  <input name="last_name" required className="ebw-form-field" placeholder="Last Name" />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Mobile Number * <span style={{ color: "#6b7280", fontWeight: 400 }}>(WhatsApp — international format, e.g. +27 82 561 1065)</span>
                </label>
                <input name="mobile" type="tel" required className="ebw-form-field" placeholder="+27 82 XXX XXXX" />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Email Address
                </label>
                <input name="email" type="email" className="ebw-form-field" placeholder="your@email.com" />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Province
                </label>
                <select name="province" className="ebw-form-field">
                  <option value="">Please Select a Province</option>
                  {["Eastern Cape", "Free State", "Gauteng", "Kwazulu-Natal", "Limpopo", "Mpumalanga", "North-West", "Northern Cape", "Western Cape"].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Please Select a Plan
                </label>
                <select
                  name="membership_type"
                  className="ebw-form-field"
                  value={membershipType}
                  onChange={e => setMembershipType(e.target.value)}
                >
                  <option value="">Please Select a Plan</option>
                  <option value="Entry Level">Free — Entry Level</option>
                  <option value="Single Membership">Individual — R150/month (just you)</option>
                  <option value="Family Membership">Family — R250/month (up to 5 members)</option>
                </select>
              </div>

              {/* ── ICE Contact — Individual plan only ────────────────── */}
              {isIndividual && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "16px 18px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#166534", marginBottom: "4px" }}>
                    🆘 ICE Contact — In Case of Emergency
                  </div>
                  <p style={{ fontSize: "12px", color: "#4b7c55", margin: "0 0 14px" }}>
                    Who should Andre contact if we can't reach you? This is your safety net. On the Family Plan, your family members automatically become each other's ICE contacts.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>ICE Contact Name</label>
                      <input name="ice_contact_name" className="ebw-form-field" placeholder="e.g. Johan Smit" />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>ICE WhatsApp Number</label>
                      <input name="ice_contact_phone" type="tel" className="ebw-form-field" placeholder="+27 82 000 0000" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Family members section ─────────────────────────────── */}
              {isFamily && (
                <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "10px", padding: "16px 18px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#1d4ed8", marginBottom: "4px" }}>
                    🏠 Family Members (up to 4 more)
                  </div>
                  <p style={{ fontSize: "12px", color: "#3b5fc0", margin: "0 0 14px" }}>
                    Add each family member below. Each person will receive a personalised WhatsApp welcome message and can log into the Member Portal individually. Family members automatically become each other's ICE contacts — no separate contact needed.
                  </p>
                  {familyMembers.map((fm, idx) => (
                    <div key={idx} style={{ background: "#fff", borderRadius: "8px", padding: "14px", marginBottom: "10px", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", marginBottom: "10px" }}>
                        Family Member {idx + 1}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>First Name</label>
                          <input
                            className="ebw-form-field"
                            placeholder="First Name"
                            value={fm.first_name}
                            onChange={e => updateFamilyMember(idx, "first_name", e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Last Name</label>
                          <input
                            className="ebw-form-field"
                            placeholder="Last Name"
                            value={fm.last_name}
                            onChange={e => updateFamilyMember(idx, "last_name", e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>WhatsApp Number</label>
                        <input
                          type="tel"
                          className="ebw-form-field"
                          placeholder="+27 82 XXX XXXX"
                          value={fm.mobile}
                          onChange={e => updateFamilyMember(idx, "mobile", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  {familyMembers.length < 4 && (
                    <button
                      type="button"
                      onClick={() => setFamilyMembers(prev => [...prev, EMPTY_FAMILY_MEMBER()])}
                      style={{ background: "none", border: "1px dashed #93c5fd", borderRadius: "8px", color: "#1d4ed8", padding: "10px 16px", fontSize: "13px", cursor: "pointer", width: "100%", fontWeight: 600 }}
                    >
                      + Add Another Family Member
                    </button>
                  )}
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Select your Security Provider
                </label>
                <select name="security_provider" className="ebw-form-field">
                  <option value="">Select your Security Provider</option>
                  {["Fidelity", "ADT", "CAP", "Beagle 24/7", "Thompsons", "TRSS", "Reaction", "None", "Other"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Select your Fire Reaction Service
                </label>
                <select name="fire_reaction_service" className="ebw-form-field">
                  <option value="">Select your Fire Reaction Service</option>
                  {["Secure Fire", "Thompsons Fire", "None", "Other"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Select your Car Tracker Provider
                </label>
                <select name="car_track_provider" className="ebw-form-field">
                  <option value="">Select your Car Tracker Provider</option>
                  {["Secure Drive", "Car Track", "Tracker", "Netstar", "Matrix", "Ctrack", "None", "Other"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Select your Industry
                </label>
                <select name="industry" className="ebw-form-field">
                  <option value="">Select your Industry</option>
                  {["Farming / Agriculture", "Education", "Healthcare / Medical", "Security / Law Enforcement", "Construction / Trades", "Retail / Hospitality", "Transport / Logistics", "IT / Tech", "Finance / Business Services", "Other"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "28px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  required
                  style={{ marginTop: "3px", flexShrink: 0, width: "16px", height: "16px", accentColor: "#1db954" }}
                />
                <label htmlFor="consent" style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.5, cursor: "pointer" }}>
                  By checking this box I consent to eblockwatch using my information to contact me regarding community safety in general.
                </label>
              </div>

              <button
                type="submit"
                className="ebw-btn-green"
                disabled={formState === "submitting"}
                style={{ width: "100%", opacity: formState === "submitting" ? 0.7 : 1, fontSize: "16px", padding: "14px" }}
              >
                {formState === "submitting" ? "Submitting…" : "Join Cyber Chaperone for Free"}
              </button>

              {formState === "error" && (
                <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
                  Oops! Something went wrong while submitting the form. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="ebw-section-dark" style={{ padding: "52px 24px 36px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "40px" }}>
            <div>
              <img src={LOGO} alt="eblockwatch" style={{ height: "40px", marginBottom: "20px" }} />
              <p style={{ color: "#9ca3af", fontSize: "14px", lineHeight: 1.7, maxWidth: "360px" }}>
                eblockwatch Cyber Chaperone gives you real-time travel safety monitoring and a trusted community network. Free for all members. South Africa's safety companion since 2001.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p className="ebw-subheading" style={{ color: "#f9fafb", fontSize: "15px", marginBottom: "4px" }}>Contact</p>
              <p style={{ color: "#9ca3af", fontSize: "14px" }}>Andre Snyman – 082 561 1065</p>
              <a href="mailto:info@eblockwatch.co.za" style={{ color: "#9ca3af", fontSize: "14px", textDecoration: "none" }}>info@eblockwatch.co.za</a>
              <a
                href="https://www.facebook.com/eblockwatchnational/reviews"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1db954", fontSize: "14px", textDecoration: "none" }}
              >
                Facebook Reviews →
              </a>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>
              Copyright © 2024 eblockwatch | All Rights Reserved
            </p>
            <a href="#" style={{ color: "#6b7280", fontSize: "13px", textDecoration: "none" }}>
              Terms and Conditions
            </a>
          </div>
        </div>
      </footer>

      {/* ── AI ARNIE CHAT WIDGET ─────────────────────────────────────────── */}
      <AiArnieChat />
    </div>
  );
}
