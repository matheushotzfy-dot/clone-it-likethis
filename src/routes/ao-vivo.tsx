import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import {
  CatalogPage,
  parseCatalogSearch,
  type CatalogSearch,
} from "@/components/casino/catalog-page";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/ao-vivo")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => parseCatalogSearch(search),
  head: () => ({
    meta: pageMeta(
      "Cassino ao vivo | apostamaxy",
      "Roleta brasileira, Bac Bo, Crazy Time e mesas com crupiê ao vivo.",
    ),
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/ao-vivo" });
  return (
    <SiteShell>
      <CatalogPage
        title="Cassino ao vivo"
        nav="aovivo"
        fixedCategory="live"
        search={search}
        onSearch={(next) => navigate({ search: next, replace: true })}
      />
    </SiteShell>
  );
}
