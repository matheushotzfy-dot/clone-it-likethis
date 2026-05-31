import { Dice5, Rocket, Sparkles, Hand, Play, Gift, Target, Plane } from "lucide-react";

const cats = [
  { id: "slots", label: "Slots", Icon: Dice5 },
  { id: "crash", label: "Crash", Icon: Rocket },
  { id: "popok", label: "Popok", Icon: Sparkles },
  { id: "tada", label: "Tada", Icon: Hand },
  { id: "drops", label: "Drops", Icon: Play },
  { id: "promocoes", label: "Promoções", Icon: Gift },
  { id: "mesas", label: "Mesas Brasileiras", Icon: Target },
  { id: "jetx", label: "Jetx", Icon: Plane },
];

export function CategoryPills() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-4 py-2">
      {cats.map(({ id, label, Icon }) => (
        <button key={id} className="flex flex-col items-center gap-2 group w-20">
          <div className="size-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_6px_20px_-6px_var(--primary)] group-hover:scale-110 transition-transform">
            <Icon className="size-6" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-semibold text-center text-foreground leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}
