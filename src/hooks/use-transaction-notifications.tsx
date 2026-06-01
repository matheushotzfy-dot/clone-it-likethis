import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Subscribe to the current user's transaction status changes and surface a toast
 * whenever a deposit or withdrawal is approved/rejected (by the gateway or admin).
 */
export function useTransactionNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const lastSeen = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`tx:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row: any = payload.new;
          if (!row) return;
          const prev = lastSeen.current.get(row.id);
          if (prev === row.status) return;
          lastSeen.current.set(row.id, row.status);

          const amount = `R$ ${Number(row.amount).toFixed(2).replace(".", ",")}`;
          const label = row.type === "deposit" ? "Depósito" : row.type === "withdrawal" ? "Saque" : "Transação";

          if (row.status === "approved" || row.status === "completed") {
            toast.success(`${label} de ${amount} aprovado!`, {
              description: row.type === "deposit" ? "O valor já está disponível no seu saldo." : "Pagamento enviado para sua chave PIX.",
              duration: 8000,
            });
            qc.invalidateQueries({ queryKey: ["my-profile"] });
            qc.invalidateQueries({ queryKey: ["transactions"] });
          } else if (row.status === "rejected" || row.status === "failed") {
            toast.error(`${label} de ${amount} rejeitado`, {
              description: "Verifique seu histórico para mais detalhes.",
              duration: 8000,
            });
            qc.invalidateQueries({ queryKey: ["transactions"] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row: any = payload.new;
          if (!row) return;
          if (row.type === "bonus" && (row.status === "approved" || row.status === "completed")) {
            const amount = `R$ ${Number(row.amount).toFixed(2).replace(".", ",")}`;
            toast.success(`🎁 Bônus de ${amount} creditado!`, {
              description: "Bônus de 100% no primeiro depósito aplicado.",
              duration: 10000,
            });
            qc.invalidateQueries({ queryKey: ["my-profile"] });
            qc.invalidateQueries({ queryKey: ["transactions"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}
