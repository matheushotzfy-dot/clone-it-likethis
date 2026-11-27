import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/promocoes")({
  head: () => ({
    meta: pageMeta("Promoções | apostamaxy", "Promoções e condições da apostamaxy."),
  }),
  component: Page,
});

const POINTS = [
  {
    title: "Seu saldo é só seu",
    body: "Sem bônus com rollover escondido: o que você deposita e ganha pode ser sacado.",
  },
  {
    title: "Pix nos dois sentidos",
    body: "Depósito confirmado em segundos e saque direto na chave CPF do titular.",
  },
  {
    title: "Jogos dos provedores oficiais",
    body: "PG Soft, Pragmatic Play, Evolution e outros, com o RTP definido pelo próprio provedor.",
  },
];

function Page() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-[900px] space-y-6 px-3 py-6 md:px-6 md:py-10">
        <h1 className="text-[24px] sm:text-[32px] md:text-[38px]">Promoções</h1>
        <div className="rounded-[14px] border border-border bg-surface px-6 py-8">
          <p className="font-display text-[24px] font-bold">Nenhuma promoção ativa no momento</p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Promoções novas aparecem aqui com todas as regras escritas por extenso.
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title} className="rounded-[14px] border border-border bg-surface p-5">
              <p className="font-display text-[20px] font-bold">{p.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 font-bold text-primary-foreground"
        >
          Ir para o cassino
        </Link>
      </div>
    </SiteShell>
  );
}
