import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, MessageSquare, Loader2, CheckCircle2, XCircle,
  Users, Megaphone, FileText, Pencil, Radio,
  ArrowLeft, Mail, Phone, MessageCircle, AlertTriangle, Info,
  Search, Filter, X, MapPin, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type Channel = "whatsapp" | "email" | "sms";

interface GeoStatRow {
  province: string | null;
  total: number;
  active: number;
  verified: number;
  withEmail: number;
  withMobile: number;
}

interface MemberRow {
  id: number;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  mobile: string | null;
  province: string | null;
  suburb: string | null;
  city: string | null;
  memberStatus: string;
  membershipTier: string | null;
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

interface Filters {
  province: string;
  status: string;
  tier: string;
  search: string;
}

// ── SA Province map data ──────────────────────────────────────────────────────

const SA_PROVINCES: Array<{ name: string; center: [number, number] }> = [
  { name: "Gauteng",        center: [-26.27, 28.11] },
  { name: "Western Cape",   center: [-33.90, 19.60] },
  { name: "KwaZulu-Natal",  center: [-29.00, 30.90] },
  { name: "Eastern Cape",   center: [-32.30, 26.42] },
  { name: "Limpopo",        center: [-23.90, 29.42] },
  { name: "Mpumalanga",     center: [-25.57, 30.53] },
  { name: "North West",     center: [-26.46, 25.72] },
  { name: "Free State",     center: [-28.45, 26.80] },
  { name: "Northern Cape",  center: [-29.05, 22.03] },
];

function normaliseProvince(raw: string | null): string {
  if (!raw) return "";
  const s = raw.trim().toLowerCase();
  if (s.includes("western cape") || s === "wc") return "Western Cape";
  if (s.includes("gauteng") || s === "gp" || s === "gt") return "Gauteng";
  if (s.includes("kwazulu") || s.includes("kwa-zulu") || s === "kzn") return "KwaZulu-Natal";
  if (s.includes("eastern cape") || s === "ec") return "Eastern Cape";
  if (s.includes("limpopo") || s === "lp" || s === "lim") return "Limpopo";
  if (s.includes("mpumalanga") || s === "mp") return "Mpumalanga";
  if (s.includes("north west") || s.includes("northwest") || s === "nw") return "North West";
  if (s.includes("free state") || s === "fs") return "Free State";
  if (s.includes("northern cape") || s === "nc") return "Northern Cape";
  return raw.trim();
}

// ── Email templates (funnel — Andre's voice) ─────────────────────────────────

const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    label: "Welcome",
    stage: "Awareness",
    description: "First touch — warm, belonging, relief",
    subject: "You made the right call, {name}.",
    body: `Hi {name},

I want to personally welcome you to eblockwatch.

You have just joined a community of South Africans who refuse to be vulnerable. Since 2001, we have been quietly watching over families, travellers, and lone drivers — not with gadgets or apps — but with real people, real networks, and real care.

Here is what happens next.

Save this WhatsApp number: +27 82 561 1065

When you are about to travel — whether it is a five-minute drive at night or a long road trip — send me a quick message. Tell me where you are going and when you expect to arrive. I will keep watch until you do.

That is Cyber Chaperone. Simple. Powerful. Yours.

[BUTTON: Start on WhatsApp | https://wa.me/27825611065]

If you have not yet set up your member profile, take two minutes and do it now. Add your ICE contact. That is the person we reach out to if we cannot get hold of you. It matters more than you think.

[BUTTON: Set Up Your Profile | https://cyber-chaperone-r--ryfsny.replit.app/website/]

---

Welcome to the network, {name}. We have got you.

P.S. — Share this with someone you care about. The more of us watching out for each other, the safer we all are.`
  },
  {
    id: "activation",
    label: "Cyber Chaperone",
    stage: "Activation",
    description: "Fear → simple action → relief",
    subject: "One message could save your life, {name}.",
    body: `Hi {name},

I am going to be direct with you.

Every year, South Africans go missing on ordinary roads, at ordinary hours. Not in dramatic circumstances — on the way home from work. From a friend's house. From a meeting across town.

Most of them had no one watching.

That changes today.

Cyber Chaperone is live and it is watching for you. Before your next trip, just send this to our WhatsApp:

*"Start [your location] to [destination] ETA [arrival time]"*

That is it. I create your trip record. I monitor your route. If you go quiet, I send a check-in. If there is still no answer, your ICE contact is alerted — automatically.

No app. No gadget. Just WhatsApp.

[BUTTON: Send Your First Trip | https://wa.me/27825611065]

25 years of watching over South Africans has taught me one thing: the people who use this feature never regret it. The ones who do not — sometimes wish they had.

Do not be in that second group.

---

I am here if you need anything.

P.S. — Takes less than 30 seconds. Try it right now, even just as a test. I promise it works.`
  },
  {
    id: "social_proof",
    label: "Social Proof",
    stage: "Engagement",
    description: "Story → community → fear resolved",
    subject: "What happened when {name}'s neighbour did not check in.",
    body: `Hi {name},

I am not going to name names. But I want to tell you something that happened recently.

A member — let us call her T — set off on a drive from Joburg to Pretoria. Normal route. Middle of the day. She had used Cyber Chaperone before, but this time she was in a rush. She did not send the message.

45 minutes past her expected arrival, no one knew where she was.

Her family started calling. Phones off. Two hours of panic, phones, roadside check — and she was fine. Tyre blow-out, no signal, stranded on the side of the N1.

She was fine. But those two hours broke her family.

That is what Cyber Chaperone prevents, {name}. Not just the incident — the *not knowing*. The silence. The panic of the people who love you.

We now have over 92,000 members watching over each other in South Africa. They know something that most people do not yet know:

*Safety is not something you buy. It is something you activate.*

[BUTTON: Activate Your Cyber Chaperone | https://wa.me/27825611065]

Also — if you have not yet added your ICE contact, please do that today. It is what makes the whole system work.

[BUTTON: Update Your Profile | https://cyber-chaperone-r--ryfsny.replit.app/website/]

---

Be safe, {name}.

P.S. — T is now one of our most vocal advocates. She has referred 14 members since that day. Community is how we stay safe.`
  },
  {
    id: "upgrade",
    label: "Upgrade",
    stage: "Consideration",
    description: "Family protection — loss aversion — FOMO",
    subject: "Your family deserves more than a maybe, {name}.",
    body: `Hi {name},

A question.

If something happened to you tonight — on the road, late at night, after a meeting — how long would it take for someone to know?

An hour? Two? Until morning?

Here is the honest truth about a free eblockwatch membership: it is a foundation. It gives you access to Cyber Chaperone, it gives you our network, it gives you the WhatsApp monitoring service.

But a *verified* membership gives your family something more.

It puts a human operator watching the Situation Room behind you. It prioritises your trip above unverified members if our capacity is stretched. It connects you to our trusted responder network if you ever need a physical presence on the ground.

For R150 a month, you are not buying a product. You are buying the certainty that if you go quiet, someone acts.

For R250 a month, your *entire family* is covered. Every drive. Every school run. Every late meeting.

[BUTTON: Upgrade Now | https://cyber-chaperone-r--ryfsny.replit.app/website/upgrade]

Over 200 South African families have already made this call. I hope you will be next.

---

This is the only time I will push you on this, {name}. After this, I am just here to watch over you either way.

P.S. — You can cancel any time. But most people who upgrade never do. Not because they are locked in — because they feel the difference.`
  },
  {
    id: "reengagement",
    label: "Re-engagement",
    stage: "Retention",
    description: "Personal concern — gentle — pull back",
    subject: "I have been thinking about you, {name}.",
    body: `Hi {name},

We have not heard from you in a while.

I hope that means everything has been quiet, safe, and good. I hope your roads have been clear and your evenings uneventful.

But I wanted to check in. Personally.

This is not an automated "we miss you" email. This is me — Andre — sitting in the Situation Room, looking at our member list, and wondering whether you are using what you have.

Because here is the thing: *the members who use Cyber Chaperone are safer.* Not because of technology. Because they have built the habit of being watched over. The habit of checking in. The habit of letting someone know.

If you have drifted away from that habit, I would like to invite you back.

Just send a WhatsApp. Say "Hi." I will be here.

[BUTTON: Message Me on WhatsApp | https://wa.me/27825611065]

And if there is anything that has made this harder to use — if there is something we could do better — reply to this email and tell me. I read every response.

---

You are not just a number to us, {name}. You are a person we made a commitment to when you joined.

That commitment does not expire.

P.S. — If life has changed and you are ready to go deeper — upgrade your membership. A lot has improved since you joined. https://cyber-chaperone-r--ryfsny.replit.app/website/upgrade`
  },
  {
    id: "blank_email",
    label: "Blank",
    stage: "Custom",
    description: "Start from scratch",
    subject: "",
    body: `Hi {name},\n\n\n\n— Andre Snyman\neblockwatch`
  },
];

