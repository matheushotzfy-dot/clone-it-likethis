import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { toast } from "sonner";

/**
 * Strict access:
 * - Not logged → open register dialog.
 * - Logged but no approved deposit → open deposit dialog.
 * - Deposited (bonus ativo) → toast "bônus só para saque".
 */
export function useGameAccess() {
  const { user, loading } = useAuth();
  const { open } = useAuthDialog();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 20_000,
  });

  const hasDeposited = !!profile?.hasDeposited;
  const isLogged = !!user;

  function tryPlay(_label?: string) {
    if (!isLogged) { open("register"); return false; }
    if (!hasDeposited) { open("deposit"); return false; }
    toast.info("Seu bônus é válido apenas para saque. Faça um depósito real para liberar os jogos.", {
      duration: 5000,
    });
    return false;
  }

  return { hasDeposited, isLogged, tryPlay, loading };
}

/**
 * Page-level gate: blocks the entire route when user cannot access it.
 * Use inside route components to redirect home + open required dialog.
 */
export function useRequireAccess() {
  const { user, loading } = useAuth();
  const { open } = useAuthDialog();
  const fetchProfile = useServerFn(getMyProfile);
  const navigate = useNavigate();
  const { data: profile, isLoading: profLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 20_000,
  });

  const allowed = !!user && !!profile?.hasDeposited;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      open("register");
      navigate({ to: "/", replace: true });
      return;
    }
    if (!profLoading && profile && !profile.hasDeposited) {
      open("deposit");
      navigate({ to: "/", replace: true });
      return;
    }
    if (!profLoading && profile?.hasDeposited) {
      // Deposited but bonus active — block with message and redirect
      toast.info("Bônus liberado apenas para saque. Os jogos abrem após depósito real.", { duration: 5000 });
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, profile, profLoading, open, navigate]);

  return { allowed, loading: loading || profLoading };
}
