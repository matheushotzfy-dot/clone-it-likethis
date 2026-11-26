import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard";

export type Banner = {
  id: string;
  image_url: string;
  title: string | null;
  link_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export const listBannersPublic = createServerFn({ method: "GET" }).handler(
  async (): Promise<Banner[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("banners")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(8);
    return (data ?? []) as Banner[];
  },
);

export const listBannersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Banner[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("banners")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Banner[];
  });

// Só https ou caminho do próprio site: evita link "javascript:" no carrossel.
const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .regex(/^https:\/\/[^\s]+$/i, "Use um endereço que comece com https://");
const linkUrl = z
  .string()
  .trim()
  .max(2000)
  .regex(
    /^(https:\/\/[^\s]+|\/[^\s/][^\s]*|\/)$/i,
    "Use um caminho do site (ex.: /cassino) ou um endereço https://",
  );

export const upsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        image_url: httpsUrl,
        title: z.string().trim().max(120).optional().nullable(),
        link_url: linkUrl.optional().nullable().or(z.literal("")),
        sort_order: z.number().int().min(0).max(9999).default(0),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const row = {
      image_url: data.image_url,
      title: data.title || null,
      link_url: data.link_url || null,
      sort_order: data.sort_order,
      active: data.active,
    };
    const { error } = data.id
      ? await context.supabase.from("banners").update(row).eq("id", data.id)
      : await context.supabase.from("banners").insert(row);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("admin_log", {
      p_action: data.id ? "banner.update" : "banner.create",
      p_target_id: data.id,
      p_details: { title: row.title, active: row.active } as never,
    });
    return { ok: true };
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("admin_log", { p_action: "banner.delete", p_target_id: data.id });
    return { ok: true };
  });
