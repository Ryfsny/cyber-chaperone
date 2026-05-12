export default function Slide12FacebookMessenger() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0d1829 0%, #1a2744 50%, #0d3320 100%)" }} />
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.2vh", background: "rgba(34,197,94,0.3)" }} />

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw" }}>

        <div className="flex flex-col justify-center" style={{ width: "50vw" }}>
          <div className="flex items-center gap-[1vw]" style={{ marginBottom: "2.5vh" }}>
            <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#22c55e" }} />
            <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.5vw", color: "#22c55e" }}>
              Live today
            </p>
          </div>

          <h2
            className="font-display font-black tracking-tight"
            style={{ fontSize: "5vw", color: "#ffffff", lineHeight: 1, marginBottom: "1.5vh" }}
          >
            CYBER CHAPERONE
          </h2>
          <h2
            className="font-display font-black tracking-tight"
            style={{ fontSize: "5vw", color: "#22c55e", lineHeight: 1, marginBottom: "3.5vh" }}
          >
            ON MESSENGER
          </h2>

          <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8", lineHeight: 1.5, marginBottom: "4vh", maxWidth: "42vw" }}>
            Members can now use the full Cyber Chaperone experience via Facebook Messenger — no WhatsApp needed.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
            {[
              "Full trip menu — start, check-in, arrival — all via Messenger",
              "Distress detection — RED alert + auto ICE escalation",
              "First message = auto member record, zero admin",
              "WhatsApp & Messenger feed one Situation Room",
            ].map((item) => (
              <div key={item} className="flex items-start gap-[1.5vw]">
                <div style={{ width: "1.4vw", height: "1.4vw", borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "0.15vw solid #22c55e", flexShrink: 0, marginTop: "0.3vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <p className="font-body" style={{ fontSize: "1.9vw", color: "#c8d4e8", lineHeight: 1.4 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center items-center" style={{ marginLeft: "4vw", flex: 1 }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "2.5vh" }}>

            <div style={{ background: "rgba(34,197,94,0.08)", border: "0.15vw solid rgba(34,197,94,0.4)", borderRadius: "1vw", padding: "2.5vh 2.5vw", display: "flex", alignItems: "center", gap: "2vw" }}>
              <div style={{ width: "3.5vw", height: "3.5vw", borderRadius: "50%", background: "#25D366", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p className="font-display font-black" style={{ fontSize: "1.6vw", color: "#ffffff" }}>W</p>
              </div>
              <div>
                <p className="font-body font-bold" style={{ fontSize: "1.8vw", color: "#22c55e" }}>WhatsApp</p>
                <p className="font-body" style={{ fontSize: "1.5vw", color: "#8a9ab8" }}>Original channel — fully live</p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={{ width: "1vw", height: "0.2vh", background: "#22c55e", opacity: 0.5 }} />
              </div>
            </div>

            <div style={{ background: "rgba(34,197,94,0.08)", border: "0.15vw solid rgba(34,197,94,0.4)", borderRadius: "1vw", padding: "2.5vh 2.5vw", display: "flex", alignItems: "center", gap: "2vw" }}>
              <div style={{ width: "3.5vw", height: "3.5vw", borderRadius: "50%", background: "#0084FF", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p className="font-display font-black" style={{ fontSize: "1.6vw", color: "#ffffff" }}>M</p>
              </div>
              <div>
                <p className="font-body font-bold" style={{ fontSize: "1.8vw", color: "#22c55e" }}>Facebook Messenger</p>
                <p className="font-body" style={{ fontSize: "1.5vw", color: "#8a9ab8" }}>New channel — live as of today</p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={{ width: "1vw", height: "0.2vh", background: "#22c55e", opacity: 0.5 }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ width: "0.2vw", height: "3vh", background: "rgba(34,197,94,0.4)" }} />
            </div>

            <div style={{ background: "rgba(34,197,94,0.12)", border: "0.2vw solid #22c55e", borderRadius: "1vw", padding: "2.5vh 2.5vw", display: "flex", alignItems: "center", gap: "2vw" }}>
              <div style={{ width: "3.5vw", height: "3.5vw", borderRadius: "0.6vw", background: "#1a2744", border: "0.15vw solid rgba(34,197,94,0.5)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p className="font-display font-black" style={{ fontSize: "1.2vw", color: "#22c55e" }}>SR</p>
              </div>
              <div>
                <p className="font-body font-bold" style={{ fontSize: "1.8vw", color: "#ffffff" }}>One Situation Room</p>
                <p className="font-body" style={{ fontSize: "1.5vw", color: "#8a9ab8" }}>All platforms. One operator. Always watching.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
