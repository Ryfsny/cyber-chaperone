import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Mail, MessageSquare, Phone, CheckSquare, Square,
  Send, Search, RefreshCw, MapPin, X, ChevronRight,
  Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  email?: string | null;
  mobile?: string | null;
  province: string | null;
  city: string | null;
  suburb: string | null;
}

interface MembersResponse {
  data: Member[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface GeoFacets {
  provinces: string[];
  cities: string[];
  suburbs: string[];
}

interface QueueItem {
  id: number;
  submitterName: string;
  scope: string;
  subject: string;
  message: string;
  channels: string[];
  recipientCount: number | null;
  status: "pending" | "approved" | "rejected" | "sent";
  rejectedReason: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface ChannelResult { status: "sent" | "failed" | "skipped"; error?: string }
interface MemberResult { id: number; name: string; email?: ChannelResult; sms?: ChannelResult; whatsapp?: ChannelResult }
interface SendResponse {
  ok: boolean; total: number;
  emailSent: number; smsSent: number; whatsappSent: number;
  results: MemberResult[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function statusColor(s: "sent" | "failed" | "skipped") {
  if (s === "sent") return "text-green-400";
  if (s === "failed") return "text-red-400";
  return "text-muted-foreground";
}
function statusIcon(s: "sent" | "failed" | "skipped") {
  return s === "sent" ? "✓" : s === "failed" ? "✗" : "—";
}

const CHANNEL_LABELS: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

const STATUS_STYLES: Record<string, string> = {
  pending:  "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  approved: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  sent:     "text-primary border-primary/30 bg-primary/10",
  rejected: "text-destructive border-destructive/30 bg-destructive/10",
};

function GeoSelect({
  value, onChange, options, placeholder, disabled, locked,
}: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder: string; disabled?: boolean; locked?: boolean;
}) {
  if (locked) {
    return (
      <div className="w-full h-8 rounded-sm border border-primary/30 bg-primary/5 px-2 text-xs flex items-center text-primary font-bold truncate">
        {value || placeholder}
      </div>
    );
  }
  const noOpts = options.length === 0;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || noOpts}
      className={cn(
        "w-full h-8 rounded-sm border border-border bg-background px-2 text-xs",
        "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        value ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <option value="">{noOpts && !disabled ? "None on record" : placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── Pending Approvals Panel (national admin only) ──────────────────────────────

function PendingApprovalsPanel() {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery<QueueItem[]>({
    queryKey: ["/api/broadcast-queue"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/broadcast-queue`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/broadcast-queue/${id}/approve`, { method: "PATCH", credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/broadcast-queue"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await fetch(`${BASE}/api/broadcast-queue/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast-queue"] });
      setRejectId(null); setRejectReason("");
    },
  });

  const pendingItems = items.filter(i => i.status === "pending");
  const recentItems  = items.filter(i => i.status !== "pending").slice(0, 5);

  if (items.length === 0) return null;

  return (
    <section className="border border-yellow-600/30 bg-yellow-950/10 rounded-sm">
      <div className="px-4 py-2.5 border-b border-yellow-600/20 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-yellow-400">
          Broadcast Approval Queue
        </span>
        {pendingItems.length > 0 && (
          <span className="bg-yellow-500 text-yellow-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
            {pendingItems.length} pending
          </span>
        )}
      </div>

      <div className="divide-y divide-border/50">
        {[...pendingItems, ...recentItems].map((item) => (
          <div key={item.id}>
            <div
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <div className={cn("text-[9px] font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded-sm shrink-0", STATUS_STYLES[item.status])}>
                {item.status}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{item.subject}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.submitterName} · {item.scope} · {(item.channels as string[]).map(c => CHANNEL_LABELS[c] ?? c).join(", ")}
                  {item.recipientCount != null && ` · ~${item.recipientCount.toLocaleString()} recipients`}
                </p>
              </div>
              {expandedId === item.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </div>

            {expandedId === item.id && (
              <div className="border-t border-border/50 px-4 py-3 bg-background/40 space-y-3">
                <div className="bg-background border border-border p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {item.message}
                </div>

                {item.status === "rejected" && item.rejectedReason && (
                  <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    Rejected: {item.rejectedReason}
                  </div>
                )}

                {item.status === "pending" && (
                  rejectId === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        rows={2}
                        className="w-full bg-background border border-border text-foreground text-xs px-3 py-2 focus:outline-none focus:border-primary resize-none rounded-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => rejectMutation.mutate({ id: item.id, reason: rejectReason })}
                          disabled={rejectMutation.isPending}
                          className="flex items-center gap-1.5 border border-destructive text-destructive px-3 py-1.5 text-xs uppercase font-bold hover:bg-destructive/10 disabled:opacity-50 rounded-sm"
                        >
                          <XCircle className="w-3 h-3" />
                          {rejectMutation.isPending ? "Rejecting…" : "Confirm Reject"}
                        </button>
                        <button onClick={() => setRejectId(null)} className="border border-border text-muted-foreground px-3 py-1.5 text-xs hover:text-foreground rounded-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveMutation.mutate(item.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 disabled:opacity-50 rounded-sm"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {approveMutation.isPending ? "Sending…" : "Approve & Send"}
                      </button>
                      <button
                        onClick={() => { setRejectId(item.id); setRejectReason(""); }}
                        className="flex items-center gap-1.5 border border-destructive/40 text-destructive px-3 py-1.5 text-xs uppercase font-bold hover:bg-destructive/10 rounded-sm"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )
                )}

                {item.status === "sent" && item.sentAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-primary">
                    <CheckCircle className="w-3 h-3" />
                    Sent {new Date(item.sentAt).toLocaleString("en-ZA")}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── My Submissions Panel (sub-national only) ───────────────────────────────────

function MySubmissionsPanel() {
  const { data: items = [] } = useQuery<QueueItem[]>({
    queryKey: ["/api/broadcast-queue"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/broadcast-queue`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="border border-border rounded-sm">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">My Submissions</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.id}>
            <div
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <div className={cn("text-[9px] font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded-sm shrink-0", STATUS_STYLES[item.status])}>
                {item.status}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{item.subject}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
                  {item.recipientCount != null && ` · ~${item.recipientCount.toLocaleString()} recipients`}
                </p>
              </div>
              {expandedId === item.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </div>
            {expandedId === item.id && (
              <div className="border-t border-border px-4 py-3 bg-background/40 space-y-2">
                <div className="bg-background border border-border p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                  {item.message}
                </div>
                {item.status === "rejected" && item.rejectedReason && (
                  <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    Rejected: {item.rejectedReason}
                  </div>
                )}
                {item.status === "pending" && (
                  <p className="flex items-center gap-1.5 text-[11px] text-yellow-400">
                    <Clock className="w-3 h-3" /> Awaiting national admin approval
                  </p>
                )}
                {item.status === "sent" && item.sentAt && (
                  <p className="flex items-center gap-1.5 text-[11px] text-primary">
                    <CheckCircle className="w-3 h-3" /> Sent {new Date(item.sentAt).toLocaleString("en-ZA")}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function OperatorBroadcast() {
  const { isNational, role, scope, displayName } = useAuth();
  const queryClient = useQueryClient();

  // Geo filter — for sub-national admins, their scope is locked
  const [geoProvince, setGeoProvince] = useState(scope.province ?? "");
  const [geoCity,     setGeoCity]     = useState(scope.city ?? "");
  const [geoSuburb,   setGeoSuburb]   = useState(scope.suburb ?? "");

  const geoLocked = !isNational;

  // UI state
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [subject,  setSubject]  = useState("");
  const [message,  setMessage]  = useState("");
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false });
  const [sendResult,  setSendResult]  = useState<SendResponse | null>(null);
  const [sendError,   setSendError]   = useState<string | null>(null);
  const [queuedOk,    setQueuedOk]    = useState(false);

  // ── Geo facets ──────────────────────────────────────────────────────────────
  const { data: facets, isLoading: facetsLoading } = useQuery<GeoFacets>({
    queryKey: ["geo-facets", geoProvince, geoCity],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (geoProvince) params.set("province", geoProvince);
      if (geoCity)     params.set("city", geoCity);
      const res = await fetch(`${BASE}/api/broadcast/geo-facets?${params}`);
      if (!res.ok) throw new Error("Failed to load geo facets");
      return res.json();
    },
    staleTime: 60_000,
  });

  // ── Members ─────────────────────────────────────────────────────────────────
  const membersParams = useMemo(() => {
    const p = new URLSearchParams({ limit: "1000" });
    if (geoProvince) p.set("province", geoProvince);
    if (geoCity)     p.set("city", geoCity);
    if (geoSuburb)   p.set("suburb", geoSuburb);
    return p.toString();
  }, [geoProvince, geoCity, geoSuburb]);

  const { data: membersResp, isLoading: membersLoading, refetch } = useQuery<MembersResponse>({
    queryKey: ["broadcast-members", membersParams],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/members?${membersParams}`);
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
    staleTime: 30_000,
  });

  const allMembers: Member[] = membersResp?.data ?? [];
  const serverTotal: number  = membersResp?.pagination.total ?? 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return allMembers;
    const q = search.toLowerCase();
    return allMembers.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.whatsappNumber.includes(q) ||
        (m.suburb ?? "").toLowerCase().includes(q) ||
        (m.city ?? "").toLowerCase().includes(q) ||
        // email/mobile only available to national admin (server strips them otherwise)
        (isNational && (m.email ?? "").toLowerCase().includes(q)) ||
        (isNational && (m.mobile ?? "").includes(q)),
    );
  }, [allMembers, search, isNational]);

  const isLoading  = facetsLoading || membersLoading;
  const geoActive  = !!(geoProvince || geoCity || geoSuburb);
  const geoLabel   = [geoProvince, geoCity, geoSuburb].filter(Boolean).join(" › ") || "All Members";

  // ── Geo handlers ────────────────────────────────────────────────────────────
  function clearGeo() { if (geoLocked) return; setGeoProvince(""); setGeoCity(""); setGeoSuburb(""); }
  function handleProvince(v: string) { setGeoProvince(v); setGeoCity(""); setGeoSuburb(""); }
  function handleCity(v: string)     { setGeoCity(v); setGeoSuburb(""); }

  // ── Checkbox helpers ─────────────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));
  function toggleMember(id: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll()   { setSelected((prev) => { const n = new Set(prev); filtered.forEach((m) => n.add(m.id)); return n; }); }
  function deselectAll() { setSelected((prev) => { const n = new Set(prev); filtered.forEach((m) => n.delete(m.id)); return n; }); }
  function toggleChannel(ch: "email" | "sms" | "whatsapp") { setChannels((p) => ({ ...p, [ch]: !p[ch] })); }

  // ── Send (national — direct) ──────────────────────────────────────────────
  const sendMutation = useMutation<SendResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/broadcast/multi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ memberIds: Array.from(selected), message, channels }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Send failed" }));
        throw new Error(err.error ?? "Send failed");
      }
      return res.json();
    },
    onSuccess: (data) => { setSendResult(data); setSendError(null); },
    onError:   (err)  => { setSendError(err.message); setSendResult(null); },
  });

  // ── Submit for approval (sub-national) ────────────────────────────────────
  const queueMutation = useMutation<{ ok: boolean; queued: boolean }, Error, void>({
    mutationFn: async () => {
      const activeChannels = (Object.keys(channels) as ("email" | "sms" | "whatsapp")[]).filter(k => channels[k]);
      const res = await fetch(`${BASE}/api/broadcast-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: subject || "eblockwatch Update", message, channels: activeChannels }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(err.error ?? "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setQueuedOk(true);
      setSendError(null);
      setMessage("");
      setSubject("");
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast-queue"] });
    },
    onError: (err) => { setSendError(err.message); },
  });

  const canSend = isNational
    ? selected.size > 0 && message.trim().length > 0 && (channels.email || channels.sms || channels.whatsapp) && !sendMutation.isPending
    : message.trim().length > 0 && (channels.email || channels.sms || channels.whatsapp) && !queueMutation.isPending;

  const isPending = isNational ? sendMutation.isPending : queueMutation.isPending;

  function handleAction() {
    setSendResult(null); setSendError(null); setQueuedOk(false);
    if (isNational) sendMutation.mutate();
    else queueMutation.mutate();
  }

  // ── Scope label for sub-national ─────────────────────────────────────────
  const scopeParts = [scope.province, scope.city, scope.suburb].filter(Boolean);
  const scopeLabel = scopeParts.length > 0 ? scopeParts.join(" › ") : "All of SA";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center gap-3">
        <Send className="w-4 h-4 text-primary shrink-0" />
        <div>
          <h1 className="text-xs uppercase tracking-widest font-bold text-foreground leading-none">
            {isNational ? "Direct Broadcast" : "Submit Broadcast"}
          </h1>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            {isNational
              ? "Select members · compose · send instantly"
              : `${displayName} · ${scopeLabel} · Requires national approval`}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">

        {/* ── Approval queue (national admin) / My submissions (sub-national) ── */}
        {isNational ? <PendingApprovalsPanel /> : <MySubmissionsPanel />}

        {/* ── Sub-national scope notice ── */}
        {!isNational && (
          <div className="border border-primary/30 bg-primary/5 rounded-sm px-4 py-3 flex items-start gap-3">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-primary">{role.charAt(0).toUpperCase() + role.slice(1)} Admin — {scopeLabel}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Your broadcast will reach members in your area only. It requires approval from the national admin before sending.
                Member email addresses and phone numbers are not shown at this access level.
              </p>
            </div>
          </div>
        )}

        {/* ── Geographic filter (national: interactive; sub-national: locked) ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Geographic Filter</span>
            {geoActive && !geoLocked && (
              <button onClick={clearGeo} className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            {geoLocked && (
              <span className="ml-auto text-[9px] uppercase tracking-widest text-primary/60 font-bold">Locked to your scope</span>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[10px] font-mono text-primary mb-2 min-h-[14px] flex-wrap">
            {geoProvince ? (
              <>
                <span className="text-muted-foreground">All</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span>{geoProvince}</span>
                {geoCity && (
                  <>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                    <span>{geoCity}</span>
                    {geoSuburb && (
                      <>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                        <span>{geoSuburb}</span>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/60">All Members (national)</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">Province</label>
              <GeoSelect value={geoProvince} onChange={handleProvince}
                options={facets?.provinces ?? []} placeholder="All provinces"
                locked={geoLocked && !!scope.province} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">City / Town</label>
              <GeoSelect value={geoCity} onChange={handleCity}
                options={facets?.cities ?? []} placeholder={geoProvince ? "All cities" : "— pick province first"}
                disabled={!geoProvince} locked={geoLocked && !!scope.city} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">Suburb</label>
              <GeoSelect value={geoSuburb} onChange={setGeoSuburb}
                options={facets?.suburbs ?? []} placeholder={geoCity ? "All suburbs" : "— pick city first"}
                disabled={!geoCity} locked={geoLocked && !!scope.suburb} />
            </div>
          </div>
        </section>

        {/* ── Member list (national: interactive checkboxes; sub-national: count view) ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              {isLoading
                ? "Loading…"
                : search.trim()
                ? `Showing ${filtered.length} matching (${serverTotal.toLocaleString()} in area)`
                : `${serverTotal.toLocaleString()} member${serverTotal !== 1 ? "s" : ""}${geoActive ? " in area" : ""}`}
            </span>
            {isNational && selected.size > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{selected.size} selected</Badge>
            )}
            {isNational && (
              <button
                onClick={allFilteredSelected ? deselectAll : selectAll}
                className="ml-auto text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 font-bold transition-colors"
              >
                {allFilteredSelected ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isNational ? "Search by name, email or phone…" : "Search by name or area…"}
              className="pl-8 h-8 text-xs bg-background border-border"
            />
          </div>

          {/* Rows */}
          <div className="border border-border rounded-sm overflow-hidden">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                Loading members…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No members match the current filters
              </div>
            ) : (
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {filtered.map((m) => {
                  const isSel = selected.has(m.id);
                  const loc = [m.suburb, m.city, m.province].filter(Boolean).join(", ");
                  return (
                    <button
                      key={m.id}
                      onClick={() => isNational && toggleMember(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        isNational
                          ? isSel ? "bg-primary/10" : "hover:bg-secondary/50"
                          : "cursor-default",
                      )}
                    >
                      {isNational && (
                        <span className={cn("shrink-0", isSel ? "text-primary" : "text-muted-foreground")}>
                          {isSel ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{m.displayName}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1 py-0 h-3.5 shrink-0 uppercase",
                              m.memberStatus === "verified" ? "border-green-600/50 text-green-500"
                                : m.memberStatus === "active" ? "border-blue-600/50 text-blue-400"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {m.memberStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {/* Email and mobile only shown to national admin */}
                          {isNational && m.email && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="w-2.5 h-2.5 shrink-0" /> {m.email}
                            </span>
                          )}
                          {isNational && m.mobile && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                              <Phone className="w-2.5 h-2.5" /> {m.mobile}
                            </span>
                          )}
                          {loc && (
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0">
                              <MapPin className="w-2.5 h-2.5" /> {loc}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!isLoading && serverTotal > 1000 && (
            <p className="text-[10px] text-amber-500/80 mt-1">
              ⚠ Showing first 1,000 of {serverTotal.toLocaleString()} members. Use geographic filters to narrow your target.
            </p>
          )}
        </section>

        {/* ── Subject (sub-national only, national uses it optionally) ── */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">
            Subject {isNational && <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span>}
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Safety Update — Western Cape"
            className="h-8 text-xs bg-background border-border"
          />
        </section>

        {/* ── Message ── */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here…"
            rows={5}
            className="text-sm bg-background border-border resize-none"
          />
          {isNational && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Tip: <code className="font-mono">{"{name}"}</code> is replaced with each member's first name.
            </p>
          )}
        </section>

        {/* ── Channels ── */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block">Send via</label>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "email", label: "Email", icon: Mail },
              { key: "sms", label: "SMS", icon: Phone },
              { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
            ] as const).map(({ key, label, icon: Icon }) => {
              const on = channels[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleChannel(key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-sm border text-xs font-bold uppercase tracking-wider transition-colors",
                    on ? "bg-primary text-primary-foreground border-primary"
                       : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {on ? <CheckSquare className="w-3 h-3 ml-0.5" /> : <Square className="w-3 h-3 ml-0.5 opacity-50" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Action button ── */}
        <section>
          {!isNational && (
            <div className="mb-3 border border-border/50 bg-secondary/20 rounded-sm px-4 py-2 text-[11px] text-muted-foreground">
              This broadcast will go to <strong className="text-foreground">{serverTotal.toLocaleString()} members</strong> in {scopeLabel}.
              It will be sent to the national admin for approval before any messages are delivered.
            </div>
          )}
          <Button
            disabled={!canSend}
            onClick={handleAction}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-sm gap-2"
          >
            {isPending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> {isNational ? "Sending…" : "Submitting…"}</>
            ) : isNational ? (
              <><Send className="w-4 h-4" /> Send to {selected.size > 0 ? `${selected.size} Member${selected.size !== 1 ? "s" : ""}` : "Selected Members"}</>
            ) : (
              <><Clock className="w-4 h-4" /> Submit for Approval</>
            )}
          </Button>
          {!canSend && !isPending && (
            <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
              {isNational && selected.size === 0 ? "Select at least one member"
                : !message.trim() ? "Type a message"
                : "Choose at least one channel"}
            </p>
          )}
        </section>

        {/* ── Queued confirmation (sub-national) ── */}
        {queuedOk && (
          <section className="bg-primary/10 border border-primary/30 rounded-sm p-4">
            <p className="text-primary text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Broadcast submitted for approval
            </p>
            <p className="text-muted-foreground text-xs">
              Your message is in the approval queue. The national admin will review and send it. You'll see the status in "My Submissions" above.
            </p>
          </section>
        )}

        {/* ── Error ── */}
        {sendError && (
          <section className="bg-red-950/40 border border-red-800/50 rounded-sm p-4">
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Failed</p>
            <p className="text-red-300 text-sm">{sendError}</p>
          </section>
        )}

        {/* ── Send result (national direct send) ── */}
        {sendResult && (
          <section>
            <div className="bg-green-950/30 border border-green-800/40 rounded-sm p-4 mb-3">
              <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
                Sent to {sendResult.total} member{sendResult.total !== 1 ? "s" : ""}
                {geoActive && <span className="text-green-400/70 font-normal ml-2">· {geoLabel}</span>}
              </p>
              <div className="flex flex-wrap gap-4 mt-1">
                {channels.email    && <span className="text-sm text-foreground">✉ Email: <strong className="text-green-400">{sendResult.emailSent} ✓</strong></span>}
                {channels.sms      && <span className="text-sm text-foreground">📱 SMS: <strong className="text-green-400">{sendResult.smsSent} ✓</strong></span>}
                {channels.whatsapp && <span className="text-sm text-foreground">💬 WhatsApp: <strong className="text-green-400">{sendResult.whatsappSent} ✓</strong></span>}
              </div>
            </div>
            <div className="border border-border rounded-sm overflow-hidden">
              <div className="bg-secondary/30 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Delivery Detail</span>
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {sendResult.results.map((r) => (
                  <div key={r.id} className="px-3 py-2 flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground flex-1 truncate">{r.name}</span>
                    <div className="flex gap-3 shrink-0 text-[11px] font-mono">
                      {r.email    && <span className={statusColor(r.email.status)}    title={r.email.error}>✉{statusIcon(r.email.status)}</span>}
                      {r.sms      && <span className={statusColor(r.sms.status)}      title={r.sms.error}>SMS{statusIcon(r.sms.status)}</span>}
                      {r.whatsapp && <span className={statusColor(r.whatsapp.status)} title={r.whatsapp.error}>WA{statusIcon(r.whatsapp.status)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
