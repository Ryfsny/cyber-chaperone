import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare, Send, Loader2, CheckCircle2, Search, ArrowLeft,
  Phone, AlertTriangle, Sparkles, ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { format, isToday, isYesterday } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Conversation {
  number: string;
  displayName: string;
  memberStatus: string | null;
  memberId: number | null;
  channel: "whatsapp" | "facebook";
  lastMessage: string;
  lastDirection: string;
  lastAt: string;
}

interface Message {
  id: number;
  fromNumber: string;
  toNumber: string;
  body: string;
  direction: string;
  receivedAt: string;
  messageSid: string | null;
}

interface Member {
  id: number;
  displayName: string;
  firstName: string;
  whatsappNumber: string;
  memberStatus: string;
  membershipTier: string | null;
  iceContactName: string | null;
  iceContactPhone: string | null;
}

interface ThreadResponse {
  messages: Message[];
  member: Member | null;
}

const QUICK_REPLIES = [
  "Got it, thanks! 👍",
  "Reply *Hi* to open your safety menu",
  "All good — stay safe out there! 🛡️",
  "We'll be in touch shortly",
  "Your trip has been noted ✅",
  "Can you confirm your current location?",
];

const statusColors: Record<string, string> = {
  verified: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

function msgTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return format(d, "d MMM, HH:mm");
}

function isOutbound(msg: Message): boolean {
  if (msg.direction) return msg.direction === "outbound";
  // Fallback for old messages without direction: if toNumber starts with whatsapp: and isn't the from, it's outbound
  return msg.toNumber?.startsWith("whatsapp:") && msg.fromNumber === msg.toNumber ? false : msg.toNumber?.startsWith("whatsapp:+1") ?? false;
}

