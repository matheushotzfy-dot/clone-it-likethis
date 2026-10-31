import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Calendar, Users, ArrowRight, Gift, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/torneios")({
  head: () => ({ meta: pageMeta('Torneios — apostamaxy', 'Participe dos nossos torneios exclusivos e ganhe prêmios incríveis.') }),
  component: TorneiosPage,
});

function TorneiosPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title text-2xl md:text-3xl flex items-center gap-3">
            <Trophy className="size-8 text-gold" />
            Torneios
          </h1>
          <p className="mt-2 text-muted-foreground">
            Competições exclusivas com premiações em dinheiro.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="aspect-[21/9] bg-gradient-to-br from-brand to-brand-2 relative flex items-center justify-center">
            <Trophy className="size-16 text-gold/20 absolute" />
            <div className="relative z-10 text-center">
              <div className="badge-chip bg-gold text-black mb-2">Em Destaque</div>
              <h3 className="text-xl font-black uppercase italic">Grand Slam de Slots</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Timer className="size-4 text-primary" />
                Termina em: 2d 14h
              </div>
              <div className="text-gold font-black text-lg">R$ 50.000</div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Jogue em qualquer slot da PG Soft para acumular pontos e subir no ranking.
            </p>
            <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase text-sm slick cta-glow">
              Participar Agora
            </button>
          </div>
        </div>

        <div className="panel flex flex-col items-center justify-center p-12 text-center border-dashed border-white/10 opacity-60">
          <Calendar className="size-12 text-muted-foreground mb-4" />
          <h3 className="font-bold">Novos torneios em breve</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Fique atento às nossas comunicações para não perder nenhuma oportunidade.
          </p>
        </div>
      </div>
    </div>
  );
}
