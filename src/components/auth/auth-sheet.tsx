import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Moldura comum de login, cadastro e depósito: tela cheia no celular, cartão no desktop. */
export function AuthSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 440,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ maxWidth: width }}
        className={cn(
          "auth-sheet flex max-h-[94dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-[16px] border-border bg-background p-0",
          className,
        )}
      >
        <div className="auth-sheet-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-6 sm:px-7">
          <DialogTitle className="pr-10 text-[28px] leading-tight">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-[14.5px] text-muted-foreground">
              {description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13.5px] font-semibold text-foreground/90">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
