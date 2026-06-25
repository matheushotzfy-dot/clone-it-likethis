import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { toast } from "sonner";

/**
 * Access flow:
 * - Not logged → open register dialog.
 * - Logged but no approved deposit → open deposit dialog.
 * - Deposited → navigate to /slots (real games via PlayFivers).
 */
export function useGameAccess() {
  const { user, loading } = useAuth();
  const { open } = useAuthDialog();
  const navigate = useNavigate();
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
    navigate({ to: "/slots" });
    return true;
  }

  return { hasDeposited, isLogged, tryPlay, loading };
}

/**
 * Page-level gate: blocks the entire route when user cannot access it.
 */
export function useRequireAccess() {
  const { user, loading } = useAuth();
  const { open } = useAuthDialog();
  const fetchProfile = useServerFn(getMyProfile);
  const navigate = useNavigate();
  const [redirected, setRedirected] = useState(false);
  const { data: profile, isLoading: profLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 20_000,
  });

  const allowed = !!user && !!profile?.hasDeposited;

  useEffect(() => {
    if (loading || redirected) return;
    if (!user) {
      setRedirected(true);
      open("register");
      navigate({ to: "/", replace: true });
      return;
    }
    if (!profLoading && profile && !profile.hasDeposited) {
      setRedirected(true);
      open("deposit");
      navigate({ to: "/", replace: true });
      toast.info("Faça um depósito para liberar os jogos.");
      return;
    }
  }, [user, loading, profile, profLoading, open, navigate, redirected]);

  return { allowed, loading: loading || profLoading };
}
