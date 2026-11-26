import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Confere o papel de admin com o cliente do próprio usuário (RLS + auth.uid()). */
export async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado");
}
