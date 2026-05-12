import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  onClose?: () => void;
}

const SUGGESTED_QUESTIONS = [
  "What trips are active right now?",
  "Are there any amber or red alerts?",
  "Summarise today's activity",
  "Which members haven't checked in recently?",
  "What should I do if a trip goes RED?",
  "How many members do we have?",
];

function renderContent(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {line}
      {i < text.split("\n").length - 1 && <br />}
    </span>
  ));
}

export function AiAssistant({ onClose }: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm your Cyber Chaperone AI assistant. I have live access to all trip data and member activity.\n\nAsk me anything — what's happening right now, what to do next, or ask me to draft a message.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "No response received.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Conversation cleared. What would you like to know?",
      },
    ]);
    setInput("");
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-foreground">
          <Bot className="w-4 h-4 text-primary" />
          AI Assistant
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            title="Clear conversation"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("text-sm font-sans leading-relaxed", msg.role === "user" ? "pl-2" : "")}>
            {msg.role === "assistant" ? (
              <>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bot className="w-3 h-3 text-primary" />
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold">AI</span>
                </div>
                <div className="text-foreground text-sm font-sans leading-relaxed">
                  {renderContent(msg.content)}
                </div>
              </>
            ) : (
              <>
                <div className="mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">You</span>
                </div>
                <div className="bg-primary/10 border border-primary/20 px-3 py-2 text-foreground text-sm font-sans leading-relaxed">
                  {renderContent(msg.content)}
                </div>
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking…
          </div>
        )}

        {/* Suggested questions — shown only at start */}
        {showSuggestions && !loading && (
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Try asking</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="text-left text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 px-3 py-2 transition-colors bg-background hover:bg-primary/5"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about trips, risk, members…"
            rows={2}
            className="flex-1 text-sm font-sans bg-background border border-border px-3 py-2 resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground text-foreground"
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
