import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  Send, MessageSquare, Loader2, CheckCircle2, XCircle,
  Users, Megaphone, FileText, Pencil, Tag, Radio, ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Counts {
  total: number;
  active: number;
  verified: number;
  known: number;
  bySource: Array<{ source: string | null; count: number }>;
}

interface BroadcastJob {
  id: string;
  total: number;
  sent: number;
  failed: number;
  done: boolean;
  startedAt: string;
  errors: Array<{ name: string; error: string }>;
}

interface SyncResult {
  ok: boolean;
  queued: false;
  sent: number;
  failed: number;
  total: number;
  results: Array<{ id: number; name: string; status: "sent" | "failed"; error?: string }>;
}

interface AsyncResult {
  ok: boolean;
  queued: true;
  total: number;
  jobId: string;
}

type SendResult = SyncResult | AsyncResult;

interface Audience {
  label: string;
  count: number;
  filter: { status?: string; sourceBatch?: string };
}

const TEMPLATES = [
  {
    id: "test_invite",
    label: "Test Invite",
    description: "Invite to test the member portal",
    body: `Hi {name}! 👋

You're invited to test the new eblockwatch Cyber Chaperone member portal.

👉 https://cyber-chaperone-r--ryfsny.replit.app/website/

Log in or register with your WhatsApp number — takes 2 minutes.

Your feedback matters. Reply to this message and let me know what you think!

— Andre | eblockwatch`,
  },
  {
    id: "welcome",
    label: "Welcome",
    description: "Warm welcome for new members",
    body: `Hi {name}! 🛡️

Welcome to eblockwatch — you're now part of a trusted safety network that's been protecting South Africans since 2001.

A few things to know:
• Reply *Hi* to this number anytime to open your safety menu
• Use *Cyber Chaperone* before a trip and someone always knows you're safe
• Your Member Portal: https://cyber-chaperone-r--ryfsny.replit.app/website/

We're glad to have you with us.

— Andre Snyman | eblockwatch`,
  },
  {
    id: "cyber_chaperone",
    label: "Cyber Chaperone",
    description: "Explain the travel safety feature",
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

📍 *Community:* Stay alert and look out for your neighbours this week.

Stay safe out there.

— Andre | eblockwatch`,
  },
  {
    id: "check_in",
    label: "Check-In",
    description: "Check in with existing members",
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
    description: "Start from scratch",
    body: "",
  },
];

function fmt(n: number) {
  return n.toLocaleString("en-ZA");
}

function sourceBadgeColour(source: string | null) {
  if (!source) return "border-zinc-600 text-zinc-400";
  const map: Record<string, string> = {
    gas: "border-blue-600 text-blue-400",
    gass: "border-blue-600 text-blue-400",
    webflow: "border-purple-600 text-purple-400",
    paystack: "border-emerald-600 text-emerald-400",
  };
  return map[source.toLowerCase()] ?? "border-zinc-600 text-zinc-400";
}

function ProgressBar({ jobId, onDone }: { jobId: string; onDone: (j: BroadcastJob) => void }) {
  const doneRef = useRef(false);
  const { data: job } = useQuery<BroadcastJob>({
    queryKey: ["broadcast-job", jobId],
    queryFn: () => fetch(`${BASE}/api/broadcast/job/${jobId}`, { credentials: "include" }).then((r) => r.json()),
    refetchInterval: (q) => (q.state.data?.done ? false : 1500),
    staleTime: 0,
  });

  useEffect(() => {
    if (job?.done && !doneRef.current) {
      doneRef.current = true;
      onDone(job);
    }
  }, [job, onDone]);

  if (!job) return <div className="text-xs text-muted-foreground animate-pulse">Starting send job…</div>;

  const pct = job.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-primary animate-pulse" />
          {job.done ? "Send complete" : `Sending… ${fmt(job.sent + job.failed)} / ${fmt(job.total)}`}
        </span>
        <span className="font-bold text-foreground">{pct}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-emerald-400 font-bold">{fmt(job.sent)} sent</span>
        {job.failed > 0 && <span className="text-red-400 font-bold">{fmt(job.failed)} failed</span>}
        <span className="text-muted-foreground">of {fmt(job.total)}</span>
      </div>
      {job.errors.length > 0 && (
        <div className="text-[10px] text-red-400/80 max-h-24 overflow-y-auto space-y-0.5">
          {job.errors.slice(0, 10).map((e, i) => (
            <div key={i}>{e.name}: {e.error.slice(0, 80)}</div>
          ))}
          {job.errors.length > 10 && <div>…and {job.errors.length - 10} more</div>}
        </div>
      )}
    </div>
  );
}

export default function Broadcast() {
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null);
  const [message, setMessage] = useState(TEMPLATES[0].body);
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0].id);
  const [jobId, setJobId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [jobDone, setJobDone] = useState<BroadcastJob | null>(null);

  const { data: counts, isLoading: countsLoading } = useQuery<Counts>({
    queryKey: ["broadcast-counts"],
    queryFn: () => fetch(`${BASE}/api/broadcast/counts`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 60_000,
  });

  const audiences: Audience[] = counts
    ? [
        { label: "Everyone", count: counts.total, filter: {} },
        { label: "Known members (Active + Verified)", count: counts.known, filter: { status: "known" } },
        { label: "Active only", count: counts.active, filter: { status: "active" } },
        { label: "Verified only", count: counts.verified, filter: { status: "verified" } },
        ...counts.bySource
          .filter((s) => s.source && s.count > 0)
          .map((s) => ({
            label: `Source: ${s.source!.toUpperCase()}`,
            count: s.count,
            filter: { sourceBatch: s.source! },
          })),
        ...counts.bySource
          .filter((s) => !s.source && s.count > 0)
          .map((s) => ({
            label: "Legacy (no source tag)",
            count: s.count,
            filter: { sourceBatch: "none" },
          })),
      ]
    : [];

  const mutation = useMutation<SendResult, Error, { filter: object; message: string }>({
    mutationFn: (payload) =>
      fetch(`${BASE}/api/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.queued) {
        setJobId(data.jobId);
        setSyncResult(null);
        setJobDone(null);
      } else {
        setSyncResult(data as SyncResult);
        setJobId(null);
      }
    },
  });

  function send() {
    if (!selectedAudience || !message.trim()) return;
    setSyncResult(null);
    setJobId(null);
    setJobDone(null);
    mutation.mutate({ filter: selectedAudience.filter, message: message.trim() });
  }

  function pickTemplate(t: typeof TEMPLATES[0]) {
    setActiveTemplate(t.id);
    setMessage(t.body);
    setSyncResult(null);
    setJobId(null);
    setJobDone(null);
  }

  const isSending = mutation.isPending;
  const isRunning = !!jobId && !jobDone;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-widest shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <div className="h-4 w-px bg-border shrink-0" />
          <Megaphone className="w-4 h-4 text-primary shrink-0" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Broadcast</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedAudience
                ? `${fmt(selectedAudience.count)} recipients selected`
                : "Select an audience group to send to"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={send}
          disabled={!selectedAudience || !message.trim() || isSending || isRunning}
          className="uppercase tracking-widest text-xs"
        >
          {isSending || isRunning
            ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />{isRunning ? "Sending…" : "Queueing…"}</>
            : <><Send className="w-3 h-3 mr-2" />Send to {selectedAudience ? fmt(selectedAudience.count) : "…"}</>}
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left: audience selector ───────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Audience
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {countsLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1 px-2">
                {audiences.map((a) => {
                  const isActive = selectedAudience?.label === a.label;
                  const isSource = a.label.startsWith("Source:");
                  const isLegacy = a.label.startsWith("Legacy");
                  return (
                    <button
                      key={a.label}
                      onClick={() => { setSelectedAudience(a); setSyncResult(null); setJobId(null); setJobDone(null); }}
                      className={`w-full text-left px-3 py-2.5 rounded-sm border transition-colors flex items-center justify-between gap-2 ${
                        isActive
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {(isSource || isLegacy) && <Tag className="w-3 h-3 shrink-0" />}
                        <span className={`text-xs truncate ${isActive ? "font-semibold" : ""}`}>{a.label}</span>
                      </div>
                      <span className={`text-[11px] font-mono shrink-0 font-bold ${
                        isSource || isLegacy
                          ? sourceBadgeColour(a.filter.sourceBatch ?? null).replace("border-", "text-").split(" ")[0]
                          : isActive ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {fmt(a.count)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Opt-in notice */}
          <div className="shrink-0 mx-2 mb-3 rounded-sm border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 text-[10px] text-yellow-400/80 leading-relaxed">
            <span className="font-bold text-yellow-400">WhatsApp opt-in:</span> You can only reach members who have previously messaged your number. New contacts must message you first.
          </div>
        </div>

        {/* ── Right: templates + compose + results ─────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Template picker */}
          <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Templates
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
                    <div className={`text-xs font-bold mb-0.5 ${isActive ? "text-primary" : ""}`}>{t.label}</div>
                    <div className="text-[10px] leading-snug opacity-80">{t.description}</div>
                  </button>
                );
              })}
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

          {/* Compose + preview + results */}
          <div className="flex-1 px-5 py-4 flex flex-col gap-4">

            {/* Compose */}
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
                onChange={(e) => { setMessage(e.target.value); setActiveTemplate("custom"); }}
                className="font-mono text-xs resize-none h-52"
                placeholder="Pick a template above or start typing…"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Use <code className="bg-secondary px-1 rounded text-[10px]">{"{name}"}</code> — replaced with each member's first name when sent.
              </p>
            </div>

            {/* WhatsApp preview */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
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

            {/* Job progress (large async sends) */}
            {jobId && !jobDone && (
              <div className="border border-primary/30 bg-primary/5 rounded-lg px-4 py-4">
                <ProgressBar jobId={jobId} onDone={setJobDone} />
              </div>
            )}

            {/* Job done summary */}
            {jobDone && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Broadcast complete
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400 font-bold">{fmt(jobDone.sent)} sent</span>
                    {jobDone.failed > 0 && <span className="text-red-400 font-bold">{fmt(jobDone.failed)} failed</span>}
                    <span className="text-muted-foreground">of {fmt(jobDone.total)}</span>
                  </div>
                </div>
                {jobDone.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto divide-y divide-border/50">
                    {jobDone.errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-xs text-foreground">{e.name}</span>
                        <span className="text-[10px] text-red-400 truncate">{e.error.slice(0, 80)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sync result (small sends ≤50) */}
            {syncResult && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Results
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400 font-bold">{syncResult.sent} sent</span>
                    {syncResult.failed > 0 && <span className="text-red-400 font-bold">{syncResult.failed} failed</span>}
                    <span className="text-muted-foreground">of {syncResult.total}</span>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                  {syncResult.results.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      {r.status === "sent"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className="text-xs text-foreground flex-1">{r.name}</span>
                      {r.error && <span className="text-[10px] text-red-400 truncate max-w-xs">{r.error}</span>}
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
