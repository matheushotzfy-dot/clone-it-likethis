import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-account";
import { formatDate } from "@/lib/format";

/** Conta suspensa pelo admin ou em autoexclusão: o jogador vê o motivo e o que ainda pode fazer. */
export function FreezeBanner() {
  const { user } = useAuth();
  const wallet = useWallet();
  if (!user || !wallet.data) return null;
  const { frozen, freezeReason, selfExcludedUntil } = wallet.data;
  if (!frozen && !selfExcludedUntil) return null;
  return (
    <div role="alert" className="border-b border-destructive/40 bg-destructive/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-[1600px] items-start gap-2.5 text-[13.5px]">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        {frozen ? (
          <p>
            <strong className="font-semibold">Conta suspensa.</strong>{" "}
            {freezeReason || "Fale com o suporte para entender o motivo."} Seu saldo continua
            disponível para saque.
          </p>
        ) : (
          <p>
            <strong className="font-semibold">
              Autoexclusão ativa até {formatDate(selfExcludedUntil)}.
            </strong>{" "}
            Apostas e depósitos ficam bloqueados até lá. Saques continuam liberados.
          </p>
        )}
      </div>
    </div>
  );
}
