import logoSrc from "../../assets/eblockwatch-logo.png";

export default function WhatsAppDualView() {
  const operatorMessages = [
    { from: "me", text: "🎤 I'm at home and going to Woolworths, leaving in 5 minutes." },
    {
      from: "bot",
      text: "Got it Andre. When you're ready, send your live location or type:\n\nLeaving from Bryanston to Woolworths Fourways ETA 15 min\n\nThat will open a trip, calculate the route, and set up your safety check-ins automatically.",
    },
    { from: "me", text: "🎤 What about my ETA and the members around me?" },
    {
      from: "bot",
      text: "Both are already live.\n\nETA: calculated via OSRM routing the moment you start a trip. No Google Maps needed.\n\nNearby members: when you start a trip or drop a location pin, the system counts responders within 30km and tells you — e.g. \"7 eblockwatch members standing by within 30km of you.\"\n\nJust start the trip and you'll see both.",
    },
  ];

  const memberMessages = [
    { from: "me", text: "Hi" },
    {
      from: "bot",
      text: "👋 Welcome to eblockwatch, Kieren!\n\n1. What is eblockwatch\n2. Membership options\n3. Activate membership\n4. Update my profile\n5. Travel with Cyber Chaperone\n6. eblockshop\n7. Speak to a human\n\nReply 10 for EMERGENCY.\nReply 0 for this menu anytime.",
    },
    { from: "me", text: "5" },
    {
      from: "bot",
      text: "🛡️ Cyber Chaperone\n\n1. Start a trip\n2. Check my active trip\n3. Update my ETA\n4. eblockshop\n5. ICE contact details\n6. Back to Main Menu\n\nReply 0 for Main Menu.",
    },
    { from: "me", text: "1" },
    {
      from: "bot",
      text: "Where are you leaving from?\n\nYou can type an address, suburb or city — or drop a 📍 live location pin.\n\nReply 0 to cancel.",
    },
    { from: "me", text: "Bryanston" },
    { from: "bot", text: "Got it — leaving from Bryanston. Where are you heading?\n\nReply 0 to cancel." },
    { from: "me", text: "Woolworths Fourways" },
    { from: "bot", text: "What time do you expect to arrive? (e.g. 14:30 or 45 min)\n\nReply 0 to cancel." },
    { from: "me", text: "20 min" },
    {
      from: "bot",
      text: "✅ Your trip is now active.\n\nWe will check in with you at Fourways.\n\n👥 There are 4 eblockwatch members standing by within 30km of you.\n\nReply ARRIVED when you reach Woolworths Fourways.\n\nReply 0 for Main Menu.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b141a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        gap: 24,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
          eblockwatch · Cyber Chaperone
        </div>
        <div style={{ color: "#e9edef", fontWeight: 700, fontSize: 20 }}>
          What each person sees on WhatsApp
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
          maxWidth: 900,
        }}
      >
        <Phone
          label="👔 BOSS (Andre)"
          sublabel="+27825611065 · Operator"
          headerColor="#1a3a2a"
          accentColor="#22c55e"
          messages={operatorMessages}
          contactName="Cyber Chaperone AI"
          contactInitial="CC"
        />
        <Phone
          label="👤 MEMBER (Kieren)"
          sublabel="+27833263751 · Entry Level"
          headerColor="#1a2a3a"
          accentColor="#22c55e"
          messages={memberMessages}
          contactName="eblockwatch"
          contactInitial="EB"
        />
      </div>

      <div
        style={{
          background: "#1f2c34",
          borderRadius: 10,
          padding: "12px 20px",
          color: "#8696a0",
          fontSize: 12,
          maxWidth: 640,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: "#22c55e", fontWeight: 600 }}>Boss number</span> — bypasses all menus, talks directly to the Claude AI assistant who knows the full system.<br />
        <span style={{ color: "#22c55e", fontWeight: 600 }}>Member number</span> — sees the full structured menu, trip flow, eblockshop, and nearby count.
      </div>
    </div>
  );
}

function Phone({
  label,
  sublabel,
  headerColor,
  accentColor,
  messages,
  contactName,
  contactInitial,
}: {
  label: string;
  sublabel: string;
  headerColor: string;
  accentColor: string;
  messages: { from: string; text: string }[];
  contactName: string;
  contactInitial: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ color: "#e9edef", fontWeight: 700, fontSize: 15, textAlign: "center" }}>{label}</div>
      <div style={{ color: "#8696a0", fontSize: 12, marginBottom: 4 }}>{sublabel}</div>

      {/* Phone shell */}
      <div
        style={{
          width: 320,
          background: "#111b21",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
          border: "2px solid #2a3942",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            background: "#1f2c34",
            padding: "8px 16px 4px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#8696a0",
          }}
        >
          <span>09:41</span>
          <span>▌▌▌ WiFi ■</span>
        </div>

        {/* Chat header */}
        <div
          style={{
            background: headerColor,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              border: `2px solid ${accentColor}`,
            }}
          >
            <img
              src={logoSrc}
              alt="eblockwatch"
              style={{ width: 34, height: 34, objectFit: "contain" }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
                if (el.parentElement) {
                  el.parentElement.style.background = accentColor;
                  el.parentElement.textContent = contactInitial;
                }
              }}
            />
          </div>
          <div>
            <div style={{ color: "#e9edef", fontWeight: 600, fontSize: 14 }}>{contactName}</div>
            <div style={{ color: "#8696a0", fontSize: 11 }}>online</div>
          </div>
        </div>

        {/* Chat body */}
        <div
          style={{
            background: "#0b141a",
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.from === "me" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  background: msg.from === "me" ? "#005c4b" : "#202c33",
                  color: "#e9edef",
                  borderRadius: msg.from === "me" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "7px 10px",
                  maxWidth: "82%",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.text}
                <div style={{ color: "#8696a0", fontSize: 10, textAlign: "right", marginTop: 2 }}>
                  {String(9 + Math.floor(i / 2)).padStart(2, "0")}:{String(41 + i * 3 > 59 ? (41 + i * 3) - 60 : 41 + i * 3).padStart(2, "0")} ✓✓
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div
          style={{
            background: "#1f2c34",
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "#2a3942",
              borderRadius: 20,
              padding: "8px 14px",
              color: "#8696a0",
              fontSize: 12,
            }}
          >
            Type a message
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
            }}
          >
            🎤
          </div>
        </div>
      </div>
    </div>
  );
}
