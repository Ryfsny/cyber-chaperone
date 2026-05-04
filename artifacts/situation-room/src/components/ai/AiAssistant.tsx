import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  onClose?: () => void;
}

export function AiAssistant({ onClose }: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "I'm your Cyber Chaperone AI assistant. Ask me anything about trips, risk levels, or today's activity.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? data.error ?? "No response." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-foreground">
          <Bot className="w-4 h-4 text-primary" />
          AI Assistant
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "text-sm font-sans leading-relaxed",
              msg.role === "user"
                ? "bg-primary/10 border border-primary/20 px-3 py-2 ml-4"
                : "text-foreground",
            )}
          >
            {msg.role === "assistant" && (
              <span className="text-xs uppercase tracking-widest text-primary font-bold block mb-1">AI</span>
            )}
            {msg.role === "user" && (
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold block mb-1">You</span>
            )}
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about trips, risk, activity..."
            rows={2}
            className="flex-1 text-sm font-sans bg-background border border-border px-3 py-2 resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
