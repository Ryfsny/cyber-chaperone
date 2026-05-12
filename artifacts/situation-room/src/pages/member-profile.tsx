import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Phone, Mail, MapPin, Shield, Calendar, MessageSquare,
  Navigation, CheckCircle2, AlertCircle, AlertTriangle, Clock, Users, FileText,
  Home, Fingerprint, ExternalLink, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberFull {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  membershipTier: string | null;
  role: string | null;
  notes: string | null;
  iceContactName: string | null;
  iceContactPhone: string | null;
  familyGroupId: number | null;
  homeLat: string | null;
  homeLon: string | null;
  homeAddress: string | null;
  email: string | null;
  mobile: string | null;
  industry: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  sourceBatch: string | null;
  importStatus: string | null;
  facebookUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MemberMessage {
  id: number;
  fromNumber: string;
  toNumber: string;
  body: string;
  messageSid: string | null;
  tripId: number | null;
  direction: string;
  receivedAt: string;
}

interface MemberTrip {
  id: number;
  title: string;
  travelerName: string;
  travelerPhone: string;
  status: string;
  evidenceNotes: string | null;
  inferenceNotes: string | null;
  nextAction: string | null;
  operatorNotes: string | null;
  originalMemberEta: string | null;
  etaDriftMinutes: number | null;
  iceEscalationStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(phone: string) { return phone.replace(/^whatsapp:/, ""); }
function fmtDate(iso: string) { return format(new Date(iso), "d MMM yyyy"); }
function fmtDatetime(iso: string) { return format(new Date(iso), "d MMM yyyy HH:mm"); }
function fmtAgo(iso: string) { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-900 text-green-300 border-green-700",
    verified: "bg-emerald-900 text-emerald-300 border-emerald-700",
    pending: "bg-yellow-900 text-yellow-300 border-yellow-700",
    inactive: "bg-red-900 text-red-300 border-red-700",
  };
  return <Badge className={`${map[status] ?? "bg-zinc-800 text-zinc-300 border-zinc-600"} uppercase text-[10px]`}>{status}</Badge>;
}

// ── Trip status colours ────────────────────────────────────────────────────────
const TRIP_BORDER: Record<string, string> = {
  red: "border-red-500",
  amber: "border-amber-500",
  green: "border-green-500/40",
  completed: "border-border opacity-60",
};
const TRIP_HEADER_BG: Record<string, string> = {
  red: "bg-red-500/10 border-red-500",
  amber: "bg-amber-500/10 border-amber-500",
  green: "bg-green-500/10 border-green-500/40",
  completed: "bg-muted/20 border-border",
};
const TRIP_STATUS_ICON: Record<string, React.FC<{ className?: string }>> = {
  red: AlertCircle,
  amber: AlertTriangle,
  green: CheckCircle2,
  completed: CheckCircle2,
};
const TRIP_STATUS_TEXT: Record<string, string> = {
  red: "text-red-400",
  amber: "text-amber-400",
  green: "text-green-400",
  completed: "text-muted-foreground",
};

// ── Info row ───────────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={cn("text-sm text-foreground", mono && "font-mono")}>{value}</span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.FC<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{title}</span>
      </div>
      <div className="p-4 grid gap-4 grid-cols-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, memberNumber }: { msg: MemberMessage; memberNumber: string }) {
  const isInbound = msg.fromNumber === memberNumber || msg.direction === "inbound";
  return (
    <div className={cn("flex flex-col max-w-[75%]", isInbound ? "self-start" : "self-end items-end")}>
      <div className={cn(
        "px-3 py-2 text-sm leading-relaxed",
        isInbound
          ? "bg-muted text-foreground rounded-br-xl rounded-tr-xl rounded-bl-sm"
          : "bg-primary/20 border border-primary/30 text-foreground rounded-bl-xl rounded-tl-xl rounded-br-sm"
      )}>
        {msg.body}
        {msg.tripId && (
          <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
            <Navigation className="w-2.5 h-2.5" />
            <Link href={`/trips/${msg.tripId}`} className="hover:text-primary underline">Trip #{msg.tripId}</Link>
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{fmtAgo(msg.receivedAt)}</span>
    </div>
  );
}

// ── Trip card (mini) ───────────────────────────────────────────────────────────
function TripCard({ trip }: { trip: MemberTrip }) {
  const Icon = TRIP_STATUS_ICON[trip.status] ?? CheckCircle2;
  return (
    <Link href={`/trips/${trip.id}`} className="block group">
      <div className={cn("border bg-card hover:bg-secondary transition-colors", TRIP_BORDER[trip.status] ?? "border-border")}>
        <div className={cn("px-4 py-2 border-b flex items-center justify-between", TRIP_HEADER_BG[trip.status] ?? "bg-muted/10 border-border")}>
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4", TRIP_STATUS_TEXT[trip.status] ?? "text-muted-foreground")} />
            <span className={cn("text-xs font-bold uppercase tracking-widest", TRIP_STATUS_TEXT[trip.status] ?? "text-muted-foreground")}>
              {trip.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(trip.createdAt)}</span>
            {trip.etaDriftMinutes != null && trip.etaDriftMinutes > 0 && (
              <span className="text-amber-400">+{trip.etaDriftMinutes}min drift</span>
            )}
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{trip.title}</p>
          {trip.nextAction && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{trip.nextAction}</p>
          )}
          {trip.originalMemberEta && (
            <p className="text-[10px] text-muted-foreground mt-0.5">ETA: {trip.originalMemberEta}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const memberId = parseInt(id ?? "0", 10);
  const [tab, setTab] = useState<"overview" | "messages" | "trips" | "activity">("overview");
  const [fbUrl, setFbUrl] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactChannel, setContactChannel] = useState<"whatsapp" | "messenger" | "email">("whatsapp");
  const [contactMsg, setContactMsg] = useState("");
  const [contactResult, setContactResult] = useState<{ ok: boolean; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: member, isLoading } = useQuery<MemberFull>({
    queryKey: ["/api/members", memberId],
    queryFn: () => fetch(`/api/members/${memberId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!memberId,
  });

  const { data: messages = [] } = useQuery<MemberMessage[]>({
    queryKey: ["/api/members", memberId, "messages"],
    queryFn: () => fetch(`/api/members/${memberId}/messages`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!memberId,
    staleTime: 30_000,
  });

  const { data: trips = [] } = useQuery<MemberTrip[]>({
    queryKey: ["/api/members", memberId, "trips"],
    queryFn: () => fetch(`/api/members/${memberId}/trips`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!memberId,
    staleTime: 30_000,
  });

  const liveTrips = trips.filter((t) => t.status !== "completed");
  const pastTrips = trips.filter((t) => t.status === "completed");

  useEffect(() => {
    if (member?.facebookUrl != null) setFbUrl(member.facebookUrl);
  }, [member?.facebookUrl]);

  const { mutate: sendContact, isPending: sendingContact } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/members/${memberId}/contact`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: contactChannel, message: contactMsg }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; to?: string };
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      return json;
    },
    onSuccess: (_data) => {
      const labels: Record<string, string> = {
        whatsapp: "WhatsApp message sent",
        messenger: "Messenger message sent",
        email: `Email sent to ${member?.email ?? ""}`,
      };
      setContactResult({ ok: true, text: labels[contactChannel] ?? "Sent" });
      setContactMsg("");
      void queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "messages"] });
      setTimeout(() => setContactResult(null), 5000);
    },
    onError: (err: Error) => {
      setContactResult({ ok: false, text: err.message });
    },
  });

  const { mutate: saveFbUrl, isPending: fbSaving } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebookUrl: fbUrl.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json() as Promise<MemberFull>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/members", memberId], data);
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading member…
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">Member not found.</p>
        <Link href="/members" className="text-xs underline hover:text-foreground">← Back to directory</Link>
      </div>
    );
  }

  const isKnown = member.memberStatus === "active" || member.memberStatus === "verified";

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-card px-6 py-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/members" className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-foreground">{member.displayName}</h1>
              <StatusBadge status={member.memberStatus} />
              {member.membershipTier && (
                <Badge variant="outline" className="text-[10px] uppercase">{member.membershipTier}</Badge>
              )}
              {member.role && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">{member.role}</Badge>
              )}
              {member.familyGroupId != null && (
                <Badge className="bg-blue-900 text-blue-300 border-blue-700 text-[10px]">
                  <Users className="w-2.5 h-2.5 mr-1" />Family #{member.familyGroupId}
                </Badge>
              )}
              {member.whatsappNumber.startsWith("fb:") && (
                <Badge className="bg-blue-950 text-blue-300 border-blue-700 text-[10px]">
                  Messenger
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Member #{member.id}
              {" · "}Joined {fmtDate(member.createdAt)}
              {member.sourceBatch && <> · <span className="font-mono">{member.sourceBatch.toUpperCase()}</span></>}
              {isKnown && <span className="text-green-400 ml-2">✓ Known member</span>}
            </p>
          </div>
        </div>

        {/* Send Message button */}
        <button
          onClick={() => {
            setContactOpen((o) => !o);
            // Auto-pick best channel
            if (!contactOpen && member.whatsappNumber.startsWith("fb:")) setContactChannel("messenger");
            else if (!contactOpen) setContactChannel("whatsapp");
            setTimeout(() => textareaRef.current?.focus(), 80);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border shrink-0",
            contactOpen
              ? "bg-primary text-primary-foreground border-primary"
              : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          )}
        >
          <Send className="w-3.5 h-3.5" />
          {contactOpen ? "Close" : "Send Message"}
          {contactOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </header>

      {/* ── Contact / Send panel ─────────────────────────────────────────────── */}
      {contactOpen && member && (
        <div className="shrink-0 border-b border-primary/30 bg-primary/5 px-6 py-4">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">
              Send a message to {member.displayName}
            </p>

            {/* Channel selector */}
            <div className="flex items-center gap-2 mb-3">
              {!member.whatsappNumber.startsWith("fb:") && (
                <button
                  onClick={() => setContactChannel("whatsapp")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors",
                    contactChannel === "whatsapp"
                      ? "bg-green-800 text-green-200 border-green-600"
                      : "border-border text-muted-foreground hover:border-green-700 hover:text-green-400"
                  )}
                >
                  📱 WhatsApp
                </button>
              )}
              {member.whatsappNumber.startsWith("fb:") && (
                <button
                  onClick={() => setContactChannel("messenger")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors",
                    contactChannel === "messenger"
                      ? "bg-blue-800 text-blue-200 border-blue-600"
                      : "border-border text-muted-foreground hover:border-blue-700 hover:text-blue-400"
                  )}
                >
                  💬 Messenger
                </button>
              )}
              {member.email && (
                <button
                  onClick={() => setContactChannel("email")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors",
                    contactChannel === "email"
                      ? "bg-zinc-700 text-white border-zinc-500"
                      : "border-border text-muted-foreground hover:border-zinc-500 hover:text-foreground"
                  )}
                >
                  <Mail className="w-3 h-3" /> Email {member.email && <span className="opacity-60">{member.email}</span>}
                </button>
              )}
              {!member.email && (
                <span className="text-[10px] text-muted-foreground italic">No email on file — add one in the member record to enable email</span>
              )}
            </div>

            {/* Message box */}
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && contactMsg.trim()) {
                    e.preventDefault();
                    sendContact();
                  }
                }}
                placeholder={
                  contactChannel === "whatsapp" ? "Type a WhatsApp message… (Ctrl+Enter to send)" :
                  contactChannel === "messenger" ? "Type a Messenger message… (Ctrl+Enter to send)" :
                  "Type an email message… (Ctrl+Enter to send)"
                }
                rows={3}
                className="flex-1 bg-background border border-border text-sm px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <button
                onClick={() => sendContact()}
                disabled={sendingContact || !contactMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-40 self-stretch"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingContact ? "Sending…" : "Send"}
              </button>
            </div>

            {/* Result */}
            {contactResult && (
              <div className={cn(
                "mt-2 text-xs px-3 py-1.5 border",
                contactResult.ok
                  ? "text-green-400 border-green-700 bg-green-900/20"
                  : "text-red-400 border-red-700 bg-red-900/20"
              )}>
                {contactResult.ok ? "✓ " : "✗ "}{contactResult.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-card flex">
        {(["overview", "messages", "trips", "activity"] as const).map((t) => {
          const counts: Record<string, number> = {
            messages: messages.length,
            trips: trips.length,
            activity: messages.length + trips.length,
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-3 text-xs uppercase tracking-widest font-bold transition-colors border-b-2",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
              {counts[t] != null && (
                <span className={cn("ml-2 text-[10px]", tab === t ? "text-primary" : "text-muted-foreground/60")}>
                  {counts[t]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="p-6 space-y-4 max-w-5xl">

            {/* Engagement summary */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "Messages", value: messages.length, icon: MessageSquare },
                { label: "Total trips", value: trips.length, icon: Navigation },
                { label: "Live trips", value: liveTrips.length, icon: AlertCircle },
                { label: "Completed", value: pastTrips.length, icon: CheckCircle2 },
                { label: "Member since", value: fmtDate(member.createdAt), icon: Calendar },
                { label: "Last updated", value: fmtAgo(member.updatedAt), icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="border border-border bg-card px-3 py-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-base font-bold font-mono text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {/* Personal / Login details */}
            <SectionCard title="Personal & Login Details" icon={Fingerprint}>
              <InfoRow label="First name" value={member.firstName} />
              <InfoRow label="Last name" value={member.lastName} />
              <InfoRow label="Display name" value={member.displayName} />
              <InfoRow label="WhatsApp (login)" value={fmt(member.whatsappNumber)} mono />
              <InfoRow label="Mobile" value={member.mobile} mono />
              <InfoRow label="Email (login)" value={member.email} mono />
            </SectionCard>

            {/* Location */}
            <SectionCard title="Location" icon={Home}>
              <InfoRow label="Street address" value={member.homeAddress} />
              <InfoRow label="Suburb" value={member.suburb} />
              <InfoRow label="City / Town" value={member.city} />
              <InfoRow label="Province" value={member.province} />
              <InfoRow label="Postal code" value={member.postalCode} />
              <InfoRow label="Country" value={member.country ?? "South Africa"} />
              {member.homeLat && member.homeLon && (
                <div className="col-span-full">
                  <InfoRow
                    label="GPS coordinates"
                    value={
                      <a
                        href={`https://www.google.com/maps?q=${member.homeLat},${member.homeLon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {parseFloat(member.homeLat).toFixed(5)}, {parseFloat(member.homeLon).toFixed(5)}
                      </a>
                    }
                    mono
                  />
                </div>
              )}
            </SectionCard>

            {/* Membership */}
            <SectionCard title="Membership" icon={Shield}>
              <InfoRow label="Status" value={<StatusBadge status={member.memberStatus} />} />
              <InfoRow label="Membership type" value={member.membershipTier} />
              <InfoRow label="Family group" value={member.familyGroupId != null ? `#${member.familyGroupId}` : null} />
              <InfoRow label="Role" value={member.role} />
              <InfoRow label="Industry" value={member.industry} />
              <InfoRow label="Source batch" value={member.sourceBatch?.toUpperCase()} mono />
              <InfoRow label="Date registered" value={fmtDatetime(member.createdAt)} />
              <InfoRow label="Import status" value={member.importStatus} />
            </SectionCard>

            {/* Facebook */}
            <div className="border border-border bg-card">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Facebook Profile</span>
                </div>
                <a
                  href={`https://www.facebook.com/search/people/?q=${encodeURIComponent(member.displayName)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Search on Facebook
                </a>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {member.facebookUrl && (
                  <a
                    href={member.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-400 hover:underline flex items-center gap-1.5 break-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {member.facebookUrl}
                  </a>
                )}
                {!member.facebookUrl && (
                  <p className="text-xs text-muted-foreground">No Facebook profile saved yet. Paste the URL below.</p>
                )}
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={fbUrl}
                    onChange={(e) => setFbUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveFbUrl()}
                    placeholder="https://www.facebook.com/..."
                    className="flex-1 bg-background border border-border text-sm px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => saveFbUrl()}
                    disabled={fbSaving}
                    className="text-xs border border-primary text-primary px-3 py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {fbSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>

            {/* ICE contact */}
            {(member.iceContactName || member.iceContactPhone) && (
              <div className="border border-amber-700/40 bg-card">
                <div className="px-4 py-2 border-b border-amber-700/40 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">ICE Contact (In Case of Emergency)</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <InfoRow label="Name" value={member.iceContactName} />
                  <InfoRow label="Phone / WhatsApp" value={member.iceContactPhone ? fmt(member.iceContactPhone) : null} mono />
                </div>
              </div>
            )}

            {/* Notes */}
            {member.notes && (
              <div className="border border-border bg-card">
                <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Operator Notes</span>
                </div>
                <p className="p-4 text-sm text-foreground whitespace-pre-wrap">{member.notes}</p>
              </div>
            )}

          </div>
        )}

        {/* ── MESSAGES ─────────────────────────────────────── */}
        {tab === "messages" && (
          <div className="flex flex-col h-full">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <MessageSquare className="w-7 h-7 opacity-30" />
                <p className="text-xs uppercase tracking-widest">No messages yet</p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-2">
                {/* Date grouping */}
                {messages.map((msg, i) => {
                  const dayKey = format(new Date(msg.receivedAt), "d MMM yyyy");
                  const prevDayKey = i > 0 ? format(new Date(messages[i - 1].receivedAt), "d MMM yyyy") : null;
                  return (
                    <div key={msg.id}>
                      {dayKey !== prevDayKey && (
                        <div className="flex items-center gap-3 my-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{dayKey}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <MessageBubble msg={msg} memberNumber={member.whatsappNumber} />
                      </div>
                    </div>
                  );
                })}
                <div className="h-4" />
              </div>
            )}
          </div>
        )}

        {/* ── TRIPS ─────────────────────────────────────────── */}
        {tab === "trips" && (
          <div className="p-6 space-y-8">
            {/* Live */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Live Trips
                <span className="text-foreground font-bold ml-2">{liveTrips.length}</span>
              </h2>
              {liveTrips.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No active trips</p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {liveTrips.map((t) => <TripCard key={t.id} trip={t} />)}
                </div>
              )}
            </section>

            {/* Past */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Past Trips
                <span className="text-foreground font-bold ml-2">{pastTrips.length}</span>
              </h2>
              {pastTrips.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No completed trips</p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {pastTrips.map((t) => <TripCard key={t.id} trip={t} />)}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── ACTIVITY LOG ──────────────────────────────────── */}
        {tab === "activity" && (() => {
          type EvTrip    = { kind: "trip_start" | "trip_end"; trip: MemberTrip; at: Date };
          type EvMessage = { kind: "message"; msg: MemberMessage; at: Date };
          type Ev = EvTrip | EvMessage;

          const events: Ev[] = [
            ...trips.map((t): EvTrip => ({ kind: "trip_start", trip: t, at: new Date(t.createdAt) })),
            ...trips.filter((t) => t.status === "completed").map((t): EvTrip => ({ kind: "trip_end", trip: t, at: new Date(t.updatedAt) })),
            ...messages.map((m): EvMessage => ({ kind: "message", msg: m, at: new Date(m.receivedAt) })),
          ].sort((a, b) => a.at.getTime() - b.at.getTime());

          if (events.length === 0) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Clock className="w-7 h-7 opacity-30" />
                <p className="text-xs uppercase tracking-widest">No activity yet</p>
              </div>
            );
          }

          const byDay: { day: string; evts: Ev[] }[] = [];
          for (const ev of events) {
            const day = format(ev.at, "d MMM yyyy");
            const last = byDay[byDay.length - 1];
            if (last && last.day === day) last.evts.push(ev);
            else byDay.push({ day, evts: [ev] });
          }

          return (
            <div className="p-4 max-w-2xl mx-auto space-y-6">
              {byDay.map(({ day, evts }) => (
                <div key={day}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{day}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-2.5">
                    {evts.map((ev, i) => {
                      if (ev.kind === "trip_start") {
                        const StatusIcon = TRIP_STATUS_ICON[ev.trip.status] ?? CheckCircle2;
                        const statusCol = TRIP_STATUS_TEXT[ev.trip.status] ?? "text-muted-foreground";
                        return (
                          <div key={`ts-${ev.trip.id}-${i}`} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-green-900/30 border border-green-700/40 flex items-center justify-center shrink-0 mt-0.5">
                              <Navigation className="w-3.5 h-3.5 text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0 border border-green-900/40 bg-card px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Trip started</span>
                                <Link href={`/trips/${ev.trip.id}`} className="text-[10px] text-primary hover:underline">#{ev.trip.id}</Link>
                                <StatusIcon className={cn("w-3 h-3", statusCol)} />
                                <span className={cn("text-[10px] uppercase tracking-widest", statusCol)}>{ev.trip.status}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto">{format(ev.at, "HH:mm")}</span>
                              </div>
                              <p className="text-sm text-foreground mt-0.5">{ev.trip.title}</p>
                            </div>
                          </div>
                        );
                      }
                      if (ev.kind === "trip_end") {
                        return (
                          <div key={`te-${ev.trip.id}-${i}`} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-muted/30 border border-border flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0 border border-border bg-card px-3 py-2 opacity-70">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trip completed</span>
                                <Link href={`/trips/${ev.trip.id}`} className="text-[10px] text-primary hover:underline">#{ev.trip.id}</Link>
                                <span className="text-[10px] text-muted-foreground ml-auto">{format(ev.at, "HH:mm")}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{ev.trip.title}</p>
                            </div>
                          </div>
                        );
                      }
                      /* message — ev.kind === "message" is implied after the two early returns above */
                      if (ev.kind !== "message") return null;
                      const isInbound = ev.msg.direction === "inbound" || ev.msg.fromNumber === member.whatsappNumber;
                      return (
                        <div key={`m-${ev.msg.id}-${i}`} className="flex items-start gap-3">
                          <div className={cn(
                            "w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                            isInbound ? "bg-blue-900/30 border-blue-700/40" : "bg-zinc-800/60 border-zinc-700/40"
                          )}>
                            <MessageSquare className={cn("w-3.5 h-3.5", isInbound ? "text-blue-400" : "text-zinc-400")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isInbound ? "text-blue-400" : "text-zinc-400")}>
                                {isInbound ? "Member" : "System"}
                              </span>
                              {ev.msg.tripId && (
                                <Link href={`/trips/${ev.msg.tripId}`} className="text-[10px] text-primary hover:underline">Trip #{ev.msg.tripId}</Link>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto">{format(ev.at, "HH:mm")}</span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4 mt-0.5">{ev.msg.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="h-4" />
            </div>
          );
        })()}

      </div>
    </div>
  );
}
