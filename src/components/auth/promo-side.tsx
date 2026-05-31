import promo from "@/assets/promo-side.jpg";

export function PromoSide() {
  return (
    <div className="relative w-full md:w-[360px] shrink-0 bg-brand">
      <img src={promo} alt="A Primeira Bet 100% Brasileira" className="w-full h-full object-cover" />
    </div>
  );
}
