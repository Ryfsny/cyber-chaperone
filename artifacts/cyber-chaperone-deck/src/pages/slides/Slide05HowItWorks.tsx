export default function Slide05HowItWorks() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#f5f3ee" }}>
      <div className="absolute top-0 left-0" style={{ width: "0.6vw", height: "100vh", background: "#e8a020" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw 0 10vw" }}>
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "1.5vh" }}>
          In 30 seconds
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4vh" }}
        >
          HOW IT WORKS
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vh 6vw" }}>
          <div className="flex items-start gap-[1.5vw]">
            <span className="font-display font-black shrink-0" style={{ fontSize: "3.5vw", color: "#e8a020", lineHeight: 1 }}>1</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4, paddingTop: "0.4vh" }}>
              Member sends a WhatsApp: "Leaving Fourways, heading to Sandton. ETA 14:30"
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <span className="font-display font-black shrink-0" style={{ fontSize: "3.5vw", color: "#e8a020", lineHeight: 1 }}>2</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4, paddingTop: "0.4vh" }}>
              Cyber Chaperone creates a live trip record instantly
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <span className="font-display font-black shrink-0" style={{ fontSize: "3.5vw", color: "#e8a020", lineHeight: 1 }}>3</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4, paddingTop: "0.4vh" }}>
              The Situation Room lights up — operator monitors in real time
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <span className="font-display font-black shrink-0" style={{ fontSize: "3.5vw", color: "#e8a020", lineHeight: 1 }}>4</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4, paddingTop: "0.4vh" }}>
              If the member goes silent past their ETA — automatic check-in sent
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <span className="font-display font-black shrink-0" style={{ fontSize: "3.5vw", color: "#e8a020", lineHeight: 1 }}>5</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4, paddingTop: "0.4vh" }}>
              No response — ICE contact alerted, operator escalates
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <span className="font-display font-black shrink-0" style={{ fontSize: "3.5vw", color: "#e8a020", lineHeight: 1 }}>6</span>
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4, paddingTop: "0.4vh" }}>
              Safe arrival message — trip closed. Family notified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
