import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";

/** Cores validadas para fundo escuro (#0f1d31): entradas e saídas, CVD ok. */
export const FLOW_IN = "#1fae96";
export const FLOW_OUT = "#e8763a";

const short = (v: number) =>
  Math.abs(v) >= 1000
    ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : v.toLocaleString("pt-BR");
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-border bg-popover px-3 py-2 text-[13px] shadow-lg">
      <p className="mb-1 font-semibold">{label ? dayLabel(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="num ml-auto pl-3 font-semibold">{formatBRL(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function FlowChart({
  data,
}: {
  data: { day: string; deposits: number; withdrawals: number }[];
}) {
  return (
    <div className="h-[260px] w-full" role="img" aria-label="Depósitos e saques por dia">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={2}
          barCategoryGap="22%"
          margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#1e3350" />
          <XAxis
            dataKey="day"
            tickFormatter={dayLabel}
            tick={{ fill: "#8fa3bf", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={short}
            tick={{ fill: "#8fa3bf", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#16283f" }} />
          <Legend
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 13, color: "#8fa3bf", paddingTop: 6 }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="deposits"
            name="Depósitos"
            fill={FLOW_IN}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
          <Bar
            isAnimationActive={false}
            dataKey="withdrawals"
            name="Saques pagos"
            fill={FLOW_OUT}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GgrChart({ data }: { data: { day: string; ggr: number }[] }) {
  return (
    <div className="h-[200px] w-full" role="img" aria-label="Resultado da casa (GGR) por dia">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barCategoryGap="22%"
          margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#1e3350" />
          <XAxis
            dataKey="day"
            tickFormatter={dayLabel}
            tick={{ fill: "#8fa3bf", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={short}
            tick={{ fill: "#8fa3bf", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#16283f" }} />
          <Bar
            isAnimationActive={false}
            dataKey="ggr"
            name="GGR"
            fill="#2e9bff"
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
