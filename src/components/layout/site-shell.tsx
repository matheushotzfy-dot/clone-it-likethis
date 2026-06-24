import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { FreezeBanner } from "@/components/notifications/freeze-banner";
import { useTransactionNotifications } from "@/hooks/use-transaction-notifications";

export function SiteShell({ children }: { children: ReactNode }) {
  useTransactionNotifications();
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <FreezeBanner />
        <main className="flex-1 pb-28 lg:pb-0">{children}</main>
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}

