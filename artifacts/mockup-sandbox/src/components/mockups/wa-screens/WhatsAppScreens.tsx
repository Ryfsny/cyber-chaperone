
const WA_GREEN = "#075E54";
const WA_LIGHT_GREEN = "#DCF8C6";
const WA_BG = "#ECE5DD";

type BubbleProps = {
  text: string;
  side?: "in" | "out";
  time?: string;
};

function Bubble({ text, side = "in", time = "09:41" }: BubbleProps) {
  const isIn = side === "in";
  return (
    <div className={`flex ${isIn ? "justify-start" : "justify-end"} mb-1`}>
      <div
        style={{
          background: isIn ? "#fff" : WA_LIGHT_GREEN,
          borderRadius: isIn ? "0 8px 8px 8px" : "8px 0 8px 8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          maxWidth: "88%",
          padding: "7px 10px 18px 10px",
          position: "relative",
          fontSize: 12,
          lineHeight: 1.45,
          color: "#111",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
        <span
          style={{
            position: "absolute",
            bottom: 4,
            right: 8,
            fontSize: 10,
            color: "#999",
          }}
        >
          {time}
        </span>
      </div>
    </div>
  );
}

type PhoneProps = {
  label: string;
  tag?: string;
  tagColor?: string;
  children: React.ReactNode;
};

function Phone({ label, tag, tagColor = "#075E54", children }: PhoneProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 260 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 4,
          textAlign: "center",
        }}
      >
        {label}
      </div>
      {tag && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "#fff",
            background: tagColor,
            borderRadius: 10,
            padding: "2px 8px",
            marginBottom: 5,
          }}
        >
          {tag}
        </div>
      )}
      <div
        style={{
          width: 260,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          border: "6px solid #222",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            background: WA_GREEN,
            padding: "6px 12px 4px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#1a7a6e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>Cyber Chaperone</div>
            <div style={{ color: "#b2dfdb", fontSize: 9 }}>eblockwatch</div>
          </div>
        </div>
        {/* Chat area */}
        <div
          style={{
            background: WA_BG,
            padding: "8px 6px",
            minHeight: 120,
            maxHeight: 480,
            overflowY: "auto",
          }}
        >
          {children}
        </div>
        {/* Input bar */}
        <div
          style={{
            background: "#f0f0f0",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 20,
              padding: "5px 10px",
              fontSize: 10,
              color: "#aaa",
            }}
          >
            Message
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: WA_GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            🎤
          </div>
        </div>
      </div>
    </div>
  );
}

type SectionProps = {
  title: string;
  color?: string;
  children: React.ReactNode;
};