export default function Conversations() {
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: convos = [], isLoading: loadingConvos } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => fetch(`${BASE}/api/conversations`, { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 10_000,
  });

  const { data: thread, isLoading: loadingThread } = useQuery<ThreadResponse>({
    queryKey: ["thread", activeNumber],
    queryFn: () =>
      fetch(`${BASE}/api/conversations/${encodeURIComponent(activeNumber!)}`, { credentials: "include" }).then((r) =>
        r.json(),
      ),
    enabled: !!activeNumber,
    refetchInterval: 6_000,
  });

  const sendMutation = useMutation<{ ok: boolean; message: Message }, Error, { to: string; body: string }>({
    mutationFn: (payload) =>
      fetch(`${BASE}/api/conversations/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["thread", activeNumber] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  function send() {
    if (!activeNumber || !reply.trim()) return;
    sendMutation.mutate({ to: activeNumber, body: reply.trim() });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  async function draftWithAI() {
    if (!thread?.messages.length) return;
    setDraftLoading(true);
    try {
      const lastInbound = [...thread.messages].reverse().find((m) => !isOutbound(m));
      const memberName = thread.member?.displayName ?? activeNumber ?? "the member";
      const lastMsg = lastInbound?.body ?? thread.messages[thread.messages.length - 1]?.body ?? "";
      const prompt = `Draft a short, professional WhatsApp reply to ${memberName} who sent: "${lastMsg}". Reply in 1-2 sentences. Be calm and helpful. Return only the message text, no quotes or labels.`;
      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: prompt }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (data.reply) setReply(data.reply);
    } catch {
      // silently fail
    } finally {
      setDraftLoading(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return convos;
    return convos.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.number.includes(q) || c.lastMessage.toLowerCase().includes(q),
    );
  }, [convos, search]);

  const activeConvo = convos.find((c) => c.number === activeNumber);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: conversation list ─────────────────────────── */}
      {/* On mobile: full-width list when no chat open, hidden when chat open */}
      <div className={`shrink-0 border-r border-border flex flex-col bg-card ${activeNumber ? "hidden md:flex md:w-72" : "flex w-full md:w-72"}`}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-[10px] uppercase tracking-widest shrink-0"
          >
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
          <div className="h-3 w-px bg-border shrink-0 mx-1" />
          <MessageSquare className="w-4 h-4 text-primary shrink-0" />
          <h1 className="text-xs font-bold uppercase tracking-widest text-foreground">Conversations</h1>
          {convos.length > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground">{convos.length}</span>
          )}
        </div>

        <div className="p-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-xs text-muted-foreground text-center">No conversations yet</div>
          ) : (
            filtered.map((c) => {
              const active = activeNumber === c.number;
              const isOut = c.lastDirection === "outbound";
              return (
                <button
                  key={c.number}
                  onClick={() => setActiveNumber(c.number)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/50 text-left transition-colors ${
                    active ? "bg-primary/15 border-l-2 border-l-primary" : "hover:bg-secondary/40"
                  }`}
                >
                  {/* Avatar — Facebook blue or standard green */}
                  <div
                    className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                      c.channel === "facebook"
                        ? active ? "bg-[#1877f2] text-white" : "bg-[#1877f2]/20 text-[#1877f2]"
                        : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.channel === "facebook" ? "f" : c.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">{c.displayName}</span>
                        {c.channel === "facebook" && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#1877f2]/15 text-[#1877f2] shrink-0 uppercase tracking-wide">FB</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{msgTime(c.lastAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOut && <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0" />}
                      <p className="text-[11px] text-muted-foreground truncate leading-snug">
                        {isOut ? "You: " : ""}{c.lastMessage}
                      </p>
                    </div>
                    {c.memberStatus && (
                      <span
                        className={`mt-1 inline-block text-[9px] px-1.5 rounded border ${statusColors[c.memberStatus] ?? statusColors.inactive}`}
                      >
                        {c.memberStatus}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: thread view ─────────────────────────────── */}
      {!activeNumber ? (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground flex-col gap-3">
          <MessageSquare className="w-10 h-10 opacity-20" />
          <p className="text-sm uppercase tracking-widest opacity-40">Select a conversation</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border shrink-0 bg-card">
            {/* Back to list — mobile only */}
            <button
              onClick={() => setActiveNumber(null)}
              className="md:hidden flex items-center justify-center w-9 h-9 -ml-1 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              activeNumber.startsWith("fb:") ? "bg-[#1877f2]/20 text-[#1877f2]" : "bg-primary/20 text-primary"
            }`}>
              {activeNumber.startsWith("fb:") ? "f" : (thread?.member?.displayName ?? activeNumber).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-foreground leading-none">
                  {thread?.member?.displayName ?? activeNumber.replace("whatsapp:", "").replace("fb:", "FB User · ")}
                </div>
                {activeNumber.startsWith("fb:") && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1877f2] text-white uppercase tracking-wide">Facebook Messenger</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {activeNumber.startsWith("fb:") ? `PSID: ${activeNumber.slice(3)}` : activeNumber.replace("whatsapp:", "")}
              </div>
              {/* ICE contact */}
              {thread?.member?.iceContactName && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-[10px] text-amber-400">
                    ICE: {thread.member.iceContactName}
                    {thread.member.iceContactPhone ? ` · ${thread.member.iceContactPhone}` : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {thread?.member?.memberStatus && (
                <Badge
                  variant="outline"
                  className={`text-[10px] ${statusColors[thread.member.memberStatus] ?? statusColors.inactive}`}
                >
                  {thread.member.memberStatus}
                </Badge>
              )}
              {thread?.member?.iceContactPhone && (
                <a
                  href={`tel:${thread.member.iceContactPhone}`}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-wider transition-colors"
                  title={`Call ICE: ${thread.member.iceContactName}`}
                >
                  <Phone className="w-3 h-3" />
                  ICE
                </a>
              )}
              {thread?.member && (
                <Link
                  href={`/members/${thread.member.id}`}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-wider transition-colors"
                >
                  Profile <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Message bubbles */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-[#0b141a]">
            {loadingThread ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : !thread?.messages.length ? (
              <div className="text-xs text-muted-foreground text-center py-8">No messages yet</div>
            ) : (
              thread.messages.map((msg) => {
                const out = isOutbound(msg);
                return (
                  <div key={msg.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[72%] rounded-lg px-4 py-2.5 ${
                        out
                          ? "bg-[#005c4b] text-[#e9edef] rounded-br-sm"
                          : "bg-[#202c33] text-[#e9edef] rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      <div
                        className={`text-[10px] mt-1 flex items-center gap-1 ${out ? "justify-end text-[#8696a0]" : "text-[#8696a0]"}`}
                      >
                        {msgTime(msg.receivedAt)}
                        {out && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies — horizontal scroll on mobile */}
          <div className="px-4 pt-2.5 pb-0 flex gap-2 overflow-x-auto bg-[#111b21] border-t border-border/30 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                onClick={() => setReply(qr)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors bg-secondary/20 whitespace-nowrap shrink-0"
              >
                {qr}
              </button>
            ))}
            <button
              onClick={() => void draftWithAI()}
              disabled={draftLoading || !thread?.messages.length}
              className="text-[11px] px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors bg-primary/5 whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-40 ml-2 mr-1"
            >
              {draftLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI Draft
            </button>
          </div>

          {/* Reply box — safe-area inset for iPhone home bar */}
          <div
            className="px-4 pt-3 bg-[#111b21] flex gap-3 items-end"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message…"
              className="flex-1 resize-none text-sm font-sans min-h-[44px] max-h-36 bg-[#2a3942] border-[#3b4a54] text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0 focus-visible:border-[#00a884]"
              rows={2}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!reply.trim() || sendMutation.isPending}
              className="shrink-0 w-11 h-11 bg-[#00a884] hover:bg-[#00a884]/90 rounded-full mb-0.5"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
