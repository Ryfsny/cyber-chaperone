import { QRCodeSVG } from "qrcode.react";

const EXPO_DOMAIN =
  (import.meta.env.VITE_BACKAPP_EXPO_DOMAIN as string | undefined) ||
  "861f57c8-8edb-426d-bcdf-9ec68d1de62b-00-1wbyvfmtwel27.expo.kirk.replit.dev";

const EXPO_URL = `exp://${EXPO_DOMAIN}`;

export default function BackAppInstall() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <img
        src="/website/eblockwatch-logo.png"
        alt="eblockwatch"
        style={{ height: 56, marginBottom: 4, objectFit: "contain" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      <p
        style={{
          fontSize: 13,
          color: "#888",
          marginTop: 0,
          marginBottom: 32,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        BackApp — Cyber Shepherd
      </p>

      <div
        style={{
          background: "#1a1f2e",
          borderRadius: 24,
          padding: "40px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          maxWidth: 420,
          width: "100%",
        }}
      >
        <h1
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            textAlign: "center",
          }}
        >
          Scan to install BackApp
        </h1>
        <p
          style={{
            color: "#aab",
            fontSize: 14,
            margin: 0,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Point your phone camera at this code. It opens in Expo Go automatically.
        </p>

        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 16,
            display: "inline-flex",
          }}
        >
          <QRCodeSVG
            value={EXPO_URL}
            size={240}
            level="M"
            includeMargin={false}
            fgColor="#1a1f2e"
          />
        </div>

        <div
          style={{
            color: "#22c55e",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.5,
            textAlign: "center",
          }}
        >
          eblockwatch · 24/7 Protection
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 400,
          width: "100%",
        }}
      >
        {[
          ["1", "Install Expo Go", "Free from the App Store (iPhone) or Google Play (Android)"],
          ["2", "Scan the QR code above", "Use your phone camera — it opens BackApp automatically in Expo Go"],
          ["3", "Enter your WhatsApp number", "Links you to your eblockwatch membership instantly"],
          ["4", "Done", "BackApp runs quietly in the background, keeping the Situation Room updated"],
        ].map(([num, title, desc]) => (
          <div
            key={num}
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              background: "#f8fafb",
              borderRadius: 12,
              padding: "14px 18px",
              border: "1px solid #e8eeee",
            }}
          >
            <div
              style={{
                minWidth: 32,
                height: 32,
                borderRadius: 16,
                background: "#1a1f2e",
                color: "#22c55e",
                fontWeight: 700,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {num}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1f2e" }}>{title}</div>
              <div style={{ fontSize: 13, color: "#777", marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#bbb", textAlign: "center" }}>
        eblockwatch BackApp · Cyber Shepherd · No app store needed
      </p>
    </div>
  );
}
