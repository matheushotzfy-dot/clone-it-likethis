import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard";

/**
 * Gateway de teste da homologação: gera um "Pix" que não vale como pagamento e
 * permite simular a confirmação. A confirmação passa pelo mesmo caminho de um
 * webhook real (status approved -> trigger -> wallet_apply), então testa o fluxo
 * inteiro de depósito sem dinheiro de ninguém. O banco recusa transação de teste
 * com dinheiro real ligado (guard_real_money).
 */

async function money() {
  return import("./money.server");
}

async function assertTestMode() {
  const m = await money();
  const s = await m.loadMoneySettings(true);
  if (s.real_money_enabled || s.active_gateway !== "teste")
    throw new Error("Pagamentos de teste estão desligados.");
  if (s.maintenance_mode)
    throw new Error("Plataforma em manutenção. Tente novamente em instantes.");
  return s;
}

/** Código no formato do copia e cola, marcado como teste para nunca ser confundido com Pix real. */
function fakeEmv(id: string, amount: number) {
  return `00020101021226580014BR.GOV.BCB.PIX0136HOMOLOGACAO-SEM-VALOR-${id.slice(0, 8)}5204000053039865406${amount.toFixed(2)}5802BR5913PIX DE TESTE6008SEM VALOR62070503***6304TEST`;
}

export const createTestPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ amount: z.number().positive().max(1_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const s = await assertTestMode();
    const m = await money();
    const amount = m.roundMoney(data.amount);
    if (amount < s.min_deposit) throw new Error(`Depósito mínimo: R$ ${s.min_deposit.toFixed(2)}`);
    if (amount > s.max_deposit) throw new Error(`Depósito máximo: R$ ${s.max_deposit.toFixed(2)}`);
    await m.assertNotFrozen(userId);
    await m.rgCheck(userId, "deposit", amount);

    const admin = await m.getAdminClient();
    const externalId = `test-${crypto.randomUUID()}`;
    const { data: tx, error } = await admin
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount,
        status: "pending",
        description: "Depósito Pix (teste)",
        gateway: "teste",
        is_test: true,
        gateway_external_id: externalId,
      })
      .select("id")
      .single();
    if (error)
      throw new Error(m.friendlyDbError(error.message, "Não foi possível gerar o Pix de teste."));
    const copyPaste = fakeEmv(tx.id, amount);
    await admin.from("transactions").update({ gateway_qrcode: copyPaste }).eq("id", tx.id);
    return { transactionId: tx.id, copyPaste, qrCodeImage: "", test: true as const };
  });

/** O próprio jogador simula o pagamento do Pix de teste que ele gerou. */
export const simulateMyTestPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transactionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertTestMode();
    const m = await money();
    const admin = await m.getAdminClient();
    const { data: tx } = await admin
      .from("transactions")
      .select("id,user_id,type,status,is_test")
      .eq("id", data.transactionId)
      .maybeSingle();
    if (!tx || tx.user_id !== context.userId || tx.type !== "deposit" || !tx.is_test)
      throw new Error("Pix de teste não encontrado.");
    if (tx.status !== "pending") return { ok: true, status: tx.status };
    const { error } = await admin
      .from("transactions")
      .update({ status: "approved" })
      .eq("id", tx.id)
      .eq("status", "pending");
    if (error)
      throw new Error(
        m.friendlyDbError(error.message, "Não foi possível confirmar o pagamento de teste."),
      );
    return { ok: true, status: "approved" };
  });

/** Admin confirma um depósito de teste pela fila de depósitos. */
export const adminSimulateTestPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transactionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await assertTestMode();
    const m = await money();
    const admin = await m.getAdminClient();
    const { data: tx } = await admin
      .from("transactions")
      .select("id,user_id,type,status,is_test,amount")
      .eq("id", data.transactionId)
      .maybeSingle();
    if (!tx || tx.type !== "deposit" || !tx.is_test)
      throw new Error("Depósito de teste não encontrado.");
    if (tx.status !== "pending") throw new Error("Esse depósito já foi finalizado.");
    const { error } = await admin
      .from("transactions")
      .update({ status: "approved" })
      .eq("id", tx.id)
      .eq("status", "pending");
    if (error) throw new Error(m.friendlyDbError(error.message, "Não foi possível confirmar."));
    await context.supabase.rpc("admin_log", {
      p_action: "deposit.test_paid",
      p_target_user: tx.user_id,
      p_target_id: tx.id,
      p_details: { amount: Number(tx.amount) } as never,
    });
    return { ok: true };
  });
