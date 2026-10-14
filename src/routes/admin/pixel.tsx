import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDepositorsPixel } from "@/lib/admin.functions";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/pixel")({
  head: () => ({ meta: pageMeta('Pixel e depositantes — apostamaxy', 'Pixel e depositantes da apostamaxy. Área de gestão autorizada.') }),
  component: PixelPage,
});

function PixelPage() {
  const fn = useServerFn(listDepositorsPixel);
  const { data, isLoading } = useQuery({ queryKey: ["admin-pixel"], queryFn: () => fn(), staleTime: 30_000, refetchOnWindowFocus: false });

  function exportCsv() {
    if (!data?.length) return;
    const headers = ["email","full_name","cpf","phone","total_deposited","deposits_count","utm_source","utm_medium","utm_campaign","fbp","fbc","referrer","signup_ip","created_at"];
    const rows = data.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pixel-depositantes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pixel · Depositantes</h1>
          <p className="text-sm text-muted-foreground">Dados consentidos para alimentar Públicos Lookalike e otimizar campanhas.</p>
        </div>
        <Button onClick={exportCsv} disabled={!data?.length} className="gap-2">
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-3">Data Cadastro</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Nome</th>
              <th className="px-3 py-3">CPF</th>
              <th className="px-3 py-3">Telefone</th>
              <th className="px-3 py-3 text-right">Total Depositado</th>
              <th className="px-3 py-3 text-center">#Dep</th>
              <th className="px-3 py-3">UTM Source</th>
              <th className="px-3 py-3">UTM Campaign</th>
              <th className="px-3 py-3">fbp</th>
              <th className="px-3 py-3">fbc</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && !data?.length && <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Nenhum depositante ainda</td></tr>}
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-3">{r.email ?? "—"}</td>
                <td className="px-3 py-3">{r.full_name || "—"}</td>
                <td className="px-3 py-3 font-mono text-xs">{r.cpf ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-xs">{r.phone ?? "—"}</td>
                <td className="px-3 py-3 text-right font-bold">R$ {Number(r.total_deposited).toFixed(2).replace(".", ",")}</td>
                <td className="px-3 py-3 text-center">{r.deposits_count}</td>
                <td className="px-3 py-3">{r.utm_source ?? "—"}</td>
                <td className="px-3 py-3">{r.utm_campaign ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-[10px] truncate max-w-[120px]">{r.fbp ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-[10px] truncate max-w-[120px]">{r.fbc ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
