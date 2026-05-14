import { Link, useLocation } from "wouter";
import {
  Plus, Shield, Bot, Users, BookUser,
  LogOut, Megaphone, MessagesSquare, Menu, X,
  LayoutDashboard, Map, ScrollText, Send, ShieldCheck, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface QueueItem { status: string }

function usePendingApprovals(isNational: boolean) {
  return useQuery<QueueItem[]>({
    queryKey: ["/api/broadcast-queue"],
    queryFn: async () => {
      const res = await fetch("/api/broadcast-queue", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isNational,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [showAi, setShowAi] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const { logout, isNational, role, displayName, scope } = useAuth();
  const { data: queueItems = [] } = usePendingApprovals(isNational);
  const pendingCount = queueItems.filter(i => i.status === "pending").length;

  const navItems = [
    {
      href: "/",
      label: "Live Trips",
      sub: "Watch live member journeys",
      icon: LayoutDashboard,
      show: true,
    },
    {
      href: "/conversations",
      label: "WhatsApp & Messenger",
      sub: "Chat with individual members",
      icon: MessagesSquare,
      show: isNational,
    },
    {
      href: "/members",
      label: "Members",
      sub: role === "national" ? "All 92 000 members" : scopeSub(role, scope),
      icon: BookUser,
      show: true,
    },
    {
      href: "/broadcast",
      label: "Broadcast",
      sub: "Send message to all members",
      icon: Megaphone,
      show: isNational,
    },
    {
      href: "/conversations",
      label: "Direct Send",
      sub: "Pick members · Email/SMS/WhatsApp",
      icon: Send,
      show: true,
    },
    {
      href: "/admin/approvals",
      label: "Broadcast Approvals",
      sub: "Approve pending alerts",
      icon: Clock,
      show: true,
      badge: isNational && pendingCount > 0 ? pendingCount : 0,
    },
    {
      href: "/radar",
      label: "Network Map",
      sub: "See where your members are",
      icon: Map,
      show: isNational,
    },
    {
      href: "/messages",
      label: "Message Log",
      sub: "All sent and received messages",
      icon: ScrollText,
      show: isNational,
    },
    {
      href: "/responders",
      label: "Responders",
      sub: "eblockwatch field network",
      icon: Users,
      show: isNational,
    },
    {
      href: "/admin/admins",
      label: "Admin Management",
      sub: "Manage community admins",
      icon: ShieldCheck,
      show: isNational,
    },
  ].filter(i => i.show);

  useEffect(() => {
    setShowNav(false);
    setShowAi(false);
  }, [location]);

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-mono">

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-card border-b border-border flex items-center px-3 gap-2">
        <button
          onClick={() => { setShowNav((v) => !v); setShowAi(false); }}
          className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Menu"
        >
          {showNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <img src="/eblockwatch-logo.png" alt="eblockwatch" className="h-6 w-auto object-contain" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Situation Room</span>
        <div className="ml-auto flex items-center gap-1">
          {isNational && (
            <button
              onClick={() => { setShowAi((v) => !v); setShowNav(false); }}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded transition-colors",
                showAi ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="AI Assistant"
            >
              <Bot className="w-4 h-4" />
            </button>
          )}
          {isNational && (
            <Link
              href="/trips/new"
              className="w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded"
            >
              <Plus className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Mobile nav overlay backdrop ────────────────────────────────── */}
      {showNav && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setShowNav(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "md:relative md:flex md:w-64 md:translate-x-0",
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-card border-r border-border shrink-0 transition-transform duration-200",
          showNav ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo */}
        <a
          href="/website/"
          className="h-16 flex items-center px-5 border-b border-border hover:bg-secondary/50 transition-colors group"
          title="Go to eblockwatch website"
        >
          <img
            src="/eblockwatch-logo.png"
            alt="eblockwatch"
            className="h-8 w-auto object-contain"
          />
          <div className="ml-3">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold leading-none">Cyber Chaperone</p>
            <p className="text-[9px] uppercase tracking-widest text-primary font-bold leading-none mt-0.5">Situation Room</p>
          </div>
        </a>

        {/* Logged-in admin identity */}
        {displayName && (
          <div className="px-5 py-2 border-b border-border bg-secondary/20">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[10px] font-bold text-foreground truncate">{displayName}</span>
            </div>
            {!isNational && (
              <p className="text-[9px] text-muted-foreground mt-0.5 capitalize">
                {role} admin
                {scope.province && ` · ${scope.province}`}
                {scope.city && ` › ${scope.city}`}
                {scope.suburb && ` › ${scope.suburb}`}
              </p>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 rounded-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("text-xs uppercase tracking-wider font-bold leading-tight", active ? "text-primary-foreground" : "text-foreground")}>
                      {item.label}
                    </div>
                    {(item as { badge?: number }).badge != null && (item as { badge?: number }).badge! > 0 && (
                      <span className="bg-yellow-500 text-yellow-950 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                        {(item as { badge?: number }).badge}
                      </span>
                    )}
                  </div>
                  <div className={cn("text-[10px] leading-tight mt-0.5", active ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                    {item.sub}
                  </div>
                </div>
              </Link>
            );
          })}

          {/* AI toggle — national only */}
          {isNational && (
            <button
              onClick={() => setShowAi((v) => !v)}
              className={cn(
                "hidden md:flex items-start gap-3 px-3 py-2.5 rounded-sm transition-colors w-full text-left",
                showAi
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Bot className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className={cn("text-xs uppercase tracking-wider font-bold leading-tight", showAi ? "text-primary-foreground" : "text-foreground")}>
                  AI Assistant
                </div>
                <div className={cn("text-[10px] leading-tight mt-0.5", showAi ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                  Arnie — trip analysis & alerts
                </div>
              </div>
            </button>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-2">
          {isNational && (
            <Link
              href="/trips/new"
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2 text-sm uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </Link>
          )}
          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-2 w-full border border-border text-muted-foreground py-2 text-xs uppercase tracking-widest hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Lock
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 flex min-w-0 overflow-hidden pt-12 md:pt-0">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>

        {showAi && isNational && (
          <>
            <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-card">
              <AiAssistant onClose={() => setShowAi(false)} />
            </div>
            <div className="hidden md:flex w-80 shrink-0 flex-col overflow-hidden border-l border-border">
              <AiAssistant onClose={() => setShowAi(false)} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function scopeSub(role: string, scope: { province: string | null; city: string | null; suburb: string | null }): string {
  if (scope.suburb) return `${scope.suburb} members only`;
  if (scope.city) return `${scope.city} members only`;
  if (scope.province) return `${scope.province} members only`;
  return "Scoped registry";
}
