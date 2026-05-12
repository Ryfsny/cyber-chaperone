export default function Slide10Network() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d1829" }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #1a2744 0%, #0d1829 100%)" }} />
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.55vh", background: "#22c55e" }} />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: "0 8vw" }}>
        <p className="font-body font-bold uppercase tracking-widest" style={{ fontSize: "1.6vw", color: "#22c55e", marginBottom: "1.5vh" }}>
          The backbone
        </p>
        <h2
          className="font-display font-black tracking-tight"
          style={{ fontSize: "5.5vw", color: "#ffffff", lineHeight: 1, marginBottom: "2vh" }}
        >
          THE EBLOCKWATCH NETWORK
        </h2>
        <p className="font-body" style={{ fontSize: "2.2vw", color: "#c8d4e8", marginBottom: "4.5vh", maxWidth: "65vw", lineHeight: 1.5 }}>
          Behind Cyber Chaperone sits the eblockwatch responder network.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw" }}>
          {[
            { title: "Community", body: "Trusted responders across South Africa" },
            { title: "Precision", body: "Each linked to a suburb, street, and support radius" },
            { title: "Escalation", body: "Available when the operator needs boots on the ground" },
          ].map(({ title, body }) => (
            <div key={title} style={{ background: "rgba(34,197,94,0.05)", borderTop: "0.3vh solid #22c55e", padding: "2.5vh 2vw" }}>
              <p className="font-display font-black" style={{ fontSize: "2.5vw", color: "#22c55e", marginBottom: "1vh" }}>{title}</p>
              <p className="font-body" style={{ fontSize: "1.9vw", color: "#8a9ab8", lineHeight: 1.4 }}>{body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "4.5vh", borderLeft: "0.4vw solid #22c55e", paddingLeft: "2.5vw" }}>
          <p className="font-display font-black" style={{ fontSize: "3vw", color: "#ffffff", lineHeight: 1.3 }}>
            This is not just software.
          </p>
          <p className="font-display font-black" style={{ fontSize: "3vw", color: "#22c55e", lineHeight: 1.3 }}>
            It is a community safety network.
          </p>
        </div>
      </div>
    </div>
  );
}
