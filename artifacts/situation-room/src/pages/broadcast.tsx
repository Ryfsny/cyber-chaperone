import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  Send, MessageSquare, Loader2, CheckCircle2, XCircle,
  Users, Megaphone, FileText, Pencil, Tag, Radio,
  ArrowLeft, Mail, Phone, MessageCircle, AlertTriangle, Info,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Channel = "whatsapp" | "email" | "sms";

interface Counts {
  total: number; active: number; verified: number; known: number;
  bySource: Array<{ source: string | null; count: number }>;
  email: { total: number; active: number; verified: number; known: number };
  sms:   { total: number; active: number; verified: number; known: number };
}

interface BroadcastJob {
  id: string; channel: Channel; total: number; sent: number; failed: number;
  done: boolean; startedAt: string; errors: Array<{ name: string; error: string }>;
}

interface SyncResult {
  ok: boolean; queued: false; sent: number; failed: number; total: number;
  results: Array<{ id: number; name: string; status: "sent" | "failed"; error?: string }>;
}
interface AsyncResult { ok: boolean; queued: true; total: number; jobId: string }
type SendResult = SyncResult | AsyncResult;

interface Audience {
  label: string; count: number;
  filter: { status?: string; sourceBatch?: string };
}

// ── Templates ────────────────────────────────────────────────────────────────

const WA_TEMPLATES = [
  { id: "test_invite",  label: "Test Invite",    description: "Invite to test the member portal",
    body: `Hi {name}!\n\nYou're invited to test the new eblockwatch Cyber Chaperone member portal.\n\nhttps://cyber-chaperone-r--ryfsny.replit.app/website/\n\nLog in or register with your WhatsApp number — takes 2 minutes. Reply and let me know what you think!\n\n— Andre | eblockwatch` },
  { id: "welcome",      label: "Welcome",         description: "Warm welcome for new members",
    body: `Hi {name}!\n\nWelcome to eblockwatch — you're now part of a trusted safety network protecting South Africans since 2001.\n\nReply *Hi* anytime to open your safety menu.\nMember Portal: https://cyber-chaperone-r--ryfsny.replit.app/website/\n\nWe're glad to have you with us.\n— Andre Snyman | eblockwatch` },
  { id: "cyber_chaperone", label: "Cyber Chaperone", description: "Explain the travel safety feature",
    body: `Hi {name}\n\nDid you know you have a personal travel safety feature?\n\n*Cyber Chaperone* monitors your trips in real time:\n\n1. WhatsApp: Start [from] to [destination] ETA [time]\n2. I track your route and check in if you're late\n3. If something seems wrong, I reach out to your ICE contact\n\nFree. On WhatsApp. Could save your life.\n\nReply *Hi* to try it.\n— Andre | eblockwatch` },
  { id: "safety_tip",   label: "Safety Tip",      description: "Timely community safety reminder",
    body: `Hi {name}\n\nQuick safety reminder from eblockwatch:\n\n*Travel tip:* Always share your route before a long trip. Even "leaving now, back by 6pm" to a trusted contact makes a difference.\n\n*Community:* Stay alert and look out for your neighbours this week.\n\nStay safe.\n— Andre | eblockwatch` },
  { id: "check_in",     label: "Check-In",        description: "Check in with existing members",
    body: `Hi {name}\n\nJust checking in from eblockwatch. Is everything okay on your side?\n\nReply *Hi* to open your menu, or just reply if you need anything.\n\nWe're here.\n— Andre | eblockwatch` },
  { id: "blank",        label: "Blank",            description: "Start from scratch", body: "" },
];

