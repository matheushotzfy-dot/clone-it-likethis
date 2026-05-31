import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";

/**
 * Lightweight access hook.
 * - Not logged in → open login dialog.
 * - Logged in → proceed (no deposit gate, no lock icons).
 */
export function useGameAccess() {
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const hasDeposited = !!profile?.hasDeposited;
  const isLogged = !!user;

  function tryPlay(_label?: string) {
    if (!isLogged) {
      open("login");
      return false;
    }
    return true;
  }

  return { hasDeposited, isLogged, tryPlay };
}
