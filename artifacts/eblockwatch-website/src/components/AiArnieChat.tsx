import { useState, useRef, useEffect } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const LOGO = "https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content: "Hi there 👋 I'm AI Arnie — Andre's digital safety wingman at eblockwatch. Ask me anything about Cyber Chaperone, how it works, or how to join. What can I help you with?",
};

export default function AiArnieChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...updated, assistantMsg]);

    try {
      const res = await fetch(`/api/arnie/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.content) {
              full += payload.content;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: full };
                return next;
              });
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Sorry, I'm having trouble right now. Please WhatsApp Andre directly on +27 82 561 1065.",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1000, fontFamily: "'Open Sans', sans-serif" }}>
      {open && (
        <div style={{
          width: "360px",
          maxWidth: "calc(100vw - 48px)",
          height: "500px",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          marginBottom: "12px",
          border: "1px solid #e5e7eb",
        }}>
          {/* Header */}
          <div style={{ background: "#0d1117", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <img src={LOGO} alt="eblockwatch" style={{ height: "28px", objectFit: "contain" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", fontFamily: "Montserrat, sans-serif" }}>AI Arnie</div>
              <div style={{ color: "#9ca3af", fontSize: "12px" }}>eblockwatch safety companion</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "2px 4px" }}
              aria-label="Close"
            >×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  background: msg.role === "user" ? "#1db954" : "#f3f4f6",
                  color: msg.role === "user" ? "#fff" : "#111827",
                  fontSize: "13.5px",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {msg.content || (streaming && i === messages.length - 1 ? (
                    <span style={{ opacity: 0.5 }}>▋</span>
                  ) : "")}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px", flexShrink: 0, background: "#fafafa" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask AI Arnie anything…"
              disabled={streaming}
              style={{
                flex: 1,
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "9px 12px",
                fontSize: "13.5px",
                outline: "none",
                background: "#fff",
                color: "#111827",
              }}
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || streaming}
              style={{
                background: "#1db954",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 14px",
                cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
                opacity: input.trim() && !streaming ? 1 : 0.5,
                fontSize: "13px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#0d1117",
          color: "#fff",
          border: "2px solid #1db954",
          borderRadius: "50px",
          padding: "12px 20px",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          fontSize: "14px",
          fontWeight: 700,
          fontFamily: "Montserrat, sans-serif",
          transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <img src={LOGO} alt="" style={{ height: "24px", objectFit: "contain" }} />
        {open ? "Close" : "Chat with AI Arnie"}
      </button>
    </div>
  );
}
