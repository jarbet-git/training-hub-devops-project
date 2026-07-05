import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/app/i18n";

type Rect = { top: number; left: number; width: number; height: number };
type StepShape = "frame" | "point";

export type TourScenario =
  | "current"
  | "overview"
  | "new-request"
  | "mandatory-trainings"
  | "admin-import";

type StepDef = {
  id: string;
  selector: string | string[];
  title: { pl: string; en: string };
  body: { pl: string; en: string };
  padding?: number;
  shape?: StepShape;
};

type TourRequest = {
  scenario?: TourScenario;
};

type ScenarioConfig = {
  path?: string;
  search?: string;
  stepIds: string[];
};

const TOUR_EVENT = "poap:start-guided-tour";

const STEPS: StepDef[] = [
  {
    id: "sidebar",
    selector: '[data-tour="sidebar-nav"]',
    title: { pl: "Menu boczne", en: "Sidebar navigation" },
    body: {
      pl: "To jest główna mapa aplikacji. Przejdziesz stąd do dashboardu, skrzynek, administracji, pomocy oraz strony O aplikacji.",
      en: "This is the main application map. Use it to move between the dashboard, inboxes, administration, Help and the About page.",
    },
    padding: 10,
    shape: "frame",
  },
  {
    id: "new-request",
    selector: '[data-tour="new-request"]',
    title: { pl: "Nowy wniosek", en: "New request" },
    body: {
      pl: "Stąd zaczynasz proces wniosków szkoleniowych. Kliknij, aby utworzyć nowy wniosek dla swojego obszaru i przejść do wypełnienia pozycji szkoleniowych.",
      en: "Start the training request flow here. Click to create a new request for your area and continue with training items.",
    },
    padding: 5,
    shape: "point",
  },
  {
    id: "help-button",
    selector: '[data-tour="help-button"]',
    title: { pl: "Szybka pomoc", en: "Quick help" },
    body: {
      pl: "Ten przycisk otwiera szybkie centrum pomocy. Stąd uruchomisz wprowadzenie, gotowe scenariusze i oprowadzanie po bieżącym ekranie.",
      en: "This button opens quick help. From there you can launch the introduction, ready-made scenarios and a tour for the current screen.",
    },
    padding: 2,
    shape: "point",
  },
  {
    id: "notifications",
    selector: '[data-tour="notifications"]',
    title: { pl: "Powiadomienia", en: "Notifications" },
    body: {
      pl: "Dzwoneczek grupuje zadania wymagające reakcji, np. odpowiedź HR, decyzję managera albo wygasające szkolenia obowiązkowe.",
      en: "The bell groups items that need action, such as HR responses, manager decisions or expiring mandatory trainings.",
    },
    padding: 2,
    shape: "point",
  },
  {
    id: "mandatory-trainings",
    selector: '[data-tour="mandatory-trainings"]',
    title: { pl: "Szkolenia obowiązkowe", en: "Mandatory trainings" },
    body: {
      pl: "Ta zakładka pokazuje pracowników z wygasającymi lub przeterminowanymi szkoleniami. Lista jest sortowana od najbardziej pilnych rekordów.",
      en: "This section shows employees with expiring or overdue trainings. The list is sorted with the most urgent records first.",
    },
    padding: 4,
    shape: "point",
  },
  {
    id: "language-toggle",
    selector: '[data-tour="language-toggle"]',
    title: { pl: "Zmiana języka", en: "Language switch" },
    body: {
      pl: "Tutaj natychmiast przełączysz cały interfejs między polskim i angielskim.",
      en: "Use this control to switch the whole interface between Polish and English.",
    },
    padding: 2,
    shape: "point",
  },
  {
    id: "theme-toggle",
    selector: '[data-tour="theme-toggle"]',
    title: { pl: "Tryb jasny / ciemny", en: "Light / dark mode" },
    body: {
      pl: "Ten przycisk pozwala szybko zmienić motyw aplikacji bez przechodzenia do ustawień profilu.",
      en: "Use this button to quickly change the app theme without opening profile settings.",
    },
    padding: 2,
    shape: "point",
  },
  {
    id: "user-menu",
    selector: '[data-tour="user-menu"]',
    title: { pl: "Menu użytkownika", en: "User menu" },
    body: {
      pl: "Z tego miejsca przejdziesz do swojego konta, ustawień avatara i wylogowania.",
      en: "Open your account, avatar settings and sign-out from this menu.",
    },
    padding: 3,
    shape: "point",
  },
  {
    id: "create-form-header",
    selector: '[data-tour="create-form-header"]',
    title: { pl: "Tworzenie nowego wniosku", en: "Creating a new request" },
    body: {
      pl: "To jest ekran startowy nowego wniosku. Najpierw wybierasz obszar, a potem system zakłada formularz i przenosi Cię do szczegółów.",
      en: "This is the start of the new request flow. First choose the area, then the system creates the form and opens its details.",
    },
    padding: 10,
    shape: "frame",
  },
  {
    id: "create-form-area",
    selector: '[data-tour="create-form-area-trigger"]',
    title: { pl: "Wybór obszaru", en: "Area selection" },
    body: {
      pl: "Wybierz obszar, dla którego składasz wniosek. To od niego zależą uprawnienia, obieg oraz późniejsze raportowanie.",
      en: "Choose the area for which the request is being created. It drives permissions, workflow and reporting.",
    },
    padding: 8,
    shape: "point",
  },
  {
    id: "create-form-actions",
    selector: '[data-tour="create-form-submit"]',
    title: { pl: "Założenie formularza", en: "Creating the form" },
    body: {
      pl: "Po kliknięciu przycisku system utworzy nowy wniosek. Następny krok to dodanie pozycji szkoleniowych, budżetów i uzasadnienia.",
      en: "Click the button to create the request. The next step is adding training items, budgets and business justification.",
    },
    padding: 8,
    shape: "point",
  },
  {
    id: "mandatory-summary",
    selector: '[data-tour="mandatory-summary"]',
    title: { pl: "Szybkie podsumowanie", en: "Quick summary" },
    body: {
      pl: "Na górze widzisz liczbę wszystkich rekordów, przeterminowanych szkoleń oraz tych wygasających w 7 i 30 dni.",
      en: "This summary shows all records, overdue trainings and those expiring within 7 and 30 days.",
    },
    padding: 10,
    shape: "frame",
  },
  {
    id: "mandatory-search",
    selector: '[data-tour="mandatory-search-input"]',
    title: { pl: "Wyszukiwanie", en: "Search" },
    body: {
      pl: "Tutaj szybko znajdziesz pracownika, szkolenie albo MPK bez ręcznego przeglądania całej tabeli.",
      en: "Use this search box to quickly find an employee, training or cost center without scanning the whole table.",
    },
    padding: 8,
    shape: "point",
  },
  {
    id: "mandatory-filters",
    selector: '[data-tour="mandatory-filters-list"]',
    title: { pl: "Filtry pilności", en: "Urgency filters" },
    body: {
      pl: "Zakładki pozwalają zawęzić widok do rekordów po terminie, wygasających w 7 dni, 30 dni albo wszystkich wpisów.",
      en: "These tabs filter the list to overdue records, items expiring within 7 days, 30 days or all records.",
    },
    padding: 8,
    shape: "frame",
  },
  {
    id: "mandatory-table",
    selector: '[data-tour="mandatory-table"]',
    title: { pl: "Tabela operacyjna", en: "Operational table" },
    body: {
      pl: "Tutaj sprawdzisz pracownika, nazwę szkolenia, MPK, koszt, datę wygaśnięcia i liczbę dni do terminu.",
      en: "This table shows the employee, training name, cost center, cost, expiration date and days left.",
    },
    padding: 10,
    shape: "frame",
  },
  {
    id: "admin-mandatory-upload",
    selector: ['#mandatory-trainings-file-input', '[data-tour="admin-mandatory-import-button"]'],
    title: { pl: "Import Excela od HR", en: "HR Excel import" },
    body: {
      pl: "Tutaj HR lub administrator wskazuje eksport z Workday i nadpisuje poprzedni import obowiązkowych szkoleń.",
      en: "HR or an administrator selects the Workday export here and replaces the previous mandatory training import.",
    },
    padding: 8,
    shape: "frame",
  },
  {
    id: "admin-mandatory-stats",
    selector: '[data-tour="admin-mandatory-stats"]',
    title: { pl: "Kontrola importu", en: "Import control" },
    body: {
      pl: "Po imporcie widać liczbę wszystkich rekordów, przeterminowanych pozycji oraz szkoleń wygasających w 7 i 30 dni.",
      en: "After the import you can review totals, overdue items and trainings expiring within 7 and 30 days.",
    },
    padding: 10,
    shape: "frame",
  },
  {
    id: "admin-mandatory-unmapped",
    selector: '[data-tour="admin-mandatory-unmapped"]',
    title: { pl: "Niezmapowane MPK", en: "Unmapped cost centers" },
    body: {
      pl: "Jeżeli w imporcie pojawi się MPK bez powiązania w Training Hub, zobaczysz je tutaj i od razu wiesz, co wymaga uzupełnienia w słownikach.",
      en: "If the import contains a cost center not mapped in Training Hub, it appears here so you know what still needs dictionary mapping.",
    },
    padding: 10,
    shape: "frame",
  },
  {
    id: "footer-links",
    selector: '[data-tour="footer-links"]',
    title: { pl: "Stopka", en: "Footer" },
    body: {
      pl: "Ze stopki przejdziesz do Pomocy, strony O aplikacji i changelogu wersji rozwojowej.",
      en: "Use the footer to open Help, the About page and the development changelog.",
    },
    padding: 10,
    shape: "frame",
  },
];