const WA_TEMPLATES = [
  { id: "wa_invite",  label: "Portal Invite",    body: `Hi {name}!\n\nYou're invited to test the new eblockwatch Member Portal.\n\nhttps://cyber-chaperone-r--ryfsny.replit.app/website/\n\nLog in with your WhatsApp number — takes 2 minutes. Let me know what you think!\n\n— Andre | eblockwatch` },
  { id: "wa_cc",      label: "Cyber Chaperone",  body: `Hi {name}!\n\nBefore your next trip, send me:\n\n*Start [from] to [destination] ETA [time]*\n\nI watch over you until you arrive safely. No app. Just WhatsApp.\n\nReply *Hi* to see your full menu.\n— Andre | eblockwatch` },
  { id: "wa_upgrade", label: "Upgrade",           body: `Hi {name}\n\nUpgrade your eblockwatch membership for R150/month and get full Cyber Chaperone monitoring + 24/7 operator cover.\n\nhttps://cyber-chaperone-r--ryfsny.replit.app/website/upgrade\n\n— Andre` },
  { id: "wa_safety",  label: "Safety Tip",        body: `Hi {name}\n\nQuick safety reminder from eblockwatch: always share your route before a trip. Even a simple "leaving now, back by 6pm" to someone you trust could save your life.\n\nStay safe.\n— Andre | eblockwatch` },
  { id: "wa_checkin", label: "Check-In",          body: `Hi {name}\n\nJust checking in from eblockwatch. All good on your side?\n\nReply *Hi* to open your safety menu, or just reply if you need anything.\n\n— Andre` },
  { id: "wa_blank",   label: "Blank",             body: "" },
];

