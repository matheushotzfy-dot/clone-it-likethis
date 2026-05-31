import { createContext, useContext, useState, type ReactNode } from "react";

type DialogKey = "login" | "register" | "deposit" | "promotions" | null;

interface Ctx {
  current: DialogKey;
  open: (k: DialogKey) => void;
  close: () => void;
}

const AuthDialogContext = createContext<Ctx>({ current: null, open: () => {}, close: () => {} });

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogKey>(null);
  return (
    <AuthDialogContext.Provider value={{ current, open: setCurrent, close: () => setCurrent(null) }}>
      {children}
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  return useContext(AuthDialogContext);
}
