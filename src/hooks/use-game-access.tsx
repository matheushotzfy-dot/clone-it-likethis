import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

/**
 * Gating rule:
 * - Not logged in → open login
 * - Logged in, no approved deposit → open deposit dialog
 * - Logged in, has deposit → toast: bônus só vale para saque
 */
export function useGameAccess() {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  const hasDeposited = !!profile?.hasDeposited;
  const isLogged = !!user;

  function tryPlay(label?: string) {
    if (!isLogged) {
      open("login");
      return false;
    }
    if (!hasDeposited) {
      toast.info("Faça seu primeiro depósito para liberar os jogos", {
        description: "Ganhe 100% de bônus nos primeiros 10 minutos!",
      });
      open("deposit");
      return false;
    }
    toast.warning("Bônus liberado apenas para saque", {
      description: label
        ? `${label} indisponível: o bônus de boas-vindas é válido somente para saque.`
        : "O bônus de boas-vindas é válido somente para saque. Jogos não liberados.",
    });
    return false;
  }

  return { hasDeposited, isLogged, tryPlay };
}
