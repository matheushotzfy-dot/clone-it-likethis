import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, CopyX, Gamepad2, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPFCatalogDiagnostics } from "@/lib/playfivers.functions";

export const Route = createFileRoute("/admin/catalogo")({
  head: () => ({ meta: [
    { title: "Catálogo de jogos — apostaya.bet" },
    { name: "description", content: "Diagnóstico administrativo do catálogo de jogos da apostaya.bet." },
    { property: "og:title", content: "Catálogo de jogos — apostaya.bet" },
    { property: "og:description", content: "Diagnóstico do catálogo de jogos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CatalogPage,
});

function CatalogPage() {
  const getDiagnostics = useServerFn(getPFCatalogDiagnostics);
  const query = useQuery({ queryKey: ["admin-catalog-diagnostics"], queryFn: () => getDiagnostics(), staleTime: 60_000 });
  if (query.isLoading) return <div className="skeleton h-48 rounded-lg" />;
  if (query.error || !query.data) return <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-destructive">Não foi possível conferir o catálogo.</div>;
  const data = query.data;
  const cards = [
    { label: "Provedores ativos", value: data.providers, Icon: Server },
    { label: "Jogos recebidos", value: data.rawGames, Icon: Gamepad2 },
    { label: "Jogos únicos", value: data.uniqueGames, Icon: CheckCircle2 },
    { label: "Duplicados removidos", value: data.duplicatesRemoved, Icon: CopyX },
  ];
  return <div className="max-w-6xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Catálogo de jogos</h1><p className="mt-1 text-sm text-muted-foreground">Conferência direta com a provedora.</p></div><Button onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />Atualizar</Button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ label, value, Icon }) => <div key={label} className="rounded-lg border border-border bg-card p-4"><Icon className="mb-4 size-5 text-primary" /><p className="text-2xl font-extrabold">{value.toLocaleString("pt-BR")}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">{data.providersFailed === 0 ? <CheckCircle2 className="size-5 text-success" /> : <AlertTriangle className="size-5 text-destructive" />}<div><p className="font-bold">{data.providersFailed === 0 ? "Todos os provedores responderam" : `${data.providersFailed} provedor(es) com falha`}</p><p className="text-xs text-muted-foreground">{data.providersLoaded} de {data.providers} carregados · atualizado em {new Date(data.updatedAt).toLocaleString("pt-BR")}</p></div></div>
  </div>;
}