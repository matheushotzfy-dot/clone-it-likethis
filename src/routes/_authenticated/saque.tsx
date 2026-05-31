import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction } from "@/lib/profile.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saque")({
  head: () => ({ meta: [{ title: "Saque — PIXBET" }] }),
  component: Page,
});

function Page() {
  const [amount, setAmount] = useState(50);
  const [pixKey, setPixKey] = useState("");
  const create = useServerFn(createTransaction);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => create({ data: { type: "withdrawal", amount, pix_key: pixKey } }),
    onSuccess: () => {
      toast.success("Saque solicitado! Processamento em até 24h.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setAmount(50); setPixKey("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteShell>
      <div className="max-w-2xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold">💸 Sacar via PIX</h1>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!pixKey) return toast.error("Informe sua chave PIX"); mut.mutate(); }}
          className="bg-surface border border-border rounded-2xl p-6 space-y-5"
        >
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" min={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 bg-surface-2 text-2xl font-bold h-14" />
          </div>
          <div>
            <Label>Chave PIX</Label>
            <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" className="mt-1 bg-surface-2" />
          </div>
          <div className="bg-surface-2 rounded-lg p-3 text-xs text-muted-foreground">
            ℹ️ Saques são processados em até 24h após confirmação. Saque mínimo: R$ 10.
          </div>
          <Button type="submit" disabled={mut.isPending} className="w-full font-bold h-12">
            {mut.isPending ? "Solicitando..." : `Solicitar Saque de R$ ${amount}`}
          </Button>
        </form>
      </div>
    </SiteShell>
  );
}
