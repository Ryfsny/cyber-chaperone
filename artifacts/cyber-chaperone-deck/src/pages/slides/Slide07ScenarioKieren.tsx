export default function Slide07ScenarioKieren() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#f5f3ee" }}>
      <div className="absolute top-0 right-0" style={{ width: "0.6vw", height: "100vh", background: "#1a2744" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw" }}>
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "1.5vh" }}>
          Real scenario
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "3.5vh" }}
        >
          KIEREN'S TRIP TO DURBAN
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh", maxWidth: "80vw" }}>
          <div className="flex items-start gap-[2vw]">
            <span className="font-body font-bold shrink-0" style={{ fontSize: "1.8vw", color: "#6b7a99", width: "8vw" }}>19:00</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Kieren messages: "Leaving home now heading to Oyster Box, Durban. ETA 22:00"
            </p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <span className="font-body font-bold shrink-0" style={{ fontSize: "1.8vw", color: "#22c55e", width: "8vw" }}>19:01</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Green trip created. Route calculated. Checkpoints set.
            </p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <span className="font-body font-bold shrink-0" style={{ fontSize: "1.8vw", color: "#6b7a99", width: "8vw" }}>21:15</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              No check-in at the halfway point. System sends a prompt.
            </p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <span className="font-body font-bold shrink-0" style={{ fontSize: "1.8vw", color: "#f59e0b", width: "8vw" }}>21:30</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Still no reply. Trip turns Amber. ICE contact (Andre) is notified.
            </p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <span className="font-body font-bold shrink-0" style={{ fontSize: "1.8vw", color: "#6b7a99", width: "8vw" }}>21:45</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Kieren replies: "Sorry, stopped for fuel. All good."
            </p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <span className="font-body font-bold shrink-0" style={{ fontSize: "1.8vw", color: "#22c55e", width: "8vw" }}>22:10</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              "I have arrived." Trip closed.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "3vh", borderLeft: "0.4vw solid #e8a020", paddingLeft: "2vw" }}>
          <p className="font-body font-bold" style={{ fontSize: "2.2vw", color: "#1a2744" }}>
            The whole time — Andre was watching. Ready.
          </p>
        </div>
      </div>
    </div>
  );
}
