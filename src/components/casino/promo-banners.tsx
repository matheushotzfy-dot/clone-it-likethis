import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBannersPublic } from "@/lib/banners.functions";
import { cn } from "@/lib/utils";

/** Banners cadastrados no admin. Sem banner ativo, não ocupa espaço. */
export function PromoBanners() {
  const fetchBanners = useServerFn(listBannersPublic);
  const { data } = useQuery({
    queryKey: ["banners-public"],
    queryFn: () => fetchBanners(),
    staleTime: 5 * 60_000,
  });
  const slides = data ?? [];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = slides.length ? idx % slides.length : 0;

  useEffect(() => {
    if (
      paused ||
      slides.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setInterval(() => setIdx((i) => i + 1), 7000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  if (!slides.length) return null;

  return (
    <section
      aria-label="Destaques"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative aspect-[2.2/1] overflow-hidden rounded-[14px] border border-border bg-surface sm:aspect-[3.6/1]"
    >
      {slides.map((s, i) => {
        const img = (
          <img
            src={s.image_url}
            alt={s.title ?? "Destaque"}
            width={1600}
            height={450}
            loading={i === 0 ? "eager" : "lazy"}
            className="size-full object-cover"
          />
        );
        return (
          <div
            key={s.id}
            aria-hidden={i !== active}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              i === active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {s.link_url ? (
              <a href={s.link_url} tabIndex={i === active ? 0 : -1} className="block size-full">
                {img}
              </a>
            ) : (
              img
            )}
          </div>
        );
      })}
      {slides.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/60 px-2 py-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Ir para o destaque ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "w-5 bg-foreground" : "w-1.5 bg-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