function Section({ title, color = WA_GREEN, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          background: color,
          color: "#fff",
          padding: "8px 20px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 0.5,
          marginBottom: 20,
          display: "inline-block",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SystemMsg({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
      <div
        style={{
          background: "rgba(0,0,0,0.12)",
          color: "#555",
          fontSize: 10,
          borderRadius: 6,
          padding: "2px 8px",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function WhatsAppScreens() {
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "#f5f5f5",
        minHeight: "100vh",
        padding: "32px 32px 64px",
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: WA_GREEN }}>
          🛡️ Cyber Chaperone — Every WhatsApp Message
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          Every message the system can send, across every flow. Left bubbles = system sends. Right
          bubbles = member replies (for context).
        </div>
      </div>

      {/* ─── SECTION 1: MAIN NAVIGATION ─────────────────────────────────────── */}
      <Section title="1 — Main Navigation">
        <Phone label="Main Menu — New Member" tag="FIRST VISIT" tagColor="#2196F3">
          <Bubble
            text={`🛡️ *eblockwatch — Cyber Chaperone*\n\nHi Kieren. I'm Arnie — André Snyman's digital safety companion.\nWe have one job: get you there safely, every time.\n\n⭕ Status: Not yet a member\n\n0️⃣  Join eblockwatch — register now (it's free)\n1️⃣  Cyber Chaperone 🛡️\n2️⃣  What is eblockwatch?\n3️⃣  Membership options\n4️⃣  Activate my membership\n5️⃣  👤 My Account\n6️⃣  eblockshop\n7️⃣  Speak to a person\n8️⃣  📣 Invite a Friend\n9️⃣  📖 Getting Started Guide\n\n🚨 *EMERGENCY? Reply 10*\n\n📺 New here? See what we do:\nhttps://fb.com/...`}
          />
        </Phone>

        <Phone label="Main Menu — Verified Member" tag="RETURNING" tagColor={WA_GREEN}>
          <Bubble
            text={`🛡️ *eblockwatch — Cyber Chaperone*\n\nHi Kieren. I'm Arnie — André Snyman's digital safety companion.\nWe have one job: get you there safely, every time.\n\n✅ Status: Verified member — Individual plan\n\n1️⃣  Cyber Chaperone 🛡️\n2️⃣  What is eblockwatch?\n3️⃣  Membership options\n4️⃣  Activate my membership\n5️⃣  👤 My Account\n6️⃣  eblockshop\n7️⃣  Speak to a person\n8️⃣  📣 Invite a Friend\n9️⃣  📖 Getting Started Guide\n\n🚨 *EMERGENCY? Reply 10*\nReply 0 to come back to this menu.\n\n👥 47 members watching your area.`}
          />
        </Phone>

        <Phone label="Cyber Chaperone Menu" tag="REPLY 1">
          <Bubble
            text={`🛡️ *Cyber Chaperone — Kieren*\n\nYour WhatsApp connection to the eblockwatch Situation Room.\nIn your safe zone, we're here. When you roam — kick-start your trip.\n\n─── 🏠 In your safe zone ───\n8️⃣  I need help 🆘\n9️⃣  Speak to André / Situation Room\n\n─── 🚗 On the road ───\n1️⃣  Start a monitored drive\n2️⃣  I'm going out — clock me in when I'm home\n3️⃣  Update my current trip\n4️⃣  Change my destination\n5️⃣  I have arrived safely ✅\n\n6️⃣  How Cyber Chaperone works\n\nReply 0 for Main Menu.`}
          />
        </Phone>

        <Phone label="How It Works" tag="CC OPTION 6">
          <Bubble
            text={`Kieren, *Cyber Chaperone* keeps you connected to eblockwatch.\n\neblockwatch has been keeping South Africans safe for over 20 years.\nWe are always watching. You are never alone.\n\n─── 🏠 At home ───\nWe are here whenever you need us.\nMessage us. Ask a question. Call for help.\nSomeone is always watching the Situation Room.\n\n─── 🚗 When you drive ───\nTell us where you are going.\nTell us when you will arrive.\nIf you don't arrive on time — we message you.\nIf you don't reply — we call your emergency contact.\n\n─── 🌙 Going out for the evening ───\nTell us what time you will be home.\nWhen you are back, reply *SAFE*.\nIf we do not hear from you — we act.\n\n─── 🆘 Emergency ───\nReply *HELP* or *10* at any time.\nA real person will respond immediately.`}
          />
        </Phone>
      </Section>

      {/* ─── SECTION 2: GETTING STARTED GUIDE ──────────────────────────────────── */}
      <Section title="2 — Getting Started Guide (Reply 9)" color="#5C6BC0">
        <Phone label="Guide — Steps 1–5" tag="PART 1">
          <Bubble
            text={`📖 *Getting Started with eblockwatch*\n\nWatch the 2-minute intro first 👇\nhttps://fb.com/...\n\n━━━━━━━━━━━━━━━━━━━━\n1️⃣  *Join eblockwatch* — it's free\n   Reply 0 right now. Takes 2 minutes.\n\n2️⃣  *Add your emergency contact*\n   This is the most important step.\n   Reply 5 → My Account → Update ICE contact.\n   This is the person we call if we cannot reach you.\n\n3️⃣  *Activate your membership*\n   Reply 4 from the main menu.\n   Individual R150/mo or Family R250/mo.\n\n4️⃣  *Use Cyber Chaperone when you go out*\n   Reply 1 from the Cyber Chaperone menu.\n\n5️⃣  *Invite someone you care about*\n   Reply 8 to share eblockwatch.\n━━━━━━━━━━━━━━━━━━━━`}
          />
        </Phone>

        <Phone label="Guide — How We Protect You" tag="PART 2">
          <Bubble
            text={`*How we look after you* 🛡️\n\nWe look after you in three levels.\nEach one is a little bigger than the last.\nWe never skip ahead.\n\n🟢😊 *Level 1 — We message YOU*\nWe ask if you are okay.\nYou reply. We stay calm. Nothing changes.\nAs long as you are talking to us — we are GREEN.\n\n🟠😟 *Level 2 — We bring in your emergency person*\nYou stopped replying.\nWe contact the person you named as your emergency contact.\nThis is AMBER. We are worried now.\n\n🔴💥 *Level 3 — We widen the circle*\nYour emergency person cannot reach you.\nYour support team makes a decision.\nWe go local. Then national. International if we have to.\nThis is RED. It is serious.\n\n*Please — don't push us to RED.*\nJust reply to our messages. That is all it takes to stay GREEN.\n\nBut if it ever comes to RED — we will find you.\n\n⚠️ *This is why filling in your profile matters.*\n━━━━━━━━━━━━━━━━━━━━\nAndré is watching. You are never alone. 🛡️`}
          />
        </Phone>
      </Section>

      {/* ─── SECTION 3: TRIP START FLOW ─────────────────────────────────────────── */}
      <Section title="3 — Starting a Monitored Drive (CC → Reply 1)" color="#00897B">
        <Phone label="Step 1 — Start Location" tag="HAS HOME ADDRESS">
          <Bubble text={`Kieren, are you starting from Home 🏠?\n\n1. Yes — start from Home 🏠\n2. No — I am somewhere else\n\nOr share your location pin 📍 to start from a different place.\n\nReply 0 for Main Menu.`} />
        </Phone>

        <Phone label="Step 1 — Start Location" tag="NO HOME ON FILE">
          <Bubble text={`Kieren, let's get you covered. 🛡️\n\nPlease send your current location pin 📍\n\n(Tap the 📎 clip → Location → Send Your Current Location)\n\nReply 0 for Main Menu.`} />
        </Phone>

        <Phone label="Step 2 — Destination">
          <Bubble text={`Got it — starting from Home 🏠.\n\nWhere are you heading today?\n\nReply 0 for Main Menu.`} />
          <Bubble text="Pretoria" side="out" />
        </Phone>

        <Phone label="Step 3 — ETA">
          <Bubble text={`Got it — heading to *Pretoria*.\n\nWhat time do you expect to arrive? (e.g. 14:30)\n\nReply 0 for Main Menu.`} />
          <Bubble text="15:30" side="out" />
        </Phone>

        <Phone label="Step 4 — Trip Confirmed 🟢" tag="GREEN" tagColor="#2e7d32">
          <Bubble
            text={`✅ *Trip started — you are covered!*\n\nKieren → Pretoria\nETA: 15:30\n\nRoute: Home → N1 → Pretoria\nDrive time: ~1h 20min\n\nWe will check in at 3 points along the route.\nIf you don't arrive by 15:30 — we will message you.\n\nSafe travels. 🛡️\n\nReply *5* when you arrive.\nReply *10* at any time for emergency.`}
          />
        </Phone>
      </Section>

      {/* ─── SECTION 4: PROACTIVE ALERTS DURING TRIP ────────────────────────────── */}
      <Section title="4 — Proactive Alerts While Driving (Scheduler)" color="#EF6C00">
        <Phone label="Checkpoint — Mid-Route" tag="AUTO-SENT">
          <Bubble
            text={`Kieren 👋 Cyber Chaperone — *Midrand* checkpoint.\n\nYou should be at or near *Midrand* on your way to *Pretoria*.\n\n1. ✅ Yes — passing through now\n2. 🕐 Not yet — running behind\n3. 📍 Somewhere else — tell us where\n4. 🆘 I need help\n\nReply 0 for Main Menu.`}
          />
        </Phone>

        <Phone label="Pre-Arrival Check" tag="NEAR DESTINATION">
          <Bubble
            text={`Kieren 👋 Cyber Chaperone — you should be close to *Pretoria* now.\n\nWe haven't stopped watching. Just confirm you're okay.\n\n1. ✅ I have arrived safely\n2. 🕐 Running a little late\n3. 🆘 I need help\n\nReply 0 for Main Menu.`}
          />
        </Phone>

        <Phone label="ETA Reached Check" tag="🟢 PHASE 1 — 0 MIN">
          <Bubble
            text={`Kieren, you should be near *Pretoria* by now.\n\nAre you there and okay?\n\n1. I have arrived safely\n2. I am delayed\n3. I will send my location pin\n4. I need help\n\nReply 0 for Main Menu.`}
          />
        </Phone>

        <Phone label="No Reply — AMBER Ping" tag="🟠 PHASE 2 — +10 MIN" tagColor="#E65100">
          <Bubble
            text={`Kieren, we have not had your arrival confirmation yet.\n\nYou are overdue at *Pretoria*.\n\nPlease reply:\n\n1. I am okay — I have arrived\n2. I am delayed\n3. Send location pin\n4. I need help`}
          />
        </Phone>

        <Phone label="RED Escalation" tag="🔴 PHASE 3 — +25 MIN" tagColor="#B71C1C">
          <Bubble
            text={`Kieren, we have not had a reply after your expected arrival time.\n\nYou are *28 minutes* overdue at *Pretoria*.\n\nCyber Chaperone is escalating this for human attention.\n\nReply:\n1. I am okay\n4. I need help`}
          />
        </Phone>

        <Phone label="Planned Stop Safety Ping" tag="STOPPED 30 MIN">
          <Bubble
            text={`Kieren 👋 This is Cyber Chaperone — André's Situation Room.\n\nYou stopped about 30 minutes ago on your way to *Pretoria*.\nWe are still watching. Are you safe?\n\n1. ✅ I'm good — back on the road\n2. 🛑 Still stopped — give me more time\n3. 🆘 I need help right now\n\nReply 0 for Main Menu.`}
          />
        </Phone>
      </Section>

      {/* ─── SECTION 5: MEMBER REPLY RESPONSES ──────────────────────────────────── */}
      <Section title="5 — Responses When Member Updates Their Status" color="#00695C">
        <Phone label="Checkpoint Confirmed ✅">
          <Bubble text={`✅ *Midrand* — confirmed, you're on track!\n\nUpdated ETA to *Pretoria*: *15:35* (22 min to go).\n\nWe're still with you. Safe travels! 🛡️`} />
        </Phone>

        <Phone label="Running Late — Ask New ETA">
          <Bubble text={`Understood — no rush.\n\nWhat is your new ETA to *Pretoria*? (e.g. 16:00)\n\nReply 0 for Main Menu.`} />
          <Bubble text="16:15" side="out" />
          <Bubble text={`✅ ETA updated to 16:15. We will continue monitoring your trip.\n\nReply 0 for Main Menu.`} />
        </Phone>

        <Phone label="Location Noted + ETA Updated">
          <Bubble text={`📍 *Midrand* noted — ETA updated.\n\nEstimated arrival at *Pretoria*: *15:45* (35 min to go).\n\nWe're still watching. Safe travels! 🛡️`} />
        </Phone>

        <Phone label="Fuel / Rest Stop">
          <Bubble text={`⛽ Fuel/rest stop noted. Take your time — we will pick up your trip when you are back on the road.\n\nReply 0 for Main Menu.`} />
        </Phone>

        <Phone label="Roadblock">
          <Bubble text={`🚧 Roadblock noted. We are watching over you.\n\nWhen you are through, just keep going — we will follow your journey from here.\n\nReply 0 for Main Menu.`} />
        </Phone>

        <Phone label="Police Stop">
          <Bubble text={`🚔 Understood — we have noted you have been pulled over. Stay calm.\n\nWe have quietly let your emergency contact know you are safe.\n\nWhen you are released and back on the road, just continue your trip — we are right here.\n\nReply 0 for Main Menu.`} />
        </Phone>

        <Phone label="Arrived Safely ✅" tag="TRIP CLOSED" tagColor="#2e7d32">
          <Bubble text="5" side="out" />
          <Bubble text={`Kieren, you have arrived safely. Your Cyber Chaperone trip is now closed.\n\nThank you for travelling with us. Stay safe.`} />
        </Phone>
      </Section>

      {/* ─── SECTION 6: CLOCK-IN FLOW ────────────────────────────────────────────── */}
      <Section title="6 — Safe Zone Clock-in Flow (CC → Reply 2)" color="#6A1B9A">
        <Phone label="Step 1 — Ask Time">
          <Bubble text={`Kieren, what time will you be home tonight? 🏠\n\nJust send us the time.\nFor example: 11pm or 23:00\n\nWe will message you then to check you are safe.`} />
          <Bubble text="23:00" side="out" />
        </Phone>

        <Phone label="Step 2 — Confirmed ✅" tag="CLOCK-IN SET" tagColor="#6A1B9A">
          <Bubble text={`✅ Done, Kieren.\n\nWe will message you at 23:00.\nWhen you are home, just reply *SAFE*.\n\nIf we do not hear from you — we will contact someone.\n\nEnjoy your evening 🌙`} />
        </Phone>

        <Phone label="T+0 — Deadline Ping" tag="AUTO-SENT AT 23:00">
          <Bubble text={`Hi Kieren 👋\n\nAre you home safely?\n\nReply *SAFE* if yes.\nReply *10* if you need help.`} />
        </Phone>

        <Phone label="Member Replies SAFE ✅" tag="CLOCK-IN CLOSED" tagColor="#2e7d32">
          <Bubble text="SAFE" side="out" />
          <Bubble text={`Good to hear, Kieren. 🏠\n\nYour clock-in is closed. Sleep well. 🌙`} />
        </Phone>
      </Section>

      {/* ─── SECTION 7: EMERGENCY ────────────────────────────────────────────────── */}
      <Section title="7 — Emergency Responses" color="#C62828">
        <Phone label="Member Says HELP / SOS" tag="🔴 RED" tagColor="#C62828">
          <Bubble text="HELP" side="out" />
          <Bubble text={`Kieren, I have alerted the Situation Room. Help is being arranged.\n\nStay where you are if possible.\n\nReply *10* at any time for immediate escalation.`} />
        </Phone>

        <Phone label='Member Replies "10"' tag="🔴 IMMEDIATE" tagColor="#C62828">
          <Bubble text="10" side="out" />
          <Bubble text={`🚨 *Emergency — Situation Room alerted.*\n\nKieren, André and the eblockwatch team have been notified.\n\nYou are not alone. Help is on the way.\n\nStay on the line.`} />
        </Phone>

        <Phone label="Check-in Choice — SOS (option 4)">
          <Bubble text="4" side="out" />
          <Bubble text={`Kieren, we are on it. 🆘\n\nAndré has been notified and the Situation Room is on alert. You are not alone.\n\nReply 0 for Main Menu.`} />
        </Phone>
      </Section>

      {/* ─── SECTION 8: ICE CONTACT MESSAGES ─────────────────────────────────────── */}
      <Section title="8 — ICE Contact Messages (What the Emergency Contact Receives)" color="#37474F">
        <Phone label="Trip Overdue — RED Alert to ICE" tag="ICE RECEIVES THIS" tagColor="#37474F">
          <Bubble
            text={`🆘 *eblockwatch Cyber Chaperone — URGENT*\n\nHi Mary,\n\nYou are the emergency contact for *Kieren Snyman*.\n\nSituation: Kieren was due to arrive at their destination 28 minutes ago and has not confirmed arrival or responded to safety check-ins.\nRoute: Home → Pretoria\n\n📍 Last known location:\nhttps://maps.google.com/?q=-25.7479,28.2293\n\nPlease contact Kieren immediately:\n👉 wa.me/27833263751\n\nAndré at eblockwatch is monitoring. Reply with any update.\n\n— eblockwatch Cyber Chaperone`}
          />
        </Phone>

        <Phone label="Clock-in Overdue — ICE Nudge" tag="T+40 MIN — ICE RECEIVES" tagColor="#37474F">
          <Bubble
            text={`Hi Mary,\n\nThis is eblockwatch. We look after *Kieren*.\n\nKieren was supposed to be home by *23:00*.\nWe have tried to reach them. No reply.\n\nPlease check on them now.\nMessage them here:\n👉 wa.me/27833263751\n\nReply to this message if you need us to do more.\n\n— eblockwatch`}
          />
        </Phone>
      </Section>

      {/* ─── SECTION 9: OPERATOR MIRRORS ─────────────────────────────────────────── */}
      <Section title="9 — Operator Mirrors (What André's Phone Receives)" color="#1565C0">
        <Phone label="ETA Reached" tag="ANDRÉ'S PHONE" tagColor="#1565C0">
          <Bubble
            text={`⏰ CYBER CHAPERONE — ETA REACHED\n\nKieren should be arriving at Pretoria now.\nTrip #42 — arrival check sent.\n\nAwaiting confirmation.`}
          />
        </Phone>

        <Phone label="AMBER Alert" tag="ANDRÉ'S PHONE" tagColor="#E65100">
          <Bubble
            text={`⚠️ CYBER CHAPERONE — AMBER\n\nKieren is 12min past ETA for Home → Pretoria.\nTrip #42 → AMBER.\n\nAmber ping sent. No arrival confirmation yet.`}
          />
        </Phone>

        <Phone label="RED Alert" tag="ANDRÉ'S PHONE" tagColor="#C62828">
          <Bubble
            text={`🚨 RED — No arrival confirmation after ETA.\n\nMember: Kieren\nTrip: Home → Pretoria\nTrip #42\nOverdue: 28 minutes\nICE contact alerted: Mary (+27820000000)\n\nNext action: Human review required.`}
          />
        </Phone>

        <Phone label="Clock-in André Nudge (+20 min)" tag="ANDRÉ'S PHONE" tagColor="#6A1B9A">
          <Bubble
            text={`🏠 CLOCK-IN OVERDUE — Kieren\n\nKieren was expected home by *23:00* and has not replied.\nOverdue: 22 minutes\nTrip #43\n\nNo action needed yet — just be aware.\nIf still no reply in 20 minutes, ICE contact will be nudged automatically.`}
          />
        </Phone>

        <Phone label="Clock-in AMBER (+40 min)" tag="ANDRÉ'S PHONE" tagColor="#E65100">
          <Bubble
            text={`⚠️ CLOCK-IN — AMBER\n\nMember: Kieren\nExpected home: 23:00\nOverdue: 42 minutes\nTrip #43\n\nICE nudged: Mary (+27820000000)\n\nStatus → AMBER. Human review recommended.`}
          />
        </Phone>
      </Section>

      {/* ─── SECTION 10: MEMBERSHIP & ACCOUNT ─────────────────────────────────────── */}
      <Section title="10 — Membership & Account Flows" color="#558B2F">
        <Phone label="Membership Options (Reply 3)">
          <Bubble
            text={`*eblockwatch Membership*\n\n─── Free ───\n✅ Cyber Chaperone basic monitoring\n✅ Emergency 10 line\n✅ eblockwatch network access\n\n─── Individual — R150/mo ───\n✅ Everything above\n✅ Full trip monitoring\n✅ ICE contact escalation\n✅ Route mapping\n\n─── Family — R250/mo ───\n✅ Everything above\n✅ Whole household covered\n✅ Family group dashboard\n\nReply 4 to activate.\nReply 0 for Main Menu.`}
          />
        </Phone>

        <Phone label="Payment Link Sent (Reply 4)">
          <Bubble
            text={`Kieren, here is your personal checkout link 👇\n\n*Individual Plan — R150/month*\n\nhttps://paystack.com/pay/...\n\nSecure payment via Paystack.\nCard, bank transfer, or EFT.\n\nOnce you pay, your account upgrades automatically.\nNo need to tell us.\n\nReply 0 for Main Menu.`}
          />
        </Phone>

        <Phone label="Invite a Friend (Reply 8)">
          <Bubble
            text={`📣 Share eblockwatch with someone you care about.\n\nJust forward this message:\n\n─────────────────────\n🛡️ I use eblockwatch to stay safe when I travel.\n\nThey watch over my trips. If I don't arrive, they act.\n\nJoin for free: wa.me/27825611065\n─────────────────────\n\nThe bigger the network — the safer we all are.\n\nReply 0 for Main Menu.`}
          />
        </Phone>

        <Phone label="Speak to a Person (Reply 7)">
          <Bubble
            text={`A human from eblockwatch will contact you shortly.\n\nIf this is urgent, reply 10.\n\nReply 0 for Main Menu.`}
          />
        </Phone>
      </Section>

      {/* Footer */}
      <div
        style={{
          borderTop: "2px solid #e0e0e0",
          paddingTop: 16,
          fontSize: 11,
          color: "#999",
          textAlign: "center",
        }}
      >
        🛡️ Cyber Chaperone — eblockwatch · All member-facing WhatsApp messages · {new Date().getFullYear()}
        <br />
        Total flows: 10 groups · ~35 distinct message screens
      </div>
    </div>
  );
}
