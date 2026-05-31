import { useState, useEffect } from "react";
import banner1 from "@/assets/banner-welcome.jpg";
import banner2 from "@/assets/banner-bonus.jpg";
import banner3 from "@/assets/banner-sports.jpg";

const slides = [banner1, banner2, banner3, banner1, banner2];

export function BannerCarousel() {
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const left = slides[idx % slides.length];
  const right = slides[(idx + 1) % slides.length];

  // SSR-safe: render identical markup on server and first client paint
  if (!mounted) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <div className="relative aspect-[21/10] rounded-2xl overflow-hidden bg-surface ring-1 ring-primary/40">
            <img src={banner1} alt="" className="w-full h-full object-cover" />
            <div className="pointer-events-none absolute -right-4 top-0 bottom-0 w-8 bg-primary skew-x-[-12deg]" />
          </div>
          <div className="relative aspect-[21/10] rounded-2xl overflow-hidden bg-surface ring-1 ring-primary/40 hidden md:block">
            <img src={banner2} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === 0 ? "w-6 bg-primary" : "w-1.5 bg-white/40"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
        <div className="relative aspect-[21/10] rounded-2xl overflow-hidden bg-surface ring-1 ring-primary/40">
          <img src={left} alt="" className="w-full h-full object-cover" />
          <div className="pointer-events-none absolute -right-4 top-0 bottom-0 w-8 bg-primary skew-x-[-12deg]" />
        </div>
        <div className="relative aspect-[21/10] rounded-2xl overflow-hidden bg-surface ring-1 ring-primary/40 hidden md:block">
          <img src={right} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-white/40"}`}
            aria-label={`Banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
