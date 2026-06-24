import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { supabase } from "@/integrations/supabase/client";
import { useAuthDialog } from "./auth-dialog-context";
import { PromoSide } from "./promo-side";
import { User, Mail, Phone, Lock, Eye, EyeOff, Info, Check } from "lucide-react";
import { toast } from "sonner";
import { maskCPF, maskPhone, validateCPF, EMAIL_DOMAINS } from "@/lib/validations";
import { getTrackingMetadata } from "@/lib/tracking";
import { cn } from "@/lib/utils";

export function RegisterDialog() {
  const { current, close, open } = useAuthDialog();
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showEmailHints, setShowEmailHints] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);

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
      if (parts[1].length < 3) {
        setShowEmailHints(true);
      } else {
        setShowEmailHints(false);
      }
    } else {
      setShowEmailHints(false);
    }
  };

  const selectHint = (domain: string) => {
    const prefix = email.split("@")[0];
    setEmail(`${prefix}@${domain}`);
    setShowEmailHints(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) { toast.error("Você precisa aceitar os termos"); return; }
    if (!validateCPF(cpf)) { toast.error("CPF inválido"); return; }
    if (password.length < 1) { toast.error("Informe uma senha"); return; }
    
    setLoading(true);
    const tracking = getTrackingMetadata();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          cpf: cpf.replace(/\D/g, ""),
          phone: phone.replace(/\D/g, ""),
          ...tracking,
        },
      },
    });
    
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      let friendly = error.message;
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        friendly = "Este email já está cadastrado. Faça login.";
      } else if (msg.includes("weak") || msg.includes("pwned") || msg.includes("compromised")) {
        friendly = "Senha muito fraca ou vazada. Use uma senha mais forte.";
      } else if (msg.includes("invalid") && msg.includes("email")) {
        friendly = "Email inválido. Verifique e tente novamente.";
      } else if (msg.includes("rate") || msg.includes("limit")) {
        friendly = "Muitas tentativas. Aguarde alguns segundos.";
      }
      toast.error(friendly);
      return;
    }
    
    
    toast.success("Conta criada! Bem-vindo.");
    // Abrir depósito imediatamente após cadastro
    open("deposit");
  }

  return (
    <Dialog open={current === "register"} onOpenChange={(o) => !o && close()}>
      <DialogContent className="p-0 max-w-[860px] w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] bg-brand border-brand overflow-hidden gap-0 flex flex-col md:flex-row max-h-[95vh] sm:max-h-[92vh] sm:rounded-2xl">
        <PromoSide />

        <div className="flex-1 p-5 md:p-8 bg-brand text-white overflow-y-auto">
          <div className="flex items-start justify-between mb-6">
            <span className="text-xl md:text-2xl font-black flex items-center gap-0.5">
              <span className="text-white">SANTOS</span>
              <span className="text-primary">BET</span>
            </span>
            <div className="text-right text-xs">
              <p className="text-white/60">Já tem uma conta?</p>
              <button onClick={() => open("login")} className="text-primary font-bold hover:underline">Entrar</button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black text-primary leading-tight">Cadastre-se!</h2>
            <p className="text-sm text-white/70">De forma fácil e rápida!</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase ml-1">CPF</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input 
                  value={cpf} 
                  onChange={(e) => setCpf(maskCPF(e.target.value))} 
                  placeholder="000.000.000-00" 
                  inputMode="numeric"
                  className="w-full h-12 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary text-base" 
                  required
                />
              </div>
            </div>

            <div className="space-y-1" ref={emailRef}>
              <label className="text-[11px] font-bold text-white/50 uppercase ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => handleEmailChange(e.target.value)} 
                  placeholder="exemplo@email.com" 
                  className="w-full h-12 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary text-base" 
                />
                {showEmailHints && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-brand-2 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
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
              <label className="text-[11px] font-bold text-white/50 uppercase ml-1">Celular</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input 
                  value={phone} 
                  onChange={(e) => setPhone(maskPhone(e.target.value))} 
                  placeholder="(00) 00000-0000" 
                  inputMode="numeric"
                  className="w-full h-12 pl-10 pr-3 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary text-base" 
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input 
                  type={show ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres" 
                  className="w-full h-12 pl-10 pr-10 rounded-lg bg-brand-2 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary text-base" 
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 text-[11px] text-white/60 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={accept} 
                    onChange={(e) => setAccept(e.target.checked)} 
                    className="appearance-none size-4 rounded bg-brand-2 border border-white/20 checked:bg-primary checked:border-primary cursor-pointer transition-all" 
                  />
                  {accept && <Check className="absolute inset-0 size-3 m-auto text-primary-foreground pointer-events-none" strokeWidth={4} />}
                </div>
                <span className="leading-normal">
                  Declaro ter mais de 18 anos e aceitar os <span className="text-primary font-bold">Termos e Condições</span> e a <span className="text-primary font-bold">Política de Privacidade</span>.
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full h-12 mt-4 rounded-lg bg-primary text-primary-foreground font-black uppercase text-sm tracking-wider hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Processando..." : "Criar minha conta"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-brand-2/40 rounded-xl border border-white/5 flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Info className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-white/50 leading-tight">Seus dados estão protegidos por criptografia de ponta a ponta e de acordo com a LGPD.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

