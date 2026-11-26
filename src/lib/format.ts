const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlPlain = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** R$ 1.234,56 */
export function formatBRL(value: number | string | null | undefined): string {
  return brl.format(Number(value ?? 0) || 0);
}

/** 1.234,56 (sem o símbolo, para quando o R$ é desenhado à parte) */
export function formatAmount(value: number | string | null | undefined): string {
  return brlPlain.format(Number(value ?? 0) || 0);
}

/** Lê "1.234,56", "1234.56" ou "1234,5" como número. */
export function parseBRL(input: string): number {
  const clean = input.replace(/[^\d,.-]/g, "");
  if (!clean) return 0;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const dateOnly = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const timeOnly = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatDateTime(iso: string | null | undefined) {
  return iso ? dateTime.format(new Date(iso)) : "";
}
export function formatDate(iso: string | null | undefined) {
  return iso ? dateOnly.format(new Date(iso)) : "";
}
export function formatTime(iso: string | null | undefined) {
  return iso ? timeOnly.format(new Date(iso)) : "";
}

/** "hoje 14:30", "ontem 09:10" ou "12/11 18:00" */
export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const key = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (key(d) === key(today)) return `hoje ${formatTime(iso)}`;
  if (key(d) === key(yesterday)) return `ontem ${formatTime(iso)}`;
  return formatDateTime(iso);
}

export function newRequestId(): string {
  return crypto.randomUUID();
}
