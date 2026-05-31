import shield from "@/assets/santos-shield.png";

export function PromoSide() {
  return (
    <div className="relative w-full md:w-[320px] shrink-0 hidden md:flex bg-gradient-to-br from-brand via-brand-2 to-black flex-col items-center justify-center p-8 overflow-hidden">
      <div className="absolute -top-16 -right-16 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <img
        src={shield}
        alt="Santos FC"
        width={220}
        height={220}
        className="relative z-10 size-44 object-contain drop-shadow-2xl"
        decoding="async"
      />
      <div className="relative z-10 mt-6 text-center">
        <h3 className="text-3xl font-black text-white leading-none">
          SANTOS<span className="text-primary">BET</span>
        </h3>
        <p className="mt-2 text-xs text-white/70 uppercase tracking-[0.2em] font-bold">A Casa da Torcida</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-primary/10 border border-primary/40 rounded-full px-3 py-1.5">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-black uppercase text-primary tracking-wider">Bônus 100% ativo</span>
        </div>
      </div>
    </div>
  );
}
