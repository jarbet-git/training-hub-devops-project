import { type ComponentType, useState } from "react";
import { BookOpen, Compass, LifeBuoy, MousePointerClick, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntroductionTourDialog } from "@/components/IntroductionTourDialog";
import { startGuidedTour, type TourScenario } from "@/components/GuidedAppTour";
import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";

const FAQ = {
  pl: [
    {
      q: "Jak rozpocząć pracę z aplikacją?",
      a: "Najpierw uruchom Wprowadzenie, a potem wybierz jedno z oprowadzań scenariuszowych. Dzięki temu użytkownik nie musi sam szukać właściwych zakładek.",
    },
    {
      q: "Do czego służy dzwoneczek powiadomień?",
      a: "Dzwoneczek zbiera sprawy wymagające reakcji w jednym miejscu. Po kliknięciu przejdziesz od razu do właściwej listy z gotowym filtrem.",
    },
    {
      q: "Gdzie sprawdzić szkolenia obowiązkowe?",
      a: "Manager i editor korzystają z zakładki Szkolenia obowiązkowe. HR i administrator dodatkowo mają w panelu admina import pliku Excel z Workday.",
    },
    {
      q: "Czy mogę uruchomić oprowadzanie bez przechodzenia do Pomocy?",
      a: "Tak. Kliknij ikonę pomocy w górnym pasku. Otworzy się szybka pomoc, z której uruchomisz wprowadzenie lub oprowadzanie dla bieżącego ekranu.",
    },
  ],
  en: [
    {
      q: "How do I get started with the app?",
      a: "Start with the introduction and then choose one of the guided workflow scenarios. This way the user does not need to search for the right tabs manually.",
    },
    {
      q: "What is the notifications bell for?",
      a: "The bell gathers actions that need attention in one place. Clicking an item opens the right list with the proper filter already applied.",
    },
    {
      q: "Where can I review mandatory trainings?",
      a: "Managers and editors use the Mandatory trainings section. HR and admins additionally manage the Workday Excel import in the admin panel.",
    },
    {
      q: "Can I start a walkthrough without opening Help first?",
      a: "Yes. Click the help icon in the top bar to open quick help and launch the introduction or a tour for the current screen.",
    },
  ],
} as const;

export function HelpPage() {
  const { lang } = useI18n();
  const { roleFlags } = useAuth();
  const [tourOpen, setTourOpen] = useState(false);

  const faq = FAQ[lang];

  const scenarios: Array<{
    id: TourScenario;
    icon: ComponentType<{ className?: string }>;
    title: string;
    body: string;
    show: boolean;
  }> = [
    {
      id: "overview",
      icon: Compass,
      title: lang === "en" ? "Quick overview" : "Szybki przegląd",
      body:
        lang === "en"
          ? "A compact route through the layout, notification bell, preferences and footer."
          : "Krótka trasa po układzie aplikacji, dzwoneczku, preferencjach i stopce.",
      show: true,
    },
    {
      id: "new-request",
      icon: BookOpen,
      title: lang === "en" ? "First request" : "Pierwszy wniosek",
      body:
        lang === "en"
          ? "The app takes the user to New request and explains the area selection and form creation step by step."
          : "Aplikacja przenosi użytkownika do Nowego wniosku i krok po kroku wyjaśnia wybór obszaru oraz założenie formularza.",
      show: roleFlags.isEditor || roleFlags.isManager,
    },
    {
      id: "mandatory-trainings",
      icon: ShieldAlert,
      title: lang === "en" ? "Mandatory trainings" : "Szkolenia obowiązkowe",
      body:
        lang === "en"
          ? "Guided walkthrough of the summary cards, search, urgency filters and main table."
          : "Oprowadzenie przez karty podsumowania, wyszukiwarkę, filtry pilności i główną tabelę.",
      show: roleFlags.isEditor || roleFlags.isManager || roleFlags.isHr,
    },
    {
      id: "admin-import",
      icon: Sparkles,
      title: lang === "en" ? "HR Excel import" : "Import Excela HR",
      body:
        lang === "en"
          ? "For HR and admins: opens the admin module on the mandatory trainings tab and explains the import controls."
          : "Dla HR i administratora: otwiera moduł administracyjny na zakładce szkoleń obowiązkowych i wyjaśnia kontrolki importu.",
      show: roleFlags.isHr,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent)] p-8 shadow-[0_20px_80px_-45px_hsl(var(--primary)/0.45)] backdrop-blur">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/40 px-3 py-1 text-xs text-muted-foreground">
            <LifeBuoy className="h-3.5 w-3.5" />
            {lang === "en" ? "Help Center" : "Centrum pomocy"}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {lang === "en" ? "Explore the app step by step" : "Poznaj aplikację krok po kroku"}
          </h1>
          <p className="text-sm leading-7 text-muted-foreground">
            {lang === "en"
              ? "Start with a short introduction, then launch a concrete walkthrough. The app can open the right screen and continue the guidance there."
              : "Zacznij od krótkiego wprowadzenia, a potem uruchom wybrany scenariusz. Aplikacja może przejść do właściwego ekranu i kontynuować oprowadzanie w odpowiednim miejscu."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-2xl" onClick={() => setTourOpen(true)}>
              <Compass className="mr-2 h-4 w-4" />
              {lang === "en" ? "Open introduction" : "Uruchom wprowadzenie"}
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => startGuidedTour("current")}>
              <MousePointerClick className="mr-2 h-4 w-4" />
              {lang === "en" ? "Tour this page" : "Oprowadź po tej stronie"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-stretch">
        {scenarios
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} className="flex h-full flex-col rounded-3xl border-white/10 bg-card/70 backdrop-blur">
                <CardHeader className="flex flex-1 flex-col">
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="flex-1 leading-6">{item.body}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button variant="outline" className="w-full rounded-2xl" onClick={() => startGuidedTour(item.id)}>
                    {lang === "en" ? "Start walkthrough" : "Uruchom oprowadzanie"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
      </section>

      <section className="grid gap-4">
        {faq.map((item) => (
          <Card key={item.q} className="rounded-3xl border-white/10 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">{item.q}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">{item.a}</CardContent>
          </Card>
        ))}
      </section>

      <IntroductionTourDialog open={tourOpen} onOpenChange={setTourOpen} />
    </div>
  );
}
