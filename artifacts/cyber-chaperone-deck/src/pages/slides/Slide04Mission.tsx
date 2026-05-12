export default function Slide04Mission() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#1a2744" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(232,160,32,0.12) 0%, transparent 65%)" }} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "0.5vh", background: "#e8a020" }} />

      <div className="absolute inset-0 flex flex-col justify-center items-center text-center" style={{ padding: "0 12vw" }}>
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "4vh" }}>
          Our mission
        </p>

        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "7vw", color: "#ffffff", lineHeight: 1, marginBottom: "5vh", textWrap: "balance" }}
        >
          "SOMEONE WHO ALWAYS KNOWS YOU'RE OKAY."
        </h2>

        <p className="font-body" style={{ fontSize: "2.4vw", color: "#c8d4e8", lineHeight: 1.6, maxWidth: "70vw", textWrap: "pretty" }}>
          To give every South African traveler a trusted, real-time safety presence — through the phone they already use, the app they already have.
        </p>

        <div className="flex gap-[6vw]" style={{ marginTop: "5vh" }}>
          <div className="text-center">
            <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#e8a020" }}>No new app</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>to download</p>
          </div>
          <div style={{ width: "0.15vw", background: "#2a3d5e" }} />
          <div className="text-center">
            <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#e8a020" }}>No gadget</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>to buy</p>
          </div>
          <div style={{ width: "0.15vw", background: "#2a3d5e" }} />
          <div className="text-center">
            <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#e8a020" }}>Just WhatsApp</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8" }}>what you know</p>
          </div>
        </div>
      </div>
    </div>
  );
}
