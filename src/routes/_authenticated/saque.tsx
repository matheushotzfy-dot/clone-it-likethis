import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AccountLayout, Section } from "@/components/account/account-layout";
import { PaymentRow } from "@/components/account/payment-row";
import { Button } from "@/components/ui/button";
import { listMyPayments, requestWithdrawal } from "@/lib/wallet.functions";
import { useProfile, useRefreshMoney, useWallet } from "@/hooks/use-account";
import { formatBRL, newRequestId, parseBRL } from "@/lib/format";
import { maskCPF } from "@/lib/validations";
import { pageMeta } from "@/lib/page-meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/saque")({
  head: () => ({
    meta: pageMeta("Sacar | apostamaxy", "Saque por Pix para a chave CPF do titular da conta."),
  }),
  component: Page,
});

function Page() {
  const wallet = useWallet();
  const profile = useProfile();
  const refresh = useRefreshMoney();
  const request = useServerFn(requestWithdrawal);
  const fetchPayments = useServerFn(listMyPayments);
  const payments = useQuery({ queryKey: ["payments"], queryFn: () => fetchPayments() });
  const [raw, setRaw] = useState("");
  // Um id por tentativa: clique duplo manda o mesmo id e não cria dois saques.
  const [requestId, setRequestId] = useState(newRequestId);

  const w = wallet.data;
  const amount = parseBRL(raw);
  const min = w?.limits.minWithdraw ?? 50;
  const max = Math.min(w?.limits.maxWithdraw ?? 5000, w?.balance ?? 0);
  const fee = w?.limits.withdrawFeePct ? Math.round(amount * w.limits.withdrawFeePct) / 100 : 0;
  const error =
    amount > 0 && amount < min
      ? `O saque mínimo é ${formatBRL(min)}.`
      : amount > (w?.balance ?? 0)
        ? "O valor passa do seu saldo."
        : amount > (w?.limits.maxWithdraw ?? Infinity)
          ? `O saque máximo é ${formatBRL(w?.limits.maxWithdraw)}.`
          : null;

  const withdrawals = useMemo(
    () => (payments.data ?? []).filter((p) => p.type === "withdrawal"),
    [payments.data],
  );

  const submit = useMutation({
    mutationFn: () => request({ data: { amount, requestId } }),
    onSuccess: () => {
      toast.success(`Saque de ${formatBRL(amount)} solicitado`, {
        description: "O valor foi reservado e você recebe o Pix assim que for aprovado.",
      });
      setRaw("");
      setRequestId(newRequestId());
      refresh();
      payments.refetch();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setRequestId(newRequestId());
    },
  });

  const cpf = profile.data?.cpf;
  const disabled = !w?.realMoney && !w?.testPayments;

  return (
    <AccountLayout
      title="Sacar"
      aside={
        <Section title="Como funciona">
          <ol className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">1. Você pede o saque.</span> O valor
              sai do saldo na hora e fica reservado.
            </li>
            <li>
              <span className="font-semibold text-foreground">2. A gente confere.</span> Em alguns
              casos pedimos uma foto do documento antes de liberar.
            </li>
            <li>
              <span className="font-semibold text-foreground">3. O Pix cai na sua conta.</span>{" "}
              Sempre na chave CPF do titular. Se o saque for recusado, o valor volta para o saldo.
            </li>
          </ol>
        </Section>
      }
    >
      <div className="space-y-4">
        <Section title="Novo saque">
          {disabled ? (
            <p className="rounded-[10px] border border-border bg-background p-4 text-[14.5px] text-muted-foreground">
              A plataforma está em homologação e ainda não faz saques com dinheiro real.
            </p>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!error && amount > 0) submit.mutate();
              }}
            >
              {w?.testPayments && (
                <p className="rounded-[10px] border border-dashed border-border bg-background px-3 py-2.5 text-[13px]">
                  <strong className="font-semibold">Modo de teste.</strong> O saque usa o saldo de
                  teste e não envia Pix de verdade. O admin aprova ou recusa pela fila de saques.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[10px] border border-border bg-background p-3.5">
                  <p className="text-[13px] text-muted-foreground">Disponível para saque</p>
                  <p className="num font-display text-[26px] font-bold">{formatBRL(w?.balance)}</p>
                </div>
                <div className="rounded-[10px] border border-border bg-background p-3.5">
                  <p className="text-[13px] text-muted-foreground">Chave Pix (CPF)</p>
                  <p className="num mt-1 text-[16px] font-semibold">
                    {cpf ? maskCPF(cpf) : "Sem CPF cadastrado"}
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[13.5px] font-semibold">Valor do saque</span>
                <span
                  className={cn(
                    "flex h-[64px] items-center rounded-[12px] border bg-background px-4 focus-within:border-primary",
                    error ? "border-destructive" : "border-input",
                  )}
                >
                  <span className="mr-2 font-display text-[24px] font-bold text-muted-foreground">
                    R$
                  </span>
                  <input
                    value={raw}
                    onChange={(e) => setRaw(e.target.value.replace(/[^\d,]/g, ""))}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="num w-full min-w-0 bg-transparent font-display text-[34px] font-bold outline-none placeholder:text-muted-foreground/50"
                  />
                  {max >= min && (
                    <button
                      type="button"
                      onClick={() => setRaw(String(max).replace(".", ","))}
                      className="shrink-0 rounded-[8px] border border-border px-3 py-1.5 text-[13px] font-semibold hover:border-primary"
                    >
                      Tudo
                    </button>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1.5 block text-[13px]",
                    error ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {error ??
                    `Entre ${formatBRL(min)} e ${formatBRL(w?.limits.maxWithdraw)} por saque.${fee ? ` Taxa de ${w?.limits.withdrawFeePct}%: ${formatBRL(fee)}.` : ""}`}
                </span>
              </label>

              {!cpf ? (
                <p className="text-[14px] text-muted-foreground">
                  Cadastre seu CPF em{" "}
                  <Link to="/perfil" className="text-primary underline">
                    Minha conta
                  </Link>{" "}
                  para sacar.
                </p>
              ) : (
                <Button
                  type="submit"
                  disabled={submit.isPending || !!error || amount <= 0}
                  className="h-12 w-full rounded-[10px] text-[16px] font-bold shadow-none sm:w-auto sm:px-8"
                >
                  {submit.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : amount > 0 ? (
                    `Sacar ${formatBRL(amount)}`
                  ) : (
                    "Informe o valor"
                  )}
                </Button>
              )}
            </form>
          )}
        </Section>

        <Section title="Seus saques">
          {payments.isLoading ? (
            <div className="skeleton h-24 rounded-[10px]" />
          ) : withdrawals.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">Você ainda não fez nenhum saque.</p>
          ) : (
            <ul className="divide-y divide-border">
              {withdrawals.map((t) => (
                <PaymentRow key={t.id} payment={t} />
              ))}
            </ul>
          )}
        </Section>
      </div>
    </AccountLayout>
  );
}
