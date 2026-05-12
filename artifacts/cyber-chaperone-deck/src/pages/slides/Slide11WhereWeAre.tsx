export default function Slide11WhereWeAre() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#ffffff" }}>
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />
      <div className="absolute top-0 left-0" style={{ width: "0.5vw", height: "100vh", background: "#22c55e" }} />
      <div className="absolute top-0 right-0" style={{ width: "0.5vw", height: "100vh", background: "#1a2744", opacity: 0.15 }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw 0 10vw" }}>
        <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "1.5vh" }}>
          Live today
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5vw", color: "#1a2744", lineHeight: 1, marginBottom: "3.5vh" }}
        >
          WHERE WE ARE TODAY
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.8vh 6vw" }}>
          {[
            "Fully live WhatsApp pipeline — tested end-to-end",
            "Full menu on Facebook Messenger — live today",
            "Situation Room dashboard — live and monitoring",
            "Member Facebook profile tracking & search",
            "Member portal — registration, login, upgrade funnel",
            "Paystack payments — R150 and R250 plans active",
            "60+ Paystack subscribers synced",
            "Route maps, checkpoint tracking, ICE escalation — all live",
          ].map((text) => (
            <div key={text} className="flex items-start gap-[1.5vw]">
              <div style={{ width: "1.8vw", height: "1.8vw", background: "#22c55e", borderRadius: "50%", flexShrink: 0, marginTop: "0.25vh" }} />
              <p className="font-body" style={{ fontSize: "1.9vw", color: "#1a2744", lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "3.5vh", background: "#1a2744", borderRadius: "0.6vw", padding: "1.5vh 2.5vw", display: "inline-block" }}>
          <p className="font-body font-medium" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>
            Production: <span style={{ color: "#22c55e" }}>cyber-chaperone-r--ryfsny.replit.app</span>
          </p>
        </div>
      </div>
    </div>
  );
}
