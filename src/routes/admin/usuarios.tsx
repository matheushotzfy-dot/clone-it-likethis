import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, deleteUsersBulkAdmin } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/usuarios")({ component: Page });

function Page() {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<10 | 25 | 50 | "all">(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fn = useServerFn(listUsers);
  const delFn = useServerFn(deleteUsersBulkAdmin);
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => fn({ data: { search: search || undefined } }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const allUsers = (data ?? []) as any[];
  const users = pageSize === "all" ? allUsers : allUsers.slice(0, pageSize);
  const allIds = useMemo(() => users.map((u) => u.id), [users]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allIds));
  };

  const delMut = useMutation({
    mutationFn: (ids: string[]) => delFn({ data: { userIds: ids } }),
    onSuccess: (r) => {
      toast.success(`${r.deleted} usuário(s) apagado(s)`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-kpi"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onBulkDelete = () => {
    if (!selected.size) return;
    if (!confirm(`Apagar ${selected.size} usuário(s) selecionado(s)? Esta ação NÃO pode ser desfeita.`)) return;
    delMut.mutate([...selected]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Input placeholder="Buscar por nome, usuário ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm flex-1 min-w-[200px]" />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
        <span>Mostrando <b className="text-foreground">{users.length}</b> de <b className="text-foreground">{allUsers.length}</b></span>
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase">Por página:</span>
          <div className="flex gap-1 bg-muted rounded-md p-1">
            {([10, 25, 50, "all"] as const).map((n) => (
              <button
                key={String(n)}
                onClick={() => setPageSize(n)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase ${pageSize === n ? "bg-primary text-primary-foreground" : "hover:text-foreground"}`}
              >
                {n === "all" ? "Todos" : n}
              </button>
            ))}
          </div>
        </div>
      </div>


      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="font-bold">{selected.size} selecionado(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Limpar</Button>
            <Button size="sm" variant="destructive" disabled={delMut.isPending} onClick={onBulkDelete}>
              <Trash2 className="size-4 mr-1" /> Apagar
            </Button>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Erro: {(error as Error).message} <button onClick={() => refetch()} className="ml-2 font-bold underline">tentar novamente</button></div>}

      {/* Desktop: table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-x-auto shadow-lg shadow-background/20">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-3 w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"} />
              </th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">KYC</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (<tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Carregando usuários...</td></tr>)}
            {!isLoading && users.length === 0 && (<tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum usuário</td></tr>)}
            {users.map((u: any) => (
              <tr key={u.id} className={`border-t border-border hover:bg-muted/30 ${selected.has(u.id) ? "bg-primary/5" : ""}`}>
                <td className="px-3 py-3">
                  <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} aria-label="Selecionar" />
                </td>
                <td className="px-4 py-3 font-mono">{u.username ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{u.email || "—"}</td>
                <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.cpf ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 font-bold text-primary">R$ {Number(u.balance).toFixed(2).replace(".", ",")}</td>
                <td className="px-4 py-3"><span className={`text-xs uppercase font-bold ${u.kyc_status === "approved" ? "text-success" : "text-muted-foreground"}`}>{u.kyc_status}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-right">
                  <Link to="/admin/usuarios/$id" params={{ id: u.id }} className="text-primary font-bold hover:underline">Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {users.length > 0 && (
          <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            Selecionar todos ({users.length})
          </label>
        )}
        {isLoading && <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>}
        {!isLoading && users.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">Nenhum usuário</div>}
        {users.map((u: any) => (
          <div key={u.id} className={`rounded-xl border bg-card p-3 ${selected.has(u.id) ? "border-primary/50 bg-primary/5" : "border-border"}`}>
            <div className="flex items-start gap-3">
              <Checkbox className="mt-1" checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} aria-label="Selecionar" />
              <Link to="/admin/usuarios/$id" params={{ id: u.id }} className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{u.full_name || u.username || "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email || u.username}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-bold text-primary">R$ {Number(u.balance).toFixed(2).replace(".", ",")}</span>
                    <span className={`uppercase font-bold ${u.kyc_status === "approved" ? "text-success" : "text-muted-foreground"}`}>{u.kyc_status}</span>
                    <span className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground shrink-0" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
