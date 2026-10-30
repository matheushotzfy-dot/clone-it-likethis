import type { ReactElement, SVGProps } from "react";

/**
 * Conjunto de ícones próprio da apostamaxy: traço único de 1.75px,
 * cantos vivos e cortes diagonais, para não parecer biblioteca padrão.
 */
export type MaxyIcon = (p: SVGProps<SVGSVGElement>) => ReactElement;

function Base({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}

export const IcCasino: MaxyIcon = (p) => (
  <Base {...p}><path d="M4 4h11l5 5v11H9l-5-5z" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /></Base>
);
export const IcSlots: MaxyIcon = (p) => (
  <Base {...p}><path d="M3 6h15v13H3z" /><path d="M8 6v13M13 6v13" /><path d="M18 9h3v-4" /><path d="M5 12.5h1M10 12.5h1M15 12.5h1" /></Base>
);
export const IcCrash: MaxyIcon = (p) => (
  <Base {...p}><path d="M3 20h18" /><path d="M4 17c5 0 9-3 12-11" /><path d="M12 6h5v5" /></Base>
);
export const IcLive: MaxyIcon = (p) => (
  <Base {...p}><path d="M3 6h18v12H3z" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" /></Base>
);
export const IcSports: MaxyIcon = (p) => (
  <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5l3.5 2.5-1.3 4h-4.4l-1.3-4z" /><path d="M12 3.5v4M20 10l-4.5 0M17 19l-2.8-5M7 19l2.8-5M4 10h4.5" /></Base>
);
export const IcFire: MaxyIcon = (p) => (
  <Base {...p}><path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 2 3 4 1-2 1-5 1-8z" /></Base>
);
export const IcGrid: MaxyIcon = (p) => (
  <Base {...p}><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></Base>
);
export const IcTrophy: MaxyIcon = (p) => (
  <Base {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /><path d="M12 14v4M8 20h8" /></Base>
);
export const IcGift: MaxyIcon = (p) => (
  <Base {...p}><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" /><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0" /></Base>
);
export const IcPix: MaxyIcon = (p) => (
  <Base {...p}><path d="M12 3l9 9-9 9-9-9z" /><path d="M7.5 7.5l4.5 4.5 4.5-4.5M7.5 16.5l4.5-4.5 4.5 4.5" /></Base>
);
export const IcFriends: MaxyIcon = (p) => (
  <Base {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-4 3-6 6-6s6 2 6 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3 2.6 3 6" /></Base>
);
export const IcSearch: MaxyIcon = (p) => (
  <Base {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></Base>
);
export const IcHome: MaxyIcon = (p) => (
  <Base {...p}><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" /></Base>
);
