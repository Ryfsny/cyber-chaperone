import { useState, type FormEvent } from "react";
import { Shield, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { login, loginPending, loginError } = useAuth();
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!password) {
      setLocalError("Please enter the operator password.");
      return;
    }
    try {
      await login(password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Login failed.");
    }
  };

  const handleForgotPassword = async () => {
    setForgotStatus("sending");
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST" });
      setForgotStatus(res.ok ? "sent" : "error");
    } catch {
      setForgotStatus("error");
    }
  };

  const error = localError ?? loginError;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-mono">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-4">
          <img
            src="/eblockwatch-logo.png"
            alt="eblockwatch"
            className="h-10 w-auto object-contain"
          />
          <div className="flex items-center gap-2 text-foreground text-sm font-extrabold uppercase tracking-widest">
            <Shield className="w-4 h-4" />
            Situation Room
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border p-6 space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-widest text-foreground font-bold mb-2">
              Operator Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-background border border-border text-foreground text-sm pl-9 pr-3 py-2 focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loginPending}
            className="w-full bg-primary text-primary-foreground py-2 text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginPending ? "Authenticating…" : "Enter"}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {forgotStatus === "idle" && (
            <button
              onClick={handleForgotPassword}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
            >
              Forgot password? Email it to me
            </button>
          )}
          {forgotStatus === "sending" && (
            <p className="text-xs text-muted-foreground">Sending…</p>
          )}
          {forgotStatus === "sent" && (
            <p className="text-xs text-green-500">Password sent to your Gmail ✓</p>
          )}
          {forgotStatus === "error" && (
            <p className="text-xs text-destructive">Could not send email. Try again.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Restricted access. Operators only.
          </p>
        </div>
      </div>
    </div>
  );
}
