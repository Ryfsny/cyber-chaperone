import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AuthState {
  authenticated: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return { authenticated: false };
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Login failed.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], { authenticated: true });
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
    isLoading,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    logout: logoutMutation.mutateAsync,
  };
}
