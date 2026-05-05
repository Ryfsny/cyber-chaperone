import { useState } from "react";
import {
  useListResponders,
  useCreateResponder,
  useUpdateResponder,
  useDeleteResponder,
} from "@workspace/api-client-react";
import type { Responder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListRespondersQueryKey } from "@workspace/api-client-react";

interface ResponderFormData {
  name: string;
  whatsappNumber: string;
  areaName: string;
  homeLat: string;
  homeLon: string;
  notes: string;
  active: boolean;
}

const EMPTY_FORM: ResponderFormData = {
  name: "",
  whatsappNumber: "",
  areaName: "",
  homeLat: "",
  homeLon: "",
  notes: "",
  active: true,
};

function ResponderForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial: ResponderFormData;
  onSave: (data: ResponderFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ResponderFormData>(initial);
  const set = (k: keyof ResponderFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isValid =
    form.name.trim() &&
    form.whatsappNumber.trim() &&
    form.areaName.trim() &&
    form.homeLat.trim() &&
    form.homeLon.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) onSave(form);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Name
          </label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            WhatsApp Number
          </label>
          <input
            value={form.whatsappNumber}
            onChange={(e) => set("whatsappNumber", e.target.value)}
            required
            className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="+27821234567"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Area / Sector
          </label>
          <input
            value={form.areaName}
            onChange={(e) => set("areaName", e.target.value)}
            required
            className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="Sandton North"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Home Latitude
          </label>
          <input
            value={form.homeLat}
            onChange={(e) => set("homeLat", e.target.value)}
            required
            type="text"
            inputMode="decimal"
            className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="-26.1076"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Home Longitude
          </label>
          <input
            value={form.homeLon}
            onChange={(e) => set("homeLon", e.target.value)}
            required
            type="text"
            inputMode="decimal"
            className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="28.0567"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Status
          </label>
          <select
            value={form.active ? "active" : "inactive"}
            onChange={(e) => set("active", e.target.value === "active")}
            className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            <option value="active">Active — receives dispatches</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Notes (optional)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          placeholder="Armed response, area captain, etc."
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!isValid || loading}
          className="flex-1 bg-primary text-primary-foreground py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving…" : "Save Responder"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ResponderRow({
  responder,
  onEdit,
}: {
  responder: Responder;
  onEdit: (r: Responder) => void;
}) {
  const queryClient = useQueryClient();
  const deleteResponder = useDeleteResponder();
  const updateResponder = useUpdateResponder();

  const handleToggle = () => {
    updateResponder.mutate(
      { id: responder.id, data: { active: !responder.active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRespondersQueryKey() });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!confirm(`Remove ${responder.name} from the responder network?`)) return;
    deleteResponder.mutate(
      { id: responder.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRespondersQueryKey() });
        },
      }
    );
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div
        className="w-3 h-3 shrink-0 rotate-45"
        style={{ background: responder.active ? "#818cf8" : "#6b7280" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{responder.name}</span>
          {!responder.active && (
            <span className="text-xs text-muted-foreground">(inactive)</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {responder.areaName} · {responder.whatsappNumber}
        </div>
        {responder.notes && (
          <div className="text-xs text-muted-foreground/70 mt-0.5">{responder.notes}</div>
        )}
      </div>
      <div className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">
        {responder.homeLat}, {responder.homeLon}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleToggle}
          disabled={updateResponder.isPending}
          className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider px-2 py-1 border border-border hover:border-border/80 transition-colors disabled:opacity-40"
        >
          {responder.active ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={() => onEdit(responder)}
          className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider px-2 py-1 border border-border hover:border-border/80 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteResponder.isPending}
          className="text-xs text-red-400 hover:text-red-300 uppercase tracking-wider px-2 py-1 border border-red-900 hover:border-red-700 transition-colors disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function Responders() {
  const queryClient = useQueryClient();
  const { data: responders = [], isLoading } = useListResponders();
  const createResponder = useCreateResponder();
  const updateResponder = useUpdateResponder();

  const [showForm, setShowForm] = useState(false);
  const [editingResponder, setEditingResponder] = useState<Responder | null>(null);

  const handleCreate = (data: ResponderFormData) => {
    createResponder.mutate(
      { data: { ...data, notes: data.notes || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRespondersQueryKey() });
          setShowForm(false);
        },
      }
    );
  };

  const handleEdit = (data: ResponderFormData) => {
    if (!editingResponder) return;
    updateResponder.mutate(
      { id: editingResponder.id, data: { ...data, notes: data.notes || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRespondersQueryKey() });
          setEditingResponder(null);
        },
      }
    );
  };

  const activeCount = responders.filter((r) => r.active).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Responder Network
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeCount} active · {responders.length} total — eblockwatch first responders
          </p>
        </div>
        {!showForm && !editingResponder && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
          >
            + Add Responder
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {(showForm || editingResponder) && (
          <div className="bg-card border border-border rounded-sm p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              {editingResponder ? `Edit — ${editingResponder.name}` : "New Responder"}
            </h2>
            <ResponderForm
              initial={
                editingResponder
                  ? {
                      name: editingResponder.name,
                      whatsappNumber: editingResponder.whatsappNumber,
                      areaName: editingResponder.areaName,
                      homeLat: editingResponder.homeLat,
                      homeLon: editingResponder.homeLon,
                      notes: editingResponder.notes ?? "",
                      active: editingResponder.active,
                    }
                  : EMPTY_FORM
              }
              onSave={editingResponder ? handleEdit : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditingResponder(null);
              }}
              loading={createResponder.isPending || updateResponder.isPending}
            />
          </div>
        )}

        {isLoading && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Loading…
          </p>
        )}

        {!isLoading && responders.length === 0 && !showForm && (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-sm">No responders configured.</p>
            <p className="text-muted-foreground text-xs max-w-md mx-auto">
              Add eblockwatch members as responders. Their home locations will appear as
              diamond pins on the Live Radar. You can dispatch a WhatsApp to any responder
              directly from the radar when a member is in distress.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 bg-primary text-primary-foreground px-6 py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
            >
              Add First Responder
            </button>
          </div>
        )}

        {responders.length > 0 && (
          <div className="bg-card border border-border rounded-sm">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Responders — sorted by area
              </p>
            </div>
            <div className="px-4">
              {responders.map((r) => (
                <ResponderRow
                  key={r.id}
                  responder={r}
                  onEdit={(r) => {
                    setShowForm(false);
                    setEditingResponder(r);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-secondary/50 border border-border/50 rounded-sm p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-bold uppercase tracking-wider text-foreground/70">How dispatch works</p>
          <p>
            From the Live Radar, click any trip icon → Dispatch to send a WhatsApp to a
            responder in that area. The responder receives a full situation brief and can
            mobilise their local Residents Association group.
          </p>
          <p>
            Home coordinates can be found using Google Maps or{" "}
            <a
              href="https://www.latlong.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              latlong.net
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
