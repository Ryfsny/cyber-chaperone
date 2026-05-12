export default function Slide06SituationRoom() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #1a2744 0%, #0d1829 100%)" }} />
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "48vw" }}>
          <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "1.5vh" }}>
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
            {[
              { color: "#22c55e", label: "GREEN", desc: "Member is on route, all good" },
              { color: "#f59e0b", label: "AMBER", desc: "Drift detected, check-in requested" },
              { color: "#ef4444", label: "RED", desc: "Distress or no response — escalate now" },
            ].map(({ color, label, desc }) => (
              <div key={label} className="flex items-center gap-[2vw]">
                <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 1.5vw ${color}60` }} />
                <div>
                  <p className="font-display font-bold" style={{ fontSize: "2.2vw", color }}>{label}</p>
                  <p className="font-body" style={{ fontSize: "1.9vw", color: "#8a9ab8" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ marginLeft: "4vw", flex: 1 }}>
          <div style={{ background: "#0d1829", border: "0.15vw solid #2a3d5e", borderRadius: "0.8vw", padding: "2.5vh 2.5vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2vh" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#22c55e" }} />
              <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.4vw", color: "#22c55e" }}>
                Every trip includes
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
              {[
                { title: "Evidence notes", sub: "Structured log of every message" },
                { title: "Route map", sub: "GPS checkpoints, live tracking" },
                { title: "ETA tracking", sub: "Real-time drift detection" },
                { title: "Full message history", sub: "Every WhatsApp & Messenger, timestamped" },
              ].map(({ title, sub }, i, arr) => (
                <div key={title} style={{ borderBottom: i < arr.length - 1 ? "0.1vw solid #1e3050" : undefined, paddingBottom: i < arr.length - 1 ? "1.8vh" : undefined }}>
                  <p className="font-body font-bold" style={{ fontSize: "2vw", color: "#c8d4e8" }}>{title}</p>
                  <p className="font-body" style={{ fontSize: "1.7vw", color: "#6b7a99" }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
