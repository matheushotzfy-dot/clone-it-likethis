import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, Gift, ShieldCheck, ArrowDownToLine, ArrowUpFromLine, History, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — PIXBET" }] }),
  component: Page,
});

function Page() {
  const { user, signOut } = useAuth();
  const fetchProfile = useServerFn(getMyProfile);
  const update = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setCpf(profile.cpf ?? "");
    }
  }, [profile]);

  const mut = useMutation({
    mutationFn: () => update({ data: { full_name: fullName, phone, cpf } }),
    onSuccess: () => { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteShell>
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-6 space-y-6">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-primary/30 to-surface border border-primary/40 rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Saldo disponível</p>
              <p className="text-4xl font-black text-foreground">
                R$ {Number(profile?.balance ?? 0).toFixed(2).replace(".", ",")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Bônus: R$ {Number(profile?.bonus_balance ?? 0).toFixed(2).replace(".", ",")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild className="font-bold"><Link to="/deposito"><ArrowDownToLine className="size-4 mr-1" />Depositar</Link></Button>
              <Button asChild variant="outline"><Link to="/saque"><ArrowUpFromLine className="size-4 mr-1" />Sacar</Link></Button>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { icon: Wallet, label: "Depositar", to: "/deposito" },
            { icon: ArrowUpFromLine, label: "Sacar", to: "/saque" },
            { icon: History, label: "Histórico", to: "/historico" },
            { icon: Gift, label: "Promoções", to: "/promocoes" },
          ].map((a) => (
            <Link key={a.label} to={a.to} className="bg-surface border border-border rounded-xl p-4 hover:border-primary transition-colors flex flex-col items-center gap-2">
              <a.icon className="size-6 text-primary" />
              <span className="text-sm font-medium">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Profile form */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Dados pessoais</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
              className="grid sm:grid-cols-2 gap-4"
            >
              <div>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled className="mt-1 bg-surface-2" />
              </div>
              <div>
                <Label>Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 bg-surface-2" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} className="mt-1 bg-surface-2" placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 bg-surface-2" placeholder="(11) 99999-9999" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-muted-foreground">Status KYC: <strong className="text-foreground">{profile?.kyc_status ?? "pendente"}</strong></span>
              </div>
              <div className="sm:col-span-2 flex justify-between">
                <Button type="button" variant="outline" onClick={() => signOut()}>
                  <LogOut className="size-4 mr-1" />Sair
                </Button>
                <Button type="submit" disabled={mut.isPending}>Salvar alterações</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