const STEP_MAP = new Map(STEPS.map((step) => [step.id, step]));

const SCENARIOS: Record<Exclude<TourScenario, "current">, ScenarioConfig> = {
  overview: {
    stepIds: ["sidebar", "new-request", "help-button", "notifications", "language-toggle", "theme-toggle", "user-menu", "footer-links"],
  },
  "new-request": {
    path: "/forms/new",
    stepIds: ["sidebar", "new-request", "create-form-header", "create-form-area", "create-form-actions", "help-button", "notifications", "user-menu"],
  },
  "mandatory-trainings": {
    path: "/mandatory-trainings",
    stepIds: ["mandatory-trainings", "mandatory-summary", "mandatory-search", "mandatory-filters", "mandatory-table", "notifications"],
  },
  "admin-import": {
    path: "/admin",
    search: "tab=mandatory_trainings",
    stepIds: ["admin-mandatory-upload", "admin-mandatory-stats", "admin-mandatory-unmapped", "notifications"],
  },
};

function normalizeSearch(search?: string) {
  if (!search) return "";
  return search.startsWith("?") ? search.slice(1) : search;
}

function inferScenarioFromLocation(pathname: string, search: string): Exclude<TourScenario, "current"> {
  if (pathname.startsWith("/forms/new")) return "new-request";
  if (pathname.startsWith("/mandatory-trainings")) return "mandatory-trainings";
  if (pathname.startsWith("/admin") && normalizeSearch(search).includes("tab=mandatory_trainings")) return "admin-import";
  return "overview";
}

