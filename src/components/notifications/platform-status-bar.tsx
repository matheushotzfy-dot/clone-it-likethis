import { usePublicSettings } from "@/hooks/use-account";

/** Avisa em todas as páginas quando não há dinheiro real ou o site está em manutenção. */
export function PlatformStatusBar() {
  const { data } = usePublicSettings();
  if (!data) return null;
  if (data.maintenance) {
    return (
      <div role="status" className="homolog-bar px-4 py-2 text-center text-[13px] font-semibold">
        Plataforma em manutenção. Algumas funções podem ficar indisponíveis por alguns minutos.
      </div>
    );
  }
  if (!data.realMoney && data.testPayments) {
    return (
      <div role="status" className="homolog-bar px-4 py-2 text-center text-[13px] font-semibold">
        Ambiente de homologação com Pix de teste: nenhum pagamento é real.
      </div>
    );
  }
  if (!data.realMoney) {
    return (
      <div role="status" className="homolog-bar px-4 py-2 text-center text-[13px] font-semibold">
        Ambiente de homologação: depósitos e saques com dinheiro real estão desativados.
      </div>
    );
  }
  return null;
}
