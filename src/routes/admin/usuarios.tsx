import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/usuarios")({ component: Page });

function Page() {
  const [search, setSearch] = useState("");
  const fn = useServerFn(listUsers);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => fn({ data: { search: search || undefined } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Input placeholder="Buscar por nome, usuário ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
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
            {isLoading && (<tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>)}
            {!isLoading && (data ?? []).length === 0 && (<tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum usuário</td></tr>)}
            {(data ?? []).map((u: any) => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/30">
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
    </div>
  );
}
