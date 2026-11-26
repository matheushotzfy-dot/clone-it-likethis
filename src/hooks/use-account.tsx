import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyWallet } from "@/lib/wallet.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { getPublicSettings } from "@/lib/settings.functions";

export function usePublicSettings() {
  const fetchSettings = useServerFn(getPublicSettings);
  return useQuery({
    queryKey: ["public-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 30_000,
  });
}

export function useWallet(options?: { poll?: boolean }) {
  const { user } = useAuth();
  const fetchWallet = useServerFn(getMyWallet);
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(),
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: options?.poll ? 5_000 : false,
  });
}

export function useProfile() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getMyProfile);
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

/** Tudo que mostra saldo ou movimentação é recarregado junto. */
export function useRefreshMoney() {
  const qc = useQueryClient();
  return useCallback(() => {
    for (const key of [
      "wallet",
      "my-profile",
      "ledger",
      "payments",
      "casino-rounds",
      "sports-bets",
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  }, [qc]);
}
