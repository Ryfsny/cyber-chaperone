export default function Slide12WhatsNext() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#1a2744" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #1a2744 0%, #0d1829 100%)" }} />

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "45vw" }}>
          <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "1.5vh" }}>
            The roadmap
          </p>
          <h2
            className="font-display font-black tracking-tight"
            style={{ fontSize: "5.5vw", color: "#ffffff", lineHeight: 1, marginBottom: "2.5vh" }}
          >
            WHAT'S COMING NEXT
          </h2>
          <p className="font-body" style={{ fontSize: "2vw", color: "#8a9ab8", lineHeight: 1.5, marginBottom: "4vh" }}>
            The foundation is live. Now we build out.
          </p>
          <div style={{ width: "5vw", height: "0.4vh", background: "#e8a020" }} />
        </div>

        <div className="flex flex-col justify-center" style={{ marginLeft: "4vw", flex: 1, display: "grid", gridTemplateColumns: "1fr", gap: "1.8vh" }}>
          <div className="flex items-center gap-[1.5vw]" style={{ borderBottom: "0.1vw solid #2a3d5e", paddingBottom: "1.8vh" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>WhatsApp Business number (application in progress)</p>
          </div>
          <div className="flex items-center gap-[1.5vw]" style={{ borderBottom: "0.1vw solid #2a3d5e", paddingBottom: "1.8vh" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Full family group WhatsApp onboarding</p>
          </div>
          <div className="flex items-center gap-[1.5vw]" style={{ borderBottom: "0.1vw solid #2a3d5e", paddingBottom: "1.8vh" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>AI-powered threat inference (Arnie — already in beta)</p>
          </div>
          <div className="flex items-center gap-[1.5vw]" style={{ borderBottom: "0.1vw solid #2a3d5e", paddingBottom: "1.8vh" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Voice check-in for areas with poor data</p>
          </div>
          <div className="flex items-center gap-[1.5vw]" style={{ borderBottom: "0.1vw solid #2a3d5e", paddingBottom: "1.8vh" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Responder dispatch from the Situation Room</p>
          </div>
          <div className="flex items-center gap-[1.5vw]" style={{ borderBottom: "0.1vw solid #2a3d5e", paddingBottom: "1.8vh" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Corporate travel packages</p>
          </div>
          <div className="flex items-center gap-[1.5vw]">
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", flexShrink: 0 }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>Integration with armed response services</p>
          </div>
        </div>
      </div>
    </div>
  );
}
