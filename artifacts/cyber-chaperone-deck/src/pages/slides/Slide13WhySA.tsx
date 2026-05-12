export default function Slide13WhySA() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#f5f3ee" }}>
      <div className="absolute bottom-0 right-0" style={{ width: "45vw", height: "60vh", background: "#1a2744", clipPath: "polygon(30% 100%, 100% 0%, 100% 100%)" }} />
      <div className="absolute top-0 left-0" style={{ width: "0.6vw", height: "100vh", background: "#e8a020" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw 0 10vw" }}>
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "1.5vh" }}>
          The heart of it
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5.5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4vh", maxWidth: "60vw" }}
        >
          WHY SOUTH AFRICA. WHY NOW.
        </h2>

        <div style={{ maxWidth: "58vw", display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.5 }}>
            South Africans are resilient. We adapt. We look after each other.
          </p>
          <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.5 }}>
            But we deserve better tools.
          </p>
          <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.5 }}>
            Cyber Chaperone is not a foreign product adapted for SA.
          </p>
          <p className="font-body font-bold" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.5 }}>
            It was born here. Built here. For our roads. Our risks. Our people.
          </p>
          <div style={{ borderLeft: "0.4vw solid #e8a020", paddingLeft: "2vw", marginTop: "1vh" }}>
            <p className="font-body font-bold" style={{ fontSize: "2.4vw", color: "#1a2744", lineHeight: 1.4 }}>
              We speak the language of South African safety — and that language is WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
