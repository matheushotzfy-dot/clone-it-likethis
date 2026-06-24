import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type DialogKey = "login" | "register" | "deposit" | "promotions" | null;

interface Ctx {
  current: DialogKey;
  open: (k: DialogKey) => void;
  close: () => void;
}

const AuthDialogContext = createContext<Ctx>({ current: null, open: () => {}, close: () => {} });

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogKey>(null);

  // Fix: Radix can leave global interaction/scroll locks on <body> after a
  // dialog closes or while a non-modal menu is open, freezing taps and scroll.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const strip = () => {
      const hasOpenDialog = !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
      if (!current && !hasOpenDialog) {
        if (document.body.style.overflow === "hidden") document.body.style.overflow = "";
        if (document.body.style.position === "fixed") document.body.style.position = "";
        if (document.body.style.touchAction === "none") document.body.style.touchAction = "";
      }
    };
    strip();
    const mo = new MutationObserver(strip);
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => mo.disconnect();
  }, [current]);


  const open = useCallback((k: DialogKey) => {
    // Defer to next frame so a previous dialog has a chance to fully unmount
    // before the next one mounts (prevents Radix lock conflicts).
    if (k && k !== current) {
      setCurrent(null);
      window.setTimeout(() => setCurrent(k), 0);
    } else {
      setCurrent(k);
    }
  }, [current]);

  const close = useCallback(() => setCurrent(null), []);

  return (
    <AuthDialogContext.Provider value={{ current, open, close }}>
      {children}
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  return useContext(AuthDialogContext);
}
