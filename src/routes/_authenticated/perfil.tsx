import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMyProfile, updateMyProfile, claimFirstAdmin } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { User, Wallet, History, Bell, Gift, Trophy, FileText, LogOut, ShieldCheck, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: pageMeta('Meu Perfil — apostamaxy', 'Meu perfil na apostamaxy. Informações e serviços da sua conta.') }),
  component: Page,
});

const menu = [
  { key: "perfil", label: "Meu Perfil", icon: User },
  { key: "saldo", label: "Gestão de Saldo", icon: Wallet },
  { key: "historico", label: "Histórico", icon: History, to: "/historico" },
  { key: "extrato", label: "Extrato", icon: FileText, to: "/historico" },
  { key: "notificacoes", label: "Notificações", icon: Bell },
  { key: "indique", label: "Indique e Ganhe", icon: Gift, to: "/indique-amigos" },
  { key: "premios", label: "Prêmios", icon: Trophy, to: "/promocoes" },
  { key: "irpf", label: "Informe IRPF", icon: FileText },
];

function Page() {
  const { user, signOut } = useAuth();
  const { open } = useAuthDialog();
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const update = useServerFn(updateMyProfile);
  const claim = useServerFn(claimFirstAdmin);
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const [active, setActive] = useState("perfil");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setCpf(profile.cpf ?? "");
      setUsername(profile.username ?? "");
    }
  }, [profile]);

  const mut = useMutation({
    mutationFn: () => update({ data: { full_name: fullName, phone, cpf, username } }),
    onSuccess: () => { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => { toast.success("Você agora é administrador!"); qc.invalidateQueries({ queryKey: ["my-profile"] }); qc.invalidateQueries({ queryKey: ["is-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const balance = Number(profile?.balance ?? 0);

  return (
    <SiteShell>
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-6 grid lg:grid-cols-[260px_1fr] gap-5">
        {/* Sidebar menu */}
        <aside className="bg-surface border border-border rounded-2xl p-3 self-start lg:sticky lg:top-20">
          <div className="flex items-center gap-3 p-3 border-b border-border mb-2">
            <div className="size-12 rounded-full bg-brand-2 border-2 border-primary flex items-center justify-center text-white font-black text-lg">
              {(profile?.username?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate">{profile?.full_name || profile?.username || "Usuário"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          {menu.map((m) => (
            <button
              key={m.key}
              onClick={() => m.to ? navigate({ to: m.to }) : setActive(m.key)}
              className={`w-full flex items-center gap-3 px-3 h-11 rounded-md text-sm font-semibold uppercase transition-colors ${active === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <m.icon className="size-4" />
              {m.label}
            </button>
          ))}
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 h-11 rounded-md text-sm font-semibold uppercase text-destructive hover:bg-destructive/10 mt-2 border-t border-border pt-3">
            <LogOut className="size-4" /> Sair
          </button>
        </aside>

        {/* Content */}
        <div className="space-y-5 min-w-0">
          {/* Balance card always shown */}
          <div className="bg-gradient-to-br from-primary/25 to-surface border border-primary/40 rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase font-bold text-muted-foreground">Saldo disponível</p>
                <p className="text-4xl font-black">R$ {balance.toFixed(2).replace(".", ",")}</p>
                <p className="text-xs text-muted-foreground mt-1">Bônus: R$ {Number(profile?.bonus_balance ?? 0).toFixed(2).replace(".", ",")}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => open("deposit")} className="font-bold uppercase"><ArrowDownToLine className="size-4 mr-1" />Depositar</Button>
                <Button asChild variant="outline" className="font-bold uppercase"><Link to="/saque"><ArrowUpFromLine className="size-4 mr-1" />Sacar</Link></Button>
              </div>
            </div>
          </div>

          {active === "perfil" && (
            <div className="bg-surface border border-border rounded-2xl p-5 md:p-6">
              <h2 className="text-lg font-bold mb-4">Dados pessoais</h2>
              {isLoading ? <p className="text-muted-foreground">Carregando...</p> : (
                <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid sm:grid-cols-2 gap-4">
                  <Field label="Email"><Input value={user?.email ?? ""} disabled className="bg-surface-2" /></Field>
                  <Field label="Usuário"><Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-surface-2" /></Field>
                  <Field label="Nome completo"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-surface-2" /></Field>
                  <Field label="CPF"><Input value={cpf} onChange={(e) => setCpf(e.target.value)} className="bg-surface-2" placeholder="000.000.000-00" /></Field>
                  <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-surface-2" placeholder="(11) 99999-9999" /></Field>
                  <div className="sm:col-span-2 flex items-center gap-2 text-sm">
                    <ShieldCheck className="size-4 text-primary" />
                    <span className="text-muted-foreground">KYC: <strong className="text-foreground capitalize">{profile?.kyc_status ?? "pendente"}</strong></span>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={mut.isPending}>Salvar alterações</Button>
                  </div>
                </form>
              )}

              {!profile?.isAdmin && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Você é o dono da plataforma? Reivindique o painel admin (só funciona se ainda não existir um admin):</p>
                  <Button variant="outline" size="sm" onClick={() => claimMut.mutate()} disabled={claimMut.isPending}>
                    {claimMut.isPending ? "..." : "Tornar-me admin"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {active === "saldo" && (
            <div className="bg-surface border border-border rounded-2xl p-5 md:p-6 space-y-3">
              <h2 className="text-lg font-bold">Gestão de Saldo</h2>
              <p className="text-sm text-muted-foreground">Use os botões acima para depositar ou sacar via PIX.</p>
            </div>
          )}

          {active === "notificacoes" && (
            <div className="bg-surface border border-border rounded-2xl p-5 md:p-6">
              <h2 className="text-lg font-bold mb-2">Notificações</h2>
              <p className="text-sm text-muted-foreground">Nenhuma notificação no momento.</p>
            </div>
          )}

          {active === "irpf" && (
            <div className="bg-surface border border-border rounded-2xl p-5 md:p-6">
              <h2 className="text-lg font-bold mb-2">Informe IRPF</h2>
              <p className="text-sm text-muted-foreground">O informe estará disponível em fevereiro do próximo ano.</p>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase font-bold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
