import {
  useGetTrip,
  useGetTripMessages,
  useUpdateTrip,
  useListCaseParticipants,
  useInviteCaseParticipant,
  useUpdateCaseParticipant,
  useListCaseLogs,
  useListResponders,
  useDispatchResponder,
  getGetTripQueryKey,
  getListTripsQueryKey,
  getGetTripMessagesQueryKey,
  getListCaseParticipantsQueryKey,
  getListCaseLogsQueryKey,
  getListRespondersQueryKey,
} from "@workspace/api-client-react";
import type { CaseParticipant, Responder, Trip } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Save, Activity, XCircle, Users, Shield, Camera, FileText } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { TripAiPanel } from "@/components/ai/TripAiPanel";
import { TripRouteMap } from "@/components/TripRouteMap";

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Status colours ────────────────────────────────────────────────────────────
const ACCESS_STATUS_COLORS: Record<string, string> = {
  invited: "text-amber-400",
  active: "text-green-400",
  declined: "text-red-400",
  removed: "text-muted-foreground",
};

const REPLY_LABELS: Record<string, string> = {
  "1": "Assisting directly",
  "2": "Alerting local network",
  "3": "Contacting trusted responder",
  "4": "Cannot assist",
  "5": "Callback requested",
};

// ── Situation Room Case panel ─────────────────────────────────────────────────
function CasePanel({ tripId, trip }: { tripId: number; trip: Trip }) {
  const queryClient = useQueryClient();
  const { data: participants = [], isLoading: loadingP } = useListCaseParticipants(tripId, {
    query: { queryKey: getListCaseParticipantsQueryKey(tripId), refetchInterval: 15000 },
  });
  const { data: caseLogs = [], isLoading: loadingL } = useListCaseLogs(tripId, {
    query: { queryKey: getListCaseLogsQueryKey(tripId), refetchInterval: 15000 },
  });
  const updateParticipant = useUpdateCaseParticipant();
  const [showLog, setShowLog] = useState(false);

  const activeParticipants = participants.filter((p) => p.accessStatus === "active");
  const invitedParticipants = participants.filter((p) => p.accessStatus === "invited");
  const declinedOrRemoved = participants.filter((p) => p.accessStatus === "declined" || p.accessStatus === "removed");

  const handleRemove = (p: CaseParticipant) => {
    if (!confirm(`Remove ${p.participantName} from this case?`)) return;
    updateParticipant.mutate(
      { id: tripId, participantId: p.id, data: { accessStatus: "removed", removedBy: "operator" } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCaseParticipantsQueryKey(tripId) }) }
    );
  };

  const handleMarkActive = (p: CaseParticipant) => {
    updateParticipant.mutate(
      { id: tripId, participantId: p.id, data: { accessStatus: "active" } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCaseParticipantsQueryKey(tripId) }) }
    );
  };

  if (loadingP) return <div className="text-xs text-muted-foreground p-4">Loading case…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> Situation Room Case
        </p>
        <button
          onClick={() => setShowLog(!showLog)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <FileText className="w-3 h-3" />
          {showLog ? "Hide log" : `Show log (${caseLogs.length})`}
        </button>
      </div>

      {participants.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No participants dispatched yet. Use the Nearby Conduits panel below.</p>
      ) : (
        <div className="space-y-1">
          {activeParticipants.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">Active</p>
              {activeParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <span className="text-xs font-bold text-foreground">{p.participantName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.role}</span>
                    <span className={`text-xs ml-2 ${ACCESS_STATUS_COLORS[p.accessStatus]}`}>{p.accessStatus}</span>
                  </div>
                  <button onClick={() => handleRemove(p)} className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 border border-red-900 hover:border-red-700">Remove</button>
                </div>
              ))}
            </div>
          )}
          {invitedParticipants.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1 mt-2">Awaiting reply</p>
              {invitedParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <span className="text-xs font-bold text-foreground">{p.participantName}</span>
                    <span className="text-xs text-amber-400 ml-2">pending</span>
                    <span className="text-xs text-muted-foreground/60 ml-2">{formatDistanceToNow(new Date(p.invitedAt))} ago</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleMarkActive(p)} className="text-xs text-green-400 hover:text-green-300 px-1.5 py-0.5 border border-green-900">Active</button>
                    <button onClick={() => handleRemove(p)} className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 border border-red-900">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {declinedOrRemoved.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1 mt-2">Declined / Removed</p>
              {declinedOrRemoved.map((p) => (
                <div key={p.id} className="flex items-center py-1 text-xs text-muted-foreground/50">
                  <span className="font-medium mr-2">{p.participantName}</span>
                  <span>{p.accessStatus}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showLog && (
        <div className="mt-3 border border-border rounded-sm overflow-hidden">
          <div className="px-3 py-2 bg-secondary border-b border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Case Audit Log</p>
          </div>
          {loadingL ? (
            <p className="text-xs text-muted-foreground p-3">Loading…</p>
          ) : caseLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">No log entries yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto divide-y divide-border">
              {[...caseLogs].reverse().map((log) => (
                <div key={log.id} className="px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <span className="font-mono">{format(new Date(log.createdAt), "HH:mm dd/MM")}</span>
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{log.actionType.replace(/_/g, " ")}</span>
                  </div>
                  {log.participantName && <div className="text-foreground/80 mt-0.5">{log.participantName}</div>}
                  {log.replyCode && (
                    <div className="text-green-400 mt-0.5">Reply {log.replyCode}: {REPLY_LABELS[log.replyCode] ?? log.replyCode}</div>
                  )}
                  {log.outcome && <div className="text-muted-foreground/70 mt-0.5">{log.outcome}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Nearby conduits panel ─────────────────────────────────────────────────────
function NearbyConduitsPanel({ tripId, trip }: { tripId: number; trip: Trip }) {
  const queryClient = useQueryClient();
  const { data: responders = [] } = useListResponders({
    query: { queryKey: getListRespondersQueryKey() },
  });
  const dispatch = useDispatchResponder();
  const inviteParticipant = useInviteCaseParticipant();
  const { toast } = useToast();

  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [infoLevel, setInfoLevel] = useState(1);
  const [customNote, setCustomNote] = useState("");
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());

  const refLat = parseFloat(trip.startLat ?? "") || parseFloat(trip.destLat ?? "");
  const refLon = parseFloat(trip.startLon ?? "") || parseFloat(trip.destLon ?? "");

  const nearby = responders
    .filter((r) => r.active)
    .map((r) => {
      const rLat = parseFloat(r.homeLat);
      const rLon = parseFloat(r.homeLon);
      const dist = refLat && refLon && !isNaN(rLat) && !isNaN(rLon)
        ? haversineKm(refLat, refLon, rLat, rLon)
        : null;
      return { ...r, dist };
    })
    .sort((a, b) => {
      if (a.dist === null && b.dist === null) return 0;
      if (a.dist === null) return 1;
      if (b.dist === null) return -1;
      return a.dist - b.dist;
    });

  const handleDispatch = (responder: Responder) => {
    dispatch.mutate(
      { data: { tripId, responderId: responder.id, customNote: customNote || null, infoLevel } },
      {
        onSuccess: () => {
          setSentIds((s) => new Set(s).add(responder.id));
          setDispatchingId(null);
          setCustomNote("");
          queryClient.invalidateQueries({ queryKey: getListCaseParticipantsQueryKey(tripId) });
          queryClient.invalidateQueries({ queryKey: getListCaseLogsQueryKey(tripId) });
          toast({ title: `Dispatch sent to ${responder.name}` });
        },
      }
    );
  };

  const INFO_LEVEL_LABELS: Record<number, string> = {
    1: "Level 1 — Area only (default, privacy-safe)",
    2: "Level 2 — Route / destination context",
    3: "Level 3 — Member first name only",
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Users className="w-3 h-3" /> Nearby Local Conduits
      </p>

      <div className="space-y-2 text-xs">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Privacy / information level</label>
          <select
            value={infoLevel}
            onChange={(e) => setInfoLevel(parseInt(e.target.value))}
            className="w-full bg-secondary border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            {[1, 2, 3].map((l) => (
              <option key={l} value={l}>{INFO_LEVEL_LABELS[l]}</option>
            ))}
          </select>
        </div>
        {infoLevel > 1 && (
          <p className="text-amber-400 text-xs">
            Level {infoLevel} shares more than the default. Confirm this is operationally justified.
          </p>
        )}
      </div>

      {nearby.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No active conduits configured. Add conduits via the Local Conduit Network page.</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
          {nearby.map((r) => {
            const isSent = sentIds.has(r.id);
            const isDispatching = dispatchingId === r.id;
            const distLabel = r.dist !== null ? `${r.dist.toFixed(1)}km` : "—";
            const isHighlighted = r.dist !== null && r.dist <= (r.supportRadiusKm ?? 5) &&
              (trip.status === "amber" || trip.status === "red");

            return (
              <div
                key={r.id}
                className={cn(
                  "border rounded-sm p-2",
                  isHighlighted ? "border-amber-600 bg-amber-950/20" : "border-border bg-secondary/30",
                  isSent && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground text-xs">{r.name}</span>
                      <span className="text-muted-foreground/60 text-xs">{r.conduitType.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground/60 text-xs">{distLabel}</span>
                      {isHighlighted && (
                        <span className="text-amber-400 text-xs font-bold">IN RADIUS</span>
                      )}
                      {isSent && <span className="text-green-400 text-xs">Dispatched</span>}
                    </div>
                    <div className="text-muted-foreground/70 text-xs mt-0.5">
                      {[r.suburb, r.areaName].filter(Boolean).join(", ")}
                      {r.linkedNetworkName && ` · ${r.linkedNetworkName}`}
                    </div>
                    <div className="text-muted-foreground/50 text-xs">{r.availabilityStatus}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!isSent && (
                      <button
                        onClick={() => setDispatchingId(isDispatching ? null : r.id)}
                        className="text-xs uppercase tracking-wider px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                      >
                        {isDispatching ? "Cancel" : "Dispatch"}
                      </button>
                    )}
                  </div>
                </div>

                {isDispatching && (
                  <div className="mt-2 space-y-2 border-t border-border pt-2">
                    <textarea
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      rows={2}
                      placeholder="Optional context (general only — no member details)..."
                      className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                    <div className="bg-background border border-border/50 rounded-sm p-2 text-xs text-muted-foreground">
                      <p className="font-bold text-muted-foreground/80 mb-1">Message preview (Level {infoLevel}):</p>
                      <p>Cyber Chaperone request from the eblockwatch Situation Room.</p>
                      <p>A member may need assistance near <strong>{r.areaName}</strong>.</p>
                      <p>Status: <strong>{trip.status.toUpperCase()}</strong></p>
                      <p className="mt-1">Reply 1–5 to respond.</p>
                    </div>
                    <button
                      onClick={() => handleDispatch(r)}
                      disabled={dispatch.isPending}
                      className="w-full bg-red-800 hover:bg-red-700 text-white text-xs uppercase tracking-widest font-bold py-1.5 disabled:opacity-40 transition-colors"
                    >
                      {dispatch.isPending ? "Sending…" : "Send Situation Room Request"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main trip detail page ─────────────────────────────────────────────────────
export default function TripDetail() {
  const { id } = useParams();
  const tripId = parseInt(id || "0", 10);

  const { data: trip, isLoading: isLoadingTrip } = useGetTrip(tripId, {
    query: { enabled: !!tripId, queryKey: getGetTripQueryKey(tripId) }
  });
  const { data: messages = [], isLoading: isLoadingMessages } = useGetTripMessages(tripId, {
    query: { enabled: !!tripId, queryKey: getGetTripMessagesQueryKey(tripId) }
  });

  const updateTrip = useUpdateTrip();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [inferenceNotes, setInferenceNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"notes" | "case">("notes");

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (trip && initializedForId.current !== trip.id) {
      initializedForId.current = trip.id;
      setEvidenceNotes(trip.evidenceNotes || "");
      setInferenceNotes(trip.inferenceNotes || "");
      setNextAction(trip.nextAction || "");
      setOperatorNotes(trip.operatorNotes || "");
    }
  }, [trip]);

  const handleSaveNotes = () => {
    updateTrip.mutate({ id: tripId, data: { evidenceNotes, inferenceNotes, nextAction, operatorNotes } }, {
      onSuccess: (updatedTrip) => {
        queryClient.setQueryData(getGetTripQueryKey(tripId), updatedTrip);
        toast({ title: "Notes saved successfully" });
      }
    });
  };

  const handleStatusChange = (status: "green" | "amber" | "red") => {
    updateTrip.mutate({ id: tripId, data: { status } }, {
      onSuccess: (updatedTrip) => {
        queryClient.setQueryData(getGetTripQueryKey(tripId), updatedTrip);
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
        toast({ title: `Status updated to ${status.toUpperCase()}` });
      }
    });
  };

  const handleCloseTrip = () => {
    updateTrip.mutate({ id: tripId, data: { status: "completed" } }, {
      onSuccess: (updatedTrip) => {
        queryClient.setQueryData(getGetTripQueryKey(tripId), updatedTrip);
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
        toast({ title: "Trip closed" });
      }
    });
  };

  if (isLoadingTrip) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!trip) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground uppercase tracking-widest text-sm">Operation not found</div>;
  }

  const showCasePanel = trip.status === "amber" || trip.status === "red";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <header className={cn(
        "h-20 px-8 flex items-center justify-between border-b shrink-0 transition-colors",
        trip.status === 'red' ? "bg-status-red/10 border-status-red" :
        trip.status === 'amber' ? "bg-status-amber/10 border-status-amber" :
        trip.status === 'completed' ? "bg-muted/30 border-border" : "bg-status-green/10 border-status-green/30"
      )}>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl uppercase tracking-widest font-bold text-foreground flex items-center gap-3">
              {trip.title}
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-sm",
                trip.status === 'red' ? "bg-status-red text-destructive-foreground" :
                trip.status === 'amber' ? "bg-status-amber text-primary-foreground" :
                trip.status === 'completed' ? "bg-muted text-muted-foreground" : "bg-status-green text-primary-foreground"
              )}>
                {trip.status}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              {trip.travelerName} &middot; {trip.travelerPhone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trip.status !== 'completed' && (
            <>
              <button onClick={() => handleStatusChange('green')} className={cn("px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors", trip.status === 'green' ? "bg-status-green text-primary-foreground border-status-green" : "border-border text-muted-foreground hover:text-foreground")}>Green</button>
              <button onClick={() => handleStatusChange('amber')} className={cn("px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors", trip.status === 'amber' ? "bg-status-amber text-primary-foreground border-status-amber" : "border-border text-muted-foreground hover:text-foreground")}>Amber</button>
              <button onClick={() => handleStatusChange('red')} className={cn("px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors", trip.status === 'red' ? "bg-status-red text-destructive-foreground border-status-red" : "border-border text-muted-foreground hover:text-foreground")}>Red</button>
              <div className="w-px h-6 bg-border mx-1" />
              <button onClick={handleCloseTrip} disabled={updateTrip.isPending} className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-bold border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50">
                {updateTrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Close Trip
              </button>
            </>
          )}
        </div>
      </header>

      <TripRouteMap trip={trip} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left pane — tabs: Situation Report / Case */}
        <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("notes")}
              className={cn(
                "flex-1 px-4 py-2.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 transition-colors",
                activeTab === "notes" ? "bg-background text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="w-3 h-3" /> Situation Report
            </button>
            <button
              onClick={() => setActiveTab("case")}
              className={cn(
                "flex-1 px-4 py-2.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 transition-colors relative",
                activeTab === "case" ? "bg-background text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="w-3 h-3" /> Case
              {showCasePanel && (
                <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "notes" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg uppercase tracking-widest font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Situation Report
                  </h2>
                  <button
                    onClick={handleSaveNotes}
                    disabled={updateTrip.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {updateTrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Notes
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Evidence (What do we know?)</label>
                  <Textarea value={evidenceNotes} onChange={(e) => setEvidenceNotes(e.target.value)} className="min-h-32 font-sans bg-card border-border" placeholder="Observed facts..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Inference (What does it mean?)</label>
                  <Textarea value={inferenceNotes} onChange={(e) => setInferenceNotes(e.target.value)} className="min-h-32 font-sans bg-card border-border" placeholder="Deductions and analysis..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Next Action</label>
                  <Textarea value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="min-h-24 font-sans bg-card border-border border-l-4 border-l-primary" placeholder="Required steps..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Operator Notes</label>
                  <Textarea value={operatorNotes} onChange={(e) => setOperatorNotes(e.target.value)} className="min-h-32 font-sans bg-card border-border" placeholder="Internal context..." />
                </div>

                {/* Trip Photos */}
                {(() => {
                  type Photo = { url: string; ts: string };
                  const photos: Photo[] = (() => {
                    try { return trip.mediaPhotos ? (JSON.parse(trip.mediaPhotos) as Photo[]) : []; }
                    catch { return []; }
                  })();
                  if (photos.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                        <Camera className="w-3 h-3" /> Trip Photos ({photos.length})
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((p, i) => (
                          <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square bg-muted rounded-sm overflow-hidden border border-border hover:border-primary transition-colors">
                            <img
                              src={p.url}
                              alt={`Trip photo ${i + 1}`}
                              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 font-mono">
                              {format(new Date(p.ts), "HH:mm")}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-6 border-t border-border">
                  <TripAiPanel tripId={tripId} tripStatus={trip.status} />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <CasePanel tripId={tripId} trip={trip} />
                <div className="border-t border-border pt-4">
                  <NearbyConduitsPanel tripId={tripId} trip={trip} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right pane — Comms Feed */}
        <div className="w-1/2 flex flex-col bg-card">
          <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
            <h2 className="text-sm uppercase tracking-widest font-bold">Comms Feed</h2>
            <span className="text-xs text-muted-foreground font-mono">{messages.length} msgs</span>
          </div>
          <div className="flex-1 p-6 overflow-auto space-y-6">
            {isLoadingMessages ? (
              <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground uppercase tracking-widest text-xs mt-10">No messages attached</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="border border-border p-4 bg-background">
                  <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="font-bold">{msg.fromNumber}</span>
                    <span>{format(new Date(msg.receivedAt), "MMM d, HH:mm")}</span>
                  </div>
                  <p className="text-sm font-sans whitespace-pre-wrap">{msg.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
