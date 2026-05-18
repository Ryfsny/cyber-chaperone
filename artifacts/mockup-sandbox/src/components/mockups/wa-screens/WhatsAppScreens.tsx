
const GREEN = "#25D366";
const GREEN_DARK = "#128C7E";
const BUBBLE_IN = "#FFFFFF";
const BUBBLE_OUT = "#D9FDD3";
const TIME_COLOR = "#8696A0";

function renderText(s: string) {
  return s.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*")
      ? <strong key={i} style={{ fontWeight: 600 }}>{part.slice(1, -1)}</strong>
      : <span key={i}>{part}</span>
  );
}

function Bubble({ text, dir, time = "09:41" }: { text: string; dir: "in" | "out"; time?: string }) {
  const isIn = dir === "in";
  return (
    <div style={{ display: "flex", justifyContent: isIn ? "flex-start" : "flex-end", marginBottom: 2, padding: "0 8px" }}>
      <div style={{
        position: "relative",
        background: isIn ? BUBBLE_IN : BUBBLE_OUT,
        borderRadius: isIn ? "0 10px 10px 10px" : "10px 0 10px 10px",
        padding: "7px 46px 16px 9px",
        maxWidth: "86%",
        boxShadow: "0 1px 2px rgba(0,0,0,0.09)",
        fontSize: 12.5,
        lineHeight: 1.45,
        color: "#111",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        <div style={{
          position: "absolute", top: 0,
          ...(isIn ? { left: -6 } : { right: -6 }),
          width: 0, height: 0, borderStyle: "solid",
          borderWidth: isIn ? "0 7px 9px 0" : "0 0 9px 7px",
          borderColor: isIn
            ? `transparent ${BUBBLE_IN} transparent transparent`
            : `transparent transparent transparent ${BUBBLE_OUT}`,
        }} />
        {renderText(text)}
        <span style={{ position: "absolute", bottom: 4, right: 6, fontSize: 10, color: TIME_COLOR, whiteSpace: "nowrap" }}>
          {time}{!isIn && <span style={{ color: GREEN_DARK }}> ✓✓</span>}
        </span>
      </div>
    </div>
  );
}

function StepLabel({ trigger, intent }: { trigger: string; intent?: string }) {
  return (
    <div style={{ margin: "12px 8px 4px", padding: "6px 10px", background: "#F0F7FF", borderLeft: "3px solid #90CAF9", borderRadius: "0 6px 6px 0" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1565C0", textTransform: "uppercase", letterSpacing: 0.4 }}>{trigger}</div>
      {intent && <div style={{ fontSize: 10.5, color: "#555", marginTop: 2 }}>{intent}</div>}
    </div>
  );
}

function Phone({ title, accent = GREEN_DARK, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 310, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.10)", border: "1px solid #e8e8e8", flexShrink: 0 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E9EDEF", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/eblockwatch-logo.png" alt="eblockwatch" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 17 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>Cyber Chaperone</div>
          <div style={{ fontSize: 11, color: accent }}>eblockwatch · Always watching 🛡️</div>
        </div>
      </div>
      {/* Title strip */}
      <div style={{ background: accent, padding: "5px 14px" }}>
        <div style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{title}</div>
      </div>
      {/* Chat */}
      <div style={{ background: "#F0F2F5", padding: "4px 0 12px", overflowY: "auto", flex: 1 }}>
        {children}
      </div>
      {/* Input bar */}
      <div style={{ background: "#fff", borderTop: "1px solid #E9EDEF", padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, background: "#F0F2F5", borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#aaa" }}>Message</div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎤</div>
      </div>
    </div>
  );
}

export default function WhatsAppScreens() {
  return (
    <div style={{ fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif", background: "#FAFAFA", minHeight: "100vh", padding: "28px 28px 60px" }}>

      {/* Page title */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <img src="/eblockwatch-logo.png" alt="eblockwatch" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>Cyber Chaperone — Complete Trip Journey</div>
            <div style={{ fontSize: 13, color: "#666" }}>Full conversation walkthrough · annotated with triggers and intent</div>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* ─── PATH A: HAPPY PATH ─────────────────────────────────────────── */}
        <Phone title="Path A — Everything Goes Smoothly" accent={GREEN_DARK}>

          <StepLabel trigger="Member opens WhatsApp, says Hi" intent="First touch — show them the door, nothing overwhelming." />
          <Bubble dir="out" text="Hi" time="14:00" />
          <Bubble dir="in" time="14:00" text={`🛡️ *eblockwatch — Cyber Chaperone*

Hi Kieren. I'm Arnie — André Snyman's digital assistant.
We have one job: get you there safely, every time.

✅ Verified member — Individual plan

1️⃣  Cyber Chaperone 🛡️
2️⃣  What is eblockwatch?
3️⃣  Membership options
4️⃣  Activate my membership
5️⃣  👤 My Account
7️⃣  Speak to a person
8️⃣  📣 Invite a Friend
9️⃣  📖 Getting Started Guide

🚨 *EMERGENCY? Reply 10*`} />

          <StepLabel trigger="Member wants to travel — replies 1" intent="Open Cyber Chaperone sub-menu. Keep it simple: home or road?" />
          <Bubble dir="out" text="1" time="14:01" />
          <Bubble dir="in" time="14:01" text={`🛡️ *Cyber Chaperone — Kieren*

─── 🏠 Safe zone ───
8️⃣  I need help 🆘
9️⃣  Speak to André

─── 🚗 On the road ───
1️⃣  Start a monitored drive
2️⃣  Clock me in — I'll be home later
3️⃣  Update my trip
4️⃣  Change destination
5️⃣  I have arrived ✅

6️⃣  How it works

Reply 0 for Main Menu.`} />

          <StepLabel trigger="Member starts a drive — replies 1" intent="Ask where they're coming from. If we have their home saved, make it a one-tap confirm." />
          <Bubble dir="out" text="1" time="14:02" />
          <Bubble dir="in" time="14:02" text={`Kieren, are you starting from Home 🏠?

1. Yes — start from Home
2. No — I'm somewhere else

Or drop a location pin 📍

Reply 0 for Main Menu.`} />

          <Bubble dir="out" text="1" time="14:02" />
          <Bubble dir="in" time="14:02" text={`Got it — starting from Home 🏠.

Where are you heading today?`} />

          <Bubble dir="out" text="Going to see my mom in Pretoria" time="14:03" />
          <Bubble dir="in" time="14:03" text={`Lovely — Pretoria it is. 🏡

What time do you expect to arrive? (e.g. 15:30)`} />

          <StepLabel trigger="Member gives ETA — trip launches" intent="Confirm everything. Warm, personal. Let them feel covered without feeling watched." />
          <Bubble dir="out" text="About 15:30" time="14:03" />
          <Bubble dir="in" time="14:03" text={`✅ *You're covered, Kieren!*

Home → Pretoria
ETA: 15:30 · about 1h 25min

I'll check in with you at Midrand.
If you're not at your mom's by 15:30 — I'll message you.

Enjoy the drive. 🛡️

Reply *5* when you arrive.
Reply *10* if you ever need us.`} />

          <StepLabel trigger="Scheduler fires checkpoint ping at Midrand" intent="Friendly mid-route check. One reply and they're good. Don't make it feel like a test." />
          <Bubble dir="in" time="14:52" text={`Kieren 👋 Just checking in — *Midrand* checkpoint.

Are you through?

1. ✅ Yes, passing through now
2. 🕐 Still on the way
3. 🆘 I need help`} />
          <Bubble dir="out" text="1" time="14:53" />
          <Bubble dir="in" time="14:53" text={`✅ On track to Pretoria!

ETA still 15:28. We're with you all the way. 🛡️`} />

          <StepLabel trigger="ETA reached — scheduler sends arrival check" intent="Soft ping. They probably arrived fine — just need the confirmation tap." />
          <Bubble dir="in" time="15:30" text={`Kieren, you should be near Pretoria by now. 🏡

Have you arrived safely?

1. Yes — I'm there ✅
2. Running a bit late
3. I need help`} />
          <Bubble dir="out" text="1" time="15:31" />

          <StepLabel trigger="Member confirms arrival — trip closes. Personalise it." intent="Warm close. Acknowledge the trip. This is their 3rd — mention it. Make them feel seen." />
          <Bubble dir="in" time="15:31" text={`🎉 *Made it, Kieren!*

Pretoria ✅ · 15:31

That's your *3rd trip* with Cyber Chaperone.
Every one covered. Every one safe.

Give your mom our regards. 😊
See you on the next journey. 🛡️`} />

        </Phone>

        {/* ─── PATH B: ESCALATION PATH ───────────────────────────────────────── */}
        <Phone title="Path B — Member Doesn't Respond" accent="#B71C1C">

          <StepLabel trigger="Same trip start — same conversation" intent="Identical opening. The difference only happens after ETA is missed." />
          <Bubble dir="out" text="Hi" time="14:00" />
          <Bubble dir="in" time="14:00" text={`🛡️ *eblockwatch — Cyber Chaperone*

Hi Kieren. Welcome back.

✅ Verified member — Individual plan

1️⃣  Cyber Chaperone 🛡️
9️⃣  📖 Getting Started Guide
🚨 *EMERGENCY? Reply 10*`} />
          <Bubble dir="out" text="1" time="14:01" />
          <Bubble dir="out" text="1" time="14:02" />
          <Bubble dir="out" text="1" time="14:02" />
          <Bubble dir="out" text="Going to Pretoria" time="14:03" />
          <Bubble dir="out" text="15:30" time="14:03" />
          <Bubble dir="in" time="14:03" text={`✅ *You're covered, Kieren!*

Home → Pretoria · ETA 15:30

I'll check in at Midrand.
Reply *5* when you arrive. Reply *10* for help.

Enjoy the drive. 🛡️`} />

          <StepLabel trigger="Checkpoint passes without reply — ETA reached" intent="They missed the checkpoint ping too. Now ETA has passed. Phase 1 — gentle. Keep the tone calm." />
          <Bubble dir="in" time="15:30" text={`Kieren, you should be near Pretoria by now. 🏡

Have you arrived safely?

1. Yes — I'm there ✅
2. Running a bit late
3. I need help`} />

          <StepLabel trigger="No reply after 10 minutes — AMBER" intent="We're getting concerned. Tone shifts slightly — more direct, still human. Not alarming yet." />
          <Bubble dir="in" time="15:40" text={`Kieren, we haven't had your arrival confirmation yet.

You're overdue at Pretoria.

Are you okay?

1. I'm okay — I've arrived
2. I'm delayed — give me time
3. Send my location
4. I need help`} />

          <StepLabel trigger="Still no reply at +25 min — RED. ICE + André alerted." intent="Now it's serious. Message is short, clear. ICE gets alerted in the background simultaneously." />
          <Bubble dir="in" time="15:55" text={`Kieren, we haven't been able to reach you.

You are *28 minutes* overdue at Pretoria.

We are escalating this now.

Reply *1* if you're okay.
Reply *10* if you need help.`} />

          <StepLabel trigger="ICE contact (Mary) receives this alert simultaneously" intent="ICE gets a direct WhatsApp. No human relay needed — the system fires it automatically." />
          <Bubble dir="in" time="15:55" text={`🆘 *eblockwatch — URGENT*

Hi Mary,

You are the emergency contact for *Kieren Snyman*.

Kieren was due in Pretoria at 15:30 and has not responded to check-ins.
They are now 28 minutes overdue.

📍 Last known route: Home → Pretoria
👉 Contact Kieren: wa.me/27833263751

André at eblockwatch is monitoring.
Reply with any update.

— eblockwatch`} />

          <StepLabel trigger="André receives operator mirror on his phone" intent="André is aware and can take over at any point. ICE note confirms who was contacted." />
          <Bubble dir="in" time="15:55" text={`🚨 RED — No arrival confirmation.

Member: Kieren Snyman
Trip: Home → Pretoria · Trip #42
Overdue: 28 minutes
ICE alerted: Mary (+27820000000)

Human review required.`} />

          <StepLabel trigger="Member finally replies — they were in a dead zone" intent="Warm resolution. Relief, not lecture. Acknowledge what happened. Remind them the one-tap trick for next time." />
          <Bubble dir="out" text="So sorry! Was in a tunnel with no signal. I'm at mom's, all good 😅" time="16:05" />
          <Bubble dir="in" time="16:05" text={`Kieren! We're so relieved. 😊

Trip closed — *Pretoria ✅ · 16:05*

We did contact Mary — she'll be glad to hear you're safe.
Quick message to let her know? 👉 wa.me/...

Next time, a quick *2* (I'm delayed) keeps us calm.
One tap. That's all it takes.

That was your *3rd trip* with us. All safe, all good.

See you on the next one. 🛡️`} />

        </Phone>

        {/* ─── PATH C: CLOCK-IN ─── */}
        <Phone title="Path C — Evening Clock-in (Going Out)" accent="#6A1B9A">

          <StepLabel trigger="Member is going out for the evening, not driving" intent="Different flow — no destination, just a home-by time. Relaxed, evening tone." />
          <Bubble dir="out" text="1" time="19:00" />
          <Bubble dir="in" time="19:00" text={`🛡️ *Cyber Chaperone — Kieren*

─── 🏠 Safe zone ───
8️⃣  I need help 🆘
9️⃣  Speak to André

─── 🚗 On the road ───
1️⃣  Start a monitored drive
2️⃣  Clock me in — I'll be home later
3️⃣  Update my trip
5️⃣  I have arrived ✅

Reply 0 for Main Menu.`} />

          <Bubble dir="out" text="2" time="19:01" />
          <Bubble dir="in" time="19:01" text={`Kieren, what time will you be home tonight? 🏠

Just send the time — e.g. 11pm or 23:00

We'll message you then to check you're safe.`} />

          <Bubble dir="out" text="11pm" time="19:02" />
          <StepLabel trigger="Member sets clock-in time — confirm warmly" intent="Evening tone. Friendly send-off. Let them go enjoy themselves." />
          <Bubble dir="in" time="19:02" text={`✅ Done, Kieren.

We'll ping you at 23:00.
When you're home, just reply *SAFE*.

If we don't hear from you — we'll follow up.

Enjoy your evening. 🌙`} />

          <StepLabel trigger="23:00 — scheduler fires deadline ping" intent="Soft, warm. Not alarming. One-word reply and everything is fine." />
          <Bubble dir="in" time="23:00" text={`Hi Kieren 👋

Are you home safely?

Reply *SAFE* if yes.
Reply *10* if you need help.`} />

          <Bubble dir="out" text="SAFE 🏠" time="23:06" />
          <StepLabel trigger="Member replies SAFE — close the clock-in warmly" intent="Warm close. Brief. They're home. Let them go to bed." />
          <Bubble dir="in" time="23:06" text={`Good to hear. 🏠

Sleep well, Kieren. 🌙`} />

          <div style={{ height: 12 }} />
          <StepLabel trigger="What if they DON'T reply to the 23:00 ping?" intent="Same 3-phase escalation: +20 min André nudge, +40 min ICE contact, trip → AMBER." />
          <Bubble dir="in" time="23:00" text={`Hi Kieren 👋

Are you home safely?

Reply *SAFE* if yes.
Reply *10* if you need help.`} />
          <Bubble dir="in" time="23:20" text={`🏠 Kieren, still waiting to hear from you.

Are you home okay?

Reply *SAFE* · Reply *10* for help.`} />
          <Bubble dir="in" time="23:42" text={`Hi Mary,

This is eblockwatch. We look after *Kieren*.

Kieren was supposed to be home by 23:00.
We have tried to reach them. No reply.

Please check on them now.
👉 wa.me/27833263751

Reply if you need us to do more.

— eblockwatch`} />

        </Phone>

      </div>

      {/* Footer */}
      <div style={{ marginTop: 36, padding: "14px 20px", background: "#fff", borderRadius: 10, border: "1px solid #e8e8e8", maxWidth: 980 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>Key UX principles across all flows</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 20px" }}>
          {[
            ["Every message has one clear next action", "No dead ends — the member always knows what to reply"],
            ["Warm, personal, first name always", "Not 'the user' — always Kieren. André's voice throughout."],
            ["Trip count on arrival", "1st trip, 2nd trip, 3rd trip — they feel seen and valued"],
            ["One-tap recovery", "Reply 1, 2 or SAFE — never more than that to stay green"],
            ["ICE fires automatically", "No human relay — system WhatsApps the ICE contact directly"],
            ["Escalation is a ladder, not a jump", "GREEN → AMBER → RED, never skipping, always giving a chance"],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{title}</div>
                <div style={{ fontSize: 11, color: "#666" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
