import { Link, useLocation } from "wouter";
import {
  MessageSquare, Plus, Shield, Bot, Radio, Users, BookUser,
  LogOut, Megaphone, MessagesSquare, Home, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/", label: "Situation Room", icon: Shield },
  { href: "/radar", label: "Live Radar", icon: Radio },
  { href: "/messages", label: "Inbox", icon: MessageSquare },
  { href: "/responders", label: "Responders", icon: Users },
  { href: "/members", label: "Members", icon: BookUser },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/broadcast", label: "Broadcast", icon: Megaphone },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [showAi, setShowAi] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const { logout } = useAuth();

  // Close drawers on route change (mobile)
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
          <Link
            href="/trips/new"
            className="w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded"
          >
            <Plus className="w-4 h-4" />
          </Link>
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
          // Desktop: always visible, fixed width
          "md:relative md:flex md:w-64 md:translate-x-0",
          // Mobile: off-canvas drawer
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
        </a>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm uppercase tracking-wider rounded-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* AI toggle — desktop only (mobile has top bar button) */}
          <button
            onClick={() => setShowAi((v) => !v)}
            className={cn(
              "hidden md:flex items-center gap-3 px-3 py-2.5 text-sm uppercase tracking-wider rounded-sm transition-colors w-full text-left",
              showAi
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            <Bot className="w-4 h-4 shrink-0" />
            AI Assistant
          </button>
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/trips/new"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2 text-sm uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </Link>
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

        {/* AI panel — desktop: side column | mobile: full-screen overlay */}
        {showAi && (
          <>
            {/* Mobile full-screen overlay */}
            <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-card">
              <AiAssistant onClose={() => setShowAi(false)} />
            </div>
            {/* Desktop side panel */}
            <div className="hidden md:flex w-80 shrink-0 flex-col overflow-hidden border-l border-border">
              <AiAssistant onClose={() => setShowAi(false)} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
