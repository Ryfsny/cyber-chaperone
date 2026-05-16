import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, RefreshCw, Users, User, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: number;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  whatsappNumber: string;
  memberStatus: string;
  membershipTier: string | null;
  paystackCustomerId: string | null;
  paystackSubscriptionCode: string | null;
  paystackStatus: string | null;
  paystackPlanCode: string | null;
  paystackPaidAt: string | null;
}

interface MembersResponse {
  members: Member[];
  total: number;
}

const PLAN_INDIVIDUAL = "PLN_rnn4nj61oh0zy0c";
const PLAN_FAMILY = "PLN_wopagttz7e5quyw";

function planLabel(planCode: string | null): string {
  if (planCode === PLAN_INDIVIDUAL) return "Individual";
  if (planCode === PLAN_FAMILY) return "Family";
  if (planCode) return planCode;
  return "—";
}

function planPrice(planCode: string | null): string {
  if (planCode === PLAN_INDIVIDUAL) return "R150/mo";
  if (planCode === PLAN_FAMILY) return "R250/mo";
  return "";
}

function paystackStatusBadge(status: string | null) {
  if (!status) return <span className="text-gray-400 text-sm">—</span>;
  const s = status.toLowerCase();
  if (s === "active") return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
  if (s === "non-renewing") return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Non-renewing</Badge>;
  if (s === "cancelled" || s === "canceled") return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
  if (s === "attention") return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Attention</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Membership() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery<MembersResponse>({
    queryKey: ["/api/members", { limit: 1000 }],
    queryFn: async () => {
      const res = await fetch("/api/members?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/paystack/sync", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (result) => {
      const msg = result.message ?? `Synced ${result.synced ?? 0} subscriber${result.synced !== 1 ? "s" : ""}`;
      setSyncResult(msg);
      toast({ title: "Paystack sync complete", description: msg });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not reach Paystack. Try again.", variant: "destructive" });
    },
  });

  const allMembers = data?.members ?? [];
  const subscribers = allMembers.filter((m) => m.paystackCustomerId);
  const active = subscribers.filter((m) => m.paystackStatus?.toLowerCase() === "active");
  const individual = subscribers.filter((m) => m.paystackPlanCode === PLAN_INDIVIDUAL);
  const family = subscribers.filter((m) => m.paystackPlanCode === PLAN_FAMILY);
  const verified = allMembers.filter((m) => m.memberStatus === "verified" || m.memberStatus === "active");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-green-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Membership</h1>
            <p className="text-sm text-gray-500">Paystack subscribers and plan status</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1">
              {syncResult}
            </span>
          )}
          <Button
            onClick={() => { setSyncResult(null); syncMutation.mutate(); }}
            disabled={syncMutation.isPending}
            className="bg-[#1a1f2e] hover:bg-[#252b3b] text-white gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing…" : "Sync from Paystack"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Verified members"
          value={verified.length}
          bg="bg-green-50"
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-blue-600" />}
          label="Paystack active"
          value={active.length}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<User className="h-5 w-5 text-purple-600" />}
          label="Individual (R150/mo)"
          value={individual.length}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-orange-600" />}
          label="Family (R250/mo)"
          value={family.length}
          bg="bg-orange-50"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            Paystack subscribers
            <span className="ml-2 text-gray-400 font-normal">({subscribers.length})</span>
          </h2>
          {isLoading && <Clock className="h-4 w-4 text-gray-400 animate-pulse" />}
        </div>

        {subscribers.length === 0 && !isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No Paystack subscribers found. Run a sync to pull the latest data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">WhatsApp</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Paystack Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Last Payment</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Member Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subscribers
                  .sort((a, b) => {
                    // Active first, then by paid date descending
                    const aActive = a.paystackStatus?.toLowerCase() === "active" ? 0 : 1;
                    const bActive = b.paystackStatus?.toLowerCase() === "active" ? 0 : 1;
                    if (aActive !== bActive) return aActive - bActive;
                    return (b.paystackPaidAt ?? "").localeCompare(a.paystackPaidAt ?? "");
                  })
                  .map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <a
                          href={`/members/${m.id}`}
                          className="font-medium text-gray-900 hover:text-green-700 hover:underline"
                        >
                          {m.displayName ?? (`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—")}
                        </a>
                        {m.email && (
                          <div className="text-xs text-gray-400 mt-0.5">{m.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {m.whatsappNumber.replace(/^whatsapp:/, "")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{planLabel(m.paystackPlanCode)}</span>
                        {planPrice(m.paystackPlanCode) && (
                          <span className="ml-1.5 text-xs text-gray-400">{planPrice(m.paystackPlanCode)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {paystackStatusBadge(m.paystackStatus)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(m.paystackPaidAt)}
                      </td>
                      <td className="px-4 py-3">
                        <MemberStatusBadge status={m.memberStatus} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plans reference */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlanCard
          name="Cyber Chaperone Individual"
          price="R150 / month"
          planCode={PLAN_INDIVIDUAL}
          count={individual.length}
          activeCount={individual.filter((m) => m.paystackStatus?.toLowerCase() === "active").length}
        />
        <PlanCard
          name="Cyber Chaperone Family"
          price="R250 / month"
          planCode={PLAN_FAMILY}
          count={family.length}
          activeCount={family.filter((m) => m.paystackStatus?.toLowerCase() === "active").length}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className={`${bg} rounded-lg p-4 border border-white`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function PlanCard({ name, price, planCode, count, activeCount }: {
  name: string; price: string; planCode: string; count: number; activeCount: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          <div className="text-sm text-gray-500 mt-0.5">{price}</div>
          <div className="text-xs text-gray-400 mt-1 font-mono">{planCode}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{count}</div>
          <div className="text-xs text-gray-500">total</div>
          <div className="text-xs text-green-600 font-medium mt-0.5">{activeCount} active</div>
        </div>
      </div>
    </div>
  );
}

function MemberStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "verified") return <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>;
  if (s === "active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>;
  if (s === "pending") return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
  return <Badge variant="outline" className="text-gray-500">{status}</Badge>;
}
