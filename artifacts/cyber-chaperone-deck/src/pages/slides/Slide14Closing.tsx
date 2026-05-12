const base = import.meta.env.BASE_URL;

export default function Slide14Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <img
        src={`${base}hero-arrival.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        alt="Person arriving home safely"
        style={{ opacity: 0.4 }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,24,41,0.95) 0%, rgba(13,24,41,0.55) 60%, transparent 100%)" }} />
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw" }}>
        <div style={{ marginBottom: "2.5vh", width: "4vw", height: "0.35vh", background: "#22c55e" }} />

        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "6.5vw", color: "#ffffff", lineHeight: 1, marginBottom: "1.5vh" }}
        >
          SOMEONE WHO ALWAYS
        </h2>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "6.5vw", color: "#22c55e", lineHeight: 1, marginBottom: "4.5vh" }}
        >
          KNOWS YOU'RE OKAY.
        </h2>

        <p className="font-body font-medium" style={{ fontSize: "2.4vw", color: "#c8d4e8", marginBottom: "4.5vh" }}>
          Join eblockwatch. Travel with confidence.
        </p>

        <div style={{ display: "flex", gap: "5vw", alignItems: "flex-start" }}>
          <div>
            <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.5vw", color: "#22c55e", marginBottom: "0.8vh" }}>WhatsApp</p>
            <p className="font-body font-bold" style={{ fontSize: "2.2vw", color: "#ffffff" }}>+27 82 561 1065</p>
          </div>
          <div style={{ width: "0.15vw", height: "5vh", background: "#2a3d5e", marginTop: "0.5vh" }} />
          <div>
            <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.5vw", color: "#22c55e", marginBottom: "0.8vh" }}>Website</p>
            <p className="font-body font-bold" style={{ fontSize: "2.2vw", color: "#ffffff" }}>eblockwatch.co.za</p>
          </div>
          <div style={{ width: "0.15vw", height: "5vh", background: "#2a3d5e", marginTop: "0.5vh" }} />
          <div>
            <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.5vw", color: "#22c55e", marginBottom: "0.8vh" }}>Facebook</p>
            <p className="font-body font-bold" style={{ fontSize: "2.2vw", color: "#ffffff" }}>facebook.com/eblockwatch</p>
          </div>
        </div>

        <p className="font-body" style={{ fontSize: "1.8vw", color: "#4a5a78", marginTop: "4.5vh" }}>
          eblockwatch — Cyber Chaperone — South Africa — 2026
        </p>
      </div>
    </div>
  );
}
