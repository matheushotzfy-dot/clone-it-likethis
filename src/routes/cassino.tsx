import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import {
  CatalogPage,
  parseCatalogSearch,
  type CatalogSearch,
} from "@/components/casino/catalog-page";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/cassino")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => parseCatalogSearch(search),
  head: () => ({
    meta: pageMeta(
      "Cassino: todos os jogos | apostamaxy",
      "Slots, crash e mesas ao vivo dos provedores oficiais, com busca por nome e provedor.",
    ),
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/cassino" });
  const title =
    search.cat === "crash"
      ? "Crash"
      : search.cat === "table"
        ? "Mesas"
        : search.cat === "slot"
          ? "Slots"
          : search.cat === "live"
            ? "Ao vivo"
            : "Todos os jogos";
  return (
    <SiteShell>
      <CatalogPage
        title={title}
        nav={search.cat === "crash" ? "crash" : "todos"}
        search={search}
        onSearch={(next) => navigate({ search: next, replace: true })}
      />
    </SiteShell>
  );
}
