import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import {
  useListResponders,
  useCreateResponder,
  useUpdateResponder,
  useDeleteResponder,
} from "@workspace/api-client-react";
import type { Responder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListRespondersQueryKey } from "@workspace/api-client-react";

const CONDUIT_TYPES = [
  { value: "general", label: "General Responder" },
  { value: "area_captain", label: "Area Captain" },
  { value: "armed_response", label: "Armed Response" },
  { value: "neighbourhood_watch", label: "Neighbourhood Watch" },
  { value: "residents_association", label: "Residents' Association" },
  { value: "medical", label: "Medical / First Aid" },
  { value: "pastoral", label: "Pastoral Care" },
  { value: "law_enforcement", label: "Law Enforcement Contact" },
];

const AVAILABILITY = [
  { value: "available", label: "Available" },
  { value: "limited", label: "Limited availability" },
  { value: "unavailable", label: "Unavailable" },
  { value: "on_shift", label: "On shift" },
];

const TRUST_LEVELS = [
  { value: "standard", label: "Standard" },
  { value: "verified", label: "Verified" },
  { value: "senior", label: "Senior / Trusted" },
];

const PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
];

interface ResponderFormData {
  name: string;
  whatsappNumber: string;
  areaName: string;
  suburb: string;
  street: string;
  province: string;
  homeLat: string;
  homeLon: string;
  conduitType: string;
  supportRadiusKm: string;
  availabilityStatus: string;
  trustLevel: string;
  linkedNetworkType: string;
  linkedNetworkName: string;
  notes: string;
  active: boolean;
}

