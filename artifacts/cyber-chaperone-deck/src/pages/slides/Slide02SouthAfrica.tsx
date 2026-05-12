const base = import.meta.env.BASE_URL;

export default function Slide02SouthAfrica() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <img
        src={`${base}hero-danger.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        alt="Empty South African road at night"
        style={{ opacity: 0.5 }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(13,24,41,0.95) 45%, rgba(13,24,41,0.2) 100%)" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw" }}>
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "2vh" }}>
          The reality
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "6.5vw", color: "#ffffff", lineHeight: 1, marginBottom: "4vh", textWrap: "balance", maxWidth: "52vw" }}
        >
          SOUTH AFRICA.
          <span style={{ color: "#e8a020" }}> BEAUTIFUL.</span>
          <span style={{ color: "#c8d4e8" }}> AND DANGEROUS.</span>
        </h2>

        <div style={{ maxWidth: "46vw" }}>
          <p className="font-body" style={{ fontSize: "2.4vw", color: "#c8d4e8", lineHeight: 1.5, marginBottom: "2vh" }}>
            Every day, ordinary people drive ordinary routes.
          </p>
          <p className="font-body" style={{ fontSize: "2.4vw", color: "#c8d4e8", lineHeight: 1.5, marginBottom: "2vh" }}>
            Some of them don't make it home.
          </p>
          <p className="font-body font-bold" style={{ fontSize: "2.4vw", color: "#ffffff", lineHeight: 1.5 }}>
            We don't talk about it enough.
          </p>
          <p className="font-body font-bold" style={{ fontSize: "2.4vw", color: "#e8a020", lineHeight: 1.5 }}>
            We should.
          </p>
        </div>
      </div>
    </div>
  );
}
