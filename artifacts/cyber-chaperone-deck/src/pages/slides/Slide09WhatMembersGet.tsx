export default function Slide09WhatMembersGet() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#ffffff" }}>
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />
      <div className="absolute top-0 left-0" style={{ width: "0.5vw", height: "100vh", background: "#22c55e" }} />
      <div className="absolute top-[5vh] right-[5vw]">
        <p className="font-display font-black" style={{ fontSize: "18vw", color: "#1a2744", opacity: 0.03, lineHeight: 1 }}>CC</p>
      </div>

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw 6vh 10vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "50vw" }}>
          <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "1.5vh" }}>
            Member benefits
          </p>
          <h2
            className="font-display font-black tracking-tight"
            style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4vh" }}
          >
            WHAT MEMBERS GET
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.7vh" }}>
            {[
              "Real-time trip monitoring via WhatsApp or Facebook Messenger",
              "Automatic ETA tracking and drift detection",
              "ICE contact notification if you go silent",
              "Route maps with GPS checkpoints",
              "Personal safety dashboard online",
              "Family group memberships",
              "A human operator who is always watching",
            ].map((text) => (
              <div key={text} className="flex items-center gap-[1.5vw]">
                <div style={{ width: "0.6vw", height: "0.6vw", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <p className="font-body" style={{ fontSize: "1.95vw", color: "#1a2744", lineHeight: 1.3 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ marginLeft: "4vw", flex: 1 }}>
          <div style={{ background: "#1a2744", borderRadius: "0.8vw", padding: "3vh 3vw", marginBottom: "2.5vh" }}>
            <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.4vw", color: "#6b7a99", marginBottom: "1.5vh" }}>Individual</p>
            <p className="font-display font-black" style={{ fontSize: "5.5vw", color: "#22c55e", lineHeight: 1 }}>R150</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>per month</p>
          </div>
          <div style={{ background: "#1a2744", borderRadius: "0.8vw", padding: "3vh 3vw", border: "0.2vw solid #22c55e" }}>
            <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.4vw", color: "#22c55e", marginBottom: "1.5vh" }}>Family (up to 5)</p>
            <p className="font-display font-black" style={{ fontSize: "5.5vw", color: "#ffffff", lineHeight: 1 }}>R250</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>per month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
