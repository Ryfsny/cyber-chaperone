export default function Slide04Mission() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 65% 45%, rgba(34,197,94,0.12) 0%, transparent 60%)" }} />
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.3vh", background: "rgba(34,197,94,0.3)" }} />

      <div className="absolute inset-0 flex flex-col justify-center items-center text-center" style={{ padding: "0 12vw" }}>
        <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "4vh" }}>
          Our mission
        </p>

        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "6.8vw", color: "#ffffff", lineHeight: 1, marginBottom: "5vh", textWrap: "balance" }}
        >
          "SOMEONE WHO ALWAYS KNOWS YOU'RE OKAY."
        </h2>

        <p className="font-body" style={{ fontSize: "2.4vw", color: "#c8d4e8", lineHeight: 1.6, maxWidth: "70vw", textWrap: "pretty" }}>
          To give every South African traveler a trusted, real-time safety presence — through the phone they already use, the app they already have.
        </p>

        <div className="flex gap-[5vw]" style={{ marginTop: "5.5vh" }}>
          <div className="text-center">
            <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#22c55e" }}>No new app</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>to download</p>
          </div>
          <div style={{ width: "0.15vw", background: "#2a3d5e" }} />
          <div className="text-center">
            <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#22c55e" }}>No gadget</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>to buy</p>
          </div>
          <div style={{ width: "0.15vw", background: "#2a3d5e" }} />
          <div className="text-center">
            <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#22c55e" }}>WhatsApp</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>or Messenger</p>
          </div>
          <div style={{ width: "0.15vw", background: "#2a3d5e" }} />
          <div className="text-center">
            <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#22c55e" }}>R150/month</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>individual plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
