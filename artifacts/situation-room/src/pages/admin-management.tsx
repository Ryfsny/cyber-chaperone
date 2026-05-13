import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Trash2, Key, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Role = "national" | "provincial" | "city" | "suburb" | "street";

interface Admin {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  province: string | null;
  city: string | null;
  suburb: string | null;
  street: string | null;
  email: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<Role, string> = {
  national: "National",
  provincial: "Provincial",
  city: "City",
  suburb: "Suburb",
  street: "Street",
};

const ROLE_COLORS: Record<Role, string> = {
  national: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  provincial: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  city: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  suburb: "text-primary border-primary/30 bg-primary/10",
  street: "text-orange-400 border-orange-400/30 bg-orange-400/10",
};

function scopeLabel(admin: Admin): string {
  const parts = [admin.province, admin.city, admin.suburb, admin.street].filter(Boolean);
  return parts.length > 0 ? parts.join(" › ") : "All of South Africa";
}

export default function AdminManagement() {
  const { isNational } = useAuth();
  const queryClient = useQueryClient();

  const { data: admins = [], isLoading } = useQuery<Admin[]>({
    queryKey: ["/api/operator-admins"],
    queryFn: async () => {
      const res = await fetch("/api/operator-admins", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load admins");
      return res.json();
    },
    enabled: isNational,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", displayName: "", role: "provincial" as Role,
    province: "", city: "", suburb: "", street: "", email: "",
  });
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/operator-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operator-admins"] });
      setShowForm(false);
      setForm({ username: "", password: "", displayName: "", role: "provincial", province: "", city: "", suburb: "", street: "", email: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/operator-admins/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/operator-admins"] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await fetch(`/api/operator-admins/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
    },
    onSuccess: () => { setResetId(null); setNewPassword(""); },
  });

  if (!isNational) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">National admin access required.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Admin Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create and manage community administrators across all geographic levels.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Admin
        </button>
      </div>

      {/* Permission model info */}
      <div className="border border-border bg-card p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-foreground">Permission Levels</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2">
          {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
            <div key={role} className={`border text-center px-2 py-1.5 text-xs font-bold rounded-sm ${ROLE_COLORS[role]}`}>
              {label}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Each level sees only members within their assigned geographic area. Email and mobile numbers are hidden from all sub-national admins. Broadcasts require national approval before sending.
        </p>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="border border-primary/40 bg-card p-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">New Community Admin</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Username</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                placeholder="jane.smith" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Display Name</label>
              <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                placeholder="Jane Smith" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                placeholder="••••••••" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Email (optional)</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                placeholder="jane@example.com" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary">
                <option value="provincial">Provincial</option>
                <option value="city">City</option>
                <option value="suburb">Suburb</option>
                <option value="street">Street</option>
                <option value="national">National</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Province</label>
              <input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                placeholder="Western Cape" />
            </div>
            {["city", "suburb", "street"].includes(form.role) && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">City</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                  placeholder="Cape Town" />
              </div>
            )}
            {["suburb", "street"].includes(form.role) && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Suburb</label>
                <input value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))}
                  className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                  placeholder="Claremont" />
              </div>
            )}
            {form.role === "street" && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Street / Area</label>
                <input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                  className="w-full mt-1 bg-background border border-border text-foreground text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                  placeholder="Main Road" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating…" : "Create Admin"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-border text-muted-foreground px-4 py-2 text-xs uppercase tracking-widest hover:text-foreground">
              Cancel
            </button>
          </div>
          {createMutation.error && (
            <p className="text-xs text-destructive">{createMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Admin list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Loading admins…</p>
      ) : admins.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-xs text-muted-foreground">No community admins yet. Create the first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="border border-border bg-card">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedId(expandedId === admin.id ? null : admin.id)}
              >
                <div className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-sm shrink-0 ${ROLE_COLORS[admin.role as Role]}`}>
                  {ROLE_LABELS[admin.role as Role] ?? admin.role}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{admin.displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{admin.username} · {scopeLabel(admin)}</p>
                </div>
                {expandedId === admin.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </div>

              {expandedId === admin.id && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">Province:</span> <span className="text-foreground">{admin.province ?? "—"}</span></div>
                    <div><span className="text-muted-foreground">City:</span> <span className="text-foreground">{admin.city ?? "—"}</span></div>
                    <div><span className="text-muted-foreground">Suburb:</span> <span className="text-foreground">{admin.suburb ?? "—"}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{admin.email ?? "—"}</span></div>
                  </div>

                  {/* Reset password */}
                  {resetId === admin.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="bg-background border border-border text-foreground text-xs px-3 py-1.5 focus:outline-none focus:border-primary flex-1"
                      />
                      <button
                        onClick={() => resetPasswordMutation.mutate({ id: admin.id, password: newPassword })}
                        disabled={resetPasswordMutation.isPending}
                        className="bg-primary text-primary-foreground px-3 py-1.5 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 disabled:opacity-50"
                      >
                        {resetPasswordMutation.isPending ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => { setResetId(null); setNewPassword(""); }}
                        className="border border-border text-muted-foreground px-3 py-1.5 text-xs hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setResetId(admin.id); setNewPassword(""); }}
                        className="flex items-center gap-1.5 border border-border text-muted-foreground px-3 py-1.5 text-xs hover:text-foreground hover:border-foreground/30 transition-colors"
                      >
                        <Key className="w-3 h-3" />
                        Reset Password
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${admin.displayName}?`)) deleteMutation.mutate(admin.id); }}
                        className="flex items-center gap-1.5 border border-destructive/40 text-destructive px-3 py-1.5 text-xs hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
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
