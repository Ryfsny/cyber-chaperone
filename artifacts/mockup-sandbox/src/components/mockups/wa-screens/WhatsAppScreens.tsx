
// Renders as a real WhatsApp conversation thread
// Left = system/Cyber Chaperone sends  |  Right = member replies (grey, for context)

const WA_HEADER = "#075E54";
const WA_WALLPAPER = "#E5DDD9";
const WA_SENT = "#DCF8C6";     // outgoing (member)
const WA_RECV = "#FFFFFF";     // incoming (system → member)
const WA_TICK = "#53BDEB";

function bold(s: string) {
  // Render *word* as bold
  return s.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*")
      ? <strong key={i}>{part.slice(1, -1)}</strong>
      : part
  );
}

type Msg = {
  text: string;
  dir: "in" | "out";
  time?: string;
};

function Bubble({ text, dir, time = "09:41" }: Msg) {
  const isIn = dir === "in";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isIn ? "flex-start" : "flex-end",
        marginBottom: 2,
        paddingLeft: isIn ? 8 : 0,
        paddingRight: isIn ? 0 : 8,
      }}
    >
      <div
        style={{
          position: "relative",
          background: isIn ? WA_RECV : WA_SENT,
          borderRadius: isIn ? "0px 8px 8px 8px" : "8px 0px 8px 8px",
          padding: "6px 58px 16px 9px",
          maxWidth: "85%",
          boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
          fontSize: 13.5,
          lineHeight: 1.45,
          color: "#111",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {/* bubble tail */}
        <div
          style={{
            position: "absolute",
            top: 0,
            ...(isIn ? { left: -6 } : { right: -6 }),
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: isIn ? "0 6px 8px 0" : "0 0 8px 6px",
            borderColor: isIn
              ? `transparent ${WA_RECV} transparent transparent`
              : `transparent transparent transparent ${WA_SENT}`,
          }}
        />
        {bold(text)}
        <span
          style={{
            position: "absolute",
            bottom: 4,
            right: 6,
            fontSize: 10.5,
            color: "#8696A0",
            whiteSpace: "nowrap",
          }}
        >
          {time}
          {!isIn && (
            <span style={{ color: WA_TICK, marginLeft: 2 }}>✓✓</span>
          )}
        </span>
      </div>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        margin: "10px 0 6px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.85)",
          borderRadius: 8,
          padding: "3px 10px",
          fontSize: 11.5,
          color: "#667781",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FlowSection({
  title,
  tag,
  tagColor = "#075E54",
  messages,
}: {
  title: string;
  tag?: string;
  tagColor?: string;
  messages: Msg[];
}) {
  return (
    <div style={{ marginBottom: 0 }}>
      <DateDivider label={tag ? `${title}  ·  ${tag}` : title} />
      {messages.map((m, i) => (
        <Bubble key={i} {...m} />
      ))}
    </div>
  );
}

export default function WhatsAppScreens() {
  return (
    <div
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#111B21",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* WhatsApp Header */}
      <div
        style={{
          background: WA_HEADER,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#1a7a6e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          🛡️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>Cyber Chaperone</div>
          <div style={{ color: "#b2dfdb", fontSize: 12 }}>eblockwatch · Always watching</div>
        </div>
        <div style={{ color: "#b2dfdb", fontSize: 20 }}>📞</div>
        <div style={{ color: "#b2dfdb", fontSize: 20 }}>⋮</div>
      </div>

      {/* Chat body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: WA_WALLPAPER,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9b8a8' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          padding: "4px 0 8px",
        }}
      >

        {/* ── 1. MAIN MENU — NEW MEMBER ── */}
        <FlowSection
          title="Main Menu — New Member"
          tag="First visit · replies Hi"
          messages={[
            { dir: "out", text: "Hi", time: "09:00" },
            {
              dir: "in",
              text: "🛡️ *eblockwatch — Cyber Chaperone*\n\nHi Kieren. I'm Arnie — André Snyman's digital safety companion.\nWe have one job: get you there safely, every time.\n\n⭕ Status: Not yet a member\n\n0️⃣  Join eblockwatch — register now (it's free)\n1️⃣  Cyber Chaperone 🛡️\n2️⃣  What is eblockwatch?\n3️⃣  Membership options\n4️⃣  Activate my membership\n5️⃣  👤 My Account\n6️⃣  eblockshop\n7️⃣  Speak to a person\n8️⃣  📣 Invite a Friend\n9️⃣  📖 Getting Started Guide\n\n🚨 *EMERGENCY? Reply 10* — we will get the world to save you.\n\n📺 New here? See what we do:\nhttps://fb.com/share/v/1ACByM44QZ",
              time: "09:00",
            },
          ]}
        />

        {/* ── 2. MAIN MENU — VERIFIED MEMBER ── */}
        <FlowSection
          title="Main Menu — Verified Member"
          tag="Returns · replies 0"
          messages={[
            { dir: "out", text: "0", time: "09:05" },
            {
              dir: "in",
              text: "🛡️ *eblockwatch — Cyber Chaperone*\n\nHi Kieren. I'm Arnie — André Snyman's digital safety companion.\nWe have one job: get you there safely, every time.\n\n✅ Status: Verified member — Individual plan\n\n1️⃣  Cyber Chaperone 🛡️\n2️⃣  What is eblockwatch?\n3️⃣  Membership options\n4️⃣  Activate my membership\n5️⃣  👤 My Account\n6️⃣  eblockshop\n7️⃣  Speak to a person\n8️⃣  📣 Invite a Friend\n9️⃣  📖 Getting Started Guide\n\n🚨 *EMERGENCY? Reply 10*\nReply 0 to come back to this menu any time.\n\n👥 47 members watching your area.",
              time: "09:05",
            },
          ]}
        />

        {/* ── 3. CYBER CHAPERONE MENU ── */}
        <FlowSection
          title="Cyber Chaperone Menu"
          tag="Replies 1 from Main Menu"
          messages={[
            { dir: "out", text: "1", time: "09:10" },
            {
              dir: "in",
              text: "🛡️ *Cyber Chaperone — Kieren*\n\nYour WhatsApp connection to the eblockwatch Situation Room.\nIn your safe zone, we're here. When you roam — kick-start your trip.\n\n─── 🏠 In your safe zone ───\n8️⃣  I need help 🆘\n9️⃣  Speak to André / Situation Room\n\n─── 🚗 On the road ───\n1️⃣  Start a monitored drive\n2️⃣  I'm going out — clock me in when I'm home\n3️⃣  Update my current trip\n4️⃣  Change my destination\n5️⃣  I have arrived safely ✅\n\n6️⃣  How Cyber Chaperone works\n\nReply 0 for Main Menu.",
              time: "09:10",
            },
          ]}
        />

        {/* ── 4. HOW IT WORKS ── */}
        <FlowSection
          title="How Cyber Chaperone Works"
          tag="Replies 6 from CC Menu"
          messages={[
            { dir: "out", text: "6", time: "09:11" },
            {
              dir: "in",
              text: "Kieren, *Cyber Chaperone* keeps you connected to eblockwatch.\n\neblockwatch has been keeping South Africans safe for over 20 years.\nWe are always watching. You are never alone.\n\n─── 🏠 At home ───\nWe are here whenever you need us.\nMessage us. Ask a question. Call for help.\nSomeone is always watching the Situation Room.\n\n─── 🚗 When you drive somewhere ───\nTell us where you are going.\nTell us when you will arrive.\nIf you do not arrive on time — we message you.\nIf you do not reply — we call your emergency contact.\n\n─── 🌙 Going out for the evening ───\nTell us what time you will be home.\nWhen you are back, reply *SAFE*.\nIf we do not hear from you — we act.\n\n─── 🆘 Emergency ───\nReply *HELP* or *10* at any time.\nA real person will respond immediately.\n\nReply 0 to go back.",
              time: "09:11",
            },
          ]}
        />

        {/* ── 5. GETTING STARTED GUIDE ── */}
        <FlowSection
          title="Getting Started Guide"
          tag="Replies 9 from anywhere"
          messages={[
            { dir: "out", text: "9", time: "09:12" },
            {
              dir: "in",
              text: "📖 *Getting Started with eblockwatch*\n\nWatch the 2-minute intro first 👇\nhttps://fb.com/share/v/1ACByM44QZ\n\n━━━━━━━━━━━━━━━━━━━━\n1️⃣  *Join eblockwatch* — it's free\n   Reply 0 right now. Takes 2 minutes.\n\n2️⃣  *Add your emergency contact*\n   This is the most important step.\n   Reply 5 → My Account → Update ICE contact.\n\n3️⃣  *Activate your membership*\n   Reply 4. Individual R150/mo or Family R250/mo.\n\n4️⃣  *Use Cyber Chaperone when you go out*\n   Reply 1 from the Cyber Chaperone menu.\n\n5️⃣  *Invite someone you care about*\n   Reply 8 to share eblockwatch.\n━━━━━━━━━━━━━━━━━━━━\n\n*How we look after you* 🛡️\n\nWe look after you in three levels.\nWe never skip ahead.\n\n🟢😊 *Level 1 — We message YOU*\nYou reply. We stay calm. GREEN.\n\n🟠😟 *Level 2 — We bring in your emergency person*\nYou stopped replying. ICE contact involved. AMBER.\n\n🔴💥 *Level 3 — We widen the circle*\nICE can't reach you. Your support team makes the call.\nLocal → national → international. RED.\n\n*Please — don't push us to RED.*\nJust reply to our messages. That is all it takes to stay GREEN.\n\nBut if it ever comes to RED — we will find you.\n\n⚠️ *This is why filling in your profile matters.*\nYour address. Your area. Your emergency contact.\n━━━━━━━━━━━━━━━━━━━━\nAndré is watching. You are never alone. 🛡️",
              time: "09:12",
            },
          ]}
        />

        {/* ── 6. START DRIVE FLOW ── */}
        <FlowSection
          title="Starting a Monitored Drive"
          tag="CC Menu → Reply 1"
          messages={[
            { dir: "out", text: "1", time: "14:00" },
            {
              dir: "in",
              text: "Kieren, are you starting from Home 🏠?\n\n1. Yes — start from Home 🏠\n2. No — I am somewhere else\n\nOr share your location pin 📍\n\nReply 0 for Main Menu.",
              time: "14:00",
            },
            { dir: "out", text: "1", time: "14:01" },
            {
              dir: "in",
              text: "Got it — starting from Home 🏠.\n\nWhere are you heading today?\n\nReply 0 for Main Menu.",
              time: "14:01",
            },
            { dir: "out", text: "Pretoria", time: "14:01" },
            {
              dir: "in",
              text: "Got it — heading to *Pretoria*.\n\nWhat time do you expect to arrive? (e.g. 15:30)\n\nReply 0 for Main Menu.",
              time: "14:01",
            },
            { dir: "out", text: "15:30", time: "14:02" },
            {
              dir: "in",
              text: "✅ *Trip started — you are covered!*\n\nKieren → Pretoria\nETA: 15:30\n\nRoute: Home → N1 → Pretoria\nDrive time: ~1h 20min\n\nWe will check in at 3 points along the route.\nIf you don't arrive by 15:30 — we will message you.\n\nSafe travels. 🛡️\n\nReply *5* when you arrive.\nReply *10* at any time for emergency.",
              time: "14:02",
            },
          ]}
        />

        {/* ── 7. CHECKPOINT PINGS ── */}
        <FlowSection
          title="Checkpoint Ping — Mid Route"
          tag="Auto-sent by scheduler"
          messages={[
            {
              dir: "in",
              text: "Kieren 👋 Cyber Chaperone — *Midrand* checkpoint.\n\nYou should be at or near *Midrand* on your way to *Pretoria*.\n\n1. ✅ Yes — passing through now\n2. 🕐 Not yet — running behind\n3. 📍 Somewhere else — tell us where\n4. 🆘 I need help\n\nReply 0 for Main Menu.",
              time: "14:40",
            },
            { dir: "out", text: "1", time: "14:41" },
            {
              dir: "in",
              text: "✅ *Midrand* — confirmed, you're on track!\n\nUpdated ETA to *Pretoria*: *15:28* (47 min to go).\n\nWe're still with you. Safe travels! 🛡️",
              time: "14:41",
            },
          ]}
        />

        <FlowSection
          title="Pre-Arrival Check"
          tag="Scheduler — near destination"
          messages={[
            {
              dir: "in",
              text: "Kieren 👋 Cyber Chaperone — you should be close to *Pretoria* now.\n\nWe haven't stopped watching. Just confirm you're okay.\n\n1. ✅ I have arrived safely\n2. 🕐 Running a little late\n3. 🆘 I need help\n\nReply 0 for Main Menu.",
              time: "15:20",
            },
          ]}
        />

        {/* ── 8. ETA OVERDUE — 3 PHASES ── */}
        <FlowSection
          title="ETA Reached — Arrival Check"
          tag="🟢 Phase 1 · 0 min overdue"
          messages={[
            {
              dir: "in",
              text: "Kieren, you should be near *Pretoria* by now.\n\nAre you there and okay?\n\n1. I have arrived safely\n2. I am delayed\n3. I will send my location pin\n4. I need help\n\nReply 0 for Main Menu.",
              time: "15:30",
            },
          ]}
        />

        <FlowSection
          title="AMBER — No Reply"
          tag="🟠 Phase 2 · +10 min overdue"
          tagColor="#E65100"
          messages={[
            {
              dir: "in",
              text: "Kieren, we have not had your arrival confirmation yet.\n\nYou are overdue at *Pretoria*.\n\nPlease reply:\n\n1. I am okay — I have arrived\n2. I am delayed\n3. Send location pin\n4. I need help",
              time: "15:40",
            },
          ]}
        />

        <FlowSection
          title="RED — Escalation"
          tag="🔴 Phase 3 · +25 min overdue"
          tagColor="#B71C1C"
          messages={[
            {
              dir: "in",
              text: "Kieren, we have not had a reply after your expected arrival time.\n\nYou are *28 minutes* overdue at *Pretoria*.\n\nCyber Chaperone is escalating this for human attention.\n\nReply:\n1. I am okay\n4. I need help",
              time: "15:55",
            },
          ]}
        />

        {/* ── 9. DURING TRIP RESPONSES ── */}
        <FlowSection
          title="Member Running Late"
          tag="Replies 2 to any check"
          messages={[
            { dir: "out", text: "2", time: "15:31" },
            {
              dir: "in",
              text: "Understood — no rush.\n\nWhat is your new ETA to *Pretoria*? (e.g. 16:00)\n\nReply 0 for Main Menu.",
              time: "15:31",
            },
            { dir: "out", text: "16:15", time: "15:32" },
            {
              dir: "in",
              text: "✅ ETA updated to 16:15. We will continue monitoring your trip.\n\nReply 0 for Main Menu.",
              time: "15:32",
            },
          ]}
        />

        <FlowSection
          title="Planned Stop — 30 Min Safety Ping"
          tag="Stopped · auto-sent after 30 min"
          messages={[
            {
              dir: "in",
              text: "Kieren 👋 This is Cyber Chaperone — André's Situation Room.\n\nYou stopped about 30 minutes ago on your way to *Pretoria*.\nWe are still watching. Are you safe?\n\n1. ✅ I'm good — back on the road\n2. 🛑 Still stopped — give me more time\n3. 🆘 I need help right now\n\nReply 0 for Main Menu.",
              time: "15:45",
            },
            { dir: "out", text: "1", time: "15:46" },
            {
              dir: "in",
              text: "✅ All good — we are still watching over your journey.\n\nSafe travels.\n\nReply 0 for Main Menu.",
              time: "15:46",
            },
          ]}
        />

        <FlowSection
          title="Fuel / Rest Stop"
          tag="Member says 'fuel stop'"
          messages={[
            { dir: "out", text: "Fuel stop", time: "15:10" },
            {
              dir: "in",
              text: "⛽ Fuel/rest stop noted. Take your time — we will pick up your trip when you are back on the road.\n\nReply 0 for Main Menu.",
              time: "15:10",
            },
          ]}
        />

        <FlowSection
          title="Roadblock"
          tag="Member says 'roadblock'"
          messages={[
            { dir: "out", text: "Roadblock", time: "15:15" },
            {
              dir: "in",
              text: "🚧 Roadblock noted. We are watching over you.\n\nWhen you are through, just keep going — we will follow your journey from here.\n\nReply 0 for Main Menu.",
              time: "15:15",
            },
          ]}
        />

        <FlowSection
          title="Police Stop"
          tag="Member says 'pulled over'"
          messages={[
            { dir: "out", text: "Pulled over", time: "15:20" },
            {
              dir: "in",
              text: "🚔 Understood — we have noted you have been pulled over. Stay calm.\n\nWe have quietly let your emergency contact know you are safe.\n\nWhen you are released and back on the road, just continue your trip — we are right here.\n\nReply 0 for Main Menu.",
              time: "15:20",
            },
          ]}
        />

        <FlowSection
          title="Arrived Safely"
          tag="Replies 5 · Trip closed ✅"
          messages={[
            { dir: "out", text: "5", time: "15:45" },
            {
              dir: "in",
              text: "Kieren, you have arrived safely. Your Cyber Chaperone trip is now closed.\n\nThank you for travelling with us. Stay safe.",
              time: "15:45",
            },
          ]}
        />

        {/* ── 10. CLOCK-IN FLOW ── */}
        <FlowSection
          title="Safe Zone Clock-in — Setup"
          tag="CC Menu → Reply 2"
          messages={[
            { dir: "out", text: "2", time: "19:00" },
            {
              dir: "in",
              text: "Kieren, what time will you be home tonight? 🏠\n\nJust send us the time.\nFor example: 11pm or 23:00\n\nWe will message you then to check you are safe.",
              time: "19:00",
            },
            { dir: "out", text: "23:00", time: "19:01" },
            {
              dir: "in",
              text: "✅ Done, Kieren.\n\nWe will message you at 23:00.\nWhen you are home, just reply *SAFE*.\n\nIf we do not hear from you — we will contact someone.\n\nEnjoy your evening 🌙",
              time: "19:01",
            },
          ]}
        />

        <FlowSection
          title="Clock-in — Deadline Ping"
          tag="Auto-sent at 23:00"
          messages={[
            {
              dir: "in",
              text: "Hi Kieren 👋\n\nAre you home safely?\n\nReply *SAFE* if yes.\nReply *10* if you need help.",
              time: "23:00",
            },
            { dir: "out", text: "SAFE", time: "23:02" },
            {
              dir: "in",
              text: "Good to hear, Kieren. 🏠\n\nYour clock-in is closed. Sleep well. 🌙",
              time: "23:02",
            },
          ]}
        />

        {/* ── 11. EMERGENCY ── */}
        <FlowSection
          title="Member Sends HELP / SOS"
          tag="🔴 Distress keyword"
          tagColor="#B71C1C"
          messages={[
            { dir: "out", text: "HELP", time: "16:33" },
            {
              dir: "in",
              text: "Kieren, I have alerted the Situation Room. Help is being arranged.\n\nStay where you are if possible.\n\nReply *10* at any time for immediate escalation.",
              time: "16:33",
            },
          ]}
        />

        <FlowSection
          title='Member Replies "10" — Emergency'
          tag="🔴 Immediate escalation"
          tagColor="#B71C1C"
          messages={[
            { dir: "out", text: "10", time: "16:34" },
            {
              dir: "in",
              text: "🚨 *Emergency — Situation Room alerted.*\n\nKieren, André and the eblockwatch team have been notified.\n\nYou are not alone. Help is on the way.\n\nStay on the line.",
              time: "16:34",
            },
          ]}
        />

        {/* ── 12. ICE CONTACT MESSAGES ── */}
        <FlowSection
          title="ICE Contact — Trip Overdue RED"
          tag="This goes to Mary (emergency contact)"
          tagColor="#37474F"
          messages={[
            {
              dir: "in",
              text: "🆘 *eblockwatch Cyber Chaperone — URGENT*\n\nHi Mary,\n\nYou are the emergency contact for *Kieren Snyman*.\n\nSituation: Kieren was due to arrive at their destination 28 minutes ago and has not confirmed arrival or responded to safety check-ins.\nRoute: Home → Pretoria\n\n📍 Last known location:\nhttps://maps.google.com/?q=-25.7479,28.2293\n\nPlease contact Kieren immediately:\n👉 wa.me/27833263751\n\nAndré at eblockwatch is monitoring. Reply with any update.\n\n— eblockwatch Cyber Chaperone",
              time: "15:58",
            },
          ]}
        />

        <FlowSection
          title="ICE Contact — Clock-in Overdue"
          tag="This goes to Mary · T+40 min"
          tagColor="#37474F"
          messages={[
            {
              dir: "in",
              text: "Hi Mary,\n\nThis is eblockwatch. We look after *Kieren*.\n\nKieren was supposed to be home by *23:00*.\nWe have tried to reach them. No reply.\n\nPlease check on them now.\nMessage them here:\n👉 wa.me/27833263751\n\nReply to this message if you need us to do more.\n\n— eblockwatch",
              time: "23:40",
            },
          ]}
        />

        {/* ── 13. ANDRÉ OPERATOR MIRRORS ── */}
        <FlowSection
          title="Operator Mirror — ETA Reached"
          tag="André's phone receives this"
          tagColor="#1565C0"
          messages={[
            {
              dir: "in",
              text: "⏰ CYBER CHAPERONE — ETA REACHED\n\nKieren should be arriving at Pretoria now.\nTrip #42 — arrival check sent.\n\nAwaiting confirmation.",
              time: "15:30",
            },
          ]}
        />

        <FlowSection
          title="Operator Mirror — AMBER"
          tag="André's phone receives this"
          tagColor="#E65100"
          messages={[
            {
              dir: "in",
              text: "⚠️ CYBER CHAPERONE — AMBER\n\nKieren is 12min past ETA for Home → Pretoria.\nTrip #42 → AMBER.\n\nAmber ping sent. No arrival confirmation yet.",
              time: "15:42",
            },
          ]}
        />

        <FlowSection
          title="Operator Mirror — RED"
          tag="André's phone receives this"
          tagColor="#B71C1C"
          messages={[
            {
              dir: "in",
              text: "🚨 RED — No arrival confirmation after ETA.\n\nMember: Kieren\nTrip: Home → Pretoria\nTrip #42\nOverdue: 28 minutes\nICE contact alerted: Mary (+27820000000)\n\nNext action: Human review required.",
              time: "15:58",
            },
          ]}
        />

        <FlowSection
          title="Operator Mirror — Clock-in Nudge"
          tag="André's phone · T+20 min"
          tagColor="#6A1B9A"
          messages={[
            {
              dir: "in",
              text: "🏠 CLOCK-IN OVERDUE — Kieren\n\nKieren was expected home by *23:00* and has not replied.\nOverdue: 22 minutes\nTrip #43\n\nNo action needed yet — just be aware.\nIf still no reply in 20 minutes, ICE contact will be nudged automatically.",
              time: "23:22",
            },
          ]}
        />

        <FlowSection
          title="Operator Mirror — Clock-in AMBER"
          tag="André's phone · T+40 min"
          tagColor="#E65100"
          messages={[
            {
              dir: "in",
              text: "⚠️ CLOCK-IN — AMBER\n\nMember: Kieren\nExpected home: 23:00\nOverdue: 42 minutes\nTrip #43\n\nICE nudged: Mary (+27820000000)\n\nStatus → AMBER. Human review recommended.",
              time: "23:42",
            },
          ]}
        />

        <div style={{ height: 16 }} />
      </div>

      {/* Input bar */}
      <div
        style={{
          background: "#F0F2F5",
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ color: "#54656F", fontSize: 22 }}>😊</div>
        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 22,
            padding: "9px 14px",
            fontSize: 14,
            color: "#aaa",
          }}
        >
          Message
        </div>
        <div style={{ color: "#54656F", fontSize: 22 }}>📎</div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: WA_HEADER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🎤
        </div>
      </div>
    </div>
  );
}
