export default function BackAppInstall() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1f2e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: "system-ui, sans-serif",
        gap: 24,
      }}
    >
      <p style={{ color: "#aaa", fontSize: 12, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>
        eblockwatch · BackApp
      </p>

      <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: 0, textAlign: "center" }}>
        Scan to install BackApp
      </h1>

      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}
      >
        <img
          src="/website/backapp-qr.png"
          alt="BackApp QR code"
          width={300}
          height={300}
          style={{ display: "block" }}
        />
      </div>

      <div
        style={{
          background: "#ffc107",
          borderRadius: 12,
          padding: "14px 20px",
          maxWidth: 360,
          textAlign: "center",
          fontSize: 15,
          fontWeight: 600,
          color: "#1a1f2e",
          lineHeight: 1.5,
        }}
      >
        ① Install <strong>Expo Go</strong> (App Store / Google Play)<br />
        ② Open Expo Go → tap <strong>Scan QR Code</strong><br />
        ③ Scan the code above<br />
        ④ Enter your WhatsApp number
      </div>

      <p style={{ color: "#555", fontSize: 12, margin: 0, textAlign: "center" }}>
        Use Expo Go's scanner — not your phone camera
      </p>
    </div>
  );
}
