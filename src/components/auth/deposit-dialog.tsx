import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuthDialog } from "./auth-dialog-context";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const presets = [
  { v: 20 }, { v: 50, hot: true }, { v: 100 },
  { v: 250, hot: true }, { v: 500 }, { v: 1000, hot: true },
];

export function DepositDialog() {
  const { current, close } = useAuthDialog();
  const [amount, setAmount] = useState(500);

  return (
    <Dialog open={current === "deposit"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[520px] bg-popover border-white/10 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={close} className="size-8 rounded hover:bg-white/10 flex items-center justify-center">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">Depositar</h2>
            <p className="text-sm text-white/60">Adicione saldo à sua conta</p>
          </div>
        </div>

        <button className="h-14 px-4 rounded-lg bg-brand-2 border border-primary/30 flex items-center gap-3 mb-5">
          <span className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">P</span>
          <span className="text-2xl font-bold italic tracking-tight">pix</span>
        </button>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-white/70 mb-1 block">Método de Pagamento</label>
            <div className="h-11 px-3 rounded-lg bg-brand-2 text-white/60 flex items-center text-sm">PIX</div>
          </div>
          <div>
            <label className="text-xs text-white/70 mb-1 block">Depósito Mínimo</label>
            <div className="h-11 px-3 rounded-lg bg-brand-2 text-white/60 flex items-center text-sm">R$ 5</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Valor a ser depositado:</span>
          <button className="text-xs text-accent hover:underline">Possui cupom?</button>
        </div>
        <div className="relative mb-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-12 pl-3 pr-16 rounded-lg bg-brand-2 border border-white/10 text-white text-lg font-semibold focus:outline-none focus:border-primary"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/70 flex items-center gap-1">
            🇧🇷 BRL
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {presets.map((p) => (
            <button
              key={p.v}
              onClick={() => setAmount(p.v)}
              className={`relative h-14 rounded-lg font-bold text-accent border-2 transition-all ${amount === p.v ? "border-primary bg-brand-2" : "border-white/10 bg-brand-2/60 hover:border-white/30"}`}
            >
              R$ {p.v.toLocaleString("pt-BR")}
              {p.hot && <span className="absolute -top-2 -right-1 text-[10px] font-bold bg-yellow-400 text-black px-1.5 rounded">HOT</span>}
            </button>
          ))}
        </div>

        <button
          onClick={() => { toast.success(`Pix de R$ ${amount} gerado (mock)`); close(); }}
          className="w-full h-12 rounded-lg bg-accent text-white font-bold uppercase hover:brightness-110"
        >
          Depositar
        </button>
      </DialogContent>
    </Dialog>
  );
}
