import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  approved: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  sent:     "text-primary border-primary/30 bg-primary/10",
  rejected: "text-destructive border-destructive/30 bg-destructive/10",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp",
};

export default function BroadcastApprovals() {
  const { isNational } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<QueueItem[]>({
    queryKey: ["/api/broadcast-queue"],
    queryFn: async () => {
      const res = await fetch("/api/broadcast-queue", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load queue");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/broadcast-queue/${id}/approve`, { method: "PATCH", credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/broadcast-queue"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await fetch(`/api/broadcast-queue/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/broadcast-queue"] }); setRejectId(null); setRejectReason(""); },
  });

  const pendingCount = items.filter(i => i.status === "pending").length;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Broadcast Approvals
            {pendingCount > 0 && (
              <span className="bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isNational
              ? "Review and approve broadcasts submitted by community admins."
              : "Track the status of your submitted broadcast requests."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
      ) : items.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-xs text-muted-foreground">No broadcast requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border border-border bg-card">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-sm shrink-0 ${STATUS_STYLES[item.status] ?? ""}`}>
                  {item.status}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{item.subject}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.submitterName} · {item.scope} · {(item.channels as string[]).map(c => CHANNEL_LABELS[c] ?? c).join(", ")}
                    {item.recipientCount != null && ` · ~${item.recipientCount.toLocaleString()} recipients`}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground hidden md:block">
                  {new Date(item.createdAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
                </p>
                {expandedId === item.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </div>

              {expandedId === item.id && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  <div className="bg-background border border-border p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {item.message}
                  </div>

                  {item.status === "rejected" && item.rejectedReason && (
                    <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      Rejected: {item.rejectedReason}
                    </div>
                  )}

                  {isNational && item.status === "pending" && (
                    <>
                      {rejectId === item.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection (optional)"
                            rows={2}
                            className="w-full bg-background border border-border text-foreground text-xs px-3 py-2 focus:outline-none focus:border-primary resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => rejectMutation.mutate({ id: item.id, reason: rejectReason })}
                              disabled={rejectMutation.isPending}
                              className="flex items-center gap-1.5 border border-destructive text-destructive px-3 py-1.5 text-xs uppercase font-bold hover:bg-destructive/10 disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              {rejectMutation.isPending ? "Rejecting…" : "Confirm Reject"}
                            </button>
                            <button onClick={() => setRejectId(null)} className="border border-border text-muted-foreground px-3 py-1.5 text-xs hover:text-foreground">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveMutation.mutate(item.id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 disabled:opacity-50"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {approveMutation.isPending ? "Sending…" : "Approve & Send"}
                          </button>
                          <button
                            onClick={() => setRejectId(item.id)}
                            className="flex items-center gap-1.5 border border-destructive/40 text-destructive px-3 py-1.5 text-xs uppercase font-bold hover:bg-destructive/10"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {item.status === "sent" && item.sentAt && (
                    <div className="flex items-center gap-1.5 text-[11px] text-primary">
                      <CheckCircle className="w-3 h-3" />
                      Sent {new Date(item.sentAt).toLocaleString("en-ZA")}
                    </div>
                  )}

                  {item.status === "pending" && !isNational && (
                    <div className="flex items-center gap-1.5 text-[11px] text-yellow-400">
                      <Clock className="w-3 h-3" />
                      Awaiting national admin approval
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
