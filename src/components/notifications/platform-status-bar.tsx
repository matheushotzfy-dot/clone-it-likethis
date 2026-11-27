import { usePublicSettings } from "@/hooks/use-account";

/** Avisa em todas as páginas quando não há dinheiro real ou o site está em manutenção. */
export function PlatformStatusBar() {
  const { data } = usePublicSettings();
  if (!data) return null;
  if (data.maintenance) {
    return (
      <div
        role="status"
        className="homolog-bar px-3 py-1.5 text-center text-[11.5px] font-semibold sm:py-2 sm:text-[13px]"
      >
        Plataforma em manutenção. Algumas funções podem ficar indisponíveis por alguns minutos.
      </div>
    );
  }
  if (!data.realMoney && data.testPayments) {
    return (
      <div
        role="status"
        className="homolog-bar px-3 py-1.5 text-center text-[11.5px] font-semibold sm:py-2 sm:text-[13px]"
      >
        <span className="sm:hidden">Homologação: Pix de teste, nenhum pagamento é real</span>
        <span className="max-sm:hidden">
          Ambiente de homologação com Pix de teste: nenhum pagamento é real.
        </span>
      </div>
    );
  }
  if (!data.realMoney) {
    return (
      <div
        role="status"
        className="homolog-bar px-3 py-1.5 text-center text-[11.5px] font-semibold sm:py-2 sm:text-[13px]"
      >
        <span className="sm:hidden">Homologação: sem depósitos e saques reais</span>
        <span className="max-sm:hidden">
          Ambiente de homologação: depósitos e saques com dinheiro real estão desativados.
        </span>
      </div>
    );
  }
  return null;
}
