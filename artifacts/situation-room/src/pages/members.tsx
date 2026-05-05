import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Search, UserCheck, UserX, Clock, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Member {
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
  createdAt: string;
  updatedAt: string;
}

function formatPhone(raw: string): string {
  return raw.replace(/^whatsapp:/, "");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
    case "verified":
      return (
        <Badge className="bg-green-900 text-green-300 border-green-700 flex items-center gap-1">
          <UserCheck className="w-3 h-3" /> {status}
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-900 text-yellow-300 border-yellow-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> pending
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="bg-red-900 text-red-300 border-red-700 flex items-center gap-1">
          <UserX className="w-3 h-3" /> inactive
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
          <HelpCircle className="w-3 h-3" /> {status}
        </Badge>
      );
  }
}

function exportCsv(members: Member[]) {
  const headers = [
    "ID", "First Name", "Last Name", "Display Name", "WhatsApp Number",
    "Status", "Membership Tier", "Role", "ICE Contact Name", "ICE Contact Phone",
    "Notes", "Joined",
  ];
  const rows = members.map((m) => [
    m.id,
    m.firstName,
    m.lastName,
    m.displayName,
    formatPhone(m.whatsappNumber),
    m.memberStatus,
    m.membershipTier ?? "",
    m.role ?? "",
    m.iceContactName ?? "",
    formatPhone(m.iceContactPhone ?? ""),
    (m.notes ?? "").replace(/,/g, ";"),
    formatDate(m.createdAt),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eblockwatch-members-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Members() {
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading, error } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: () => fetch("/api/members").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.whatsappNumber.includes(q) ||
      (m.role ?? "").toLowerCase().includes(q) ||
      (m.membershipTier ?? "").toLowerCase().includes(q) ||
      m.memberStatus.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Member Directory</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${members.length} registered member${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-xs uppercase tracking-wider"
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="w-3 h-3" />
          Download CSV
        </Button>
      </div>

      <div className="px-6 py-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, number, tier, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="p-8 text-center text-destructive text-sm">Failed to load members.</div>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {search ? "No members match your search." : "No members registered yet."}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr>
                {["Name", "WhatsApp", "Status", "Tier", "Role", "Emergency Contact", "Joined"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground uppercase tracking-widest font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr
                  key={m.id}
                  className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{m.displayName}</div>
                    {m.notes && (
                      <div className="text-muted-foreground mt-0.5 max-w-[200px] truncate" title={m.notes}>
                        {m.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">
                    {formatPhone(m.whatsappNumber)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.memberStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.membershipTier ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.role ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {m.iceContactName ? (
                      <div>
                        <div className="text-foreground">{m.iceContactName}</div>
                        <div className="text-muted-foreground font-mono">
                          {formatPhone(m.iceContactPhone ?? "")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-border">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
