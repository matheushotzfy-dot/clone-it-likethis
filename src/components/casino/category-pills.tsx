import { Gamepad2, Rocket, Sparkles, Hand, Play, Gift, Target, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

const cats = [
  { id: "slots", label: "Slots", Icon: Gamepad2 },
  { id: "live", label: "Ao Vivo", Icon: MonitorPlay },
  { id: "popok", label: "Popok", Icon: Sparkles },
  { id: "tada", label: "Tada", Icon: Hand },
  { id: "drops", label: "Drops", Icon: Play },
  { id: "promocoes", label: "Promoções", Icon: Gift },
  { id: "mesas", label: "Mesas BR", Icon: Target },
  { id: "crash", label: "Crash", Icon: Rocket },
];

export function CategoryPills() {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-start gap-4 md:gap-8 px-2 md:px-4 md:justify-center min-w-max md:min-w-0">
        {cats.map(({ id, label, Icon }) => (
          <button key={id} className="flex flex-col items-center gap-2 group w-16 md:w-20">
            <div className={cn(
              "size-12 md:size-14 rounded-2xl bg-surface-2 border border-white/5 text-white/70 flex items-center justify-center transition-all",
              "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:-translate-y-1",
              id === "slots" && "bg-primary text-primary-foreground border-primary"
            )}>
              <Icon className="size-5 md:size-6" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] md:text-[11px] font-bold text-center text-white/60 group-hover:text-primary leading-tight uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