const EMAIL_TEMPLATES = [
  { id: "welcome_email", label: "Welcome",        description: "Welcome email for new members",
    subject: "Welcome to eblockwatch, {name}",
    body: `Hi {name},\n\nWelcome to eblockwatch — you are now part of a trusted safety network that has been protecting South Africans since 2001.\n\nHere is what you get as a member:\n\n*Cyber Chaperone* — real-time trip monitoring via WhatsApp. Before any journey, send us a WhatsApp with your destination and ETA, and we watch over you until you arrive safely.\n\n*Your Member Portal* — log in at https://cyber-chaperone-r--ryfsny.replit.app/website/ to manage your profile, update your ICE contact, and upgrade your membership.\n\n*24/7 Operator* — a human is always watching the Situation Room, ready to act if something goes wrong.\n\nTo get started, save our WhatsApp number and send us a message: +27 82 561 1065\n\nWe are glad to have you with us.\n\nAndre Snyman\neblockwatch` },
  { id: "cyber_chaperone_email", label: "Cyber Chaperone", description: "Introduce the travel feature",
    subject: "Your personal travel safety feature is ready, {name}",
    body: `Hi {name},\n\nDid you know your eblockwatch membership includes a personal travel safety feature called *Cyber Chaperone*?\n\nHere is how it works:\n\n1. Before any trip, WhatsApp us: "Start [from] to [destination] ETA [time]"\n2. We create a live trip record and monitor your route in real time\n3. If you go silent past your ETA, we send you a check-in prompt\n4. If there is no response, we alert your ICE contact immediately\n5. When you arrive safely, simply message "I have arrived" and your trip is closed\n\nNo app to download. No gadget to buy. Just WhatsApp.\n\nSave our number and try it on your next trip: +27 82 561 1065\n\nStay safe out there.\n\nAndre Snyman\neblockwatch` },
  { id: "newsletter", label: "Newsletter",          description: "Monthly member update",
    subject: "eblockwatch — Member Update",
    body: `Hi {name},\n\nHere is a quick update from eblockwatch.\n\n*What is new*\n\nWe have been busy improving Cyber Chaperone — your real-time travel safety monitor. The system is now faster, smarter, and watching more carefully than ever.\n\n*Reminder*\n\nIf you have not yet added an ICE (In Case of Emergency) contact to your profile, please do so now. Log in at https://cyber-chaperone-r--ryfsny.replit.app/website/ and update your profile — it takes two minutes and could make all the difference.\n\n*Thank you*\n\nThank you for being part of the eblockwatch community. We take this responsibility seriously.\n\nAndre Snyman\neblockwatch` },
  { id: "upgrade", label: "Upgrade Offer",          description: "Invite to upgrade membership",
    subject: "Upgrade your eblockwatch membership, {name}",
    body: `Hi {name},\n\nThank you for being an eblockwatch member.\n\nIf you have not yet upgraded to a paid membership, now is the time. For just R150 per month (or R250 for your whole family), you get full Cyber Chaperone monitoring, 24/7 operator cover, and access to our trusted responder network.\n\nTo upgrade, log in to your Member Portal:\nhttps://cyber-chaperone-r--ryfsny.replit.app/website/upgrade\n\nIt takes two minutes and you are instantly covered.\n\nAndre Snyman\neblockwatch` },
  { id: "blank_email", label: "Blank",              description: "Start from scratch", subject: "", body: "" },
];

const SMS_TEMPLATES = [
  { id: "sms_invite", label: "Portal Invite",   description: "Short invite to the member portal",
    body: `Hi {name}, your eblockwatch member portal is live. Log in now: https://cyber-chaperone-r--ryfsny.replit.app/website/ - Andre | eblockwatch` },
  { id: "sms_cc",     label: "Cyber Chaperone", description: "Introduce the travel feature by SMS",
    body: `Hi {name}, before your next trip WhatsApp us your route and ETA and we watch over you until you arrive. Save: +27 82 561 1065 - eblockwatch` },
  { id: "sms_safety", label: "Safety Tip",       description: "Short community safety reminder",
    body: `Hi {name}, quick safety tip from eblockwatch: always share your route before a long trip. We are here if you need us. - Andre` },
  { id: "sms_blank",  label: "Blank",            description: "Start from scratch", body: "" },
];

// ── Utilities ────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("en-ZA"); }

function sourceBadgeColour(source: string | null) {
  if (!source) return "text-zinc-400";
  const map: Record<string, string> = { gas: "text-blue-400", gass: "text-blue-400", webflow: "text-purple-400", paystack: "text-emerald-400" };
  return map[source.toLowerCase()] ?? "text-zinc-400";
}

