import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import {
  CatalogPage,
  parseCatalogSearch,
  type CatalogSearch,
} from "@/components/casino/catalog-page";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/slots")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => parseCatalogSearch(search),
  head: () => ({
    meta: pageMeta(
      "Slots | apostamaxy",
      "Fortune Tiger, Gates of Olympus, Sweet Bonanza e os slots mais jogados do Brasil.",
    ),
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/slots" });
  return (
    <SiteShell>
      <CatalogPage
        title="Slots"
        nav="slots"
        fixedCategory="slot"
        search={search}
        onSearch={(next) => navigate({ search: next, replace: true })}
      />
    </SiteShell>
  );
}