export function startGuidedTour(scenario: TourScenario = "current") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<TourRequest>(TOUR_EVENT, { detail: { scenario } }));
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function overlaps(a: Rect, b: Rect) {
  return !(a.left + a.width < b.left || b.left + b.width < a.left || a.top + a.height < b.top || b.top + b.height < a.top);
}

function getCardRect(top: number, left: number, width: number, height: number): Rect {
  return { top, left, width, height };
}

function isElementVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  const bounds = el.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && bounds.width > 0 && bounds.height > 0;
}

function getMatchedElements(step: StepDef): HTMLElement[] {
  const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
  const found = selectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
  const visible = found.filter(isElementVisible);
  return visible.length > 0 ? visible : found;
}

function normalizeRect(rect: Rect): Rect {
  return {
    top: Number(rect.top.toFixed(2)),
    left: Number(rect.left.toFixed(2)),
    width: Number(rect.width.toFixed(2)),
    height: Number(rect.height.toFixed(2)),
  };
}

function expandRect(rect: Rect, padding: number, minSize = 16): Rect {
  return normalizeRect({
    top: Math.max(4, rect.top - padding),
    left: Math.max(4, rect.left - padding),
    width: Math.max(minSize, rect.width + padding * 2),
    height: Math.max(minSize, rect.height + padding * 2),
  });
}

function getUnionRect(elements: HTMLElement[], padding: number): Rect | null {
  if (elements.length === 0) return null;
  const rects = elements.map((el) => el.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0);
  if (rects.length === 0) return null;

  const top = Math.min(...rects.map((box) => box.top));
  const left = Math.min(...rects.map((box) => box.left));
  const right = Math.max(...rects.map((box) => box.right));
  const bottom = Math.max(...rects.map((box) => box.bottom));

  return expandRect({ top, left, width: right - left, height: bottom - top }, padding);
}

function getStepRect(step: StepDef, elements: HTMLElement[], padding: number): Rect | null {
  if (elements.length === 0) return null;
  if (step.shape === "point") {
    const primary = elements[0];
    const box = primary.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    return expandRect({ top: box.top, left: box.left, width: box.width, height: box.height }, padding, 14);
  }
  return getUnionRect(elements, padding);
}

