export default function Slide12WhatsNext() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #1a2744 0%, #0d1829 100%)" }} />
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "45vw" }}>
          <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "1.5vh" }}>
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
          <div style={{ width: "4vw", height: "0.35vh", background: "#22c55e" }} />
        </div>

        <div className="flex flex-col justify-center" style={{ marginLeft: "4vw", flex: 1, display: "grid", gridTemplateColumns: "1fr", gap: "1.8vh" }}>
          {[
            "WhatsApp Business number (application in progress)",
            "Full family group WhatsApp onboarding",
            "AI-powered threat inference (Arnie — already in beta)",
            "Voice check-in for areas with poor data",
            "Responder dispatch from the Situation Room",
            "Corporate travel packages",
            "Integration with armed response services",
          ].map((item, i, arr) => (
            <div key={item} className="flex items-center gap-[1.5vw]" style={{ borderBottom: i < arr.length - 1 ? "0.1vw solid #2a3d5e" : undefined, paddingBottom: i < arr.length - 1 ? "1.8vh" : undefined }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8" }}>{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
