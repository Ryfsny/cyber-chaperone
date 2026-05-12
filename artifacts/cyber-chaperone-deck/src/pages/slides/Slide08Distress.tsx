export default function Slide08Distress() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#1a0a0a" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.15) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.5vh", background: "#ef4444" }} />

      <div className="absolute inset-0 flex" style={{ padding: "6vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "50vw" }}>
          <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#ef4444", marginBottom: "2vh" }}>
            Real scenario
          </p>
          <h2
            className="font-display font-black tracking-tight"
            style={{ fontSize: "5.5vw", color: "#ffffff", lineHeight: 1, marginBottom: "4vh" }}
          >
            DISTRESS SIGNAL
          </h2>

          <div style={{ background: "rgba(239,68,68,0.1)", border: "0.15vw solid rgba(239,68,68,0.3)", borderRadius: "0.6vw", padding: "2.5vh 2.5vw", marginBottom: "3.5vh" }}>
            <p className="font-body" style={{ fontSize: "1.6vw", color: "#9ca3af", marginBottom: "0.8vh" }}>Member sends:</p>
            <p className="font-display font-black" style={{ fontSize: "3.5vw", color: "#ffffff" }}>"I need help"</p>
          </div>

          <p className="font-body font-bold" style={{ fontSize: "2vw", color: "#c8d4e8", marginBottom: "3vh" }}>
            In under 3 seconds:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div className="flex items-start gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#ef4444", marginTop: "1vh", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8", lineHeight: 1.4 }}>Trip escalates to RED</p>
            </div>
            <div className="flex items-start gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#ef4444", marginTop: "1vh", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8", lineHeight: 1.4 }}>ICE contact receives an urgent WhatsApp</p>
            </div>
            <div className="flex items-start gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#ef4444", marginTop: "1vh", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8", lineHeight: 1.4 }}>Operator dashboard fires an alert</p>
            </div>
            <div className="flex items-start gap-[1.5vw]">
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#ef4444", marginTop: "1vh", flexShrink: 0 }} />
              <p className="font-body" style={{ fontSize: "2vw", color: "#c8d4e8", lineHeight: 1.4 }}>Evidence and last known location locked</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center" style={{ marginLeft: "4vw", flex: 1 }}>
          <p className="font-display font-black text-center" style={{ fontSize: "3vw", color: "#ffffff", lineHeight: 1.3, textWrap: "balance" }}>
            No human had to make a single decision.
          </p>
          <div style={{ width: "6vw", height: "0.4vh", background: "#ef4444", margin: "3vh 0" }} />
          <p className="font-display font-black text-center" style={{ fontSize: "3vw", color: "#ef4444", lineHeight: 1.3, textWrap: "balance" }}>
            The system acted.
            <br />
            The people followed.
          </p>
        </div>
      </div>
    </div>
  );
}
