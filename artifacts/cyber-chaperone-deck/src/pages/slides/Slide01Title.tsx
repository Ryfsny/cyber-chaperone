const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <img
        src={`${base}hero-highway.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        alt="South African highway at night"
        style={{ opacity: 0.5 }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,24,41,0.92) 0%, rgba(13,24,41,0.35) 65%, transparent 100%)" }} />

      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />

      <div className="absolute inset-0 flex flex-col justify-end" style={{ padding: "7vh 8vw" }}>
        <div className="flex items-center gap-[1.2vw]" style={{ marginBottom: "2.5vh" }}>
          <div style={{ width: "4vw", height: "0.35vh", background: "#22c55e" }} />
          <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.7vw", color: "#22c55e" }}>
            eblockwatch presents
          </p>
        </div>
        <h1
          className="font-display font-black tracking-tight leading-none"
          style={{ fontSize: "9.5vw", color: "#ffffff", lineHeight: 0.9 }}
        >
          CYBER
        </h1>
        <h1
          className="font-display font-black tracking-tight leading-none"
          style={{ fontSize: "9.5vw", color: "#22c55e", lineHeight: 0.9, marginBottom: "3.5vh" }}
        >
          CHAPERONE
        </h1>
        <p className="font-body font-medium" style={{ fontSize: "2.4vw", color: "#c8d4e8", maxWidth: "52vw", lineHeight: 1.4 }}>
          A WhatsApp-first traveler safety platform built for South Africa
        </p>
        <p className="font-body" style={{ fontSize: "1.8vw", color: "#6b7a99", marginTop: "2.5vh" }}>
          Andre Snyman — eblockwatch — 2026
        </p>
      </div>

      <div className="absolute top-[5vh] right-[6vw] flex flex-col items-end gap-[0.8vh]">
        <div style={{ width: "1.5vw", height: "0.3vh", background: "#22c55e" }} />
        <div style={{ width: "2.5vw", height: "0.3vh", background: "#22c55e", opacity: 0.5 }} />
        <div style={{ width: "1vw", height: "0.3vh", background: "#22c55e", opacity: 0.25 }} />
      </div>
    </div>
  );
}
