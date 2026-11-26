import { Link } from "@tanstack/react-router";
import { useProviders, type LobbyProvider } from "@/hooks/use-games";
import { SectionHeading } from "./game-section";
import { cn } from "@/lib/utils";

/** Cartão de provedor com três capas em leque. Leva ao catálogo filtrado. */
export function ProviderCard({ p }: { p: LobbyProvider }) {
  return (
    <Link
      to="/cassino"
      search={{ provedor: p.name } as never}
      className="provider-card"
      aria-label={`${p.name}, ${p.games} jogos`}
    >
      {p.covers.length > 0 && (
        <span className="provider-fan" aria-hidden>
          {p.covers.slice(0, 3).map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              width={46}
              height={61}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ))}
        </span>
      )}
      <span className="relative block truncate font-display text-[17px] font-bold leading-tight md:text-[18px]">
        {p.name}
      </span>
      <span className="num relative text-[12.5px] text-muted-foreground">
        {p.games.toLocaleString("pt-BR")} {p.games === 1 ? "jogo" : "jogos"}
      </span>
    </Link>
  );
}

export const PROVIDER_GRID =
  "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-6";

/** Provedores no fim da página inicial: os maiores primeiro, com link para todos. */
export function ProviderStrip({ limit = 12, className }: { limit?: number; className?: string }) {
  const { data } = useProviders();
  if (!data?.length) return null;
  return (
    <section aria-label="Provedores" className={className}>
      <SectionHeading
        title="Provedores"
        to={data.length > limit ? "/provedores" : undefined}
        linkLabel={`Ver os ${data.length}`}
        extra={
          <span className="num hidden text-[13px] text-muted-foreground sm:inline">
            {data.length} estúdios
          </span>
        }
      />
      <div className={cn(PROVIDER_GRID)}>
        {data.slice(0, limit).map((p) => (
          <ProviderCard key={p.name} p={p} />
        ))}
      </div>
    </section>
  );
}
