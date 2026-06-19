import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, PartyPopper, X } from "lucide-react";
import { listMyTransactions } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";

type Tx = { id: string; type: string; status: string; amount: number; created_at: string };

const SHOWN_KEY = "withdrawal_shown_ids";
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // notify if approved in last 24h and not yet shown

function loadShown(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}
function saveShown(set: Set<string>) {
  try {
    // keep at most 200 ids
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export function WithdrawalWatcher() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchTxs = useServerFn(listMyTransactions);
  const shownRef = useRef<Set<string>>(new Set());
  const [approved, setApproved] = useState<Tx | null>(null);

  useEffect(() => {
    shownRef.current = loadShown();
  }, [user?.id]);

  const { data: txs } = useQuery({
    queryKey: ["my-tx-watcher", user?.id],
    queryFn: () => fetchTxs(),
    enabled: !!user,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!txs || !user) return;
    const list = txs as Tx[];
    const now = Date.now();
    // Find the most recent approved withdrawal in the last 24h that we haven't shown yet
    const candidate = list.find(
      (t) =>
        t.type === "withdrawal" &&
        t.status === "approved" &&
        !shownRef.current.has(t.id) &&
        now - new Date(t.created_at).getTime() <= RECENT_WINDOW_MS,
    );
    if (candidate) {
      shownRef.current.add(candidate.id);
      saveShown(shownRef.current);
      setApproved(candidate);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    }
  }, [txs, qc, user]);

  if (!user) return null;

  return (
    <Dialog open={!!approved} onOpenChange={(o) => !o && setApproved(null)}>
      <DialogContent className="max-w-md bg-gradient-to-br from-brand via-brand-2 to-brand border-2 border-primary p-0 overflow-hidden">
        <button
          onClick={() => setApproved(null)}
          className="absolute right-4 top-4 z-10 size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        >
          <X className="size-4" />
        </button>
        <div className="relative overflow-hidden">
          <div className="absolute -top-16 -left-16 size-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 size-48 rounded-full bg-green-500/20 blur-3xl" />
          <div className="relative px-8 py-10 text-center space-y-5">
            <div className="mx-auto size-20 rounded-full bg-gradient-to-br from-primary to-yellow-400 flex items-center justify-center shadow-2xl shadow-primary/50 animate-pulse">
              <CheckCircle2 className="size-12 text-primary-foreground" strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <PartyPopper className="size-4" /> Pagamento Liberado
              </div>
              <h2 className="text-3xl font-black text-white">Saque Aprovado!</h2>
              <p className="text-white/70 text-sm">Seu PIX foi enviado e cairá na sua conta em instantes.</p>
            </div>
            <div className="bg-black/40 rounded-2xl p-5 border border-primary/30">
              <div className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-1">Valor recebido</div>
              <div className="text-4xl font-black text-primary">
                R$ {Number(approved?.amount ?? 0).toFixed(2).replace(".", ",")}
              </div>
            </div>
            <button
              onClick={() => setApproved(null)}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider hover:brightness-110 transition-all"
            >
              Continuar Jogando
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
