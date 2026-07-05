import { type ComponentType, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Compass, LifeBuoy, MousePointerClick, ShieldAlert, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";
import { startGuidedTour, type TourScenario } from "@/components/GuidedAppTour";

type QuickHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenIntroduction: () => void;
};

type ScenarioCard = {
  id: TourScenario;
  icon: ComponentType<{ className?: string }>;
  title: { pl: string; en: string };
  body: { pl: string; en: string };
  show: boolean;
};

export function QuickHelpDialog({ open, onOpenChange, onOpenIntroduction }: QuickHelpDialogProps) {
  const { lang } = useI18n();
  const { roleFlags } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentContextLabel = useMemo(() => {
    if (location.pathname.startsWith("/forms/new")) return lang === "en" ? "New request" : "Nowy wniosek";
    if (location.pathname.startsWith("/mandatory-trainings")) return lang === "en" ? "Mandatory trainings" : "Szkolenia obowiązkowe";
    if (location.pathname.startsWith("/admin")) return lang === "en" ? "Administration" : "Administracja";
    return lang === "en" ? "Current screen" : "Aktualny ekran";
  }, [lang, location.pathname]);

  const scenarios: ScenarioCard[] = [
    {
      id: "overview",
      icon: Compass,
      title: { pl: "Szybki przegląd aplikacji", en: "Quick application overview" },
      body: {
        pl: "Krótka trasa po najważniejszych elementach wspólnych: menu, dzwoneczek, preferencje i stopka.",
        en: "A short route through shared essentials: menu, notification bell, preferences and footer.",
      },
      show: true,
    },
    {
      id: "new-request",
      icon: BookOpen,
      title: { pl: "Pierwszy wniosek krok po kroku", en: "First request step by step" },
      body: {
        pl: "Przejdź do ekranu Nowy wniosek i zobacz, jak wybrać obszar oraz założyć formularz.",
        en: "Jump to the New request screen and see how to choose an area and create the form.",
      },
      show: roleFlags.isEditor || roleFlags.isManager,
    },
    {
      id: "mandatory-trainings",
      icon: ShieldAlert,
      title: { pl: "Szkolenia obowiązkowe", en: "Mandatory trainings" },
      body: {
        pl: "Aplikacja przeprowadzi Cię przez podsumowanie, wyszukiwarkę, filtry i tabelę rekordów.",
        en: "The app will walk you through the summary, search, filters and the main records table.",
      },
      show: roleFlags.isEditor || roleFlags.isManager || roleFlags.isHr,
    },
    {
      id: "admin-import",
      icon: Sparkles,
      title: { pl: "Import Excela HR", en: "HR Excel import" },
      body: {
        pl: "Dla HR i administratora: import, statystyki oraz niezmapowane MPK w panelu administracyjnym.",
        en: "For HR and admins: import, stats and unmapped cost centers in the admin area.",
      },
      show: roleFlags.isHr,
    },
  ];

  const startScenario = (scenario: TourScenario) => {
    onOpenChange(false);
    window.setTimeout(() => startGuidedTour(scenario), 120);
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-none overflow-hidden rounded-[30px] border-white/10 bg-background/95 p-0 sm:max-w-[1080px] lg:max-w-[1180px] xl:max-w-[1240px]">
        <ScrollArea className="max-h-[92vh] rounded-[30px]">
          <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent)] p-5 sm:p-7 lg:p-9">
            <DialogHeader className="max-w-3xl space-y-2 text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                <LifeBuoy className="h-3.5 w-3.5" />
                {lang === "en" ? "Quick help" : "Szybka pomoc"}
              </div>
              <DialogTitle className="text-2xl leading-tight sm:text-3xl">
                {lang === "en" ? "Help for this screen" : "Pomoc dla tego ekranu"}
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-6">
                {lang === "en"
                  ? "Start the introduction, launch a short guide for the current page or choose a ready scenario. Everything opens here, without switching to a separate tab."
                  : "Uruchom wprowadzenie, krótki przewodnik po bieżącej stronie albo gotowy scenariusz. Wszystko otworzysz tutaj, bez przechodzenia do osobnej zakładki."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-5">
              <Card className="rounded-3xl border-white/10 bg-background/70 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle>{lang === "en" ? "Current context" : "Bieżący kontekst"}</CardTitle>
                  <CardDescription className="leading-6">
                    {lang === "en"
                      ? `You are currently on: ${currentContextLabel}. Choose what you want to do next.`
                      : `Obecnie jesteś na ekranie: ${currentContextLabel}. Wybierz, co chcesz zrobić dalej.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button className="h-auto min-h-[120px] flex-1 basis-[260px] items-start justify-start rounded-2xl px-5 py-5 text-left whitespace-normal" onClick={() => { onOpenChange(false); onOpenIntroduction(); }}>
                    <Compass className="mr-3 mt-0.5 h-4 w-4 shrink-0" />
                    <span className="space-y-1">
                      <span className="block font-medium">{lang === "en" ? "Open introduction" : "Uruchom wprowadzenie"}</span>
                      <span className="block text-xs leading-5 text-primary-foreground/80">
                        {lang === "en" ? "A short overview before the detailed walkthroughs." : "Krótki przegląd aplikacji przed szczegółowymi oprowadzaniami."}
                      </span>
                    </span>
                  </Button>
                  <Button variant="outline" className="h-auto min-h-[120px] flex-1 basis-[260px] items-start justify-start rounded-2xl px-5 py-5 text-left whitespace-normal" onClick={() => startScenario("current")}>
                    <MousePointerClick className="mr-3 mt-0.5 h-4 w-4 shrink-0" />
                    <span className="space-y-1">
                      <span className="block font-medium">{lang === "en" ? "Guide me on this page" : "Pokaż po tej stronie"}</span>
                      <span className="block text-xs leading-5 text-muted-foreground">
                        {lang === "en" ? "Focus only on the elements visible on the current page." : "Skup się wyłącznie na elementach widocznych na tej stronie."}
                      </span>
                    </span>
                  </Button>
                  <Button variant="ghost" className="h-auto min-h-[120px] flex-1 basis-[260px] items-start justify-start rounded-2xl px-5 py-5 text-left whitespace-normal" onClick={() => { onOpenChange(false); navigate("/help"); }}>
                    <LifeBuoy className="mr-3 mt-0.5 h-4 w-4 shrink-0" />
                    <span className="space-y-1">
                      <span className="block font-medium">{lang === "en" ? "Open Help Center" : "Otwórz centrum pomocy"}</span>
                      <span className="block text-xs leading-5 text-muted-foreground">
                        {lang === "en" ? "FAQ, ready scenarios and extra instructions in one place." : "FAQ, gotowe scenariusze i dodatkowe instrukcje w jednym miejscu."}
                      </span>
                    </span>
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {lang === "en" ? "Ready walkthrough scenarios" : "Gotowe scenariusze oprowadzania"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lang === "en"
                      ? "Choose a concrete workflow. Each row opens the right screen and starts the matching tour."
                      : "Wybierz konkretny proces. Każdy wiersz otworzy właściwy ekran i uruchomi dopasowane oprowadzanie."}
                  </p>
                </div>

                <div className="grid gap-3">
                  {scenarios.filter((item) => item.show).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Card key={item.id} className="rounded-3xl border-white/10 bg-background/70 backdrop-blur">
                        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-semibold leading-6">{item.title[lang]}</div>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body[lang]}</p>
                            </div>
                          </div>
                          <Button variant="outline" className="w-full shrink-0 rounded-2xl xl:w-auto xl:min-w-[240px]" onClick={() => startScenario(item.id)}>
                            {lang === "en" ? "Start walkthrough" : "Uruchom oprowadzanie"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
