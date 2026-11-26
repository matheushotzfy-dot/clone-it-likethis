import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { FreezeBanner } from "@/components/notifications/freeze-banner";
import { PlatformStatusBar } from "@/components/notifications/platform-status-bar";
import { useTransactionNotifications } from "@/hooks/use-transaction-notifications";

export function SiteShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  useTransactionNotifications();
  return (
    <div className="app-shell flex min-h-dvh w-full bg-background">
      <AppSidebar />
      <div className="app-column flex min-w-0 flex-1 flex-col">
        <PlatformStatusBar />
        <Header />
        <FreezeBanner />
        <main className="app-main min-w-0 flex-1 lg:pb-0">{children}</main>
        {!bare && <Footer />}
      </div>
      <MobileBottomNav />
    </div>
  );
}
