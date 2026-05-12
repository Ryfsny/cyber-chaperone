export default function Slide03Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#f5f3ee" }}>
      <div className="absolute top-0 right-0" style={{ width: "30vw", height: "100vh", background: "#1a2744", clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)" }} />
      <div className="absolute top-0 right-0" style={{ width: "4vw", height: "100vh", background: "#e8a020", clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw", maxWidth: "72vw" }}>
        <p className="font-body font-medium uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#e8a020", marginBottom: "2vh" }}>
          The problem
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5.5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4.5vh" }}
        >
          THE PROBLEM WE ARE SOLVING
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.2vh" }}>
          <div className="flex items-start gap-[2vw]">
            <div className="shrink-0" style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", marginTop: "1vh" }} />
            <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.4 }}>Crime, hijackings, and road incidents are a daily reality</p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <div className="shrink-0" style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", marginTop: "1vh" }} />
            <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.4 }}>Families have no visibility when a loved one is en route</p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <div className="shrink-0" style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", marginTop: "1vh" }} />
            <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.4 }}>WhatsApp is how South Africans already communicate</p>
          </div>
          <div className="flex items-start gap-[2vw]">
            <div className="shrink-0" style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#e8a020", marginTop: "1vh" }} />
            <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.4 }}>There was no simple, affordable tool that used this</p>
          </div>
        </div>

        <div style={{ marginTop: "4vh", borderLeft: "0.4vw solid #e8a020", paddingLeft: "2vw" }}>
          <p className="font-body font-bold" style={{ fontSize: "2.5vw", color: "#1a2744", lineHeight: 1.4 }}>
            We asked: what if WhatsApp could be your safety net?
          </p>
        </div>
      </div>
    </div>
  );
}
