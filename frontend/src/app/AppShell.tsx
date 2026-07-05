import { Outlet } from "react-router-dom";
import { CircleHelp, Menu } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/app/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";
import { BrandLogo } from "@/components/BrandLogo";
import { AppFooter } from "@/components/AppFooter";
import { GuidedAppTour } from "@/components/GuidedAppTour";
import { IntroductionTourDialog, hasSeenIntroduction } from "@/components/IntroductionTourDialog";
import { QuickHelpDialog } from "@/components/QuickHelpDialog";

export function AppShell() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!hasSeenIntroduction()) {
      const id = window.setTimeout(() => setTourOpen(true), 400);
      return () => window.clearTimeout(id);
    }
  }, [user]);

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-transparent">
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-primary/12 blur-3xl floating-orb" />
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-chart-2/10 blur-3xl floating-orb" />
      <div className="pointer-events-none absolute inset-0 mesh-grid opacity-20" />
      <div className="grid min-h-dvh w-full grid-cols-1 md:grid-cols-[292px_1fr]">
        <div className="hidden border-r border-border/50 md:block">
          <div className="box-border h-dvh p-3">
            <div className="h-full rounded-[28px] border border-border/60 bg-background/72 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-background/60">
              <Sidebar />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b border-border/50 bg-background/72 backdrop-blur-xl dark:border-white/8 dark:bg-background/65">
            <div className="flex w-full items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 lg:px-6">
              <div className="md:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-2xl border-border/60 bg-background/72 backdrop-blur dark:border-white/10 dark:bg-background/60">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="border-border/60 bg-background/95 p-2 dark:border-white/10">
                    <div className="h-full rounded-[28px] border border-border/60 bg-background/78 dark:border-white/10 dark:bg-background/70">
                      <Sidebar onNavigate={() => setMobileOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <BrandLogo size="sm" showText={false} className="md:hidden" />

              <div className="min-w-0">
                <div className="text-sm font-semibold leading-none">{t("app.name")}</div>
                <div className="mt-1 hidden text-xs text-muted-foreground sm:block">{t("app.tagline")}</div>
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <Button
                  data-tour="help-button"
                  variant="outline"
                  size="icon"
                  className="rounded-2xl border-border/60 bg-background/72 backdrop-blur dark:border-white/10 dark:bg-background/60"
                  onClick={() => setHelpOpen(true)}
                  aria-label={t("nav.help")}
                >
                  <CircleHelp className="h-4 w-4" />
                </Button>
                <NotificationBell />
                <div data-tour="topbar-preferences" className="flex items-center gap-2">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
                <UserMenu />
              </div>
            </div>
          </header>

          <main className="w-full min-h-0 flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
            <Outlet />
          </main>

          <AppFooter />
        </div>
      </div>

      <IntroductionTourDialog open={tourOpen} onOpenChange={setTourOpen} />
      <QuickHelpDialog open={helpOpen} onOpenChange={setHelpOpen} onOpenIntroduction={() => setTourOpen(true)} />
      <GuidedAppTour />
    </div>
  );
}
