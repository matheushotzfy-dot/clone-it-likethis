const providers = [
  { name: "PG Soft", style: "tracking-tight" },
  { name: "PRAGMATIC PLAY", style: "tracking-wider" },
  { name: "SPRIBE", style: "tracking-widest" },
  { name: "TaDa Gaming", style: "italic" },
  { name: "SMARTSOFT", style: "tracking-wider" },
  { name: "BGAMING", style: "tracking-wider" },
  { name: "HACKSAW", style: "tracking-widest" },
  { name: "Spinomenal", style: "" },
  { name: "EVOPLAY", style: "tracking-wider" },
  { name: "POPOK", style: "tracking-widest" },
  { name: "NOLIMIT CITY", style: "tracking-wide" },
  { name: "GALAXSYS", style: "tracking-widest" },
  { name: "Platipus", style: "" },
  { name: "IRONDOG", style: "tracking-wide" },
];

export function ProviderStrip() {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
      {providers.map((p) => (
        <div
          key={p.name}
          className={`shrink-0 px-6 h-12 rounded-xl bg-popover border border-white/5 flex items-center justify-center text-sm font-bold whitespace-nowrap text-white/80 hover:text-primary hover:border-primary transition-colors cursor-pointer ${p.style}`}
        >
          {p.name}
        </div>
      ))}
    </div>
  );
}
