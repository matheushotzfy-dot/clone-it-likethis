import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { listBannersPublic } from "@/lib/banners.functions";
import { Button } from "@/components/ui/button";
import { useAuthDialog } from "@/components/auth/auth-dialog-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import casinoCover from "@/assets/maxy-casino-cover.jpg";
import pixCover from "@/assets/maxy-pix-cover.jpg";

const fallbacks = [
  { id: "maxy-casino", image_url: casinoCover, desktop_image_url: casinoCover, link_url: null, title: "apostamaxy", subtitle: "Slots, crash e cassino ao vivo.", own: true },
  { id: "maxy-pix", image_url: pixCover, desktop_image_url: pixCover, link_url: null, title: "Seu cassino. Seu PIX.", subtitle: "Depósitos em reais na apostamaxy.", own: true },
];

export function BannerCarousel({ aspectClass = "aspect-[1.8/1] sm:aspect-[3/1] md:aspect-[3.8/1]" }: { aspectClass?: string } = {}) {
  const fetchBanners = useServerFn(listBannersPublic);
  const { open } = useAuthDialog();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["banners-public"], queryFn: () => fetchBanners(), staleTime: 5 * 60_000, refetchOnWindowFocus: false });
  const slides = data?.length ? data : fallbacks;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = idx % slides.length;

  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  return (
    <section aria-label="Destaques apostamaxy" aria-roledescription="carrossel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} className={cn("relative w-full overflow-hidden rounded-lg bg-surface", aspectClass)}>
      {slides.map((slide, i) => {
        const own = "own" in slide && slide.own;
        const desktop = "desktop_image_url" in slide ? slide.desktop_image_url : null;
        return (
          <div key={slide.id} aria-hidden={i !== active} className={cn("absolute inset-0 transition-opacity duration-500", i === active ? "opacity-100" : "pointer-events-none opacity-0")}>
            <picture>
              {desktop && <source media="(min-width: 768px)" srcSet={desktop} />}
              <img src={slide.image_url} alt={own ? "" : slide.title || "Destaque apostamaxy"} width={1920} height={768} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} className="size-full object-cover object-center" />
            </picture>
            {own ? (
              <>
                <div className="banner-shade pointer-events-none absolute inset-0" />
                <div className="absolute inset-y-0 left-0 flex max-w-[68%] flex-col justify-center px-5 pb-5 sm:max-w-[55%] sm:px-8 md:px-10">
                  <span className="mb-2 text-[10px] font-semibold uppercase text-primary sm:text-xs">Cassino online · Brasil</span>
                  {i === 0 ? <h1 className="font-display text-3xl font-extrabold leading-tight md:text-5xl">aposta<span className="text-primary">maxy</span></h1> : <h2 className="font-display text-2xl font-extrabold leading-tight md:text-4xl">{slide.title}</h2>}
                  <p className="mt-2 text-xs text-foreground/80 sm:text-sm">{"subtitle" in slide ? slide.subtitle : ""}</p>
                  <div className="mt-4 flex items-center gap-3">
                    {i === 0 && user ? (
                      <Button asChild tabIndex={i === active ? 0 : -1} className="h-9 px-4 text-xs font-bold"><Link to="/cassino">Explorar jogos <ArrowRight /></Link></Button>
                    ) : (
                      <Button tabIndex={i === active ? 0 : -1} onClick={() => open(user ? "deposit" : "register")} className="h-9 px-4 text-xs font-bold">{user ? "Depositar com PIX" : "Criar conta"}<ArrowRight /></Button>
                    )}
                  </div>
                </div>
              </>
            ) : slide.link_url && i === active ? (
              <a href={slide.link_url} target="_blank" rel="noopener noreferrer" aria-label={slide.title || "Abrir destaque"} className="absolute inset-0" />
            ) : null}
          </div>
        );
      })}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-3">
          <div className="flex gap-1">
            {slides.map((slide, i) => <Button key={slide.id} variant="ghost" onClick={() => setIdx(i)} aria-label={`Banner ${i + 1}`} aria-pressed={active === i} className="h-6 w-7 p-0 hover:bg-transparent"><span className={cn("h-1 rounded-full transition-all", active === i ? "w-6 bg-primary" : "w-3 bg-foreground/30")} /></Button>)}
          </div>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon" className="size-7 bg-background/60" aria-label="Banner anterior" onClick={() => setIdx((active + slides.length - 1) % slides.length)}><ChevronLeft /></Button>
            <Button variant="secondary" size="icon" className="size-7 bg-background/60" aria-label="Próximo banner" onClick={() => setIdx((active + 1) % slides.length)}><ChevronRight /></Button>
          </div>
        </div>
      )}
    </section>
  );
}