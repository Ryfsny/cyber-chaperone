import { useState, useRef, useEffect } from "react";
import { Flag, X, Send, CheckCircle, ChevronDown, AlertCircle, Lightbulb, Eye, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type Category = "BUG" | "FEATURE" | "OBSERVATION" | "QUESTION";

interface Report {
  id: string;
  category: Category;
  message: string;
  submittedAt: string;
  status: "sent" | "sending" | "error";
}

const CATEGORIES: { value: Category; label: string; icon: React.ElementType; color: string }[] = [
  { value: "BUG",         label: "Bug",         icon: AlertCircle, color: "text-red-400 bg-red-400/10 border-red-400/30" },
  { value: "FEATURE",     label: "Feature",     icon: Lightbulb,   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  { value: "OBSERVATION", label: "Observation", icon: Eye,         color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  { value: "QUESTION",    label: "Question",    icon: HelpCircle,  color: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
];

const STORAGE_KEY = "agent_reporter_history";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AgentReporter() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("OBSERVATION");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [history, setHistory] = useState<Report[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [location] = useLocation();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored) as Report[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const catInfo = CATEGORIES.find(c => c.value === category)!;

  async function submit() {
    if (!message.trim() || sending) return;
    setSending(true);
    const report: Report = {
      id: String(Date.now()),
      category,
      message: message.trim(),
      submittedAt: new Date().toISOString(),
      status: "sending",
    };
    try {
      const res = await fetch("/api/agent-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: message.trim(), category, pageUrl: location }),
      });
      report.status = res.ok ? "sent" : "error";
    } catch {
      report.status = "error";
    }
    const updated = [report, ...history].slice(0, 20);
    setHistory(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    setSending(false);
    if (report.status === "sent") {
      setMessage("");
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2500);
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Report to Agent"
        className={cn(
          "fixed bottom-20 right-4 md:bottom-6 z-50",
          "w-11 h-11 rounded-full shadow-lg flex items-center justify-center",
          "transition-all duration-200",
          open
            ? "bg-primary text-primary-foreground rotate-12"
            : "bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary",
        )}
      >
        <Flag className="w-4 h-4" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-32 right-4 md:bottom-20 right-4 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">Report to Agent</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 px-4 pt-3 pb-2 flex-wrap">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all",
                    category === c.value ? c.color : "text-muted-foreground border-border hover:border-muted-foreground/50",
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Message */}
          <div className="px-4 pb-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder="What are you seeing? Describe the issue or idea..."
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">
                {location !== "/" ? `📍 ${location}` : "📍 Live Trips"}
              </span>
              <span className="text-[10px] text-muted-foreground hidden">⌘↵ to send</span>
            </div>
          </div>

          {/* Send button */}
          <div className="px-4 pb-4">
            {justSent ? (
              <div className="flex items-center justify-center gap-2 py-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Sent — agent notified!</span>
              </div>
            ) : (
              <button
                onClick={submit}
                disabled={!message.trim() || sending}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
                  message.trim() && !sending
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? "Sending..." : "Send Report"}
              </button>
            )}
          </div>

          {/* History toggle */}
          {history.length > 0 && (
            <div className="border-t border-border">
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Past reports ({history.length})</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showHistory && "rotate-180")} />
              </button>

              {showHistory && (
                <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                  {history.map(r => {
                    const ci = CATEGORIES.find(c => c.value === r.category)!;
                    const Icon = ci.icon;
                    return (
                      <div key={r.id} className="px-4 py-2.5 flex gap-2.5">
                        <div className={cn("mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center border", ci.color)}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-foreground/90 leading-snug line-clamp-2">{r.message}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{timeAgo(r.submittedAt)}</span>
                            {r.status === "error" && <span className="text-[10px] text-red-400">failed to send</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
