import { Link, useLocation } from "wouter";
import { Activity, MessageSquare, Plus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Situation Room", icon: Shield },
    { href: "/messages", label: "Inbox", icon: MessageSquare },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-mono">
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="w-5 h-5" />
            <span className="font-bold tracking-wider uppercase text-sm">Chaperone</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm uppercase tracking-wider rounded-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Link
            href="/trips/new"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2 text-sm uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </Link>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
