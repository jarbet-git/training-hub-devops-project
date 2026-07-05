import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, Check, Compass, FolderKanban, Forward, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/app/i18n";
import { startGuidedTour } from "@/components/GuidedAppTour";

const TOUR_KEY = "poap_intro_seen_v1";

export function hasSeenIntroduction() {
  return typeof window !== "undefined" && window.localStorage.getItem(TOUR_KEY) === "1";
}

export function markIntroductionSeen() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOUR_KEY, "1");
  }
}

export function IntroductionTourDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { lang } = useI18n();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const steps = useMemo(
    () =>
      lang === "en"
        ? [
            { icon: Compass, title: "Welcome to Training Hub", body: "Use the left navigation to move between requests, inboxes, mandatory trainings and administration." },
            { icon: FolderKanban, title: "Create your first request", body: "Open New request, choose an area, add items and submit the request to the next workflow stage." },
            { icon: Bell, title: "Stay on top of notifications", body: "The bell groups pending actions and mandatory training alerts so you can jump straight to the right list." },
            { icon: ShieldAlert, title: "Monitor mandatory trainings", body: "Managers and editors can see expiring mandatory trainings sorted by urgency, while HR/Admin manage imports." },
            { icon: Sparkles, title: "Use Help and About", body: "You can always return to quick help, the Help Center and the About page from the top bar, footer and left menu. On the last step you can also launch a full guided walkthrough." },
          ]
        : [
            { icon: Compass, title: "Witaj w Training Hub", body: "Po lewej stronie znajdziesz nawigację do wniosków, inboxów, szkoleń obowiązkowych i panelu administracyjnego." },
            { icon: FolderKanban, title: "Utwórz pierwszy wniosek", body: "Wejdź w Nowy wniosek, wybierz obszar, dodaj pozycje i przekaż wniosek do kolejnego etapu procesu." },
            { icon: Bell, title: "Korzystaj z powiadomień", body: "Dzwoneczek grupuje oczekujące działania i alerty o szkoleniach obowiązkowych, aby szybko przejść do właściwej listy." },
            { icon: ShieldAlert, title: "Pilnuj szkoleń obowiązkowych", body: "Managerowie i edytorzy widzą wygasające szkolenia posortowane po pilności, a HR/Admin zarządzają importem danych." },
            { icon: Sparkles, title: "Korzystaj z pomocy i strony O aplikacji", body: "Do szybkiej pomocy, centrum pomocy i strony O aplikacji wrócisz z górnego paska, stopki oraz menu po lewej stronie. Na końcu możesz też uruchomić pełne oprowadzanie po interfejsie." },
          ],
    [lang],
  );

  const current = steps[step];
  const Icon = current.icon;

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl border-white/10 bg-background/95 p-0">
        <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-6">
          <DialogHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle className="text-2xl">{current.title}</DialogTitle>
            <DialogDescription className="max-w-xl text-sm leading-6">{current.body}</DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex gap-2">
            {steps.map((_, index) => (
              <div key={index} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-white/10"}`} />
            ))}
          </div>

          <DialogFooter className="mt-8 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              <Forward className="mr-2 h-4 w-4" />
              {lang === "en" ? "Skip" : "Pomiń"}
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {lang === "en" ? "Back" : "Wstecz"}
              </Button>
              {step < steps.length - 1 ? (
                <Button className="rounded-xl" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {lang === "en" ? "Next" : "Dalej"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      markIntroductionSeen();
                      onOpenChange(false);
                      window.setTimeout(() => startGuidedTour("overview"), 120);
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {lang === "en" ? "Start guided walkthrough" : "Uruchom oprowadzanie"}
                  </Button>
                  <Button
                    className="rounded-xl"
                    onClick={() => {
                      markIntroductionSeen();
                      onOpenChange(false);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {lang === "en" ? "Finish" : "Zakończ"}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
