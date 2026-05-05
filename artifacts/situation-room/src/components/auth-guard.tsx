import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/login";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono">
        <span className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse">
          Checking access…
        </span>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