function charCount(text: string) {
  const len = text.length;
  const parts = len <= 160 ? 1 : Math.ceil(len / 153);
  return { len, parts };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ jobId, onDone }: { jobId: string; onDone: (j: BroadcastJob) => void }) {
  const doneRef = useRef(false);
  const { data: job } = useQuery<BroadcastJob>({
    queryKey: ["broadcast-job", jobId],
    queryFn: () => fetch(`${BASE}/api/broadcast/job/${jobId}`, { credentials: "include" }).then((r) => r.json()),
    refetchInterval: (q) => (q.state.data?.done ? false : 1500),
    staleTime: 0,
  });
  useEffect(() => {
    if (job?.done && !doneRef.current) { doneRef.current = true; onDone(job); }
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
        <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-emerald-400 font-bold">{fmt(job.sent)} sent</span>
        {job.failed > 0 && <span className="text-red-400 font-bold">{fmt(job.failed)} failed</span>}
        <span className="text-muted-foreground">of {fmt(job.total)}</span>
      </div>
      {job.errors.length > 0 && (
        <div className="text-[10px] text-red-400/80 max-h-24 overflow-y-auto space-y-0.5">
          {job.errors.slice(0, 10).map((e, i) => <div key={i}>{e.name}: {e.error.slice(0, 80)}</div>)}
          {job.errors.length > 10 && <div>…and {job.errors.length - 10} more</div>}
        </div>
      )}
    </div>
  );
}

function ResultsTable({ result }: { result: SyncResult }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> Results
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400 font-bold">{result.sent} sent</span>
          {result.failed > 0 && <span className="text-red-400 font-bold">{result.failed} failed</span>}
          <span className="text-muted-foreground">of {result.total}</span>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
        {result.results.map((r) => (
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
  );
}

function DoneBox({ job }: { job: BroadcastJob }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Broadcast complete
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400 font-bold">{fmt(job.sent)} sent</span>
          {job.failed > 0 && <span className="text-red-400 font-bold">{fmt(job.failed)} failed</span>}
          <span className="text-muted-foreground">of {fmt(job.total)}</span>
        </div>
      </div>
      {job.errors.length > 0 && (
        <div className="max-h-32 overflow-y-auto divide-y divide-border/50">
          {job.errors.map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-foreground">{e.name}</span>
              <span className="text-[10px] text-red-400 truncate">{e.error.slice(0, 80)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Broadcast() {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null);
  const [message, setMessage] = useState(WA_TEMPLATES[0].body);
  const [subject, setSubject]   = useState(EMAIL_TEMPLATES[0].subject);
  const [activeTemplate, setActiveTemplate] = useState("test_invite");
  const [jobId, setJobId]       = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [jobDone, setJobDone]   = useState<BroadcastJob | null>(null);

  const { data: counts, isLoading: countsLoading } = useQuery<Counts>({
    queryKey: ["broadcast-counts"],
    queryFn: () => fetch(`${BASE}/api/broadcast/counts`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 60_000,
  });

  // Build audience list per channel
  const audiences: Audience[] = counts
    ? (() => {
        const src = channel === "email" ? counts.email : channel === "sms" ? counts.sms : counts;
        const base: Audience[] = [
          { label: "Everyone",                      count: src.total,    filter: {} },
          { label: "Known members (Active + Verified)", count: src.known,    filter: { status: "known" } },
          { label: "Active only",                   count: src.active,   filter: { status: "active" } },
          { label: "Verified only",                 count: src.verified, filter: { status: "verified" } },
        ];
        if (channel === "whatsapp") {
          const sourceSubs = counts.bySource
            .filter((s) => s.source && s.count > 0)
            .map((s) => ({ label: `Source: ${s.source!.toUpperCase()}`, count: s.count, filter: { sourceBatch: s.source! } }));
          const legacySubs = counts.bySource
            .filter((s) => !s.source && s.count > 0)
            .map((s) => ({ label: "Legacy (no source tag)", count: s.count, filter: { sourceBatch: "none" } }));
          return [...base, ...sourceSubs, ...legacySubs];
        }
        return base;
      })()
    : [];

  // Reset audience when channel changes
  useEffect(() => {
    setSelectedAudience(null);
    setSyncResult(null);
    setJobId(null);
    setJobDone(null);
    if (channel === "whatsapp") { setMessage(WA_TEMPLATES[0].body); setActiveTemplate(WA_TEMPLATES[0].id); }
    if (channel === "email")    { setMessage(EMAIL_TEMPLATES[0].body); setSubject(EMAIL_TEMPLATES[0].subject); setActiveTemplate(EMAIL_TEMPLATES[0].id); }
    if (channel === "sms")      { setMessage(SMS_TEMPLATES[0].body); setActiveTemplate(SMS_TEMPLATES[0].id); }
  }, [channel]);

  const endpoint = channel === "whatsapp" ? "/api/broadcast" : channel === "email" ? "/api/broadcast/email" : "/api/broadcast/sms";

  const mutation = useMutation<SendResult, Error, object>({
    mutationFn: (payload) =>
      fetch(`${BASE}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.queued) { setJobId(data.jobId); setSyncResult(null); setJobDone(null); }
      else { setSyncResult(data as SyncResult); setJobId(null); }
    },
  });

  function send() {
    if (!selectedAudience || !message.trim()) return;
    if (channel === "email" && !subject.trim()) return;
    setSyncResult(null); setJobId(null); setJobDone(null);
    const payload: Record<string, unknown> = { filter: selectedAudience.filter, message: message.trim() };
    if (channel === "email") payload.subject = subject.trim();
    mutation.mutate(payload);
  }

  function resetState() { setSyncResult(null); setJobId(null); setJobDone(null); }

  const templates = channel === "whatsapp" ? WA_TEMPLATES : channel === "email" ? EMAIL_TEMPLATES : SMS_TEMPLATES;
  const isSending = mutation.isPending;
  const isRunning = !!jobId && !jobDone;
  const canSend   = !!selectedAudience && !!message.trim() && (channel !== "email" || !!subject.trim());
  const { len: smsLen, parts: smsParts } = charCount(message);

  const channelLabel = channel === "whatsapp" ? `WhatsApp ${fmt(selectedAudience?.count ?? 0)}` : channel === "email" ? `Email ${fmt(selectedAudience?.count ?? 0)}` : `SMS ${fmt(selectedAudience?.count ?? 0)}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
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
              {selectedAudience ? `${fmt(selectedAudience.count)} recipients — ${channel.toUpperCase()}` : "Select channel and audience"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={send}
          disabled={!canSend || isSending || isRunning}
          className="uppercase tracking-widest text-xs"
        >
          {isSending || isRunning
            ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />{isRunning ? "Sending…" : "Queueing…"}</>
            : <><Send className="w-3 h-3 mr-2" />Send {selectedAudience ? channelLabel : "…"}</>}
        </Button>
      </div>

      {/* ── Channel tabs ───────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-border bg-card/40">
        {(["whatsapp", "email", "sms"] as Channel[]).map((ch) => {
          const Icon = ch === "whatsapp" ? MessageCircle : ch === "email" ? Mail : Phone;
          const label = ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Gmail" : "SMS";
          const count = counts
            ? ch === "whatsapp" ? counts.total
            : ch === "email"    ? counts.email.total
            : counts.sms.total
            : null;
          return (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
                channel === ch
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count !== null && (
                <span className={`text-[10px] font-mono ${channel === ch ? "text-primary" : "text-muted-foreground"}`}>
                  {fmt(count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left: audience ─────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Audience
            </div>
            {channel === "email" && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Counts filtered to members with an email address.
              </p>
            )}
            {channel === "sms" && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Counts filtered to members with a mobile number.
              </p>
            )}
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
                      onClick={() => { setSelectedAudience(a); resetState(); }}
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
                        isSource || isLegacy ? sourceBadgeColour(a.filter.sourceBatch ?? null)
                        : isActive ? "text-primary" : "text-muted-foreground"
                      }`}>{fmt(a.count)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notice per channel */}
          <div className={`shrink-0 mx-2 mb-3 rounded-sm border px-3 py-2.5 text-[10px] leading-relaxed ${
            channel === "email"
              ? "border-blue-500/30 bg-blue-500/5 text-blue-400/80"
              : channel === "sms"
              ? "border-orange-500/30 bg-orange-500/5 text-orange-400/80"
              : "border-yellow-500/30 bg-yellow-500/5 text-yellow-400/80"
          }`}>
            {channel === "whatsapp" && <><span className="font-bold text-yellow-400">WhatsApp opt-in:</span> Only members who have previously messaged your number can receive WhatsApp messages.</>}
            {channel === "email" && <><span className="font-bold text-blue-400">Gmail limit:</span> Standard Gmail sends up to 500 emails per day. For large batches, split across multiple days.</>}
            {channel === "sms" && <><span className="font-bold text-orange-400">SMS sender:</span> Messages go out from your registered Twilio number. Recipients will see a +1 US number unless you configure an alphanumeric sender ID.</>}
          </div>
        </div>

        {/* ── Right: compose ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Template picker */}
          <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Templates
            </div>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((t) => {
                const isActive = activeTemplate === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTemplate(t.id);
                      setMessage(t.body);
                      if (channel === "email") setSubject((t as typeof EMAIL_TEMPLATES[0]).subject ?? "");
                      resetState();
                    }}
                    className={`text-left p-3 rounded-md border transition-all ${
                      isActive ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className={`text-xs font-bold mb-0.5 ${isActive ? "text-primary" : ""}`}>{t.label}</div>
                    <div className="text-[10px] leading-snug opacity-80">{t.description}</div>
                  </button>
                );
              })}
              {activeTemplate === "custom" && (
                <div className="text-left p-3 rounded-md border border-primary bg-primary/10">
                  <div className="text-xs font-bold text-primary mb-0.5 flex items-center gap-1"><Pencil className="w-3 h-3" /> Custom</div>
                  <div className="text-[10px] leading-snug text-muted-foreground">Your own message</div>
                </div>
              )}
            </div>
          </div>

          {/* Compose */}
          <div className="flex-1 px-5 py-4 flex flex-col gap-4">

            {/* Subject (email only) */}
            {channel === "email" && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Mail className="w-3 h-3" /> Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setActiveTemplate("custom"); resetState(); }}
                  className="text-xs"
                  placeholder="Email subject line — supports {name}"
                />
              </div>
            )}

            {/* Message body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Message
                </label>
                {channel === "sms" ? (
                  <span className={`text-[10px] font-mono ${smsLen > 320 ? "text-red-400" : smsLen > 160 ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {smsLen} chars · {smsParts} {smsParts === 1 ? "SMS" : "SMS parts"}
                  </span>
                ) : (
                  <span className={`text-[10px] font-mono ${message.length > 1600 ? "text-red-400" : "text-muted-foreground"}`}>
                    {message.length}{channel === "whatsapp" ? " / 1600" : ""}
                  </span>
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setActiveTemplate("custom"); resetState(); }}
                className="font-mono text-xs resize-none h-48"
                placeholder={
                  channel === "whatsapp" ? "Pick a template or start typing… use {name} for the member's first name"
                  : channel === "email"  ? "Email body — use {name} for first name, *bold* for bold, blank line for new paragraph"
                  : "SMS message — keep it short and clear. Use {name} for the member's first name."
                }
              />
              {channel === "sms" && smsLen > 160 && (
                <p className="text-[10px] text-yellow-400/80 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> Over 160 characters — this will send as {smsParts} SMS parts and cost {smsParts}x per recipient.
                </p>
              )}
              {channel !== "sms" && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Use <code className="bg-secondary px-1 rounded text-[10px]">{"{name}"}</code> — replaced with each member's first name.
                  {channel === "email" && <> Use <code className="bg-secondary px-1 rounded text-[10px]">*word*</code> for <strong>bold</strong>. Blank lines become paragraphs.</>}
                </p>
              )}
            </div>

            {/* Preview */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Preview</div>

              {channel === "whatsapp" && (
                <div className="bg-[#0b141a] rounded-xl p-4 max-h-56 overflow-y-auto">
                  <div className="inline-block bg-[#202c33] rounded-lg px-4 py-3 max-w-[85%] text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                    {message.replace(/\{name\}/gi, "Kieren") || <span className="italic text-[#8696a0]">Your message will appear here…</span>}
                  </div>
                  <div className="text-[10px] text-[#8696a0] mt-1.5 ml-1">{new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              )}

              {channel === "email" && (
                <div className="rounded-lg overflow-hidden border border-border max-h-72 overflow-y-auto">
                  <div className="bg-[#1a2744] px-5 py-3">
                    <div className="text-[#e8a020] text-xs font-bold tracking-widest">eblockwatch</div>
                    <div className="text-[#8a9ab8] text-[10px] mt-0.5">Cyber Chaperone Safety Network</div>
                  </div>
                  <div className="bg-white px-5 py-4">
                    {subject && <div className="text-[11px] font-bold text-gray-500 mb-3 pb-2 border-b border-gray-100">Subject: {subject.replace(/\{name\}/gi, "Kieren")}</div>}
                    <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {message.replace(/\{name\}/gi, "Kieren") || <span className="italic text-gray-400">Your message will appear here…</span>}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-2.5 border-t border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400">eblockwatch — Cyber Chaperone — South Africa</span>
                  </div>
                </div>
              )}

              {channel === "sms" && (
                <div className="bg-[#f0f0f0] rounded-xl p-4 max-h-40 overflow-y-auto">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-400 shrink-0 mt-0.5" />
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                      <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {message.replace(/\{name\}/gi, "Kieren") || <span className="italic text-gray-400">Your SMS will appear here…</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 text-right">{new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gmail batch info */}
            {channel === "email" && selectedAudience && selectedAudience.count > 500 && (
              <div className="flex items-start gap-2 rounded-sm border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 text-[10px] text-yellow-400/80 leading-relaxed">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <span>You are about to send to {fmt(selectedAudience.count)} recipients. Gmail allows ~500 emails per day. The system will send as many as it can — you may need to run this again tomorrow for the remainder.</span>
              </div>
            )}

            {/* Job progress */}
            {jobId && !jobDone && (
              <div className="border border-primary/30 bg-primary/5 rounded-lg px-4 py-4">
                <ProgressBar jobId={jobId} onDone={setJobDone} />
              </div>
            )}

            {/* Job done */}
            {jobDone && <DoneBox job={jobDone} />}

            {/* Sync results */}
            {syncResult && <ResultsTable result={syncResult} />}
          </div>
        </div>
      </div>
    </div>
  );
}
