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

export const Route = createFileRoute("/_authenticated/deposito")({
  head: () => ({ meta: [{ title: "Depósito — PIXBET" }] }),
  component: Page,
});

const quick = [20, 50, 100, 200, 500, 1000];

function Page() {
  const [amount, setAmount] = useState(50);
  const create = useServerFn(createTransaction);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => create({ data: { type: "deposit", amount } }),
    onSuccess: () => {
      toast.success(`Depósito de R$ ${amount} registrado (mock). Aguarde confirmação do PIX.`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteShell>
      <div className="max-w-2xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold">💵 Depositar via PIX</h1>
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              min={10}
              max={50000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 bg-surface-2 text-2xl font-bold h-14"
            />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {quick.map((q) => (
              <Button key={q} variant={amount === q ? "default" : "outline"} size="sm" onClick={() => setAmount(q)}>
                R$ {q}
              </Button>
            ))}
          </div>
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <div className="size-32 mx-auto bg-foreground grid grid-cols-8 gap-px p-2 rounded">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className={`aspect-square ${Math.random() > 0.5 ? "bg-background" : "bg-foreground"}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">QR Code de demonstração — escaneie com seu app bancário</p>
          </div>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || amount < 10} className="w-full font-bold h-12">
            {mut.isPending ? "Processando..." : `Confirmar Depósito de R$ ${amount}`}
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
