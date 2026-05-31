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
  // we transition between dialogs (e.g. register → deposit). This freezes the
  // whole UI: buttons stop responding even though the click handlers exist.
  // Clear it whenever the active dialog changes.
  useEffect(() => {
    const clear = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
    clear();
    const t = window.setTimeout(clear, 350);
    return () => window.clearTimeout(t);
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
