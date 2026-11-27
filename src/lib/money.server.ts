// Server-only: regras de dinheiro compartilhadas por depósitos, saques e apostas.
// O saldo em si só muda dentro do banco (public.wallet_apply); aqui ficam as
// checagens que precisam acontecer ANTES de falar com gateway ou provedor.

type AdminClient = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

export async function getAdminClient(): Promise<AdminClient> {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

/** "teste" = Pix simulado da homologação (nunca com dinheiro real ligado). */
export type Gateway = "veopag" | "podpay" | "bspay" | "teste";

export interface MoneySettings {
  real_money_enabled: boolean;
  maintenance_mode: boolean;
  casino_enabled: boolean;
  sports_enabled: boolean;
  signup_enabled: boolean;
  active_gateway: Gateway;
  min_deposit: number;
  max_deposit: number;
  min_withdraw: number;
  max_withdraw: number;
  withdrawal_fee_pct: number;
  min_bet_sports: number;
  max_bet_sports: number;
  max_payout_sports: number;
  /** Exige identidade verificada antes de depositar ou apostar (Portaria 1.231, art. 31). */
  require_identity: boolean;
  /** Versão vigente dos termos; mudar pede novo aceite de todos (arts. 46-47). */
  terms_version: string;
  support_email: string;
  support_whatsapp: string;
  support_hours: string;
  ouvidoria_email: string;
  /** Número da portaria de autorização da SPA/MF, mostrado no rodapé quando preenchido. */
  spa_authorization: string;
  company_name: string;
  company_cnpj: string;
}

export const MONEY_DEFAULTS: MoneySettings = {
  real_money_enabled: false,
  maintenance_mode: false,
  casino_enabled: true,
  sports_enabled: true,
  signup_enabled: true,
  active_gateway: "veopag",
  min_deposit: 30,
  max_deposit: 3000,
  min_withdraw: 50,
  max_withdraw: 5000,
  withdrawal_fee_pct: 0,
  min_bet_sports: 1,
  max_bet_sports: 5000,
  max_payout_sports: 50000,
  require_identity: true,
  terms_version: "",
  support_email: "",
  support_whatsapp: "",
  support_hours: "",
  ouvidoria_email: "",
  spa_authorization: "",
  company_name: "",
  company_cnpj: "",
};

/** Converte as linhas de app_settings mantendo o tipo de cada chave conhecida. */
export function parseSettings(
  rows: { key: string; value: unknown }[] | null | undefined,
): MoneySettings {
  const out: MoneySettings = { ...MONEY_DEFAULTS };
  for (const row of rows ?? []) {
    const key = row.key as keyof MoneySettings;
    if (!(key in MONEY_DEFAULTS)) continue;
    const def = MONEY_DEFAULTS[key];
    const value = row.value;
    if (typeof def === "boolean") {
      (out as unknown as Record<string, unknown>)[key] = value === true || value === "true";
    } else if (typeof def === "number") {
      const n = Number(value);
      if (Number.isFinite(n)) (out as unknown as Record<string, unknown>)[key] = n;
    } else if (typeof value === "string") {
      (out as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

let cache: { at: number; value: MoneySettings } | null = null;

/** Lê sempre do banco com cache curto: mudanças do admin valem em segundos. */
export async function loadMoneySettings(fresh = false): Promise<MoneySettings> {
  if (!fresh && cache && Date.now() - cache.at < 3_000) return cache.value;
  const admin = await getAdminClient();
  const { data, error } = await admin.from("app_settings").select("key,value");
  if (error) throw new Error("Não foi possível carregar as configurações");
  const value = parseSettings(data as { key: string; value: unknown }[]);
  cache = { at: Date.now(), value };
  return value;
}

export class MoneyError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "MoneyError";
  }
}

export async function assertRealMoney(kind: "deposit" | "withdrawal") {
  const s = await loadMoneySettings(true);
  if (s.maintenance_mode)
    throw new MoneyError("MAINTENANCE", "Plataforma em manutenção. Tente novamente em instantes.");
  if (!s.real_money_enabled) {
    throw new MoneyError(
      "REAL_MONEY_DISABLED",
      kind === "deposit"
        ? "Depósitos ainda não estão disponíveis. A plataforma está em fase de homologação."
        : "Saques ainda não estão disponíveis. A plataforma está em fase de homologação.",
    );
  }
  return s;
}

/**
 * Dinheiro liberado para esta operação? Com dinheiro real ligado, sim (test=false).
 * Em homologação, só pelo gateway de teste (Pix simulado, test=true).
 */
export async function assertMoneyAllowed(kind: "deposit" | "withdrawal") {
  const s = await loadMoneySettings(true);
  if (s.maintenance_mode)
    throw new MoneyError("MAINTENANCE", "Plataforma em manutenção. Tente novamente em instantes.");
  if (s.real_money_enabled) return { settings: s, test: false };
  if (s.active_gateway === "teste") return { settings: s, test: true };
  return { settings: await assertRealMoney(kind), test: false };
}

/** Identidade verificada (quando a configuração exige) e conta aberta. */
export async function assertIdentity(userId: string) {
  const s = await loadMoneySettings();
  const admin = await getAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("kyc_status,closed_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new MoneyError("USER_NOT_FOUND", DB_ERRORS.USER_NOT_FOUND);
  if (data.closed_at) throw new MoneyError("ACCOUNT_CLOSED", DB_ERRORS.ACCOUNT_CLOSED);
  if (s.require_identity && data.kyc_status !== "verified")
    throw new MoneyError("IDENTITY_REQUIRED", DB_ERRORS.IDENTITY_REQUIRED);
}

export async function assertActiveGateway(gateway: Gateway) {
  const s = await loadMoneySettings();
  if (s.active_gateway !== gateway) {
    throw new MoneyError("GATEWAY_INACTIVE", "Este meio de pagamento não está ativo.");
  }
}

/** Mensagens para o jogador a partir dos códigos que o banco levanta. */
const DB_ERRORS: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Saldo insuficiente.",
  USER_FROZEN: "Sua conta está suspensa. Fale com o suporte.",
  SELF_EXCLUDED:
    "Sua conta está em autoexclusão. Apostas e depósitos ficam bloqueados até o fim do período.",
  LIMIT_DEPOSIT_DAILY: "Este depósito passa do seu limite diário.",
  LIMIT_DEPOSIT_WEEKLY: "Este depósito passa do seu limite semanal.",
  LIMIT_DEPOSIT_MONTHLY: "Este depósito passa do seu limite mensal.",
  LIMIT_LOSS_DAILY: "Você atingiu seu limite diário de perda.",
  LIMIT_LOSS_WEEKLY: "Você atingiu seu limite semanal de perda.",
  LIMIT_LOSS_MONTHLY: "Você atingiu seu limite mensal de perda.",
  LIMIT_BETS_DAILY: "Você atingiu o número máximo de apostas que definiu para hoje.",
  LIMIT_SESSION:
    "Seu tempo de sessão acabou, pelo limite que você definiu. Faça uma pausa e volte mais tarde.",
  IDENTITY_REQUIRED:
    "Verifique sua identidade para depositar e apostar. Leva poucos minutos, em Minha conta.",
  PAUSED: "Sua conta está em pausa. Você pode consultar e sacar, mas não apostar nem depositar.",
  ACCOUNT_CLOSED: "Esta conta foi encerrada.",
  ACCOUNT_HAS_BALANCE: "Saque todo o saldo antes de encerrar a conta.",
  ACCOUNT_HAS_PENDING:
    "Espere o depósito ou saque em andamento terminar antes de encerrar a conta.",
  TERMS_VERSION_MISMATCH:
    "Os termos foram atualizados. Recarregue a página e aceite a versão nova.",
  INVALID_ADDRESS: "Confira o CEP e a sigla do estado.",
  TEST_MONEY_DISABLED: "Pagamentos de teste estão desligados porque o dinheiro real foi ativado.",
  REAL_MONEY_DISABLED: "Operação indisponível: a plataforma está em fase de homologação.",
  INVALID_STAKE: "Valor de aposta inválido.",
  INVALID_ODD: "Odd inválida.",
  USER_NOT_FOUND: "Conta não encontrada.",
  TRANSACTION_ALREADY_FINAL: "Esta transação já foi finalizada.",
  TRANSACTION_HAS_LEDGER: "Transações que movimentaram saldo não podem ser apagadas.",
  FORBIDDEN: "Acesso negado.",
  REASON_REQUIRED: "Informe o motivo.",
  INVALID_LIMIT: "Limite inválido.",
  INVALID_PERIOD: "Período inválido.",
};

export function dbErrorCode(message: string | undefined | null): string | null {
  if (!message) return null;
  for (const code of Object.keys(DB_ERRORS)) if (message.includes(code)) return code;
  return null;
}

export function friendlyDbError(
  message: string | undefined | null,
  fallback = "Não foi possível concluir a operação.",
): string {
  const code = dbErrorCode(message);
  return code ? DB_ERRORS[code] : fallback;
}

/** Checa autoexclusão e limites do jogador (lança MoneyError com texto pronto). */
export async function rgCheck(userId: string, action: "deposit" | "bet", amount: number) {
  const admin = await getAdminClient();
  const { error } = await admin.rpc("rg_check", {
    p_user: userId,
    p_action: action,
    p_amount: amount,
  });
  if (error)
    throw new MoneyError(dbErrorCode(error.message) ?? "RG", friendlyDbError(error.message));
}

/** Conta congelada não deposita nem aposta (saque e consulta continuam liberados). */
export async function assertNotFrozen(userId: string) {
  const admin = await getAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("is_frozen,freeze_reason")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new MoneyError("USER_NOT_FOUND", "Conta não encontrada.");
  if (data.is_frozen) {
    throw new MoneyError(
      "USER_FROZEN",
      data.freeze_reason
        ? `Conta suspensa: ${data.freeze_reason}`
        : "Sua conta está suspensa. Fale com o suporte.",
    );
  }
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(raw: string | null | undefined): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

/** Idade completa em anos numa data de referência. */
export function ageOn(birthIso: string, today = new Date()): number {
  const b = new Date(`${birthIso}T12:00:00Z`);
  if (Number.isNaN(b.getTime())) return -1;
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const m = today.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < b.getUTCDate())) age--;
  return age;
}
