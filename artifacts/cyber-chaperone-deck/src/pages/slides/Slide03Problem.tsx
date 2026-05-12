export default function Slide03Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#ffffff" }}>
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />
      <div className="absolute top-0 right-0" style={{ width: "28vw", height: "100vh", background: "#1a2744", clipPath: "polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)" }} />
      <div className="absolute top-0 right-0" style={{ width: "3.5vw", height: "100vh", background: "#22c55e", clipPath: "polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw", maxWidth: "74vw" }}>
        <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "2vh" }}>
          The problem
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5.5vw", color: "#1a2744", lineHeight: 1, marginBottom: "4.5vh" }}
        >
          THE PROBLEM WE ARE SOLVING
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.4vh" }}>
          {[
            "Crime, hijackings, and road incidents are a daily reality",
            "Families have no visibility when a loved one is en route",
            "WhatsApp is how South Africans already communicate",
            "There was no simple, affordable tool that used this",
          ].map((text) => (
            <div key={text} className="flex items-start gap-[2vw]">
              <div className="shrink-0" style={{ width: "0.6vw", height: "0.6vw", borderRadius: "50%", background: "#22c55e", marginTop: "1vh" }} />
              <p className="font-body" style={{ fontSize: "2.3vw", color: "#1a2744", lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "4vh", borderLeft: "0.4vw solid #22c55e", paddingLeft: "2vw" }}>
          <p className="font-body font-bold" style={{ fontSize: "2.5vw", color: "#1a2744", lineHeight: 1.4 }}>
            We asked: what if WhatsApp could be your safety net?
          </p>
        </div>
      </div>
    </div>
  );
}
