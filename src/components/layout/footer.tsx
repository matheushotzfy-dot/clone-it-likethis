import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="bg-sidebar border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10">
          <div>
            <h4 className="font-bold mb-3 text-sm">Apostas</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/esportes" className="hover:text-foreground">Esportes</Link></li>
              <li><Link to="/ao-vivo" className="hover:text-foreground">Ao Vivo</Link></li>
              <li><Link to="/cassino" className="hover:text-foreground">Cassino</Link></li>
              <li><Link to="/torneios" className="hover:text-foreground">Torneios</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Conta</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground">Entrar</Link></li>
              <li><Link to="/registro" className="hover:text-foreground">Cadastrar</Link></li>
              <li><Link to="/deposito" className="hover:text-foreground">Depósito</Link></li>
              <li><Link to="/saque" className="hover:text-foreground">Saque</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-foreground">FAQ</a></li>
              <li><a href="#" className="hover:text-foreground">Contato</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/legal/termos" className="hover:text-foreground">Termos de Uso</Link></li>
              <li><Link to="/legal/privacidade" className="hover:text-foreground">Privacidade</Link></li>
              <li><Link to="/legal/jogo-responsavel" className="hover:text-foreground">Jogo Responsável</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            {["PIX", "+18", "GLI", "RA"].map((b) => (
              <div key={b} className={`px-3 py-1.5 rounded-md text-xs font-bold ${b === "+18" ? "bg-destructive text-destructive-foreground" : "bg-surface text-foreground"}`}>
                {b}
              </div>
            ))}
          </div>
          <Logo />
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} SANTOSBET Clone Demo — Apenas para estudo.
        </p>
      </div>
    </footer>
  );
}
