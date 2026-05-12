export default function Slide11WhereWeAre() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#f5f3ee" }}>
      <div className="absolute top-0 left-0" style={{ width: "0.6vw", height: "100vh", background: "#1a2744" }} />
      <div className="absolute top-0 right-0" style={{ width: "0.6vw", height: "100vh", background: "#e8a020" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw 0 10vw" }}>
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "1.5vh" }}>
          Live today
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4vh" }}
        >
          WHERE WE ARE TODAY
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vh 6vw" }}>
          <div className="flex items-start gap-[1.5vw]">
            <div style={{ width: "1.8vw", height: "1.8vw", background: "#22c55e", borderRadius: "50%", flexShrink: 0, marginTop: "0.3vh" }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Fully live WhatsApp pipeline — tested end-to-end
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div style={{ width: "1.8vw", height: "1.8vw", background: "#22c55e", borderRadius: "50%", flexShrink: 0, marginTop: "0.3vh" }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Situation Room dashboard — live and monitoring
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div style={{ width: "1.8vw", height: "1.8vw", background: "#22c55e", borderRadius: "50%", flexShrink: 0, marginTop: "0.3vh" }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Member portal — registration, login, upgrade funnel
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div style={{ width: "1.8vw", height: "1.8vw", background: "#22c55e", borderRadius: "50%", flexShrink: 0, marginTop: "0.3vh" }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Paystack payments — R150 and R250 plans active
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div style={{ width: "1.8vw", height: "1.8vw", background: "#22c55e", borderRadius: "50%", flexShrink: 0, marginTop: "0.3vh" }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              60+ Paystack subscribers synced
            </p>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div style={{ width: "1.8vw", height: "1.8vw", background: "#22c55e", borderRadius: "50%", flexShrink: 0, marginTop: "0.3vh" }} />
            <p className="font-body" style={{ fontSize: "2vw", color: "#1a2744", lineHeight: 1.4 }}>
              Route maps, checkpoint tracking, ICE escalation — all live
            </p>
          </div>
        </div>

        <div style={{ marginTop: "3.5vh", background: "#1a2744", borderRadius: "0.6vw", padding: "1.5vh 2.5vw", display: "inline-block" }}>
          <p className="font-body font-medium" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>
            Production: <span style={{ color: "#e8a020" }}>cyber-chaperone-r--ryfsny.replit.app</span>
          </p>
        </div>
      </div>
    </div>
  );
}
