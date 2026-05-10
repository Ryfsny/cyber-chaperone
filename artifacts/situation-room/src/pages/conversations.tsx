import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, Send, Loader2, CheckCircle2, Search, ChevronRight, ArrowLeft } from "lucide-react";
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

export default function Conversations() {
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
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
      fetch(`${BASE}/api/conversations/${encodeURIComponent(activeNumber!)}`, { credentials: "include" }).then((r) => r.json()),
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

  // Auto-scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return convos;
    return convos.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.number.includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  }, [convos, search]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: conversation list ─────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-[10px] uppercase tracking-widest shrink-0">
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
          <div className="h-3 w-px bg-border shrink-0 mx-1" />
          <MessageSquare className="w-4 h-4 text-primary shrink-0" />
          <h1 className="text-xs font-bold uppercase tracking-widest text-foreground">Conversations</h1>
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
              return (
                <button
                  key={c.number}
                  onClick={() => setActiveNumber(c.number)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/50 text-left transition-colors ${
                    active ? "bg-primary/15 border-l-2 border-l-primary" : "hover:bg-secondary/40"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                    active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                    {c.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-foreground truncate">{c.displayName}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{msgTime(c.lastAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.lastDirection === "outbound" && (
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                      <p className="text-[11px] text-muted-foreground truncate leading-snug">{c.lastMessage}</p>
                    </div>
                    {c.memberStatus && (
                      <span className={`mt-1 inline-block text-[9px] px-1.5 rounded border ${statusColors[c.memberStatus] ?? statusColors.inactive}`}>
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
          <MessageSquare className="w-10 h-10 opacity-20" />
          <p className="text-sm uppercase tracking-widest opacity-40">Select a conversation</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="h-14 px-5 flex items-center gap-3 border-b border-border shrink-0 bg-card">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {(thread?.member?.displayName ?? activeNumber).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground leading-none">
                {thread?.member?.displayName ?? activeNumber.replace("whatsapp:", "")}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {activeNumber.replace("whatsapp:", "")}
              </div>
            </div>
            {thread?.member?.memberStatus && (
              <Badge variant="outline" className={`text-[10px] ${statusColors[thread.member.memberStatus] ?? statusColors.inactive}`}>
                {thread.member.memberStatus}
              </Badge>
            )}
            {thread?.member && (
              <a
                href={`../members`}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-wider transition-colors"
              >
                Profile <ChevronRight className="w-3 h-3" />
              </a>
            )}
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
                const isOut = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[72%] rounded-lg px-4 py-2.5 ${
                      isOut
                        ? "bg-[#005c4b] text-[#e9edef] rounded-br-sm"
                        : "bg-[#202c33] text-[#e9edef] rounded-bl-sm"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      <div className={`text-[10px] mt-1 flex items-center gap-1 ${isOut ? "justify-end text-[#8696a0]" : "text-[#8696a0]"}`}>
                        {msgTime(msg.receivedAt)}
                        {isOut && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-4 pt-3 pb-0 flex gap-2 flex-wrap bg-[#111b21] border-t border-border/30">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                onClick={() => setReply(qr)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors bg-secondary/20 whitespace-nowrap"
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Reply box */}
          <div className="px-4 pb-4 pt-3 bg-[#111b21] flex gap-3 items-end">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message… (Ctrl+Enter to send)"
              className="flex-1 resize-none text-sm font-sans min-h-[44px] max-h-36 bg-[#2a3942] border-[#3b4a54] text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0 focus-visible:border-[#00a884]"
              rows={2}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!reply.trim() || sendMutation.isPending}
              className="shrink-0 w-10 h-10 bg-[#00a884] hover:bg-[#00a884]/90 rounded-full"
            >
              {sendMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
