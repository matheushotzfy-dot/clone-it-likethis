import { useState, useEffect } from "react";
import banner1 from "@/assets/banner-welcome.jpg";
import banner2 from "@/assets/banner-bonus.jpg";
import banner3 from "@/assets/banner-sports.jpg";

const banners = [
  { img: banner1, alt: "Bem-vindo" },
  { img: banner2, alt: "Bônus 100%" },
  { img: banner3, alt: "Esportes" },
];

export function BannerCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-surface">
      {banners.map((b, i) => (
        <img
          key={b.alt}
          src={b.img}
          alt={b.alt}
          width={1600}
          height={700}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
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
