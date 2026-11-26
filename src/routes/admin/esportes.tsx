import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSportsExposure, listSportsBetsAdmin } from "@/lib/admin.functions";
import { settleSportsBetManual, settleSportsNow } from "@/lib/sports.functions";
import {
  Empty,
  ErrorBox,
  Money,
  PageHeader,
  Panel,
  PlayerLink,
  Segmented,
  StatusPill,
  Table,
  Td,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, formatWhen } from "@/lib/format";

type Status = "open" | "settled" | "all";
const PICK: Record<string, string> = { home: "Casa", draw: "Empate", away: "Fora" };

export const Route = createFileRoute("/admin/esportes")({
  head: () => ({ meta: [{ title: "Esportes | admin" }] }),
  component: Page,
});

function Page() {
  const [status, setStatus] = useState<Status>("open");
  const [settling, setSettling] = useState<{ id: string; label: string } | null>(null);
  const qc = useQueryClient();
  const fetchBets = useServerFn(listSportsBetsAdmin);
  const fetchExposure = useServerFn(getSportsExposure);
  const runNow = useServerFn(settleSportsNow);
  const bets = useQuery({
    queryKey: ["admin-sports-bets", status],
    queryFn: () => fetchBets({ data: { status } }),
  });
  const exposure = useQuery({
    queryKey: ["admin-sports-exposure"],
    queryFn: () => fetchExposure(),
  });
  const run = useMutation({
    mutationFn: () => runNow(),
    onSuccess: (r) => {
      toast.success(
        `Conferidas ${r.checked}: ${r.won} ganharam, ${r.lost} perderam, ${r.void} anuladas, ${r.pending} ainda sem resultado.`,
      );
      qc.invalidateQueries({ queryKey: ["admin-sports-bets"] });
      qc.invalidateQueries({ queryKey: ["admin-sports-exposure"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Esportes"
        description="Apostas são liquidadas sozinhas quando a ESPN fecha o placar (tempo normal). Jogo adiado ou cancelado devolve a aposta."
        actions={
          <Button
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="h-10 rounded-[10px] font-bold shadow-none"
          >
            {run.isPending ? <Loader2 className="animate-spin" /> : "Conferir resultados agora"}
          </Button>
        }
      />

      <Panel flush title="Exposição por jogo (apostas abertas)">
        <Table
          rightCols={[2, 3]}
          loading={exposure.isLoading}
          head={[
            "Jogo",
            "Começa",
            "Apostas",
            "Apostado",
            "Paga se casa",
            "Paga se empate",
            "Paga se fora",
          ]}
          empty={
            exposure.data && !exposure.data.length ? <Empty>Nenhuma aposta aberta.</Empty> : null
          }
        >
          {exposure.data?.map((e) => {
            const worst = Math.max(e.payout_home, e.payout_draw, e.payout_away);
            return (
              <tr key={e.event_id}>
                <Td>
                  <span className="font-medium">
                    {e.home} x {e.away}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">{e.league_name}</span>
                </Td>
                <Td>
                  <span className="num text-[13px]">{formatWhen(e.starts_at)}</span>
                </Td>
                <Td right>
                  <span className="num">{Number(e.bets)}</span>
                </Td>
                <Td right>
                  <Money value={e.stakes} />
                </Td>
                {[e.payout_home, e.payout_draw, e.payout_away].map((v, i) => (
                  <Td key={i} right>
                    <Money
                      value={v}
                      className={v === worst && v > e.stakes ? "font-semibold text-[#e8763a]" : ""}
                    />
                  </Td>
                ))}
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Segmented<Status>
        value={status}
        onChange={setStatus}
        options={[
          { id: "open", label: "Abertas" },
          { id: "settled", label: "Liquidadas" },
          { id: "all", label: "Todas" },
        ]}
      />
      {bets.error ? (
        <ErrorBox error={bets.error} onRetry={() => bets.refetch()} />
      ) : (
        <Panel flush>
          <Table
            rightCols={[4, 5, 7]}
            loading={bets.isLoading}
            head={["Feita em", "Jogador", "Jogo", "Palpite", "Aposta", "Retorno", "Situação", ""]}
            empty={bets.data && !bets.data.length ? <Empty>Nenhuma aposta.</Empty> : null}
          >
            {bets.data?.map((b) => (
              <tr key={b.id}>
                <Td>
                  <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
                    {formatDateTime(b.created_at)}
                  </span>
                </Td>
                <Td>
                  <PlayerLink user={b.user} id={b.user_id} />
                </Td>
                <Td>
                  <span className="block max-w-[240px] truncate font-medium">
                    {b.home} x {b.away}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {b.league_name}, {formatWhen(b.starts_at)}
                  </span>
                </Td>
                <Td>
                  {PICK[b.pick]}{" "}
                  <span className="num text-muted-foreground">@{b.odd.toFixed(2)}</span>
                </Td>
                <Td right>
                  <Money value={b.stake} />
                </Td>
                <Td right>
                  <Money
                    value={b.status === "void" ? b.stake : b.potential_payout}
                    className={b.status === "won" ? "font-semibold text-gold" : ""}
                  />
                </Td>
                <Td>
                  <StatusPill status={b.status} />
                  {b.score_home !== null && (
                    <span className="num ml-2 text-[12.5px] text-muted-foreground">
                      {b.score_home}x{b.score_away}
                    </span>
                  )}
                  {b.settled_by && (
                    <span className="block text-[12px] text-muted-foreground">manual</span>
                  )}
                </Td>
                <Td right>
                  {b.status === "open" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shadow-none"
                      onClick={() =>
                        setSettling({ id: b.id, label: `${b.home} x ${b.away}, ${PICK[b.pick]}` })
                      }
                    >
                      Liquidar
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
      <ManualSettle bet={settling} onClose={() => setSettling(null)} />
    </div>
  );
}

function ManualSettle({
  bet,
  onClose,
}: {
  bet: { id: string; label: string } | null;
  onClose: () => void;
}) {
  const settle = useServerFn(settleSportsBetManual);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"won" | "lost" | "void">("lost");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: () =>
      settle({
        data: {
          betId: bet!.id,
          status,
          scoreHome: home === "" ? null : Number(home),
          scoreAway: away === "" ? null : Number(away),
          note: note.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Aposta liquidada.");
      qc.invalidateQueries({ queryKey: ["admin-sports-bets"] });
      qc.invalidateQueries({ queryKey: ["admin-sports-exposure"] });
      onClose();
      setNote("");
      setHome("");
      setAway("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!bet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-[14px] border-border bg-background">
        <DialogTitle className="text-[24px]">Liquidar na mão</DialogTitle>
        <DialogDescription>
          {bet?.label}. Use só quando a ESPN não fechar o resultado. Fica na auditoria.
        </DialogDescription>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { id: "won", label: "Ganhou" },
            { id: "lost", label: "Perdeu" },
            { id: "void", label: "Anular e devolver" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-semibold">Gols casa</span>
            <input
              className="field-input num"
              inputMode="numeric"
              value={home}
              onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-semibold">Gols fora</span>
            <input
              className="field-input num"
              inputMode="numeric"
              value={away}
              onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[13.5px] font-semibold">Motivo</span>
          <input
            className="field-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: jogo não apareceu como encerrado na fonte"
          />
        </label>
        <Button
          disabled={note.trim().length < 3 || m.isPending}
          onClick={() => m.mutate()}
          className="h-11 rounded-[10px] font-bold shadow-none"
        >
          {m.isPending ? <Loader2 className="animate-spin" /> : "Liquidar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