const EMPTY_FORM: ResponderFormData = {
  name: "",
  whatsappNumber: "",
  areaName: "",
  suburb: "",
  street: "",
  province: "Gauteng",
  homeLat: "",
  homeLon: "",
  conduitType: "general",
  supportRadiusKm: "5",
  availabilityStatus: "available",
  trustLevel: "standard",
  linkedNetworkType: "",
  linkedNetworkName: "",
  notes: "",
  active: true,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: "decimal" | "tel";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      inputMode={inputMode}
      placeholder={placeholder}
      className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ResponderForm({ initial, onSave, onCancel, loading }: {
  initial: ResponderFormData; onSave: (d: ResponderFormData) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState<ResponderFormData>(initial);
  const set = (k: keyof ResponderFormData, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const isValid = form.name.trim() && form.whatsappNumber.trim() && form.areaName.trim() && form.homeLat.trim() && form.homeLon.trim();

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (isValid) onSave(form); }} className="space-y-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Identity</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name">
          <Input value={form.name} onChange={(v) => set("name", v)} placeholder="John Smith" />
        </Field>
        <Field label="WhatsApp number">
          <Input value={form.whatsappNumber} onChange={(v) => set("whatsappNumber", v)} placeholder="+27821234567" inputMode="tel" />
        </Field>
        <Field label="Conduit type">
          <Select value={form.conduitType} onChange={(v) => set("conduitType", v)} options={CONDUIT_TYPES} />
        </Field>
        <Field label="Trust level">
          <Select value={form.trustLevel} onChange={(v) => set("trustLevel", v)} options={TRUST_LEVELS} />
        </Field>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-2 pt-2">Location</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Area / Sector">
          <Input value={form.areaName} onChange={(v) => set("areaName", v)} placeholder="Sandton North" />
        </Field>
        <Field label="Suburb">
          <Input value={form.suburb} onChange={(v) => set("suburb", v)} placeholder="Bryanston" />
        </Field>
        <Field label="Street / Nearest street">
          <Input value={form.street} onChange={(v) => set("street", v)} placeholder="William Nicol Drive" />
        </Field>
        <Field label="Province">
          <Select value={form.province} onChange={(v) => set("province", v)} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
        </Field>
        <Field label="Home latitude">
          <Input value={form.homeLat} onChange={(v) => set("homeLat", v)} placeholder="-26.1076" inputMode="decimal" />
        </Field>
        <Field label="Home longitude">
          <Input value={form.homeLon} onChange={(v) => set("homeLon", v)} placeholder="28.0567" inputMode="decimal" />
        </Field>
        <Field label="Support radius (km)">
          <Input value={form.supportRadiusKm} onChange={(v) => set("supportRadiusKm", v)} placeholder="5" inputMode="decimal" />
        </Field>
        <Field label="Availability status">
          <Select value={form.availabilityStatus} onChange={(v) => set("availabilityStatus", v)} options={AVAILABILITY} />
        </Field>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-2 pt-2">Local network</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Linked network type">
          <Input value={form.linkedNetworkType} onChange={(v) => set("linkedNetworkType", v)} placeholder="Residents' Association / HOA / CPF" />
        </Field>
        <Field label="Linked network name">
          <Input value={form.linkedNetworkName} onChange={(v) => set("linkedNetworkName", v)} placeholder="Bryanston RA" />
        </Field>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-2 pt-2">Status &amp; notes</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Active status">
          <Select
            value={form.active ? "active" : "inactive"}
            onChange={(v) => set("active", v === "active")}
            options={[
              { value: "active", label: "Active — can receive dispatches" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          placeholder="Armed response, area captain hours, special capabilities..."
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!isValid || loading}
          className="flex-1 bg-primary text-primary-foreground py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving…" : "Save Conduit"}
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

const CONDUIT_TYPE_LABELS: Record<string, string> = {
  general: "General",
  area_captain: "Area Captain",
  armed_response: "Armed Response",
  neighbourhood_watch: "NW",
  residents_association: "RA",
  medical: "Medical",
  pastoral: "Pastoral",
  law_enforcement: "LEA",
};

const AVAILABILITY_COLORS: Record<string, string> = {
  available: "text-green-400",
  limited: "text-amber-400",
  unavailable: "text-red-400",
  on_shift: "text-blue-400",
};

function ResponderRow({ responder, onEdit }: { responder: Responder; onEdit: (r: Responder) => void }) {
  const queryClient = useQueryClient();
  const deleteResponder = useDeleteResponder();
  const updateResponder = useUpdateResponder();

  const handleToggle = () => {
    updateResponder.mutate(
      { id: responder.id, data: { active: !responder.active } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRespondersQueryKey() }) }
    );
  };

  const handleDelete = () => {
    if (!confirm(`Remove ${responder.name} from the conduit network?`)) return;
    deleteResponder.mutate(
      { id: responder.id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRespondersQueryKey() }) }
    );
  };

  const availColor = AVAILABILITY_COLORS[responder.availabilityStatus] ?? "text-muted-foreground";

  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <div className="w-3 h-3 shrink-0 rotate-45 mt-1" style={{ background: responder.active ? "#818cf8" : "#6b7280" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground">{responder.name}</span>
          <span className="text-xs px-1.5 py-0.5 bg-secondary border border-border text-muted-foreground">
            {CONDUIT_TYPE_LABELS[responder.conduitType] ?? responder.conduitType}
          </span>
          <span className={`text-xs font-medium ${availColor}`}>
            {responder.availabilityStatus}
          </span>
          <span className="text-xs text-muted-foreground/60">{responder.trustLevel}</span>
          {!responder.active && <span className="text-xs text-muted-foreground">(inactive)</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {[responder.suburb, responder.areaName, responder.province].filter(Boolean).join(" · ")}
          {responder.supportRadiusKm && <span className="ml-2 text-muted-foreground/60">{responder.supportRadiusKm}km radius</span>}
        </div>
        {responder.linkedNetworkName && (
          <div className="text-xs text-muted-foreground/60 mt-0.5">
            {responder.linkedNetworkType && `${responder.linkedNetworkType}: `}{responder.linkedNetworkName}
          </div>
        )}
        <div className="text-xs text-muted-foreground/50 mt-0.5">{responder.whatsappNumber}</div>
        {responder.notes && <div className="text-xs text-muted-foreground/70 mt-0.5">{responder.notes}</div>}
      </div>
      <div className="text-xs text-muted-foreground/50 shrink-0 tabular-nums hidden lg:block">
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

  const toFormData = (r: Responder): ResponderFormData => ({
    name: r.name,
    whatsappNumber: r.whatsappNumber,
    areaName: r.areaName,
    suburb: r.suburb ?? "",
    street: r.street ?? "",
    province: r.province ?? "Gauteng",
    homeLat: r.homeLat,
    homeLon: r.homeLon,
    conduitType: r.conduitType,
    supportRadiusKm: String(r.supportRadiusKm ?? 5),
    availabilityStatus: r.availabilityStatus,
    trustLevel: r.trustLevel,
    linkedNetworkType: r.linkedNetworkType ?? "",
    linkedNetworkName: r.linkedNetworkName ?? "",
    notes: r.notes ?? "",
    active: r.active,
  });

  const toApiData = (d: ResponderFormData) => ({
    name: d.name,
    whatsappNumber: d.whatsappNumber,
    areaName: d.areaName,
    suburb: d.suburb || null,
    street: d.street || null,
    province: d.province || null,
    homeLat: d.homeLat,
    homeLon: d.homeLon,
    conduitType: d.conduitType,
    supportRadiusKm: parseInt(d.supportRadiusKm) || 5,
    availabilityStatus: d.availabilityStatus,
    trustLevel: d.trustLevel,
    linkedNetworkType: d.linkedNetworkType || null,
    linkedNetworkName: d.linkedNetworkName || null,
    notes: d.notes || null,
    active: d.active,
  });

  const handleCreate = (data: ResponderFormData) => {
    createResponder.mutate(
      { data: toApiData(data) },
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
      { id: editingResponder.id, data: toApiData(data) },
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
      <div className="px-6 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-widest shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <div className="h-4 w-px bg-border shrink-0" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Local Conduit Network
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeCount} active · {responders.length} total — eblockwatch Situation Room conduits
            </p>
          </div>
        </div>
        {!showForm && !editingResponder && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
          >
            + Add Conduit
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {(showForm || editingResponder) && (
          <div className="bg-card border border-border rounded-sm p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              {editingResponder ? `Edit — ${editingResponder.name}` : "New Local Conduit"}
            </h2>
            <ResponderForm
              initial={editingResponder ? toFormData(editingResponder) : EMPTY_FORM}
              onSave={editingResponder ? handleEdit : handleCreate}
              onCancel={() => { setShowForm(false); setEditingResponder(null); }}
              loading={createResponder.isPending || updateResponder.isPending}
            />
          </div>
        )}

        {isLoading && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Loading…</p>
        )}

        {!isLoading && responders.length === 0 && !showForm && (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-sm">No conduits configured.</p>
            <p className="text-muted-foreground text-xs max-w-md mx-auto">
              Add eblockwatch local conduits — area captains, neighbourhood watch coordinators,
              armed response contacts, or residents' association leads. Their locations appear
              as diamond pins on the Live Radar. Dispatch is always Situation Room-mediated.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 bg-primary text-primary-foreground px-6 py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
            >
              Add First Conduit
            </button>
          </div>
        )}

        {responders.length > 0 && (
          <div className="bg-card border border-border rounded-sm">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Conduits — sorted by area
              </p>
            </div>
            <div className="px-4">
              {responders.map((r) => (
                <ResponderRow
                  key={r.id}
                  responder={r}
                  onEdit={(r) => { setShowForm(false); setEditingResponder(r); }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-secondary/50 border border-border/50 rounded-sm p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-bold uppercase tracking-wider text-foreground/70">Situation Room communication model</p>
          <p>
            All dispatch is Situation Room-mediated. Conduits receive only a privacy-safe request
            (Level 1: approximate area and status). Member identity is never shared by default.
          </p>
          <p>
            Conduits reply 1–5 to the Situation Room. Replies are logged. Member isolation is maintained —
            conduits do not receive the member's phone number or private notes unless the operator
            explicitly approves an information upgrade.
          </p>
          <p>
            Home coordinates: use{" "}
            <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">latlong.net</a>
            {" "}or Google Maps (right-click → coordinates).
          </p>
        </div>
      </div>
    </div>
  );
}