function isRectFullyVisible(rect: DOMRect | Rect, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight) {
  return rect.top >= 16 && rect.left >= 16 && rect.top + rect.height <= viewportHeight - 16 && rect.left + rect.width <= viewportWidth - 16;
}

export function GuidedAppTour() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [requestedScenario, setRequestedScenario] = useState<TourScenario | null>(null);
  const [activeScenario, setActiveScenario] = useState<Exclude<TourScenario, "current">>("overview");
  const [requestKey, setRequestKey] = useState(0);

  const availableSteps = useMemo(() => {
    const config = SCENARIOS[activeScenario];
    return config.stepIds
      .map((id) => STEP_MAP.get(id))
      .filter((step): step is StepDef => !!step)
      .filter((step) => typeof document !== "undefined" && getMatchedElements(step).length > 0);
  }, [activeScenario, location.pathname, location.search, open]);

  const current = availableSteps[stepIndex] ?? null;

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TourRequest>).detail;
      setRequestedScenario(detail?.scenario ?? "current");
      setRequestKey((value) => value + 1);
    };
    window.addEventListener(TOUR_EVENT, handler as EventListener);
    return () => window.removeEventListener(TOUR_EVENT, handler as EventListener);
  }, []);

  useEffect(() => {
    if (!requestedScenario) return;

    const scenario = requestedScenario === "current" ? inferScenarioFromLocation(location.pathname, location.search) : requestedScenario;

    const config = SCENARIOS[scenario];
    const targetSearch = normalizeSearch(config.search);
    const currentSearch = normalizeSearch(location.search);

    if (config.path && (location.pathname !== config.path || targetSearch !== currentSearch)) {
      const target = targetSearch ? `${config.path}?${targetSearch}` : config.path;
      navigate(target);
      return;
    }

    const timeout = window.setTimeout(() => {
      setActiveScenario(scenario);
      setStepIndex(0);
      setOpen(true);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [requestedScenario, requestKey, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!open || availableSteps.length > 0) return;
    toast.error(
      lang === "en" ? "No tour steps are available on this screen yet." : "Na tym ekranie nie ma jeszcze dostępnych kroków oprowadzania.",
    );
    setOpen(false);
  }, [availableSteps.length, lang, open]);

  useEffect(() => {
    if (stepIndex >= availableSteps.length && availableSteps.length > 0) {
      setStepIndex(availableSteps.length - 1);
    }
  }, [availableSteps.length, stepIndex]);

  useLayoutEffect(() => {
    if (!open || !current) {
      setRect(null);
      return;
    }

    const padding = current.padding ?? 10;
    let frame: number | null = null;
    let timeout: number | null = null;
    const observers: ResizeObserver[] = [];

    const updateRect = () => {
      const elements = getMatchedElements(current);
      if (elements.length === 0) {
        setRect(null);
        return;
      }

      const primary = elements[0];
      const primaryBounds = primary.getBoundingClientRect();
      if (!isRectFullyVisible(primaryBounds)) {
        primary.scrollIntoView({ block: "center", inline: "nearest" });
        window.setTimeout(() => {
          const refreshed = getMatchedElements(current);
          const nextRect = getStepRect(current, refreshed, padding);
          setRect(nextRect);
        }, 90);
        return;
      }

      const nextRect = getStepRect(current, elements, padding);
      setRect(nextRect);
    };

    const scheduleUpdate = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateRect);
    };

    scheduleUpdate();
    timeout = window.setTimeout(scheduleUpdate, 220);

    const elements = getMatchedElements(current);
    if (typeof ResizeObserver !== "undefined") {
      elements.forEach((element) => {
        const observer = new ResizeObserver(scheduleUpdate);
        observer.observe(element);
        observers.push(observer);
      });
    }

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (timeout !== null) window.clearTimeout(timeout);
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [open, current, stepIndex]);

  if (!open || !current || !rect || typeof document === "undefined") return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(430, vw - 32);
  const cardHeight = 252;
  const gap = 20;

  const candidates = [
    { top: rect.top, left: rect.left + rect.width + gap },
    { top: rect.top + rect.height + gap, left: clamp(rect.left, 16, vw - cardWidth - 16) },
    { top: Math.max(16, rect.top - cardHeight - gap), left: clamp(rect.left, 16, vw - cardWidth - 16) },
    { top: rect.top, left: Math.max(16, rect.left - cardWidth - gap) },
  ].map((pos) => ({
    top: clamp(pos.top, 16, Math.max(16, vh - cardHeight - 16)),
    left: clamp(pos.left, 16, Math.max(16, vw - cardWidth - 16)),
  }));

  let selected = candidates[0];
  for (const candidate of candidates) {
    const candidateRect = getCardRect(candidate.top, candidate.left, cardWidth, cardHeight);
    if (!overlaps(candidateRect, rect)) {
      selected = candidate;
      break;
    }
  }

  const isPoint = current.shape === "point" || (rect.width <= 96 && rect.height <= 56);
  const highlightRect = rect;
  const pointIsRound = Math.abs(highlightRect.width - highlightRect.height) <= 10;

  const close = () => {
    setOpen(false);
    setRequestedScenario(null);
  };

  const scenarioLabel = {
    overview: { pl: "Szybki przegląd", en: "Quick overview" },
    "new-request": { pl: "Pierwszy wniosek", en: "First request" },
    "mandatory-trainings": { pl: "Szkolenia obowiązkowe", en: "Mandatory trainings" },
    "admin-import": { pl: "Import HR", en: "HR import" },
  }[activeScenario][lang];

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      <div className="absolute bg-black/58 backdrop-blur-[1.8px]" style={{ top: 0, left: 0, width: "100%", height: rect.top }} />
      <div className="absolute bg-black/58 backdrop-blur-[1.8px]" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
      <div
        className="absolute bg-black/58 backdrop-blur-[1.8px]"
        style={{ top: rect.top, left: rect.left + rect.width, width: `calc(100% - ${rect.left + rect.width}px)`, height: rect.height }}
      />
      <div
        className="absolute bg-black/58 backdrop-blur-[1.8px]"
        style={{ top: rect.top + rect.height, left: 0, width: "100%", height: `calc(100% - ${rect.top + rect.height}px)` }}
      />

      <div
        className={`absolute pointer-events-none transition-all duration-150 ${isPoint ? (pointIsRound ? "rounded-full" : "rounded-[20px]") : "rounded-[28px]"}`}
        style={{
          top: highlightRect.top - 5,
          left: highlightRect.left - 5,
          width: highlightRect.width + 10,
          height: highlightRect.height + 10,
          background: "radial-gradient(circle at center, hsl(var(--primary)/0.18), transparent 68%)",
          filter: "blur(10px)",
          opacity: 0.95,
        }}
      />
      <div
        className={`absolute pointer-events-none transition-all duration-150 ${isPoint ? (pointIsRound ? "rounded-full" : "rounded-[18px]") : "rounded-[26px]"}`}
        style={{
          top: highlightRect.top,
          left: highlightRect.left,
          width: highlightRect.width,
          height: highlightRect.height,
          boxShadow: "0 0 0 1px hsl(var(--primary)/0.95), 0 0 0 4px hsl(var(--primary)/0.16), 0 18px 48px -30px hsl(var(--primary)/0.95)",
          background: "linear-gradient(180deg, hsl(var(--primary)/0.08), transparent)",
        }}
      />

      <div
        className="absolute pointer-events-auto w-[min(430px,calc(100vw-2rem))] rounded-[30px] border border-white/10 bg-background/96 p-5 shadow-[0_24px_90px_-40px_rgba(0,0,0,0.65)]"
        style={{ top: selected.top, left: selected.left, width: cardWidth }}
      >
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
          <span>{lang === "en" ? "Guided tour" : "Oprowadzanie"}</span>
          <span className="h-1 w-1 rounded-full bg-primary/70" />
          <span>{scenarioLabel}</span>
          <span className="h-1 w-1 rounded-full bg-primary/70" />
          <span>
            {stepIndex + 1}/{availableSteps.length}
          </span>
        </div>
        <h3 className="text-xl font-semibold tracking-tight">{current.title[lang]}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.body[lang]}</p>

        <div className="mt-5 flex gap-2">
          {availableSteps.map((step, index) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${index <= stepIndex ? "bg-primary" : "bg-white/10"}`}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={close}>
            <X className="mr-2 h-4 w-4" />
            {lang === "en" ? "Close" : "Zamknij"}
          </Button>
          <Button
            variant="ghost"
            className="rounded-2xl"
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            disabled={stepIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {lang === "en" ? "Back" : "Wstecz"}
          </Button>
          {stepIndex < availableSteps.length - 1 ? (
            <Button className="rounded-2xl" onClick={() => setStepIndex((value) => Math.min(availableSteps.length - 1, value + 1))}>
              <ArrowRight className="mr-2 h-4 w-4" />
              {lang === "en" ? "Next" : "Dalej"}
            </Button>
          ) : (
            <Button className="rounded-2xl" onClick={close}>
              <Check className="mr-2 h-4 w-4" />
              {lang === "en" ? "Finish" : "Zakończ"}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
