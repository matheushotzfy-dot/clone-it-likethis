import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBannersPublic } from "@/lib/banners.functions";
import banner1 from "@/assets/banner-santos-1.jpg";
import banner2 from "@/assets/banner-santos-2.jpg";

const fallbacks = [
  { id: "f1", image_url: banner1, link_url: null as string | null, title: "SantosBet — A casa da torcida" },
  { id: "f2", image_url: banner2, link_url: null as string | null, title: "Bônus 100% no primeiro depósito" },
];

export function BannerCarousel() {
  const fetchBanners = useServerFn(listBannersPublic);
  const { data } = useQuery({
    queryKey: ["banners-public"],
    queryFn: () => fetchBanners(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const slides = (data && data.length > 0) ? data : fallbacks;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[3/2] sm:aspect-[2/1] md:aspect-[5/2] lg:aspect-[15/4] xl:aspect-[15/4] rounded-xl md:rounded-2xl overflow-hidden bg-black ring-1 ring-primary/20 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)]">
        {slides.map((s, i) => {
          const content = (
            <div className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === idx ? "opacity-100" : "opacity-0"}`}>
              {/* Blurred backdrop fills the wider desktop canvas without cropping the foreground */}
              <img
                src={s.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-60 hidden md:block"
              />
              {/* Mobile: cover (unchanged). Desktop: contain so nothing is cropped */}
              <img
                src={s.image_url}
                alt={s.title || "Banner promocional"}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                className="relative h-full w-full object-cover md:object-contain object-center"
              />
            </div>
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
        <div className="flex justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/50"}`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
