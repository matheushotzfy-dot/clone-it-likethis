import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRefreshMoney } from "@/hooks/use-account";
import { formatBRL } from "@/lib/format";

/**
 * Escuta mudanças de status nos depósitos e saques do jogador e avisa na hora,
 * seja aprovação do gateway ou decisão do admin.
 */
export function useTransactionNotifications() {
  const { user } = useAuth();
  const refresh = useRefreshMoney();
  const lastSeen = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`tx:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            type: string;
            status: string;
            amount: number;
            description?: string | null;
          };
          if (!row || lastSeen.current.get(row.id) === row.status) return;
          lastSeen.current.set(row.id, row.status);
          const amount = formatBRL(row.amount);

          if (row.type === "deposit" && row.status === "approved") {
            toast.success(`Depósito de ${amount} confirmado`, {
              description: "O valor já está no seu saldo.",
              duration: 8000,
            });
          } else if (row.type === "withdrawal" && row.status === "approved") {
            toast.success(`Saque de ${amount} enviado`, {
              description: "O Pix foi enviado para a sua chave CPF.",
              duration: 8000,
            });
          } else if (
            row.type === "withdrawal" &&
            (row.status === "rejected" || row.status === "cancelled")
          ) {
            const reason = row.description?.split(" — Motivo: ")[1];
            toast.error(`Saque de ${amount} recusado`, {
              description: `${reason ? `${reason}. ` : ""}O valor voltou para o seu saldo.`,
              duration: 10000,
            });
          } else if (row.type === "deposit" && row.status === "rejected") {
            toast.error(`Depósito de ${amount} não foi concluído`, { duration: 8000 });
          }
          refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);
}
