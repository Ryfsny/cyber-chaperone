export default function Slide07ScenarioKieren() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#ffffff" }}>
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />
      <div className="absolute top-0 right-0" style={{ width: "0.5vw", height: "100vh", background: "#1a2744" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw" }}>
        <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "1.5vh" }}>
          Real scenario
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "3.5vh" }}
        >
          KIEREN'S TRIP TO DURBAN
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh", maxWidth: "80vw" }}>
          {[
            { time: "19:00", color: "#6b7a99", text: 'Kieren messages: "Leaving home now heading to Oyster Box, Durban. ETA 22:00"' },
            { time: "19:01", color: "#22c55e", text: "Green trip created. Route calculated. Checkpoints set." },
            { time: "21:15", color: "#6b7a99", text: "No check-in at the halfway point. System sends a prompt." },
            { time: "21:30", color: "#f59e0b", text: "Still no reply. Trip turns Amber. ICE contact (Andre) is notified." },
            { time: "21:45", color: "#6b7a99", text: 'Kieren replies: "Sorry, stopped for fuel. All good."' },
            { time: "22:10", color: "#22c55e", text: '"I have arrived." Trip closed.' },
          ].map(({ time, color, text }) => (
            <div key={time} className="flex items-start gap-[2vw]">
              <span className="font-body font-bold shrink-0" style={{ fontSize: "1.8vw", color, width: "8vw" }}>{time}</span>
              <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "3vh", borderLeft: "0.4vw solid #22c55e", paddingLeft: "2vw" }}>
          <p className="font-body font-bold" style={{ fontSize: "2.2vw", color: "#1a2744" }}>
            The whole time — Andre was watching. Ready.
          </p>
        </div>
      </div>
    </div>
  );
}
