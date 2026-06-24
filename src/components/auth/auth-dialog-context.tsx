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

  // Fix: Radix Dialog sometimes leaves `pointer-events: none` on <body> when
  // we transition between dialogs (e.g. register → deposit) or after a dialog
  // closes. This freezes the whole UI. Permanently watch <body> and strip the
  // style any time it appears.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const strip = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
    strip();
    const mo = new MutationObserver(strip);
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => mo.disconnect();
  }, []);


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
