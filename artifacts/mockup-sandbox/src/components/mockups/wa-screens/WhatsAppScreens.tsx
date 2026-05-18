
const GREEN = "#25D366";
const GREEN_DARK = "#128C7E";
const BUBBLE_IN = "#FFFFFF";
const BUBBLE_OUT = "#D9FDD3";
const TIME_COLOR = "#8696A0";

function Bubble({ text, from, time = "" }: { text: string; from: "member" | "system"; time?: string }) {
  const isSystem = from === "system";
  return (
    <div style={{ display: "flex", justifyContent: isSystem ? "flex-start" : "flex-end", marginBottom: 2, padding: "0 6px" }}>
      <div style={{
        position: "relative",
        background: isSystem ? BUBBLE_IN : BUBBLE_OUT,
        borderRadius: isSystem ? "0 10px 10px 10px" : "10px 0 10px 10px",
        padding: "6px 42px 14px 8px",
        maxWidth: "88%",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        fontSize: 11.5,
        lineHeight: 1.45,
        color: "#111",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        <div style={{
          position: "absolute", top: 0,
          ...(isSystem ? { left: -6 } : { right: -6 }),
          width: 0, height: 0, borderStyle: "solid",
          borderWidth: isSystem ? "0 7px 9px 0" : "0 0 9px 7px",
          borderColor: isSystem
            ? `transparent ${BUBBLE_IN} transparent transparent`
            : `transparent transparent transparent ${BUBBLE_OUT}`,
        }} />
        {text}
        {time && <span style={{ position: "absolute", bottom: 3, right: 5, fontSize: 9.5, color: TIME_COLOR, whiteSpace: "nowrap" }}>{time}{from === "member" && <span style={{ color: GREEN_DARK }}> ✓✓</span>}</span>}
      </div>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", background: color + "18", color, border: `1px solid ${color}40`, borderRadius: 4, fontSize: 9.5, fontWeight: 700, padding: "1px 5px", marginRight: 4 }}>
      {label}
    </span>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", margin: "8px 6px 5px", gap: 6 }}>
      <div style={{ flex: 1, height: 1, background: "#ddd" }} />
      <div style={{ fontSize: 9.5, color: "#999", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: "#ddd" }} />
    </div>
  );
}

function Phone({ title, subtitle, accentColor = GREEN_DARK, children }: { title: string; subtitle: string; accentColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 300, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.09)", border: "1px solid #e8e8e8", flexShrink: 0 }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E9EDEF", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/eblockwatch-logo.png" alt="" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 16 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: "#111" }}>Cyber Chaperone</div>
          <div style={{ fontSize: 10, color: accentColor }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ background: accentColor, padding: "4px 12px" }}>
        <div style={{ color: "#fff", fontSize: 10.5, fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ background: "#F0F2F5", padding: "4px 0 10px", flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function Insight({ icon, title, body, tag, tagColor = "#1565C0" }: { icon: string; title: string; body: string; tag?: string; tagColor?: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "1px solid #F0F0F0" }}>
      <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{title}</div>
          {tag && <Tag label={tag} color={tagColor} />}
        </div>
        <div style={{ fontSize: 11, color: "#444", lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

function Rule({ n, title, what, howNow, howShouldBe }: { n: number; title: string; what: string; howNow: string; howShouldBe: string }) {
  return (
    <div style={{ borderRadius: 10, border: "1px solid #e8e8e8", overflow: "hidden", marginBottom: 12 }}>
      <div style={{ background: "#1a1f2e", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{n}</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{title}</div>
      </div>
      <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>What members actually do</div>
          <div style={{ fontSize: 11, color: "#333", lineHeight: 1.5 }}>{what}</div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>What it did / should do</div>
          <div style={{ fontSize: 11, color: "#333", lineHeight: 1.5, marginBottom: 6 }}>
            <span style={{ color: "#B71C1C" }}>Was: </span>{howNow}
          </div>
          <div style={{ fontSize: 11, color: "#333", lineHeight: 1.5 }}>
            <span style={{ color: GREEN_DARK, fontWeight: 600 }}>Should: </span>{howShouldBe}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppScreens() {
  return (
    <div style={{ fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif", background: "#FAFAFA", minHeight: "100vh", padding: "24px 24px 60px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <img src="/eblockwatch-logo.png" alt="eblockwatch" style={{ width: 42, height: 42, objectFit: "contain" }} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#111" }}>Behavioral Model — From Real Conversations</div>
          <div style={{ fontSize: 12, color: "#666" }}>Extracted from 24 live pilot sessions · André Snyman + Kieren Snyman · May 2026</div>
        </div>
      </div>

      <div style={{ marginBottom: 20, padding: "10px 14px", background: "#EFF8F0", border: "1px solid #A5D6A7", borderRadius: 8, fontSize: 11.5, color: "#2E7D32", maxWidth: 960 }}>
        This is the system's teaching document. Every pattern here came from real WhatsApp sessions — not imagination. The goal: build a system that speaks and listens the way real people do.
      </div>

      {/* ─── SECTION 1: REAL CONVERSATION PANELS ──────────────────── */}
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 12, marginTop: 4 }}>Real pilot conversations — annotated</div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap" }}>

        {/* ── Panel A: André's natural language trip starts ─── */}
        <Phone title="André — Natural language trip starts" subtitle="Founder testing · May 4 2026" accentColor={GREEN_DARK}>
          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#E8F5E9", borderLeft: "3px solid #4CAF50", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#2E7D32" }}>
            ✅ This is André's natural format. One sentence. No menu. System parses it completely.
          </div>
          <Bubble from="member" text="TEST LIVE — Leaving Fourways now heading to Rosebank Mall. ETA 14:40." time="12:16" />
          <Bubble from="system" text={`✅ Trip started, André.\n\nFourways → Rosebank Mall · ETA 14:40\n\nI'm watching. Reply 5 when you arrive.\nReply 10 for emergency.`} time="12:16" />
          <Bubble from="member" text="ETA changed to 15:00. Traffic is slower than expected." time="14:12" />
          <Bubble from="system" text={`Got it — updated ETA to 15:00. 🕐\n\nStill with you.`} time="14:12" />
          <Bubble from="member" text="I have arrived safely at Rosebank Mall." time="14:58" />
          <Bubble from="system" text={`🎉 Arrived! Rosebank Mall ✅\n\nTrip closed. Well done, André.\nSee you on the next one. 🛡️`} time="14:58" />

          <Divider label="Second trip in same session" />

          <Bubble from="member" text="Leaving Fourways now heading to Sandton City. ETA 15:30." time="13:03" />
          <Bubble from="system" text={`✅ New trip, André.\n\nFourways → Sandton City · ETA 15:30\n\nReply 5 on arrival. Reply 10 for help.`} time="13:03" />
          <Bubble from="member" text="I need help." time="13:04" />
          <Bubble from="system" text={`🚨 André — sending RED alert.\n\nAndré has been notified immediately.\nICE contact is being reached.\n\nStay where you are if safe to do so.`} time="13:04" />

          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#FFF3E0", borderLeft: "3px solid #FF9800", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#E65100" }}>
            💡 LESSON: André uses full natural language and expects instant recognition. No menu steps needed for the experienced member.
          </div>
        </Phone>

        {/* ── Panel B: Kieren's repeated loop ── */}
        <Phone title="Kieren — The loop that repeated 4× " subtitle="First real member · May 4 2026 · 19:50" accentColor="#B71C1C">
          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#FFEBEE", borderLeft: "3px solid #F44336", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#B71C1C" }}>
            🚨 This exact sequence repeated 4 times. Kieren got no confirmation. The system was silent.
          </div>
          <Bubble from="member" text="Hi" time="19:50" />
          <Bubble from="member" text="5" time="19:50" />
          <Bubble from="member" text="1" time="19:50" />
          <Bubble from="member" text="Durban Oyster Box" time="19:50" />
          <Bubble from="member" text="ETA 19:30" time="19:50" />
          <Bubble from="member" text="ETA 19:30" time="19:51" />
          <div style={{ margin: "4px 8px", padding: "4px 8px", background: "#FCE4EC", borderRadius: 6, fontSize: 10, color: "#880E4F" }}>
            ⬆️ Silence from system. So Kieren tried the same thing again. And again. And again.
          </div>
          <Bubble from="member" text="update" time="19:51" />
          <Bubble from="member" text="1" time="19:51" />
          <Bubble from="member" text="check" time="19:51" />
          <Bubble from="member" text="hello" time="19:52" />
          <Bubble from="member" text="HELP" time="19:53" />
          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#FFF3E0", borderLeft: "3px solid #FF9800", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#E65100" }}>
            💡 LESSON 1: Every trip start MUST send a clear confirmation. If the member doesn't get "✅ Trip started, Kieren" — they'll keep trying.{"\n\n"}💡 LESSON 2: "update", "check", "status check", "any update" must return the current trip status — not silence.{"\n\n"}💡 LESSON 3: Kieren pressed 5 thinking it was "start trip #5 option" — but 5 is "I have arrived". Menu numbers must be obvious.
          </div>
        </Phone>

        {/* ── Panel C: Waze link + AI ETA ── */}
        <Phone title="André — Waze link + AI ETA request" subtitle="Advanced tester · May 5–6 2026" accentColor="#6A1B9A">
          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#F3E5F5", borderLeft: "3px solid #9C27B0", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#6A1B9A" }}>
            André started sharing his Waze ETA links directly. The system needs to parse these.
          </div>
          <Bubble from="member" text="0" time="06:18" />
          <Bubble from="member" text="5" time="06:18" />
          <Bubble from="member" text="1" time="06:18" />
          <Bubble from="member" text="Bloemfontein" time="06:19" />
          <Bubble from="member" text="Yes" time="06:19" />
          <Bubble from="member" text={`I'm using Waze to drive to Bloemfontein, FS, arriving at 12:10. Watch my drive in real-time on the Waze app.`} time="06:19" />

          <Divider label="André's comment on what should happen" />

          <Bubble from="member" text="5" time="05:18" />
          <Bubble from="member" text="1" time="05:18" />
          <Bubble from="member" text="Durban" time="05:18" />
          <Bubble from="member" text={`This is where AI should calculate the route and get an ETA and the...`} time="05:18" />

          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#F3E5F5", borderLeft: "3px solid #9C27B0", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#4A148C" }}>
            💡 LESSON: André shared a Waze link — system should parse: destination="Bloemfontein, FS", ETA="12:10". Auto-confirm trip without further questions.{"\n\n"}💡 LESSON: When member types a destination only (no ETA), system should say: "Calculating your route to Durban... what time do you expect to arrive?" OR use OSRM to estimate it.
          </div>

          <Divider label="The home address session" />
          <Bubble from="member" text="Home" time="09:52" />
          <Bubble from="member" text={`College Road is my home. Best you get claude and ChatGPT to add this to the CRM so that the system can remember it.`} time="09:52" />
          <div style={{ margin: "6px 8px 4px", padding: "5px 8px", background: "#E8EAF6", borderLeft: "3px solid #3F51B5", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#1A237E" }}>
            💡 LESSON: Members type "Home" as their departure. System needs to resolve this to their saved home address OR ask them to save one if not set. Natural language address saving ("College Road is my home") should be handled.
          </div>
        </Phone>

        {/* ── Panel D: Kieren exploring all menus ── */}
        <Phone title="Kieren — Learning the system" subtitle="Exploring every menu option · May 5 2026 · 17:12" accentColor="#1565C0">
          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#E3F2FD", borderLeft: "3px solid #1976D2", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#0D47A1" }}>
            Kieren went through every single menu option (0–10) systematically. She was learning what exists. This is what onboarding should prevent.
          </div>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <div key={n} style={{ display: "flex", gap: 4, padding: "1px 6px" }}>
              <Bubble from="member" text={`${n}`} time="17:12" />
            </div>
          ))}
          <div style={{ margin: "8px 8px 2px", padding: "5px 8px", background: "#E3F2FD", borderLeft: "3px solid #1976D2", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#0D47A1" }}>
            💡 LESSON: A member who systematically sends 0,1,2,3...10 is doing your job for you. They don't know what the options do. The Getting Started Guide (reply 9) should be sent automatically on first interaction — not hidden behind a menu number.
          </div>
        </Phone>

      </div>

      {/* ─── SECTION 2: BEHAVIORAL RULES ──────────────────────────── */}
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 14 }}>Behavioral rules — extracted from real data</div>

      <div style={{ maxWidth: 960 }}>
        <Rule
          n={1}
          title="Always confirm trip start — immediately and clearly"
          what={`Kieren sent "Hi → 5 → 1 → Durban → ETA 19:30" four times in a row. The system gave no clear confirmation. She didn't know if the trip had registered.`}
          howNow="System may have confirmed, but the message wasn't clear or was missed."
          howShouldBe={`Send "✅ Trip started, Kieren — Durban · ETA 19:30. I'm watching. Reply 5 when you arrive." Within 3 seconds of trip registration. Make it unmistakable.`}
        />
        <Rule
          n={2}
          title="Handle status checks mid-trip"
          what={`Kieren sent "update", "check", "status check", "any update" repeatedly. André asked "Running late, any update?" These are real members checking in.`}
          howNow="These messages hit the default fallback handler and probably returned the main menu — useless."
          howShouldBe={`Detect "update", "check", "status", "any update", "where am I" → return current trip: "Your trip to Durban is active. ETA 19:30. You're at [checkpoint]. Reply 5 to close."`}
        />
        <Rule
          n={3}
          title="Parse Waze share links as trip starts"
          what={`André shared Waze links: "I'm using Waze to drive to Bloemfontein, FS, arriving at 12:10." — he expected the system to read these.`}
          howNow="System ignored the Waze text and asked for destination again."
          howShouldBe={`Parse Waze link text: extract destination + ETA. Confirm: "✅ Waze trip to Bloemfontein · ETA 12:10. I've got it — reply 5 on arrival."`}
        />
        <Rule
          n={4}
          title="Send the Getting Started Guide automatically on first message"
          what={`Kieren's first ever message was "Hi". She then pressed every menu number (1–10) trying to figure out what things do. Kieren and André both went through this learning phase.`}
          howNow="Getting Started Guide is hidden behind reply 9 — nobody finds it unless told."
          howShouldBe={`On first message from a new member, lead with a short welcome + single sentence summary, then immediately offer: "Reply 9 for your Getting Started Guide — it takes 1 minute to read."`}
        />
        <Rule
          n={5}
          title="Save home address from natural language"
          what={`André typed "College Road is my home." He expected this to be saved. He also typed "Home" as his departure, expecting it to resolve.`}
          howNow="No natural language address saving. 'Home' as departure didn't resolve to anything useful."
          howShouldBe={`Detect "X is my home address" → save to member profile. Detect "Home" as departure → resolve to saved home, or ask "You haven't saved a home address yet — what is it?"`}
        />
        <Rule
          n={6}
          title="Natural language trip start is the primary path — not the menu"
          what={`André settled on "Leaving X now heading to Y. ETA Z." as his natural format. He used this reliably across multiple sessions. It's faster than any menu.`}
          howNow="The freeform parser handles this, but it's not advertised. Members don't know they can type naturally."
          howShouldBe={`In the Getting Started Guide, show the natural format first: "The fastest way to start a trip: just tell us where you're going. Example: Leaving Joburg heading to Pretoria, ETA 15:30."`}
        />
      </div>

      {/* ─── SECTION 3: VOICE + TONE MODEL ──────────────────── */}
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 12, marginTop: 8 }}>André's voice — what the real messages teach us</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 960 }}>
        {[
          {
            icon: "🗣️",
            title: "Confident and direct",
            example: `"Leaving Fourways now heading to Rosebank Mall. ETA 14:40."`,
            lesson: "No hedging. No filler. Get to the point. The system should respond the same way."
          },
          {
            icon: "📝",
            title: "One thought per line",
            example: `"ETA changed to 15:00.\nTraffic is slower than expected."`,
            lesson: "André separates his thoughts clearly. System replies should do the same — never block text."
          },
          {
            icon: "✅",
            title: "Arrival is formal and clear",
            example: `"I have arrived safely at Rosebank Mall."`,
            lesson: "He uses full words on important moments. The system should match — 'Arrived ✅' not just 'ok'"
          },
          {
            icon: "😤",
            title: "Frustration is a signal, not abuse",
            example: `"You need to work this out."`,
            lesson: "This is André saying the system failed him. Not anger at a person — a clear product note. Build what makes this sentence impossible."
          },
          {
            icon: "🧠",
            title: "He expects the system to be intelligent",
            example: `"This is where AI should calculate the route and get an ETA."`,
            lesson: "He doesn't want to spell things out. If he gives a destination, the system should get the ETA — not ask for it every time."
          },
          {
            icon: "🏠",
            title: "He wants memory",
            example: `"College Road is my home. Best you get Claude to add this to the CRM."`,
            lesson: "Members want the system to remember them. Name, home, common destinations. Build it once, use it forever."
          },
        ].map((item, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8e8", padding: "12px 14px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 5 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: "#888", fontStyle: "italic", marginBottom: 6, padding: "5px 8px", background: "#F9F9F9", borderRadius: 5, borderLeft: "2px solid #ddd" }}>{item.example}</div>
            <div style={{ fontSize: 11, color: "#444", lineHeight: 1.5 }}>{item.lesson}</div>
          </div>
        ))}
      </div>

      {/* ─── SECTION 4: REAL TRIP DESTINATIONS ──────────────── */}
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 10, marginTop: 24 }}>Real destinations used in pilot — system must handle these</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 960 }}>
        {[
          "Rosebank Mall", "Sandton City", "OR Tambo Airport", "Cape Town Waterfront",
          "The Oyster Box, Durban", "Melrose Arch", "Salt Rock KZN", "Nelspruit",
          "Bloemfontein", "Eaton Farm Witpoort, Midrand", "Bushbuck Ridge", "Hyde Park (stop)",
          "Durban", "Home (→ College Road)", "Airport", "Pretoria",
        ].map(d => (
          <div key={d} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#333" }}>
            📍 {d}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#888", maxWidth: 960 }}>
        These are the real places members use. Geocoding via Nominatim (SA) must resolve all of these. The system should never ask "could not find that location" — it should try harder.
      </div>

    </div>
  );
}
