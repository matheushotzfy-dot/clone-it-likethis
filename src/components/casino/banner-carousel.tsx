import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBannersPublic } from "@/lib/banners.functions";
import banner1 from "@/assets/banner-bgaming.webp";
import banner2 from "@/assets/banner-jelly.webp";
import banner3 from "@/assets/banner-hacksaw.webp";

const fallbacks = [
  { id: "f1", image_url: banner1, link_url: null as string | null, title: "" },
  { id: "f2", image_url: banner2, link_url: null as string | null, title: "" },
  { id: "f3", image_url: banner3, link_url: null as string | null, title: "" },
];

export function BannerCarousel() {
  const fetchBanners = useServerFn(listBannersPublic);
  const { data } = useQuery({
    queryKey: ["banners-public"],
    queryFn: () => fetchBanners(),
    staleTime: 60_000,
  });

  const slides = (data && data.length > 0) ? data : fallbacks;

  const [mounted, setMounted] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  const current = slides[idx] ?? slides[0];

  const Img = (
    <img
      src={current.image_url}
      alt={current.title || "Banner promocional"}
      className="w-full h-full object-cover transition-opacity duration-700"
      key={mounted ? current.id : "ssr"}
    />
  );

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[1280/280] rounded-2xl overflow-hidden bg-surface ring-1 ring-primary/30 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)]">
        {current.link_url ? (
          <a href={current.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            {Img}
          </a>
        ) : Img}
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
