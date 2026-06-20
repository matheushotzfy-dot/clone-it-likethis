import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, X, ChevronDown, ChevronUp } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";

export function FreezeBanner() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
    refetchInterval: 15000,
  });
  const [collapsed, setCollapsed] = useState(false);

  if (!user || !profile?.is_frozen) return null;
  const reason = profile.freeze_reason ?? "Sua conta está congelada. Entre em contato com o suporte.";

  return (
    <div className="sticky top-0 z-40 w-full border-b-2 border-red-500/60 bg-gradient-to-r from-red-950 via-red-900 to-red-950 shadow-lg">
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-4">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="size-4 text-red-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="font-black uppercase tracking-widest text-red-200 text-[11px] sm:text-xs">
                ⚠️ Conta Congelada — Compliance
              </div>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="shrink-0 size-7 rounded-md hover:bg-white/10 flex items-center justify-center text-red-200"
                aria-label={collapsed ? "Expandir" : "Recolher"}
              >
                {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
            </div>
            {!collapsed && (
              <p className="mt-1.5 text-[12px] sm:text-xs text-red-100/95 leading-relaxed whitespace-pre-wrap">
                {reason}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
