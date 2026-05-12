export default function Slide09WhatMembersGet() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#f5f3ee" }}>
      <div className="absolute top-0 left-0" style={{ width: "0.6vw", height: "100vh", background: "#e8a020" }} />
      <div className="absolute top-[5vh] right-[5vw]">
        <p className="font-display font-black" style={{ fontSize: "18vw", color: "#1a2744", opacity: 0.04, lineHeight: 1 }}>CC</p>
      </div>

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw 6vh 10vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "50vw" }}>
          <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "1.5vh" }}>
            Member benefits
          </p>
          <h2
            className="font-display font-black tracking-tight"
            style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4vh" }}
          >
            WHAT MEMBERS GET
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
            <div className="flex items-center gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.3 }}>Real-time trip monitoring via WhatsApp</p>
            </div>
            <div className="flex items-center gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.3 }}>Automatic ETA tracking and drift detection</p>
            </div>
            <div className="flex items-center gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.3 }}>ICE contact notification if you go silent</p>
            </div>
            <div className="flex items-center gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.3 }}>Route maps with GPS checkpoints</p>
            </div>
            <div className="flex items-center gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.3 }}>Personal safety dashboard online</p>
            </div>
            <div className="flex items-center gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.3 }}>Family group memberships</p>
            </div>
            <div className="flex items-center gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.3 }}>A human operator who is always watching</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ marginLeft: "4vw", flex: 1 }}>
          <div style={{ background: "#1a2744", borderRadius: "0.8vw", padding: "3vh 3vw", marginBottom: "2.5vh" }}>
            <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.4vw", color: "#6b7a99", marginBottom: "1.5vh" }}>Individual</p>
            <p className="font-display font-black" style={{ fontSize: "5.5vw", color: "#e8a020", lineHeight: 1 }}>R150</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>per month</p>
          </div>
          <div style={{ background: "#1a2744", borderRadius: "0.8vw", padding: "3vh 3vw", border: "0.2vw solid #e8a020" }}>
            <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.4vw", color: "#e8a020", marginBottom: "1.5vh" }}>Family (up to 5)</p>
            <p className="font-display font-black" style={{ fontSize: "5.5vw", color: "#ffffff", lineHeight: 1 }}>R250</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>per month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
