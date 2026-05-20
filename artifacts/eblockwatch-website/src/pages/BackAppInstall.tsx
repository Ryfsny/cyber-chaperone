import { QRCodeSVG } from "qrcode.react";

const EXPO_DOMAIN =
  (import.meta.env.VITE_BACKAPP_EXPO_DOMAIN as string | undefined) ||
  "861f57c8-8edb-426d-bcdf-9ec68d1de62b-00-1wbyvfmtwel27.expo.kirk.replit.dev";

const EXPO_URL = `exp://${EXPO_DOMAIN}`;
const EXPO_HTTPS_URL = `https://${EXPO_DOMAIN}`;

const APP_STORE_URL =
  "https://apps.apple.com/app/expo-go/id982107779";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=host.exp.exponent";

export default function BackAppInstall() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px 48px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: 4, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#aaa", letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>
          eblockwatch · BackApp
        </p>
      </div>

      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#1a1f2e",
          margin: "8px 0 4px",
          textAlign: "center",
        }}
      >
        Install BackApp on your phone
      </h1>
      <p style={{ color: "#777", fontSize: 15, margin: "0 0 32px", textAlign: "center", maxWidth: 400 }}>
        Follow the steps below — takes about 2 minutes.
      </p>

      {/* Step 1 */}
      <StepCard
        num="1"
        title="Install Expo Go on your phone"
        desc="Expo Go is the free app that runs BackApp. Tap the right button for your phone:"
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            style={badgeStyle("#000")}
          >
            <span style={{ fontSize: 18 }}>🍎</span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>Download on the</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>App Store</span>
            </span>
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            style={badgeStyle("#1a73e8")}
          >
            <span style={{ fontSize: 18 }}>🤖</span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>Get it on</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Google Play</span>
            </span>
          </a>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#888", textAlign: "center" }}>
          Already have Expo Go? Skip to step 2.
        </p>
      </StepCard>

      {/* Step 2 */}
      <StepCard
        num="2"
        title="Open Expo Go and tap Scan QR Code"
        desc={`Open the Expo Go app — you'll see a "Scan QR Code" button. Tap it. Do NOT use your phone camera — use the scanner inside Expo Go.`}
      >
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "#856404",
            lineHeight: 1.5,
            width: "100%",
          }}
        >
          ⚠️ <strong>Important:</strong> Use the scanner <em>inside</em> Expo Go — not your phone's camera app. The camera app won't open it correctly.
        </div>
      </StepCard>

      {/* Step 3 */}
      <StepCard
        num="3"
        title="Scan this QR code"
        desc="Point the Expo Go scanner at the code below:"
      >
        <div
          style={{
            background: "#1a1f2e",
            borderRadius: 20,
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ background: "#fff", padding: 16, borderRadius: 12, display: "inline-flex" }}>
            <QRCodeSVG
              value={EXPO_URL}
              size={220}
              level="M"
              includeMargin={false}
              fgColor="#1a1f2e"
            />
          </div>
          <p style={{ color: "#22c55e", fontSize: 13, fontWeight: 600, margin: 0 }}>
            eblockwatch · 24/7 Protection
          </p>
        </div>

        <div style={{ marginTop: 16, width: "100%", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#888", margin: "0 0 8px" }}>
            Can't scan? Tap this link on your phone instead:
          </p>
          <a
            href={EXPO_URL}
            style={{
              display: "inline-block",
              background: "#1a1f2e",
              color: "#22c55e",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "monospace",
              textDecoration: "none",
              wordBreak: "break-all",
            }}
          >
            {EXPO_URL}
          </a>
        </div>
      </StepCard>

      {/* Step 4 */}
      <StepCard
        num="4"
        title="Enter your WhatsApp number"
        desc="BackApp will ask for your WhatsApp number to link to your eblockwatch membership. Type it in and tap Connect. Done!"
      />

      <p style={{ marginTop: 32, fontSize: 12, color: "#bbb", textAlign: "center" }}>
        eblockwatch BackApp · Cyber Shepherd · Powered by Replit
      </p>
    </div>
  );
}

function StepCard({
  num,
  title,
  desc,
  children,
}: {
  num: string;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "24px",
        marginBottom: 16,
        maxWidth: 520,
        width: "100%",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        border: "1px solid #eee",
      }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: children ? 16 : 0 }}>
        <div
          style={{
            minWidth: 36,
            height: 36,
            borderRadius: 18,
            background: "#1a1f2e",
            color: "#22c55e",
            fontWeight: 700,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {num}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1f2e", marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function badgeStyle(bg: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: bg,
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 10,
    textDecoration: "none",
    minWidth: 160,
  };
}
