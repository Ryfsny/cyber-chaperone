export default function Slide06SituationRoom() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#1a2744" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #1a2744 0%, #0d1829 100%)" }} />

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "48vw" }}>
          <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "1.5vh" }}>
            Command centre
          </p>
          <h2
            className="font-display font-black tracking-tight"
            style={{ fontSize: "5.5vw", color: "#ffffff", lineHeight: 1, marginBottom: "4vh" }}
          >
            THE SITUATION ROOM
          </h2>
          <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8", marginBottom: "4vh", lineHeight: 1.5 }}>
            Our operator command centre — live at all times.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
            <div className="flex items-center gap-[2vw]">
              <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <div>
                <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#22c55e" }}>GREEN</p>
                <p className="font-body" style={{ fontSize: "1.9vw", color: "#8a9ab8" }}>Member is on route, all good</p>
              </div>
            </div>
            <div className="flex items-center gap-[2vw]">
              <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
              <div>
                <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#f59e0b" }}>AMBER</p>
                <p className="font-body" style={{ fontSize: "1.9vw", color: "#8a9ab8" }}>Drift detected, check-in requested</p>
              </div>
            </div>
            <div className="flex items-center gap-[2vw]">
              <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
              <div>
                <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#ef4444" }}>RED</p>
                <p className="font-body" style={{ fontSize: "1.9vw", color: "#8a9ab8" }}>Distress or no response — escalate now</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ marginLeft: "4vw", flex: 1 }}>
          <div style={{ background: "#0d1829", border: "0.15vw solid #2a3d5e", borderRadius: "0.8vw", padding: "2.5vh 2.5vw" }}>
            <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.4vw", color: "#6b7a99", marginBottom: "2vh" }}>
              Every trip includes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
              <div style={{ borderBottom: "0.1vw solid #1e3050", paddingBottom: "1.8vh" }}>
                <p className="font-body font-bold" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Evidence notes</p>
                <p className="font-body" style={{ fontSize: "1.7vw", color: "#6b7a99" }}>Structured log of every message</p>
              </div>
              <div style={{ borderBottom: "0.1vw solid #1e3050", paddingBottom: "1.8vh" }}>
                <p className="font-body font-bold" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Route map</p>
                <p className="font-body" style={{ fontSize: "1.7vw", color: "#6b7a99" }}>GPS checkpoints, live tracking</p>
              </div>
              <div style={{ borderBottom: "0.1vw solid #1e3050", paddingBottom: "1.8vh" }}>
                <p className="font-body font-bold" style={{ fontSize: "2vw", color: "#c8d4e8" }}>ETA tracking</p>
                <p className="font-body" style={{ fontSize: "1.7vw", color: "#6b7a99" }}>Real-time drift detection</p>
              </div>
              <div>
                <p className="font-body font-bold" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Full message history</p>
                <p className="font-body" style={{ fontSize: "1.7vw", color: "#6b7a99" }}>Every WhatsApp, timestamped</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
