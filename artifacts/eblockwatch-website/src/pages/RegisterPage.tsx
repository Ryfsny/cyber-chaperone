import { useState, useCallback } from "react";

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

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

type FormState = "idle" | "submitting" | "success" | "error";
interface FamilyMember { first_name: string; last_name: string; mobile: string }
const EMPTY_FAMILY_MEMBER = (): FamilyMember => ({ first_name: "", last_name: "", mobile: "" });

export default function RegisterPage() {
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
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  }

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif", color: "#111827", minHeight: "100vh", background: "#f7f7f7" }}>

      {/* NAV */}
      <nav className="ebw-nav" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <a href={`${BASE}/`}>
            <img src={LOGO} alt="eblockwatch" style={{ height: "40px", objectFit: "contain" }} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <a
              href={`${BASE}/login`}
              style={{ color: "#d1d5db", fontSize: "14px", textDecoration: "none", fontWeight: 600, padding: "9px 16px", border: "1px solid #374151", borderRadius: "8px" }}
            >
              Member Login
            </a>
          </div>
        </div>
      </nav>

      {/* FORM */}
      <section style={{ padding: "64px 24px 80px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h1 className="ebw-heading" style={{ fontSize: "clamp(24px, 3vw, 36px)", textAlign: "center", marginBottom: "12px", color: "#0d1117" }}>
            Join Cyber Chaperone for Free Today!
          </h1>
          <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "40px", fontSize: "15px" }}>
            Fill in your details below and one of our eblockwatch safety specialists will be in touch with you.
          </p>

          {formState === "success" ? (
            <div style={{ background: "#ffffff", borderRadius: "12px", padding: "48px 36px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <h2 className="ebw-subheading" style={{ fontSize: "22px", color: "#0d1117", marginBottom: "12px" }}>THANK YOU</h2>
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
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>First Name *</label>
                  <input name="first_name" required className="ebw-form-field" placeholder="First Name" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Last Name *</label>
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
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Email Address</label>
                <input name="email" type="email" className="ebw-form-field" placeholder="your@email.com" />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Province</label>
                <select name="province" className="ebw-form-field">
                  <option value="">Please Select a Province</option>
                  {["Eastern Cape", "Free State", "Gauteng", "Kwazulu-Natal", "Limpopo", "Mpumalanga", "North-West", "Northern Cape", "Western Cape"].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Please Select a Plan</label>
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

              {isIndividual && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "16px 18px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#166534", marginBottom: "4px" }}>
                    🆘 ICE Contact — In Case of Emergency
                  </div>
                  <p style={{ fontSize: "12px", color: "#4b7c55", margin: "0 0 14px" }}>
                    Who should Andre contact if we can't reach you? This is your safety net.
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

              {isFamily && (
                <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "10px", padding: "16px 18px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#1d4ed8", marginBottom: "4px" }}>
                    🏠 Family Members (up to 4 more)
                  </div>
                  <p style={{ fontSize: "12px", color: "#3b5fc0", margin: "0 0 14px" }}>
                    Add each family member below. Each person will receive a personalised WhatsApp welcome message.
                  </p>
                  {familyMembers.map((fm, idx) => (
                    <div key={idx} style={{ background: "#fff", borderRadius: "8px", padding: "14px", marginBottom: "10px", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", marginBottom: "10px" }}>Family Member {idx + 1}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>First Name</label>
                          <input className="ebw-form-field" placeholder="First Name" value={fm.first_name} onChange={e => updateFamilyMember(idx, "first_name", e.target.value)} />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Last Name</label>
                          <input className="ebw-form-field" placeholder="Last Name" value={fm.last_name} onChange={e => updateFamilyMember(idx, "last_name", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>WhatsApp Number</label>
                        <input type="tel" className="ebw-form-field" placeholder="+27 82 XXX XXXX" value={fm.mobile} onChange={e => updateFamilyMember(idx, "mobile", e.target.value)} />
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
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Select your Security Provider</label>
                <select name="security_provider" className="ebw-form-field">
                  <option value="">Select your Security Provider</option>
                  {["Fidelity", "ADT", "CAP", "Beagle 24/7", "Thompsons", "TRSS", "Reaction", "None", "Other"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Select your Fire Reaction Service</label>
                <select name="fire_reaction_service" className="ebw-form-field">
                  <option value="">Select your Fire Reaction Service</option>
                  {["Secure Fire", "Thompsons Fire", "None", "Other"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Select your Car Tracker Provider</label>
                <select name="car_track_provider" className="ebw-form-field">
                  <option value="">Select your Car Tracker Provider</option>
                  {["Secure Drive", "Car Track", "Tracker", "Netstar", "Matrix", "Ctrack", "None", "Other"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Select your Industry</label>
                <select name="industry" className="ebw-form-field">
                  <option value="">Select your Industry</option>
                  {SA_INDUSTRIES.map(v => (
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
                  Oops! Something went wrong. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ebw-section-dark" style={{ padding: "40px 24px 28px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <img src={LOGO} alt="eblockwatch" style={{ height: "36px", marginBottom: "16px" }} />
          <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 8px" }}>
            eblockwatch Cyber Chaperone · South Africa's safety companion since 2001
          </p>
          <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
            Copyright © 2026 eblockwatch | All Rights Reserved · POPIA compliant
          </p>
        </div>
      </footer>
    </div>
  );
}
