import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { maskCPF, maskPhone, validateCPF, EMAIL_DOMAINS } from "@/lib/validations";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { User, Mail, Phone, Lock, Eye, EyeOff, Info, Check } from "lucide-react";

const schema = z.object({
  fullName: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  cpf: z.string().refine(validateCPF, "CPF inválido"),
  acceptTerms: z.boolean().refine((v) => v, "Você precisa aceitar os termos"),
});

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Cadastro — APOSTAYA.BET" }, { property: "og:title", content: "Cadastro — APOSTAYA.BET" }, { name: "description", content: "Crie sua conta na APOSTAYA.BET e comece a ganhar." }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { open } = useAuthDialog();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showEmailHints, setShowEmailHints] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emailRef.current && !emailRef.current.contains(event.target as Node)) {
        setShowEmailHints(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val.includes("@")) {
      const parts = val.split("@");
      if (parts[1].length < 3) setShowEmailHints(true);
      else setShowEmailHints(false);
    } else setShowEmailHints(false);
  };

  const selectHint = (domain: string) => {
    const prefix = email.split("@")[0];
    setEmail(`${prefix}@${domain}`);
    setShowEmailHints(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password, cpf, acceptTerms });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { 
          full_name: parsed.data.fullName,
          cpf: cpf.replace(/\D/g, ""),
          phone: phone.replace(/\D/g, "")
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Bem-vindo 🎉");
    open("deposit");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand px-4 py-10 overflow-x-hidden">
      <div className="w-full max-w-md bg-brand-2 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="text-center">
          <Logo className="justify-center" />
          <h1 className="text-2xl font-black mt-4 text-white uppercase tracking-tight">Criar sua conta</h1>
          <p className="text-sm text-white/60 mt-1">Ganhe bônus de boas-vindas de 100%</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-[11px] font-bold text-white/50 uppercase ml-1">Nome completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input 
                id="name" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="h-12 pl-10 bg-brand border-white/10 text-white placeholder:text-white/30 focus:border-primary text-base" 
                placeholder="Seu nome aqui"
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cpf" className="text-[11px] font-bold text-white/50 uppercase ml-1">CPF</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input 
                id="cpf" 
                value={cpf} 
                onChange={(e) => setCpf(maskCPF(e.target.value))} 
                inputMode="numeric"
                className="h-12 pl-10 bg-brand border-white/10 text-white placeholder:text-white/30 focus:border-primary text-base" 
                placeholder="000.000.000-00"
                required 
              />
            </div>
          </div>

          <div className="space-y-1" ref={emailRef}>
            <Label htmlFor="email" className="text-[11px] font-bold text-white/50 uppercase ml-1">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => handleEmailChange(e.target.value)} 
                className="h-12 pl-10 bg-brand border-white/10 text-white placeholder:text-white/30 focus:border-primary text-base" 
                placeholder="exemplo@email.com"
                required 
              />
              {showEmailHints && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-brand border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                  {EMAIL_DOMAINS.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => selectHint(domain)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 text-white/80 transition-colors border-b border-white/5 last:border-0"
                    >
                      @{domain}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone" className="text-[11px] font-bold text-white/50 uppercase ml-1">Celular</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(maskPhone(e.target.value))} 
                inputMode="numeric"
                className="h-12 pl-10 bg-brand border-white/10 text-white placeholder:text-white/30 focus:border-primary text-base" 
                placeholder="(00) 00000-0000"
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-[11px] font-bold text-white/50 uppercase ml-1">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input 
                id="password" 
                type={showPass ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="h-12 pl-10 pr-10 bg-brand border-white/10 text-white placeholder:text-white/30 focus:border-primary text-base" 
                placeholder="Mínimo 6 caracteres"
                required 
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 text-[11px] text-white/60 cursor-pointer group pt-2">
            <div className="relative mt-0.5">
              <input 
                type="checkbox" 
                checked={acceptTerms} 
                onChange={(e) => setAcceptTerms(e.target.checked)} 
                className="appearance-none size-4 rounded bg-brand border border-white/20 checked:bg-primary checked:border-primary cursor-pointer transition-all" 
              />
              {acceptTerms && <Check className="absolute inset-0 size-3 m-auto text-primary-foreground pointer-events-none" strokeWidth={4} />}
            </div>
            <span>Tenho mais de 18 anos e aceito os <Link to="/legal/termos" className="text-primary font-bold hover:underline">termos</Link></span>
          </label>

          <Button type="submit" className="w-full h-12 font-black uppercase tracking-wider bg-primary text-primary-foreground hover:brightness-110 transition-all" disabled={loading}>
            {loading ? "Criando..." : "CRIAR MINHA CONTA"}
          </Button>
        </form>

        <div className="text-center text-sm border-t border-white/5 pt-6">
          <p className="text-white/60">
            Já tem conta? <Link to="/login" className="text-primary font-bold hover:underline">Entrar agora</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
