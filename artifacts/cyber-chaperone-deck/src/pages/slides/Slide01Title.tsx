const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <img
        src={`${base}hero-highway.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        alt="South African highway at night"
        style={{ opacity: 0.55 }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,24,41,0.85) 0%, rgba(13,24,41,0.4) 60%, transparent 100%)" }} />

      <div className="absolute inset-0 flex flex-col justify-end" style={{ padding: "7vh 8vw" }}>
        <div className="mb-[2vh]" style={{ width: "5vw", height: "0.4vh", background: "#e8a020" }} />
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.8vw", color: "#e8a020", marginBottom: "1.5vh" }}>
          eblockwatch presents
        </p>
        <h1
          className="font-display font-black tracking-tight leading-none"
          style={{ fontSize: "9vw", color: "#ffffff", textWrap: "balance", lineHeight: 0.92 }}
        >
          CYBER
        </h1>
        <h1
          className="font-display font-black tracking-tight leading-none"
          style={{ fontSize: "9vw", color: "#e8a020", textWrap: "balance", lineHeight: 0.92, marginBottom: "3vh" }}
        >
          CHAPERONE
        </h1>
        <p className="font-body font-medium" style={{ fontSize: "2.4vw", color: "#c8d4e8", maxWidth: "55vw", lineHeight: 1.4 }}>
          A WhatsApp-first traveler safety platform built for South Africa
        </p>
        <p className="font-body" style={{ fontSize: "1.8vw", color: "#8a9ab8", marginTop: "2vh" }}>
          Andre Snyman — eblockwatch — 2026
        </p>
      </div>

      <div className="absolute top-[5vh] right-[6vw] flex flex-col items-end gap-[0.8vh]">
        <div style={{ width: "1.5vw", height: "0.3vh", background: "#e8a020" }} />
        <div style={{ width: "2.5vw", height: "0.3vh", background: "#e8a020", opacity: 0.5 }} />
        <div style={{ width: "1vw", height: "0.3vh", background: "#e8a020", opacity: 0.3 }} />
      </div>
    </div>
  );
}
