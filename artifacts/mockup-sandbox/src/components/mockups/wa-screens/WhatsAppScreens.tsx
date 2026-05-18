
// Clean light WhatsApp UI — white background, green accents, eblockwatch logo

const GREEN = "#25D366";
const GREEN_DARK = "#128C7E";
const BUBBLE_IN = "#FFFFFF";
const BUBBLE_OUT = "#D9FDD3";
const CHAT_BG = "#F0F2F5";
const HEADER_BG = "#FFFFFF";
const TIME_COLOR = "#8696A0";
const DIVIDER_BG = "#E1E8ED";

// Render *bold* markdown
function renderText(s: string) {
  return s.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*")
      ? <strong key={i} style={{ fontWeight: 600 }}>{part.slice(1, -1)}</strong>
      : <span key={i}>{part}</span>
  );
}

type Dir = "in" | "out";

function Bubble({ text, dir, time = "09:41" }: { text: string; dir: Dir; time?: string }) {
  const isIn = dir === "in";
  return (
    <div style={{ display: "flex", justifyContent: isIn ? "flex-start" : "flex-end", marginBottom: 3, padding: "0 8px" }}>
      <div style={{
        position: "relative",
        background: isIn ? BUBBLE_IN : BUBBLE_OUT,
        borderRadius: isIn ? "0 12px 12px 12px" : "12px 0 12px 12px",
        padding: "8px 52px 18px 10px",
        maxWidth: "82%",
        boxShadow: "0 1px 2px rgba(0,0,0,0.10)",
        fontSize: 14,
        lineHeight: 1.5,
        color: "#111",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {/* Bubble tail */}
        <div style={{
          position: "absolute", top: 0,
          ...(isIn ? { left: -7 } : { right: -7 }),
          width: 0, height: 0, borderStyle: "solid",
          borderWidth: isIn ? "0 8px 10px 0" : "0 0 10px 8px",
          borderColor: isIn
            ? `transparent ${BUBBLE_IN} transparent transparent`
            : `transparent transparent transparent ${BUBBLE_OUT}`,
        }} />
        {renderText(text)}
        <span style={{
          position: "absolute", bottom: 5, right: 8,
          fontSize: 11, color: TIME_COLOR, whiteSpace: "nowrap",
          display: "flex", alignItems: "center", gap: 2,
        }}>
          {time}
          {!isIn && <span style={{ color: GREEN_DARK, fontSize: 13 }}>✓✓</span>}
        </span>
      </div>
    </div>
  );
}

function FlowLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 8px" }}>
      <div style={{
        background: DIVIDER_BG, borderRadius: 8,
        padding: "3px 12px", fontSize: 11.5, color: "#667781",
        textAlign: "center", lineHeight: 1.5,
      }}>
        <strong style={{ fontWeight: 600 }}>{label}</strong>
        {sub && <span style={{ color: "#999" }}> · {sub}</span>}
      </div>
    </div>
  );
}

type Flow = { label: string; sub?: string; msgs: { text: string; dir: Dir; time?: string }[] };

