import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Send, CheckSquare, Square, MessageSquare, Loader2, CheckCircle2, XCircle, Users, Megaphone } from "lucide-react";
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

const DEFAULT_MESSAGE = `Hi {name}! 👋

You're invited to test the new eblockwatch Cyber Chaperone member portal.

👉 Visit: https://eblockwatch.replit.app/website/

Register or log in with your WhatsApp number. Takes 2 minutes.

Your feedback matters — reply to this message to let us know what you think!

— Andre | eblockwatch`;

export default function Broadcast() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
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
      setSelected((prev) => {
        const next = new Set(prev);
        members.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        members.forEach((m) => next.add(m.id));
        return next;
      });
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const mutation = useMutation<BroadcastResponse, Error, { memberIds: number[]; message: string }>({
    mutationFn: (payload) =>
      fetch(`${BASE}/api/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      setResults(data);
    },
  });

  function send() {
    if (selected.size === 0 || !message.trim()) return;
    setResults(null);
    mutation.mutate({ memberIds: Array.from(selected), message: message.trim() });
  }

  const statusColors: Record<string, string> = {
    verified: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    active: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Broadcast</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send a WhatsApp message to selected members
            </p>
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
            {mutation.isPending ? (
              <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Sending…</>
            ) : (
              <><Send className="w-3 h-3 mr-2" />Send to {selected.size || "…"}</>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: member list */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Input
                placeholder="Search members…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pl-3"
              />
            </div>
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

          {/* Select all row */}
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 px-3 py-2 border-b border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
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
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-foreground truncate">{m.displayName}</span>
                        {resultItem && (
                          resultItem.status === "sent"
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            : <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {m.whatsappNumber?.replace("whatsapp:", "") ?? m.mobile}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0 rounded border ${statusColors[m.memberStatus] ?? statusColors.inactive}`}>
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

        {/* Right: compose + results */}
        <div className="flex-1 flex flex-col min-w-0 p-5 gap-4 overflow-y-auto">
          {/* Message composer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                Message
              </label>
              <span className={`text-[10px] font-mono ${message.length > 1600 ? "text-red-400" : "text-muted-foreground"}`}>
                {message.length} / 1600
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="font-mono text-xs resize-none h-64"
              placeholder="Type your WhatsApp message…"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Tip: use <code className="bg-secondary px-1 rounded">{"{name}"}</code> and it will be replaced with each member's first name automatically.
            </p>
          </div>

          {/* Preview */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
            <div className="bg-[#1a1a2e] border border-border rounded-lg p-4 text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-52 overflow-y-auto">
              {message.replace(/\{name\}/g, "Kieren") || <span className="text-muted-foreground italic">Your message will appear here…</span>}
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
                <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Broadcast Results
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
                    {r.status === "sent" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="text-xs text-foreground flex-1">{r.name}</span>
                    {r.error && <span className="text-[10px] text-red-400 truncate max-w-xs">{r.error}</span>}
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
  );
}
