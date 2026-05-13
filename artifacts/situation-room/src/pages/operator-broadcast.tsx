import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Mail, MessageSquare, Phone, CheckSquare, Square,
  Send, Search, RefreshCw, MapPin, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  email: string | null;
  mobile: string | null;
  province: string | null;
  city: string | null;
  suburb: string | null;
}

interface ChannelResult {
  status: "sent" | "failed" | "skipped";
  error?: string;
}

interface MemberResult {
  id: number;
  name: string;
  email?: ChannelResult;
  sms?: ChannelResult;
  whatsapp?: ChannelResult;
}

interface SendResponse {
  ok: boolean;
  total: number;
  emailSent: number;
  smsSent: number;
  whatsappSent: number;
  results: MemberResult[];
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function statusColor(s: "sent" | "failed" | "skipped") {
  if (s === "sent") return "text-green-400";
  if (s === "failed") return "text-red-400";
  return "text-muted-foreground";
}

function statusIcon(s: "sent" | "failed" | "skipped") {
  if (s === "sent") return "✓";
  if (s === "failed") return "✗";
  return "—";
}

function distinct(arr: (string | null | undefined)[]): string[] {
  return [...new Set(arr.filter((v): v is string => !!v?.trim()))].sort();
}

/** Native select styled to match the dark theme */
function GeoSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || options.length === 0}
      className={cn(
        "flex-1 min-w-0 h-8 rounded-sm border border-border bg-background px-2 text-xs text-foreground",
        "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        value ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <option value="">{disabled || options.length === 0 ? "—" : placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default function OperatorBroadcast() {
  const [search, setSearch] = useState("");

  // ── Geographic filters ─────────────────────────────────────────────────────
  const [geoProvince, setGeoProvince] = useState("");
  const [geoCity, setGeoCity] = useState("");
  const [geoSuburb, setGeoSuburb] = useState("");

  // ── Compose / send state ───────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false });
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const { data: members = [], isLoading, refetch } = useQuery<Member[]>({
    queryKey: ["members-all"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/members`);
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
  });

  // ── Derive cascading options from the full member set ──────────────────────
  const provinces = useMemo(() => distinct(members.map((m) => m.province)), [members]);

  const cities = useMemo(() => {
    const pool = geoProvince ? members.filter((m) => m.province === geoProvince) : members;
    return distinct(pool.map((m) => m.city));
  }, [members, geoProvince]);

  const suburbs = useMemo(() => {
    let pool = members;
    if (geoProvince) pool = pool.filter((m) => m.province === geoProvince);
    if (geoCity)     pool = pool.filter((m) => m.city === geoCity);
    return distinct(pool.map((m) => m.suburb));
  }, [members, geoProvince, geoCity]);

  // ── Members after geo + text search ───────────────────────────────────────
  const filtered = useMemo(() => {
    let pool = members;
    if (geoProvince) pool = pool.filter((m) => m.province === geoProvince);
    if (geoCity)     pool = pool.filter((m) => m.city === geoCity);
    if (geoSuburb)   pool = pool.filter((m) => m.suburb === geoSuburb);

    if (search.trim()) {
      const q = search.toLowerCase();
      pool = pool.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          (m.email ?? "").toLowerCase().includes(q) ||
          (m.mobile ?? "").includes(q) ||
          m.whatsappNumber.includes(q),
      );
    }
    return pool;
  }, [members, geoProvince, geoCity, geoSuburb, search]);

  const geoActive = !!(geoProvince || geoCity || geoSuburb);

  function clearGeo() {
    setGeoProvince("");
    setGeoCity("");
    setGeoSuburb("");
  }

  function handleProvinceChange(v: string) {
    setGeoProvince(v);
    setGeoCity("");
    setGeoSuburb("");
  }

  function handleCityChange(v: string) {
    setGeoCity(v);
    setGeoSuburb("");
  }

  // ── Checkbox helpers ───────────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  function toggleMember(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((m) => next.add(m.id));
      return next;
    });
  }

  function deselectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((m) => next.delete(m.id));
      return next;
    });
  }

  function toggleChannel(ch: "email" | "sms" | "whatsapp") {
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const mutation = useMutation<SendResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/broadcast/multi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: Array.from(selected),
          message,
          channels,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Send failed" }));
        throw new Error(err.error ?? "Send failed");
      }
      return res.json();
    },
    onSuccess: (data) => { setSendResult(data); setSendError(null); },
    onError: (err) => { setSendError(err.message); setSendResult(null); },
  });

  const canSend =
    selected.size > 0 &&
    message.trim().length > 0 &&
    (channels.email || channels.sms || channels.whatsapp) &&
    !mutation.isPending;

  // ── Location label for header breadcrumb ──────────────────────────────────
  const geoLabel = [geoProvince, geoCity, geoSuburb].filter(Boolean).join(" › ") || "All Members";

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ── */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center gap-3">
        <Send className="w-4 h-4 text-primary shrink-0" />
        <div>
          <h1 className="text-xs uppercase tracking-widest font-bold text-foreground leading-none">
            Direct Broadcast
          </h1>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            Select members · compose · choose channels · send
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">

        {/* ── Geographic drill-down ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Geographic Filter
            </span>
            {geoActive && (
              <button
                onClick={clearGeo}
                className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="text-[10px] text-primary font-mono mb-2 min-h-[14px]">
            {geoLabel}
          </div>

          {/* Cascading selects */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">
                Province
              </label>
              <GeoSelect
                value={geoProvince}
                onChange={handleProvinceChange}
                options={provinces}
                placeholder="All provinces"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">
                City / Town
              </label>
              <GeoSelect
                value={geoCity}
                onChange={handleCityChange}
                options={cities}
                placeholder="All cities"
                disabled={!geoProvince}
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">
                Suburb
              </label>
              <GeoSelect
                value={geoSuburb}
                onChange={setGeoSuburb}
                options={suburbs}
                placeholder="All suburbs"
                disabled={!geoCity}
              />
            </div>
          </div>

          {provinces.length === 0 && !isLoading && (
            <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
              No location data on members yet — fill in Province / City / Suburb in each member profile to enable geographic targeting.
            </p>
          )}
        </section>

        {/* ── Member list ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              {isLoading
                ? "Loading…"
                : `Showing ${filtered.length} of ${members.length} member${members.length !== 1 ? "s" : ""}`}
            </span>
            {selected.size > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {selected.size} selected
              </Badge>
            )}
            <div className="ml-auto flex gap-3">
              <button
                onClick={allFilteredSelected ? deselectAll : selectAll}
                className="text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 font-bold transition-colors"
              >
                {allFilteredSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="pl-8 h-8 text-xs bg-background border-border"
            />
          </div>

          {/* Member rows */}
          <div className="border border-border rounded-sm overflow-hidden">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground text-xs">Loading members…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No members match the current filters
              </div>
            ) : (
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {filtered.map((m) => {
                  const isSelected = selected.has(m.id);
                  const locationParts = [m.suburb, m.city, m.province].filter(Boolean);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-secondary/50",
                      )}
                    >
                      <span className={cn("shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{m.displayName}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1 py-0 h-3.5 shrink-0 uppercase",
                              m.memberStatus === "verified"
                                ? "border-green-600/50 text-green-500"
                                : m.memberStatus === "active"
                                ? "border-blue-600/50 text-blue-400"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {m.memberStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {m.email && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="w-2.5 h-2.5 shrink-0" /> {m.email}
                            </span>
                          )}
                          {m.mobile && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                              <Phone className="w-2.5 h-2.5" /> {m.mobile}
                            </span>
                          )}
                          {locationParts.length > 0 && (
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0">
                              <MapPin className="w-2.5 h-2.5" />
                              {locationParts.join(", ")}
                            </span>
                          )}
                          {!m.email && !m.mobile && locationParts.length === 0 && (
                            <span className="text-[10px] text-muted-foreground/50 italic">
                              {m.whatsappNumber}
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
        </section>

        {/* ── Compose ── */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block">
            Message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here… Use {name} to personalise."
            rows={5}
            className="text-sm bg-background border-border resize-none"
          />
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Tip: <code className="font-mono">{"{name}"}</code> is replaced with each member's first name.
          </p>
        </section>

        {/* ── Channels ── */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block">
            Send via
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "email", label: "Email", icon: Mail },
                { key: "sms", label: "SMS", icon: Phone },
                { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const on = channels[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleChannel(key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-sm border text-xs font-bold uppercase tracking-wider transition-colors",
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {on ? (
                    <CheckSquare className="w-3 h-3 ml-0.5" />
                  ) : (
                    <Square className="w-3 h-3 ml-0.5 opacity-50" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Send button ── */}
        <section>
          <Button
            disabled={!canSend}
            onClick={() => {
              setSendResult(null);
              setSendError(null);
              mutation.mutate();
            }}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-sm gap-2"
          >
            {mutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to{" "}
                {selected.size > 0
                  ? `${selected.size} Member${selected.size !== 1 ? "s" : ""}`
                  : "Selected Members"}
              </>
            )}
          </Button>
          {!canSend && !mutation.isPending && (
            <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
              {selected.size === 0
                ? "Select at least one member"
                : !message.trim()
                ? "Type a message"
                : "Choose at least one channel"}
            </p>
          )}
        </section>

        {/* ── Send error ── */}
        {sendError && (
          <section className="bg-red-950/40 border border-red-800/50 rounded-sm p-4">
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Send failed</p>
            <p className="text-red-300 text-sm">{sendError}</p>
          </section>
        )}

        {/* ── Results ── */}
        {sendResult && (
          <section>
            <div className="bg-green-950/30 border border-green-800/40 rounded-sm p-4 mb-3">
              <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
                Sent to {sendResult.total} member{sendResult.total !== 1 ? "s" : ""}
                {geoActive && (
                  <span className="text-green-400/70 font-normal ml-2">· {geoLabel}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-4 mt-1">
                {channels.email && (
                  <span className="text-sm text-foreground">
                    ✉ Email: <strong className="text-green-400">{sendResult.emailSent} ✓</strong>
                  </span>
                )}
                {channels.sms && (
                  <span className="text-sm text-foreground">
                    📱 SMS: <strong className="text-green-400">{sendResult.smsSent} ✓</strong>
                  </span>
                )}
                {channels.whatsapp && (
                  <span className="text-sm text-foreground">
                    💬 WhatsApp: <strong className="text-green-400">{sendResult.whatsappSent} ✓</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Per-member detail */}
            <div className="border border-border rounded-sm overflow-hidden">
              <div className="bg-secondary/30 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Delivery Detail
                </span>
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {sendResult.results.map((r) => (
                  <div key={r.id} className="px-3 py-2 flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground flex-1 truncate">{r.name}</span>
                    <div className="flex gap-3 shrink-0 text-[11px] font-mono">
                      {r.email && (
                        <span className={statusColor(r.email.status)} title={r.email.error}>
                          ✉{statusIcon(r.email.status)}
                        </span>
                      )}
                      {r.sms && (
                        <span className={statusColor(r.sms.status)} title={r.sms.error}>
                          SMS{statusIcon(r.sms.status)}
                        </span>
                      )}
                      {r.whatsapp && (
                        <span className={statusColor(r.whatsapp.status)} title={r.whatsapp.error}>
                          WA{statusIcon(r.whatsapp.status)}
                        </span>
                      )}
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
