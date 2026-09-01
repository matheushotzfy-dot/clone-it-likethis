import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBannersPublic } from "@/lib/banners.functions";
import { cn } from "@/lib/utils";
import banner1 from "@/assets/banner-santos-1.jpg";
import banner2 from "@/assets/banner-santos-2.jpg";
import banner1Desktop from "@/assets/banner-santos-desktop.jpg";
import banner2Desktop from "@/assets/banner-santos-2-desktop.jpg";

const fallbacks = [
  { id: "f1", image_url: banner1, desktop_image_url: banner1Desktop, link_url: null as string | null, title: "SANTOSBET — cassino online" },
  { id: "f2", image_url: banner2, desktop_image_url: banner2Desktop, link_url: null as string | null, title: "Bônus de 100% no primeiro depósito" },
];

export function BannerCarousel() {
  const fetchBanners = useServerFn(listBannersPublic);
  const { data } = useQuery({
    queryKey: ["banners-public"],
    queryFn: () => fetchBanners(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const slides = data && data.length > 0 ? data : fallbacks;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  return (
    <div className="space-y-2.5">
      <div className="relative w-full overflow-hidden rounded-[10px] border border-border bg-surface aspect-[3/2] sm:aspect-[2/1] md:aspect-[1920/560]">
        {slides.map((s, i) => {
          const desktopImage = "desktop_image_url" in s ? s.desktop_image_url : null;
          const content = (
            <picture
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                i === idx ? "opacity-100" : "opacity-0",
              )}
            >
              {desktopImage && <source media="(min-width: 768px)" srcSet={desktopImage} />}
              <img
                src={s.image_url}
                alt={s.title || "Banner promocional"}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                className="size-full object-cover object-center"
                draggable={false}
              />
            </picture>
          );
          return s.link_url && i === idx ? (
            <a key={s.id} href={s.link_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0">
              {content}
            </a>
          ) : (
            <span key={s.id}>{content}</span>
          );
        })}
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className={cn(
                "h-[3px] rounded-full transition-all duration-300",
                i === idx ? "w-10 bg-primary" : "w-4 bg-foreground/20 hover:bg-foreground/40",
              )}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
