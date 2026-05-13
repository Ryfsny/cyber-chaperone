import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type AdminRole = "national" | "provincial" | "city" | "suburb" | "street";

export interface AdminScope {
  province: string | null;
  city: string | null;
  suburb: string | null;
  street: string | null;
}

interface AuthState {
  authenticated: boolean;
  role: AdminRole;
  displayName: string;
  scope: AdminScope;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return { authenticated: false, role: "national" as AdminRole, displayName: "", scope: { province: null, city: null, suburb: null, street: null } };
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username?: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Login failed.");
      }
      return res.json() as Promise<{ ok: boolean; role: AdminRole; displayName: string; scope: AdminScope }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/auth/me"], {
        authenticated: true,
        role: result.role,
        displayName: result.displayName,
        scope: result.scope ?? { province: null, city: null, suburb: null, street: null },
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], { authenticated: false });
      queryClient.clear();
    },
  });

  return {
    authenticated: data?.authenticated ?? false,
    role: data?.role ?? "national",
    displayName: data?.displayName ?? "",
    scope: data?.scope ?? { province: null, city: null, suburb: null, street: null },
    isNational: (data?.role ?? "national") === "national",
    isLoading,
    login: (username: string | undefined, password: string) => loginMutation.mutateAsync({ username, password }),
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    logout: logoutMutation.mutateAsync,
  };
}
