export default function Slide05HowItWorks() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#ffffff" }}>
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />
      <div className="absolute top-0 left-0" style={{ width: "0.5vw", height: "100vh", background: "#22c55e" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw 0 10vw" }}>
        <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "1.5vh" }}>
          In 30 seconds
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4vh" }}
        >
          HOW IT WORKS
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vh 6vw" }}>
          {[
            { n: "1", text: 'Member sends a message: "Leaving Fourways, heading to Sandton. ETA 14:30"' },
            { n: "2", text: "Cyber Chaperone creates a live trip record instantly" },
            { n: "3", text: "The Situation Room lights up — operator monitors in real time" },
            { n: "4", text: "If the member goes silent past their ETA — automatic check-in sent" },
            { n: "5", text: "No response — ICE contact alerted, operator escalates" },
            { n: "6", text: "Safe arrival message — trip closed. Family notified." },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-[1.5vw]">
              <span className="font-display font-black shrink-0" style={{ fontSize: "3.5vw", color: "#22c55e", lineHeight: 1 }}>{n}</span>
              <p className="font-body" style={{ fontSize: "1.9vw", color: "#1a2744", lineHeight: 1.4, paddingTop: "0.4vh" }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
