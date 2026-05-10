import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Send, CheckSquare, Square, MessageSquare, Loader2,
  CheckCircle2, XCircle, Users, Megaphone, FileText, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Member {
  id: number;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  membershipTier: string | null;
  mobile: string | null;
}

interface PaginatedResponse {
  data: Member[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface BroadcastResult {
  id: number;
  name: string;
  status: "sent" | "failed";
  error?: string;
}

interface BroadcastResponse {
  ok: boolean;
  sent: number;
  failed: number;
  total: number;
  results: BroadcastResult[];
}

interface Template {
  id: string;
  label: string;
  description: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: "test_invite",
    label: "Test Invite",
    description: "Invite someone to test the live member portal",
    body: `Hi {name}! 👋

You're invited to test the new eblockwatch Cyber Chaperone member portal.

👉 https://eblockwatch.replit.app/website/

Log in or register with your WhatsApp number — takes 2 minutes.

Your feedback matters. Reply to this message and let me know what you think!

— Andre | eblockwatch`,
  },
  {
    id: "welcome",
    label: "Welcome",
    description: "Warm welcome message for new members",
    body: `Hi {name}! 🛡️

Welcome to eblockwatch — you're now part of a trusted safety network that's been protecting South Africans since 2001.

A few things to know:
• Reply *Hi* to this number anytime to open your safety menu
• Use *Cyber Chaperone* before a trip and someone always knows you're safe
• Your Member Portal: https://eblockwatch.replit.app/website/

We're glad to have you with us.

— Andre Snyman | eblockwatch`,
  },
  {
    id: "cyber_chaperone",
    label: "Cyber Chaperone",
    description: "Explain the travel safety feature to members",
    body: `Hi {name} 👋

Did you know you have a personal travel safety feature?

*Cyber Chaperone* monitors your trips in real time. Here's how it works:

1️⃣ WhatsApp me: *Start [from] to [destination] ETA [time]*
2️⃣ I'll track your route and check in if you're running late
3️⃣ If something seems wrong, I'll reach out to your ICE contact

It's free, it's on WhatsApp, and it could save your life. Reply *Hi* to try it now.

— Andre | eblockwatch`,
  },
  {
    id: "safety_tip",
    label: "Safety Tip",
    description: "A timely community safety reminder",
    body: `Hi {name} 👮

Quick safety reminder from eblockwatch:

🚗 *Travel tip:* Always share your route before a long trip. Even a quick "leaving now, back by 6pm" message to a trusted contact makes a difference.

📍 *Crime alert:* Stay alert on [AREA] — there have been reports of [INCIDENT TYPE] in the area this week.

Stay safe out there.

— Andre | eblockwatch`,
  },
  {
    id: "check_in",
    label: "Check-In",
    description: "Check in with existing members — are they okay?",
    body: `Hi {name} 👋

Just checking in from eblockwatch.

Is everything okay on your side? We haven't heard from you in a while.

Reply *Hi* to open your menu, or just reply to this message if you need anything.

We're here.

— Andre | eblockwatch`,
  },
  {
    id: "blank",
    label: "Blank",
    description: "Start from scratch — write your own message",
    body: "",
  },
];

const statusColors: Record<string, string> = {
  verified: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

export default function Broadcast() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState(TEMPLATES[0].body);
  const [activeTemplate, setActiveTemplate] = useState<string>(TEMPLATES[0].id);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BroadcastResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "verified">("all");

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["members-broadcast"],
    queryFn: () =>
      fetch(`${BASE}/api/members?limit=500`, { credentials: "include" }).then((r) => r.json()),
  });

  const members: Member[] = useMemo(() => {
    const all = data?.data ?? [];
    return all.filter((m) => {
      if (!m.whatsappNumber) return false;
      const q = search.toLowerCase();
      if (q && !m.displayName.toLowerCase().includes(q) && !(m.mobile ?? "").includes(q)) return false;
      if (statusFilter === "active") return m.memberStatus === "active";
      if (statusFilter === "verified") return m.memberStatus === "verified";
      return true;
    });
  }, [data, search, statusFilter]);

  const allSelected = members.length > 0 && members.every((m) => selected.has(m.id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); members.forEach((m) => n.delete(m.id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); members.forEach((m) => n.add(m.id)); return n; });
    }
  }

  function toggle(id: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function pickTemplate(t: Template) {
    setActiveTemplate(t.id);
    setMessage(t.body);
    setResults(null);
  }

  function onMessageChange(val: string) {
    setMessage(val);
    setActiveTemplate("custom");
  }

  const mutation = useMutation<BroadcastResponse, Error, { memberIds: number[]; message: string }>({
    mutationFn: (payload) =>
      fetch(`${BASE}/api/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (d) => setResults(d),
  });

  function send() {
    if (selected.size === 0 || !message.trim()) return;
    setResults(null);
    mutation.mutate({ memberIds: Array.from(selected), message: message.trim() });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Broadcast</h1>
            <p className="text-xs text-muted-foreground mt-0.5">WhatsApp a message to selected members</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="text-primary font-bold">{selected.size}</span> selected
            </span>
          )}
          <Button
            size="sm"
            onClick={send}
            disabled={selected.size === 0 || !message.trim() || mutation.isPending}
            className="uppercase tracking-widest text-xs"
          >
            {mutation.isPending
              ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Sending…</>
              : <><Send className="w-3 h-3 mr-2" />Send to {selected.size || "…"}</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left: member list ──────────────────────────────────── */}
        <div className="w-68 shrink-0 border-r border-border flex flex-col" style={{ width: "270px" }}>
          <div className="p-3 border-b border-border space-y-2">
            <Input
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex gap-1">
              {(["all", "active", "verified"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                    statusFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={toggleAll}
            className="flex items-center gap-2 px-3 py-2 border-b border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
          >
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />}
            <span className="uppercase tracking-wider">Select all ({members.length})</span>
          </button>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">No members found</div>
            ) : (
              members.map((m) => {
                const checked = selected.has(m.id);
                const resultItem = results?.results.find((r) => r.id === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={`w-full flex items-start gap-2 px-3 py-2.5 border-b border-border/50 text-left transition-colors ${
                      checked ? "bg-primary/10" : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {checked
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{m.displayName}</span>
                        {resultItem && (
                          resultItem.status === "sent"
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            : <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {(m.whatsappNumber ?? m.mobile ?? "").replace("whatsapp:", "")}
                        </span>
                        <span className={`text-[10px] px-1.5 rounded border ${statusColors[m.memberStatus] ?? statusColors.inactive}`}>
                          {m.memberStatus}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: templates + compose ────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Template picker */}
          <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Templates — click one to load, then edit freely
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => {
                const isActive = activeTemplate === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => pickTemplate(t)}
                    className={`text-left p-3 rounded-md border transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className={`text-xs font-bold mb-0.5 ${isActive ? "text-primary" : ""}`}>
                      {t.label}
                    </div>
                    <div className="text-[10px] leading-snug opacity-80">{t.description}</div>
                  </button>
                );
              })}
              {/* Custom indicator — shows when user has edited away from a template */}
              {activeTemplate === "custom" && (
                <div className="text-left p-3 rounded-md border border-primary bg-primary/10">
                  <div className="text-xs font-bold text-primary mb-0.5 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Custom
                  </div>
                  <div className="text-[10px] leading-snug text-muted-foreground">Your own message</div>
                </div>
              )}
            </div>
          </div>

          {/* Compose area */}
          <div className="flex-1 px-5 py-4 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Message
                </label>
                <span className={`text-[10px] font-mono ${message.length > 1600 ? "text-red-400" : "text-muted-foreground"}`}>
                  {message.length} / 1600
                </span>
              </div>
              <Textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                className="font-mono text-xs resize-none h-52"
                placeholder="Pick a template above or start typing your message…"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Use <code className="bg-secondary px-1 rounded text-[10px]">{"{name}"}</code> — replaced with each member's first name when sent.
              </p>
            </div>

            {/* WhatsApp preview */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Preview — as seen on WhatsApp</div>
              <div className="bg-[#0b141a] rounded-xl p-4 max-h-56 overflow-y-auto">
                <div className="inline-block bg-[#202c33] rounded-lg px-4 py-3 max-w-[85%] text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                  {message.replace(/\{name\}/gi, "Kieren") || (
                    <span className="italic text-[#8696a0]">Your message will appear here…</span>
                  )}
                </div>
                <div className="text-[10px] text-[#8696a0] mt-1.5 ml-1">
                  {new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>

            {/* Opt-in notice */}
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-[11px] text-yellow-400 leading-relaxed">
              <span className="font-bold">WhatsApp opt-in rule:</span> You can only send to people who have already messaged your WhatsApp number (+27825611065). Anyone who hasn't messaged you first — WhatsApp will block the delivery. To reach new contacts, send them an SMS or email asking them to save the number and send "Hi".
            </div>

            {/* Results */}
            {results && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Results
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400 font-bold">{results.sent} sent</span>
                    {results.failed > 0 && <span className="text-red-400 font-bold">{results.failed} failed</span>}
                    <span className="text-muted-foreground">of {results.total}</span>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                  {results.results.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      {r.status === "sent"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className="text-xs text-foreground flex-1">{r.name}</span>
                      {r.error && (
                        <span className="text-[10px] text-red-400 truncate max-w-xs">{r.error}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${r.status === "sent" ? "border-emerald-500/40 text-emerald-400" : "border-red-500/40 text-red-400"}`}
                      >
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