const flows: Flow[] = [
  {
    label: "First Contact",
    sub: "Member sends Hi",
    msgs: [
      { dir: "out", text: "Hi", time: "09:00" },
      { dir: "in", time: "09:00", text: `🛡️ *eblockwatch — Cyber Chaperone*

Hi Kieren. I'm Arnie — André Snyman's digital safety companion.
We have one job: get you there safely, every time.

⭕ Status: Not yet a member

0️⃣  Join eblockwatch — it's free
1️⃣  Cyber Chaperone 🛡️
2️⃣  What is eblockwatch?
3️⃣  Membership options
4️⃣  Activate my membership
5️⃣  👤 My Account
6️⃣  eblockshop
7️⃣  Speak to a person
8️⃣  📣 Invite a Friend
9️⃣  📖 Getting Started Guide

🚨 *EMERGENCY? Reply 10*

📺 New here? See what we do:
https://fb.com/share/v/1ACByM44QZ` },
    ],
  },
  {
    label: "Returning Verified Member",
    sub: "Replies 0 or Hi",
    msgs: [
      { dir: "out", text: "0", time: "09:05" },
      { dir: "in", time: "09:05", text: `🛡️ *eblockwatch — Cyber Chaperone*

Hi Kieren. Welcome back.

✅ Verified member — Individual plan

1️⃣  Cyber Chaperone 🛡️
2️⃣  What is eblockwatch?
3️⃣  Membership options
4️⃣  Activate my membership
5️⃣  👤 My Account
6️⃣  eblockshop
7️⃣  Speak to a person
8️⃣  📣 Invite a Friend
9️⃣  📖 Getting Started Guide

🚨 *EMERGENCY? Reply 10*
Reply 0 any time to return here.

👥 47 members watching your area.` },
    ],
  },
  {
    label: "Cyber Chaperone Menu",
    sub: "Replies 1",
    msgs: [
      { dir: "out", text: "1", time: "09:10" },
      { dir: "in", time: "09:10", text: `🛡️ *Cyber Chaperone — Kieren*

Your WhatsApp connection to the eblockwatch Situation Room.
In your safe zone, we're here. When you roam — kick-start your trip.

─── 🏠 In your safe zone ───
8️⃣  I need help 🆘
9️⃣  Speak to André / Situation Room

─── 🚗 On the road ───
1️⃣  Start a monitored drive
2️⃣  I'm going out — clock me in when I'm home
3️⃣  Update my current trip
4️⃣  Change my destination
5️⃣  I have arrived safely ✅

6️⃣  How Cyber Chaperone works

Reply 0 for Main Menu.` },
    ],
  },
  {
    label: "How Cyber Chaperone Works",
    sub: "Replies 6",
    msgs: [
      { dir: "out", text: "6", time: "09:11" },
      { dir: "in", time: "09:11", text: `Kieren, *Cyber Chaperone* keeps you connected to eblockwatch.

eblockwatch has been keeping South Africans safe for over 20 years.
We are always watching. You are never alone.

─── 🏠 At home ───
We are here whenever you need us.
Someone is always watching the Situation Room.

─── 🚗 When you drive ───
Tell us where you are going and when you will arrive.
If you don't arrive on time — we message you.
If you don't reply — we call your emergency contact.

─── 🌙 Going out for the evening ───
Tell us what time you will be home.
When you are back, reply *SAFE*.
If we do not hear from you — we act.

─── 🆘 Emergency ───
Reply *HELP* or *10* at any time.
A real person will respond immediately.

Reply 0 to go back.` },
    ],
  },
  {
    label: "Getting Started Guide",
    sub: "Replies 9",
    msgs: [
      { dir: "out", text: "9", time: "09:12" },
      { dir: "in", time: "09:12", text: `📖 *Getting Started with eblockwatch*

Watch the 2-minute intro first 👇
https://fb.com/share/v/1ACByM44QZ

━━━━━━━━━━━━━━━━━━━━
1️⃣  *Join eblockwatch* — it's free. Reply 0.

2️⃣  *Add your emergency contact*
   Reply 5 → My Account → Update ICE contact.
   This is the person we call if we cannot reach you.

3️⃣  *Activate your membership*
   R150/mo Individual or R250/mo Family.

4️⃣  *Use Cyber Chaperone when you go out*
   Reply 1. Tell us where you're going.

5️⃣  *Invite someone you care about*
   Reply 8.
━━━━━━━━━━━━━━━━━━━━

*How we look after you* 🛡️

We never jump straight to the last step.

🟢😊 *Level 1 — We message you*
You reply. All good. GREEN.

🟠😟 *Level 2 — We contact your emergency person*
You stopped replying. AMBER.

🔴💥 *Level 3 — We widen the circle*
Local → national → international. RED.

*Don't push us to RED.*
Just reply to our messages to stay GREEN.
But if it ever comes to RED — we will find you.

⚠️ *Your profile is what makes this work.*
Add your address, area, and emergency contact.
━━━━━━━━━━━━━━━━━━━━
André is watching. You are never alone. 🛡️` },
    ],
  },
  {
    label: "Starting a Monitored Drive",
    sub: "CC Menu → 1",
    msgs: [
      { dir: "out", text: "1", time: "14:00" },
      { dir: "in", time: "14:00", text: `Kieren, are you starting from Home 🏠?

1. Yes — start from Home 🏠
2. No — I am somewhere else

Or share your location pin 📍

Reply 0 for Main Menu.` },
      { dir: "out", text: "1", time: "14:01" },
      { dir: "in", time: "14:01", text: `Got it — starting from Home 🏠.

Where are you heading today?

Reply 0 for Main Menu.` },
      { dir: "out", text: "Pretoria", time: "14:01" },
      { dir: "in", time: "14:02", text: `Got it — heading to *Pretoria*.

What time do you expect to arrive? (e.g. 15:30)

Reply 0 for Main Menu.` },
      { dir: "out", text: "15:30", time: "14:02" },
      { dir: "in", time: "14:02", text: `✅ *Trip started — you are covered!*

Kieren → Pretoria
ETA: 15:30 · Drive time: ~1h 20min

We will check in along the route.
If you don't arrive by 15:30 — we will message you.

Safe travels. 🛡️

Reply *5* when you arrive.
Reply *10* at any time for emergency.` },
    ],
  },
  {
    label: "Checkpoint Ping — Mid Route",
    sub: "Auto-sent by scheduler",
    msgs: [
      { dir: "in", time: "14:42", text: `Kieren 👋 Cyber Chaperone — *Midrand* checkpoint.

You should be at or near *Midrand* on your way to *Pretoria*.

1. ✅ Yes — passing through now
2. 🕐 Not yet — running behind
3. 📍 Somewhere else — tell us where
4. 🆘 I need help

Reply 0 for Main Menu.` },
      { dir: "out", text: "1", time: "14:43" },
      { dir: "in", time: "14:43", text: `✅ *Midrand* — confirmed, you're on track!

Updated ETA to *Pretoria*: 15:28 (45 min to go).

We're still with you. Safe travels! 🛡️` },
    ],
  },
  {
    label: "ETA Reached — Arrival Check",
    sub: "🟢 Phase 1 · 0 min",
    msgs: [
      { dir: "in", time: "15:30", text: `Kieren, you should be near *Pretoria* by now.

Are you there and okay?

1. I have arrived safely
2. I am delayed
3. I will send my location pin
4. I need help

Reply 0 for Main Menu.` },
    ],
  },
  {
    label: "AMBER — No Reply After 10 Min",
    sub: "🟠 Phase 2",
    msgs: [
      { dir: "in", time: "15:40", text: `Kieren, we have not had your arrival confirmation yet.

You are overdue at *Pretoria*.

Please reply:

1. I am okay — I have arrived
2. I am delayed
3. Send location pin
4. I need help` },
    ],
  },
  {
    label: "RED — Escalated After 25 Min",
    sub: "🔴 Phase 3",
    msgs: [
      { dir: "in", time: "15:55", text: `Kieren, we have not had a reply after your expected arrival time.

You are *28 minutes* overdue at *Pretoria*.

Cyber Chaperone is escalating this for human attention.

Reply:
1. I am okay
4. I need help` },
    ],
  },
  {
    label: "Running Late",
    sub: "Replies 2 to any check",
    msgs: [
      { dir: "out", text: "2", time: "15:32" },
      { dir: "in", time: "15:32", text: `Understood — no rush.

What is your new ETA to *Pretoria*? (e.g. 16:00)

Reply 0 for Main Menu.` },
      { dir: "out", text: "16:15", time: "15:33" },
      { dir: "in", time: "15:33", text: `✅ ETA updated to 16:15. We will continue monitoring your trip.

Reply 0 for Main Menu.` },
    ],
  },
  {
    label: "Fuel / Rest Stop",
    msgs: [
      { dir: "out", text: "Fuel stop", time: "15:10" },
      { dir: "in", time: "15:10", text: `⛽ Fuel/rest stop noted. Take your time — we will pick up your trip when you are back on the road.

Reply 0 for Main Menu.` },
    ],
  },
  {
    label: "Roadblock",
    msgs: [
      { dir: "out", text: "Roadblock", time: "15:15" },
      { dir: "in", time: "15:15", text: `🚧 Roadblock noted. We are watching over you.

When you are through, just keep going — we will follow your journey from here.

Reply 0 for Main Menu.` },
    ],
  },
  {
    label: "Police Stop",
    msgs: [
      { dir: "out", text: "Pulled over", time: "15:20" },
      { dir: "in", time: "15:20", text: `🚔 Understood — pulled over. Stay calm.

We have quietly let your emergency contact know you are safe.

When you are back on the road, just continue — we are right here.

Reply 0 for Main Menu.` },
    ],
  },
  {
    label: "Arrived Safely",
    sub: "Replies 5 · Trip closed ✅",
    msgs: [
      { dir: "out", text: "5", time: "15:48" },
      { dir: "in", time: "15:48", text: `Kieren, you have arrived safely. Your Cyber Chaperone trip is now closed.

Thank you for travelling with us. Stay safe.` },
    ],
  },
  {
    label: "Safe Zone Clock-in — Setup",
    sub: "CC Menu → 2",
    msgs: [
      { dir: "out", text: "2", time: "19:00" },
      { dir: "in", time: "19:00", text: `Kieren, what time will you be home tonight? 🏠

Just send us the time.
For example: 11pm or 23:00

We will message you then to check you are safe.` },
      { dir: "out", text: "23:00", time: "19:01" },
      { dir: "in", time: "19:01", text: `✅ Done, Kieren.

We will message you at 23:00.
When you are home, just reply *SAFE*.

If we do not hear from you — we will contact someone.

Enjoy your evening 🌙` },
    ],
  },
  {
    label: "Clock-in — Deadline Ping",
    sub: "Auto-sent at 23:00",
    msgs: [
      { dir: "in", time: "23:00", text: `Hi Kieren 👋

Are you home safely?

Reply *SAFE* if yes.
Reply *10* if you need help.` },
      { dir: "out", text: "SAFE", time: "23:04" },
      { dir: "in", time: "23:04", text: `Good to hear, Kieren. 🏠

Sleep well. 🌙` },
    ],
  },
  {
    label: "Emergency — HELP or SOS",
    sub: "🔴 Any distress keyword",
    msgs: [
      { dir: "out", text: "HELP", time: "16:33" },
      { dir: "in", time: "16:33", text: `Kieren, I have alerted the Situation Room. Help is being arranged.

Stay where you are if possible.

Reply *10* at any time for immediate escalation.` },
    ],
  },
  {
    label: 'Emergency — Reply "10"',
    sub: "🔴 Immediate escalation",
    msgs: [
      { dir: "out", text: "10", time: "16:34" },
      { dir: "in", time: "16:34", text: `🚨 *Emergency — Situation Room alerted.*

Kieren, André and the eblockwatch team have been notified.

You are not alone. Help is on the way.

Stay on the line.` },
    ],
  },
  {
    label: "ICE Contact — Trip Overdue RED",
    sub: "Goes to Mary (emergency contact)",
    msgs: [
      { dir: "in", time: "15:58", text: `🆘 *eblockwatch Cyber Chaperone — URGENT*

Hi Mary,

You are the emergency contact for *Kieren Snyman*.

Kieren was due to arrive at Pretoria 28 minutes ago and has not responded.

📍 Last known location:
https://maps.google.com/?q=-25.7479,28.2293

Please contact Kieren now:
👉 wa.me/27833263751

André at eblockwatch is monitoring. Reply with any update.

— eblockwatch Cyber Chaperone` },
    ],
  },
  {
    label: "ICE Contact — Clock-in Overdue",
    sub: "Goes to Mary · T+40 min",
    msgs: [
      { dir: "in", time: "23:42", text: `Hi Mary,

This is eblockwatch. We look after *Kieren*.

Kieren was supposed to be home by 23:00.
We have tried to reach them. No reply.

Please check on them now.
Message them here:
👉 wa.me/27833263751

Reply if you need us to do more.

— eblockwatch` },
    ],
  },
  {
    label: "Operator Mirror — André's Phone",
    sub: "ETA / AMBER / RED alerts",
    msgs: [
      { dir: "in", time: "15:30", text: `⏰ CYBER CHAPERONE — ETA REACHED

Kieren should be arriving at Pretoria now.
Trip #42 — arrival check sent. Awaiting confirmation.` },
      { dir: "in", time: "15:42", text: `⚠️ CYBER CHAPERONE — AMBER

Kieren is 12min past ETA for Home → Pretoria.
Trip #42 → AMBER. No arrival confirmation yet.` },
      { dir: "in", time: "15:58", text: `🚨 RED — No arrival confirmation after ETA.

Member: Kieren · Trip: Home → Pretoria · Trip #42
Overdue: 28 minutes
ICE contact alerted: Mary (+27820000000)

Next action: Human review required.` },
    ],
  },
];

