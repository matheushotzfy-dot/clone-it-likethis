import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/indique-amigos")({
  head: () => ({ meta: [{ title: "Indique Amigos — apostamaxy" }, { property: "og:title", content: "Indique Amigos — apostamaxy" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const code = user?.id?.slice(0, 8).toUpperCase() ?? "ENTRE";
  const link = typeof window !== "undefined" ? `${window.location.origin}/registro?ref=${code}` : "";

  return (
    <SiteShell>
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black">Indique e Ganhe R$ 50</h1>
          <p className="text-muted-foreground mt-2">Para cada amigo que se cadastrar e depositar pelo seu link</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <label className="text-sm font-medium">Seu link de indicação</label>
          <div className="flex gap-2">
            <Input value={link} readOnly className="bg-surface-2" />
            <Button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado!"); }}>
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Código: <strong className="text-primary">{code}</strong></p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { n: 1, t: "Compartilhe", d: "Envie seu link para amigos" },
            { n: 2, t: "Eles se cadastram", d: "Usando seu código" },
            { n: 3, t: "Você ganha", d: "R$ 50 no primeiro depósito" },
          ].map((s) => (
            <div key={s.n} className="bg-surface border border-border rounded-xl p-4 text-center">
              <div className="size-10 mx-auto rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">{s.n}</div>
              <h3 className="font-bold mt-3">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
