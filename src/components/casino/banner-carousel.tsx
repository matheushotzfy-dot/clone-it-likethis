import { useState, useEffect } from "react";
import banner1 from "@/assets/banner-bgaming.webp";
import banner2 from "@/assets/banner-jelly.webp";
import banner3 from "@/assets/banner-hacksaw.webp";

const slides = [banner1, banner2, banner3];

export function BannerCarousel() {
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const current = slides[idx];

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[1280/280] rounded-2xl overflow-hidden bg-surface ring-1 ring-primary/30 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)]">
        <img
          src={current}
          alt="Banner promocional"
          className="w-full h-full object-cover transition-opacity duration-700"
          key={mounted ? current : "ssr"}
        />
      </div>
      <div className="flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/50"}`}
            aria-label={`Banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