const SMS_TEMPLATES = [
  { id: "sms_invite",  label: "Portal",    body: `Hi {name}, your eblockwatch member portal is live: https://cyber-chaperone-r--ryfsny.replit.app/website/ — Andre Snyman | eblockwatch` },
  { id: "sms_cc",      label: "Chaperone", body: `Hi {name}, before your next trip WhatsApp +27825611065 your route + ETA and we watch you arrive safely. Free. | eblockwatch` },
  { id: "sms_upgrade", label: "Upgrade",   body: `Hi {name}, upgrade to full eblockwatch protection for R150/mo: https://cyber-chaperone-r--ryfsny.replit.app/website/upgrade — Andre` },
  { id: "sms_blank",   label: "Blank",     body: "" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("en-ZA");
function charInfo(t: string) { const l = t.length; return { len: l, parts: l <= 160 ? 1 : Math.ceil(l / 153) }; }

function statusBadge(s: string) {
  if (s === "verified") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (s === "active")   return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
}

// ── Province Map ──────────────────────────────────────────────────────────────

function ProvinceMap({
  geoStats, selected, onSelect
}: { geoStats: GeoStatRow[]; selected: string; onSelect: (p: string) => void }) {
  // Build normalised lookup from DB rows
  const lookup = new Map<string, GeoStatRow>();
  for (const row of geoStats) {
    const key = normaliseProvince(row.province);
    const existing = lookup.get(key);
    if (!existing || row.total > existing.total) lookup.set(key, row);
  }

  const maxTotal = Math.max(...SA_PROVINCES.map((p) => lookup.get(p.name)?.total ?? 0), 1);

  return (
    <div className="relative w-full h-full">
      <style>{`
        .province-tip { background:transparent!important;border:none!important;box-shadow:none!important;color:#fff!important;font-weight:700!important;font-size:11px!important;padding:0!important;white-space:nowrap; }
        .province-tip::before { display:none!important; }
        .leaflet-container { background:#0f172a!important; }
      `}</style>
      <MapContainer
        center={[-28.5, 25.5]}
        zoom={5}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/" target="_blank">CARTO</a>'
        />
        {SA_PROVINCES.map((prov) => {
          const stat   = lookup.get(prov.name);
          const count  = stat?.total ?? 0;
          const radius = 12 + Math.sqrt((count / maxTotal)) * 38;
          const isSel  = selected === prov.name;
          return (
            <CircleMarker
              key={prov.name}
              center={prov.center}
              radius={radius}
              pathOptions={{
                color:       isSel ? "#c9a227" : "#334155",
                fillColor:   isSel ? "#c9a227" : "#1e40af",
                fillOpacity: isSel ? 0.92 : count > 0 ? 0.72 : 0.25,
                weight:      isSel ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(isSel ? "" : prov.name) }}
            >
              <Tooltip
                permanent
                direction="center"
                offset={[0, 0]}
                className="province-tip"
              >
                {count > 0 ? (count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)) : ""}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-black/70 border border-border px-2 py-1.5 text-[9px] text-muted-foreground font-mono pointer-events-none space-y-0.5">
        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#c9a227]" /> Selected</div>
        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-700" /> Province</div>
        <div className="text-[8px] opacity-60 mt-0.5">Size = member count</div>
      </div>
    </div>
  );
}

// ── Progress / Results ────────────────────────────────────────────────────────

function ProgressBar({ jobId, onDone }: { jobId: string; onDone: (j: BroadcastJob) => void }) {
  const doneRef = useRef(false);
  const { data: job } = useQuery<BroadcastJob>({
    queryKey: ["broadcast-job", jobId],
    queryFn: () => fetch(`${BASE}/api/broadcast/job/${jobId}`, { credentials: "include" }).then((r) => r.json()),
    refetchInterval: (q) => (q.state.data?.done ? false : 1500),
    staleTime: 0,
  });
  useEffect(() => { if (job?.done && !doneRef.current) { doneRef.current = true; onDone(job); } }, [job, onDone]);
  if (!job) return <div className="text-xs text-muted-foreground animate-pulse">Starting job…</div>;
  const pct = job.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;
  return (
    <div className="space-y-2 border border-primary/30 bg-primary/5 rounded-lg px-4 py-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-primary animate-pulse" />
          {job.done ? "Complete" : `${fmt(job.sent + job.failed)} / ${fmt(job.total)}`}
        </span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-3 text-xs">
        <span className="text-emerald-400 font-bold">{fmt(job.sent)} sent</span>
        {job.failed > 0 && <span className="text-red-400 font-bold">{fmt(job.failed)} failed</span>}
      </div>
    </div>
  );
}

function ResultsBox({ result }: { result: SyncResult }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border text-xs font-bold">
        <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Results</span>
        <span className="flex items-center gap-3">
          <span className="text-emerald-400">{result.sent} sent</span>
          {result.failed > 0 && <span className="text-red-400">{result.failed} failed</span>}
        </span>
      </div>
      <div className="max-h-40 overflow-y-auto divide-y divide-border/50">
        {result.results.slice(0, 50).map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-4 py-2">
            {r.status === "sent" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
            <span className="text-xs flex-1 truncate">{r.name}</span>
            {r.error && <span className="text-[10px] text-red-400 truncate max-w-[180px]">{r.error}</span>}
          </div>
        ))}
        {result.results.length > 50 && <div className="px-4 py-2 text-[10px] text-muted-foreground">…and {result.results.length - 50} more</div>}
      </div>
    </div>
  );
}

// ── Member list panel ─────────────────────────────────────────────────────────

function MemberListPanel({ filters, channel }: { filters: Filters; channel: Channel }) {
  const params = new URLSearchParams();
  if (filters.province) params.set("province", filters.province);
  if (filters.status)   params.set("status",   filters.status);
  if (filters.tier)     params.set("tier",      filters.tier);
  if (filters.search)   params.set("search",    filters.search);
  if (channel !== "whatsapp") params.set("channel", channel);
  params.set("limit", "150");

  const { data, isLoading } = useQuery<{ members: MemberRow[]; total: number }>({
    queryKey: ["broadcast-member-list", params.toString()],
    queryFn: () => fetch(`${BASE}/api/broadcast/member-list?${params}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 30_000,
  });

  const [expanded, setExpanded] = useState(false);
  const displayCount = expanded ? (data?.members.length ?? 0) : 24;

  if (isLoading) return (
    <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading members…
    </div>
  );

  const members = data?.members ?? [];
  const total   = data?.total ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-bold flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary font-mono">{fmt(total)}</span>
          <span className="text-muted-foreground font-normal">recipients</span>
        </span>
        {members.length > 24 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
            {expanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />All {members.length}</>}
          </button>
        )}
      </div>
      <div className={`grid grid-cols-2 gap-0 ${expanded ? "max-h-96" : "max-h-52"} overflow-y-auto`}>
        {members.slice(0, displayCount).map((m) => (
          <div key={m.id} className="flex items-start gap-2 px-3 py-2 border-b border-border/30 hover:bg-secondary/20">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{m.displayName}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {m.suburb || m.city || m.province || "—"}
              </div>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusBadge(m.memberStatus)}`}>
              {m.memberStatus.slice(0, 3).toUpperCase()}
            </span>
          </div>
        ))}
        {total > 150 && !expanded && (
          <div className="col-span-2 px-3 py-2 text-[10px] text-muted-foreground text-center border-t border-border/30">
            +{fmt(total - 150)} more members — showing first 150
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Broadcast() {
  const [channel,  setChannel]  = useState<Channel>("email");
  const [filters,  setFilters]  = useState<Filters>({ province: "", status: "", tier: "", search: "" });
  const [message,  setMessage]  = useState(EMAIL_TEMPLATES[0].body);
  const [subject,  setSubject]  = useState(EMAIL_TEMPLATES[0].subject);
  const [tmplId,   setTmplId]   = useState(EMAIL_TEMPLATES[0].id);
  const [jobId,    setJobId]    = useState<string | null>(null);
  const [syncRes,  setSyncRes]  = useState<SyncResult | null>(null);
  const [jobDone,  setJobDone]  = useState<BroadcastJob | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const { data: geoData } = useQuery<{ provinces: GeoStatRow[] }>({
    queryKey: ["broadcast-geo"],
    queryFn: () => fetch(`${BASE}/api/broadcast/geo-stats`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 60_000,
  });

  const geoStats = geoData?.provinces ?? [];

  // Province click from map
  const handleProvinceSelect = useCallback((p: string) => {
    setFilters((f) => ({ ...f, province: p }));
    setSyncRes(null); setJobId(null); setJobDone(null);
  }, []);

  // Channel change → reset template
  useEffect(() => {
    setSyncRes(null); setJobId(null); setJobDone(null);
    if (channel === "email") { setMessage(EMAIL_TEMPLATES[0].body); setSubject(EMAIL_TEMPLATES[0].subject); setTmplId(EMAIL_TEMPLATES[0].id); }
    if (channel === "whatsapp") { setMessage(WA_TEMPLATES[0].body); setSubject(""); setTmplId(WA_TEMPLATES[0].id); }
    if (channel === "sms") { setMessage(SMS_TEMPLATES[0].body); setSubject(""); setTmplId(SMS_TEMPLATES[0].id); }
  }, [channel]);

  const endpoint = channel === "whatsapp" ? "/api/broadcast" : `/api/broadcast/${channel}`;
  const mutation = useMutation<SendResult, Error, object>({
    mutationFn: (payload) =>
      fetch(`${BASE}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.queued) { setJobId(data.jobId); setSyncRes(null); setJobDone(null); }
      else { setSyncRes(data as SyncResult); setJobId(null); }
    },
  });

  function send() {
    if (!message.trim()) return;
    if (channel === "email" && !subject.trim()) return;
    setSyncRes(null); setJobId(null); setJobDone(null);
    const f: Record<string, string> = {};
    if (filters.province) f.province = filters.province;
    if (filters.status)   f.status   = filters.status;
    if (filters.tier)     f.tier     = filters.tier;
    if (filters.search)   f.search   = filters.search;
    const payload: Record<string, unknown> = { filter: f, message: message.trim() };
    if (channel === "email") payload.subject = subject.trim();
    mutation.mutate(payload);
  }

  function clearFilters() { setFilters({ province: "", status: "", tier: "", search: "" }); }

  const templates = channel === "email" ? EMAIL_TEMPLATES : channel === "whatsapp" ? WA_TEMPLATES : SMS_TEMPLATES;
  const hasFilters = !!(filters.province || filters.status || filters.tier || filters.search);
  const isBusy = mutation.isPending || (!!jobId && !jobDone);
  const canSend = !!message.trim() && (channel !== "email" || !!subject.trim());
  const { len: smsLen, parts: smsParts } = charInfo(message);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <Megaphone className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-bold uppercase tracking-widest">Broadcast</span>
        </div>

        {/* Channel tabs */}
        <div className="flex items-center gap-0 border border-border rounded-md overflow-hidden">
          {(["email", "whatsapp", "sms"] as Channel[]).map((ch) => {
            const Icon = ch === "whatsapp" ? MessageCircle : ch === "email" ? Mail : Phone;
            return (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  channel === ch ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="w-3 h-3" />
                {ch === "whatsapp" ? "WA" : ch}
              </button>
            );
          })}
        </div>

        <Button size="sm" onClick={send} disabled={!canSend || isBusy} className="uppercase tracking-widest text-xs">
          {isBusy ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sending…</> : <><Send className="w-3 h-3 mr-1.5" />Send</>}
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left: map + filters ──────────────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">

          {/* Province map */}
          <div className="h-56 shrink-0 border-b border-border relative">
            {geoStats.length > 0
              ? <ProvinceMap geoStats={geoStats} selected={filters.province} onSelect={handleProvinceSelect} />
              : <div className="w-full h-full flex items-center justify-center bg-slate-950">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            }
            {filters.province && (
              <div className="absolute top-2 left-2 right-2 z-[1000] bg-primary/90 text-primary-foreground text-xs font-bold px-2.5 py-1.5 rounded flex items-center justify-between">
                <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{filters.province}</span>
                <button onClick={() => handleProvinceSelect("")} className="hover:opacity-70"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>

          {/* Province list (quick select) */}
          <div className="shrink-0 border-b border-border">
            <button onClick={() => setShowFilters(!showFilters)} className="w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-1.5"><Filter className="w-3 h-3" />Filters {hasFilters && <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[9px]">•</span>}</span>
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showFilters && (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

              {/* Province dropdown */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
                  <MapPin className="w-3 h-3" /> Province
                </label>
                <select
                  value={filters.province}
                  onChange={(e) => { setFilters((f) => ({ ...f, province: e.target.value })); setSyncRes(null); setJobId(null); setJobDone(null); }}
                  className="w-full bg-secondary border border-border rounded-sm text-xs px-2 py-1.5 text-foreground"
                >
                  <option value="">All provinces</option>
                  {SA_PROVINCES.map((p) => {
                    const stat = geoStats.find((g) => normaliseProvince(g.province) === p.name);
                    return <option key={p.name} value={p.name}>{p.name} {stat ? `(${fmt(stat.total)})` : ""}</option>;
                  })}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Status</label>
                <div className="grid grid-cols-2 gap-1">
                  {[["", "All"], ["known", "Known"], ["active", "Active"], ["verified", "Verified"]].map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => { setFilters((f) => ({ ...f, status: val })); setSyncRes(null); setJobId(null); setJobDone(null); }}
                      className={`py-1.5 text-xs rounded-sm border transition-colors ${filters.status === val ? "border-primary bg-primary/10 text-primary font-bold" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"}`}
                    >{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Tier */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Membership tier</label>
                <div className="grid grid-cols-3 gap-1">
                  {[["", "All"], ["individual", "Individual"], ["family", "Family"]].map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => { setFilters((f) => ({ ...f, tier: val })); setSyncRes(null); setJobId(null); setJobDone(null); }}
                      className={`py-1.5 text-[10px] rounded-sm border transition-colors ${filters.tier === val ? "border-primary bg-primary/10 text-primary font-bold" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"}`}
                    >{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Name/email/area search */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Search className="w-3 h-3" /> Search by name / email / area
                </label>
                <div className="relative">
                  <Input
                    value={filters.search}
                    onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setSyncRes(null); setJobId(null); setJobDone(null); }}
                    className="text-xs pr-7"
                    placeholder="Smith, Sandton, gmail…"
                  />
                  {filters.search && (
                    <button onClick={() => setFilters((f) => ({ ...f, search: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {hasFilters && (
                <button onClick={clearFilters} className="w-full text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-sm py-1.5 flex items-center justify-center gap-1">
                  <X className="w-3 h-3" /> Clear all filters
                </button>
              )}

              {/* Channel notices */}
              <div className={`rounded-sm border px-2.5 py-2 text-[10px] leading-relaxed ${
                channel === "email" ? "border-blue-500/30 bg-blue-500/5 text-blue-400/80"
                : channel === "sms" ? "border-orange-500/30 bg-orange-500/5 text-orange-400/80"
                : "border-yellow-500/30 bg-yellow-500/5 text-yellow-400/80"
              }`}>
                {channel === "email"    && <><span className="font-bold text-blue-400">Gmail limit:</span> ~500 emails/day. Larger batches auto-queue over multiple runs.</>}
                {channel === "sms"      && <><span className="font-bold text-orange-400">SMS sender:</span> Sends from your Twilio number. Recipients see +1 US number.</>}
                {channel === "whatsapp" && <><span className="font-bold text-yellow-400">WhatsApp:</span> Only members who have messaged your number first can receive messages.</>}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: members + compose ──────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Member names panel */}
          <div className="shrink-0 border-b border-border">
            <MemberListPanel filters={filters} channel={channel} />
          </div>

          {/* Compose area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Template selector */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Templates
                {channel === "email" && <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">— funnel-stage copy · Andre's voice</span>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {templates.map((t) => {
                  const isActive = tmplId === t.id;
                  const stage = (t as typeof EMAIL_TEMPLATES[0]).stage;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTmplId(t.id); setMessage(t.body);
                        if (channel === "email") setSubject((t as typeof EMAIL_TEMPLATES[0]).subject ?? "");
                        setSyncRes(null); setJobId(null); setJobDone(null);
                      }}
                      className={`text-left p-2.5 rounded-md border transition-all ${isActive ? "border-primary bg-primary/10" : "border-border bg-secondary/20 hover:border-border/80 hover:bg-secondary/50"}`}
                    >
                      <div className={`text-[11px] font-bold mb-0.5 ${isActive ? "text-primary" : "text-foreground"}`}>{t.label}</div>
                      {stage && <div className={`text-[9px] font-mono uppercase tracking-wide mb-0.5 ${isActive ? "text-primary/70" : "text-muted-foreground/60"}`}>{stage}</div>}
                      {"description" in t && <div className="text-[10px] text-muted-foreground leading-snug">{(t as { description: string }).description}</div>}
                    </button>
                  );
                })}
                {tmplId === "custom" && (
                  <div className="text-left p-2.5 rounded-md border border-primary bg-primary/10">
                    <div className="text-[11px] font-bold text-primary flex items-center gap-1"><Pencil className="w-3 h-3" />Custom</div>
                    <div className="text-[10px] text-muted-foreground">Your own message</div>
                  </div>
                )}
              </div>
            </div>

            {/* Subject (email only) */}
            {channel === "email" && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3 h-3" /> Subject line
                </label>
                <Input
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setTmplId("custom"); }}
                  className="text-xs"
                  placeholder="Subject — supports {name}"
                />
              </div>
            )}

            {/* Message body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Message
                </label>
                {channel === "sms"
                  ? <span className={`text-[10px] font-mono ${smsLen > 320 ? "text-red-400" : smsLen > 160 ? "text-yellow-400" : "text-muted-foreground"}`}>{smsLen} chars · {smsParts} SMS</span>
                  : <span className={`text-[10px] font-mono ${message.length > 3000 ? "text-yellow-400" : "text-muted-foreground"}`}>{message.length} chars</span>
                }
              </div>
              <Textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setTmplId("custom"); setSyncRes(null); setJobId(null); setJobDone(null); }}
                className="font-mono text-xs resize-none h-52"
                placeholder={
                  channel === "email" ? "Email body — {name} for first name · *bold* · [BUTTON: Label | url] for gold CTA button"
                  : channel === "sms" ? "SMS text — keep under 160 chars. {name} for first name."
                  : "WhatsApp message — {name} for first name, *bold* for bold."
                }
              />
              {channel === "email" && (
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  <code className="bg-secondary px-1 rounded">{"{"+"name}"}</code> first name ·
                  <code className="bg-secondary px-1 rounded mx-1">*text*</code> bold ·
                  <code className="bg-secondary px-1 rounded">[BUTTON: Label | https://...]</code> gold CTA button ·
                  <code className="bg-secondary px-1 rounded mx-1">---</code> divider
                </p>
              )}
              {channel === "sms" && smsLen > 160 && (
                <p className="text-[10px] text-yellow-400/80 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> Over 160 chars — sends as {smsParts} SMS parts, costs {smsParts}× per person.
                </p>
              )}
            </div>

            {/* Email preview */}
            {channel === "email" && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Preview</div>
                <div className="rounded-lg overflow-hidden border border-border max-h-72 overflow-y-auto">
                  {/* Header — eblockwatch navy */}
                  <div className="bg-[#1a1f2e] px-5 py-4 text-center">
                    <img src="https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif" alt="eblockwatch" className="h-7 mx-auto object-contain" />
                    <div className="text-[#6b7280] text-[9px] tracking-[3px] mt-2 font-sans uppercase">Cyber Chaperone · Est. 2001 · South Africa</div>
                  </div>
                  {/* Green bar */}
                  <div className="h-0.5 bg-gradient-to-r from-[#16a34a] via-[#22c55e] to-[#16a34a]" />
                  {subject && <div className="bg-white px-5 py-2 border-b border-gray-100 text-[11px] font-bold text-gray-500">Subject: {subject.replace(/\{name\}/gi, "Kieren")}</div>}
                  <div className="bg-white px-5 py-4 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                    {message.replace(/\{name\}/gi, "Kieren") || <span className="italic text-gray-400">Your message will appear here…</span>}
                  </div>
                  {/* Signature */}
                  <div className="bg-[#f0fdf4] px-5 py-3 border-t-2 border-[#22c55e] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1a1f2e] border-2 border-[#22c55e] flex items-center justify-center shrink-0">
                      <span className="text-[#22c55e] font-bold text-xs font-sans">A</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-800 font-sans">Andre Snyman</div>
                      <div className="text-[10px] text-gray-500 font-sans">Founder · eblockwatch · +27 82 561 1065</div>
                    </div>
                  </div>
                  {/* Social footer */}
                  <div className="bg-[#1a1f2e] px-5 py-2.5 flex justify-center gap-1.5 flex-wrap">
                    {[
                      { l: "Facebook", bg: "#1877f2" },
                      { l: "Instagram", bg: "#e1306c" },
                      { l: "Website", bg: "#22c55e" },
                      { l: "Portal", bg: "#22c55e" },
                      { l: "WhatsApp", bg: "#25d366" },
                    ].map(({ l, bg }) => (
                      <span key={l} style={{ background: bg }} className="text-[8px] font-bold px-2 py-1 font-sans tracking-widest uppercase text-white rounded">{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp preview */}
            {channel === "whatsapp" && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Preview</div>
                <div className="bg-[#0b141a] rounded-xl p-4 max-h-56 overflow-y-auto">
                  <div className="inline-block bg-[#202c33] rounded-lg px-4 py-3 max-w-[85%] text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                    {message.replace(/\{name\}/gi, "Kieren") || <span className="italic text-[#8696a0]">Your message…</span>}
                  </div>
                </div>
              </div>
            )}

            {/* SMS preview */}
            {channel === "sms" && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Preview</div>
                <div className="bg-[#f0f0f0] rounded-xl p-4">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-400 shrink-0 mt-0.5" />
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {message.replace(/\{name\}/gi, "Kieren") || <span className="italic text-gray-400">Your SMS…</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gmail batch warning */}
            {channel === "email" && (
              <div className="flex items-start gap-2 rounded-sm border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[10px] text-blue-400/80 leading-relaxed">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <span>Emails come from <strong>Andre Snyman | eblockwatch</strong> with eblockwatch navy/green branding, your signature, and Facebook · Instagram · Website · Portal · WhatsApp links in the footer.</span>
              </div>
            )}

            {/* Progress */}
            {jobId && !jobDone && <ProgressBar jobId={jobId} onDone={setJobDone} />}
            {jobDone && (
              <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg px-4 py-3 text-xs">
                <div className="font-bold text-emerald-400 flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4" /> Broadcast complete</div>
                <div className="text-muted-foreground">{fmt(jobDone.sent)} sent · {jobDone.failed > 0 ? `${jobDone.failed} failed · ` : ""}{fmt(jobDone.total)} total</div>
              </div>
            )}
            {syncRes && <ResultsBox result={syncRes} />}
          </div>
        </div>
      </div>
    </div>
  );
}