export default function WhatsAppScreens() {
  return (
    <div style={{
      fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#fff",
      maxWidth: 480,
      margin: "0 auto",
      border: "1px solid #e0e0e0",
    }}>

      {/* ── Header ── */}
      <div style={{
        background: HEADER_BG,
        borderBottom: "1px solid #E9EDEF",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <img
          src="/eblockwatch-logo.png"
          alt="eblockwatch"
          style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 20 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Cyber Chaperone</div>
          <div style={{ fontSize: 12, color: GREEN_DARK }}>eblockwatch · Always watching 🛡️</div>
        </div>
        <div style={{ display: "flex", gap: 16, color: "#54656F", fontSize: 20 }}>
          <span>📞</span>
          <span>⋮</span>
        </div>
      </div>

      {/* ── Chat body ── */}
      <div style={{ flex: 1, overflowY: "auto", background: CHAT_BG, padding: "4px 0 12px" }}>
        {flows.map((flow, fi) => (
          <div key={fi}>
            <FlowLabel label={flow.label} sub={flow.sub} />
            {flow.msgs.map((m, mi) => (
              <Bubble key={mi} text={m.text} dir={m.dir} time={m.time} />
            ))}
          </div>
        ))}
        <div style={{ height: 8 }} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        background: HEADER_BG,
        borderTop: "1px solid #E9EDEF",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 22, color: "#54656F" }}>😊</span>
        <div style={{
          flex: 1, background: "#F0F2F5", borderRadius: 22,
          padding: "9px 16px", fontSize: 14, color: "#aaa",
        }}>
          Message
        </div>
        <span style={{ fontSize: 22, color: "#54656F" }}>📎</span>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: GREEN, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          🎤
        </div>
      </div>
    </div>
  );
}
