import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo de jogos | admin" }] }),
  component: () => <p className="text-muted-foreground">Catálogo em atualização.</p>,
});
