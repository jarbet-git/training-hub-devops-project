import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Layers3,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Workflow,
  BarChart3,
  Users,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/context";
import { useI18n } from "@/app/i18n";
import { useNotificationSummary } from "@/features/notifications/queries";
import { useMandatoryTrainingSummary } from "@/features/mandatoryTrainings/queries";
import { useMyForms } from "@/features/forms/queries";
import { useDashboardComparison } from "@/features/dashboard/queries";
import { BrandWordmark } from "@/components/BrandWordmark";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
};

type GaugeCardProps = {
  title: string;
  value: number;
  total?: number;
  hint: string;
  colorClassName?: string;
  semantic?: "neutral" | "higher-better" | "lower-better";
};

type BreakdownItem = {
  label: string;
  value: number;
  tone?: "default" | "danger" | "success";
};

type ComparisonMetric = "forms" | "participants" | "budget";

const sectionMotion = {
  initial: { opacity: 0, filter: "blur(6px)" },
  whileInView: { opacity: 1, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.32, ease: "easeOut" as const },
};

function MetricCard({ title, value, hint, icon: Icon }: MetricCardProps) {
  return (
    <Card className="glass-card glass-lift rounded-[28px] border-border/60 bg-card/82 dark:border-white/10 dark:bg-card/72">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary shadow-[0_20px_40px_-28px_rgba(129,92,246,0.65)] dark:border-white/10">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function CircularGauge({ title, value, total = 100, hint, colorClassName, semantic = "neutral" }: GaugeCardProps) {
  const clampedTotal = total <= 0 ? 100 : total;
  const pct = Math.max(0, Math.min(100, Math.round((value / clampedTotal) * 100)));

  const tone = (() => {
    const ratio = semantic === "lower-better" ? 100 - pct : pct;
    if (semantic === "neutral") {
      if (pct >= 70) return { accent: "#8b5cf6", shadow: "rgba(139,92,246,0.55)", badge: "text-violet-300" };
      if (pct >= 35) return { accent: "#60a5fa", shadow: "rgba(96,165,250,0.52)", badge: "text-sky-300" };
      return { accent: "#22c55e", shadow: "rgba(34,197,94,0.48)", badge: "text-emerald-300" };
    }
    if (ratio >= 70) return { accent: "#22c55e", shadow: "rgba(34,197,94,0.5)", badge: "text-emerald-300" };
    if (ratio >= 35) return { accent: "#f59e0b", shadow: "rgba(245,158,11,0.5)", badge: "text-amber-300" };
    return { accent: "#ef4444", shadow: "rgba(239,68,68,0.5)", badge: "text-rose-300" };
  })();

  const style: CSSProperties = {
    background: `conic-gradient(${tone.accent} ${pct}%, rgba(255,255,255,0.10) ${pct}% 100%)`,
    boxShadow: `0 22px 54px -36px ${tone.shadow}`,
  };

  return (
    <div className="min-w-0 rounded-[28px] border border-border/60 bg-background/58 p-5 shadow-[0_22px_70px_-52px_rgba(129,92,246,0.42)] dark:border-white/10 dark:bg-background/50 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_96px] sm:items-center lg:grid-cols-1 lg:items-start xl:grid-cols-[minmax(0,1fr)_96px] xl:items-center">
        <div className="min-w-0">
          <div className="text-base font-semibold leading-6">{title}</div>
          <div className="mt-3 text-sm leading-7 text-muted-foreground">{hint}</div>
        </div>
        <div className="flex justify-start sm:justify-end lg:justify-start xl:justify-end">
          <div className={cn("relative flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full p-[7px]", colorClassName)} style={style}>
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-border/60 bg-background/92 px-2 text-center shadow-inner dark:border-white/10">
              <div className="text-[30px] font-semibold leading-none">{pct}%</div>
              <div className={cn("mt-1 text-[10px] uppercase tracking-[0.16em]", tone.badge)}>
                {value}/{clampedTotal}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownList({ title, description, items }: { title: string; description: string; items: BreakdownItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="min-w-0 rounded-[28px] border border-border/60 bg-background/58 p-5 dark:border-white/10 dark:bg-background/50">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{description}</div>

      <div className="mt-5 grid gap-4">
        {items.map((item) => {
          const width = `${Math.max(8, Math.round((item.value / max) * 100))}%`;
          const toneClassName =
            item.tone === "danger"
              ? "from-rose-500/90 to-orange-400/80"
              : item.tone === "success"
                ? "from-emerald-400/90 to-cyan-400/80"
                : "from-primary to-violet-400/80";

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
              <div className="h-2.5 rounded-full bg-foreground/6 dark:bg-white/6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className={cn("h-full rounded-full bg-gradient-to-r", toneClassName)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDateTime(value: string | null | undefined, lang: "pl" | "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number, lang: "pl" | "en") {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "pl-PL", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number, lang: "pl" | "en") {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function percentDelta(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) return null;
    return Infinity;
  }
  return ((current - previous) / previous) * 100;
}

function statusTone(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-500/10 text-amber-700 border-amber-400/30 dark:text-amber-200 dark:border-amber-400/20";
    case "MANAGER_REVIEW":
      return "bg-sky-500/10 text-sky-700 border-sky-400/30 dark:text-sky-200 dark:border-sky-400/20";
    case "HR_REVIEW":
      return "bg-violet-500/10 text-violet-700 border-violet-400/30 dark:text-violet-200 dark:border-violet-400/20";
    case "REPLIED":
    case "CLOSED":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-400/30 dark:text-emerald-200 dark:border-emerald-400/20";
    default:
      return "bg-foreground/6 text-foreground border-border/60 dark:bg-white/6 dark:border-white/10";
  }
}

export function DashboardPage() {
  const { user, roleFlags } = useAuth();
  const { t, lang } = useI18n();
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>("forms");
  const [comparisonExpanded, setComparisonExpanded] = useState(false);

  const notificationQ = useNotificationSummary(!!user);
  const mandatoryQ = useMandatoryTrainingSummary(!!user && (roleFlags.isEditor || roleFlags.isManager || roleFlags.isHr));
  const myFormsQ = useMyForms({ limit: 5, offset: 0, sort_by: "updated_at", sort_dir: "desc" }, !!user);
  const comparisonQ = useDashboardComparison(!!user);

  const counts = notificationQ.data?.counts;
  const items = notificationQ.data?.items ?? [];
  const mandatory = mandatoryQ.data;
  const comparison = comparisonQ.data;
  const comparisonReady = !!comparison?.has_previous_year_data;

  useEffect(() => {
    if (comparisonReady) {
      setComparisonExpanded(true);
    }
  }, [comparisonReady]);

  const poapTotal =
    (roleFlags.isEditor ? counts?.editor_inbox ?? 0 : 0) +
    (roleFlags.isManager ? counts?.manager_inbox ?? 0 : 0) +
    (roleFlags.isHr ? (counts?.hr_inbox ?? 0) + (counts?.hr_training_proposals ?? 0) : 0) +
    (counts?.proposal_reviews ?? 0);

  const mandatoryTotal = counts?.mandatory_training_alerts ?? 0;
  const pendingTotal = poapTotal + mandatoryTotal;

  const myFormsTotal = myFormsQ.data?.total ?? 0;
  const recentForms = myFormsQ.data?.items ?? [];

  const expiredCount = mandatory?.expired ?? 0;
  const due7Count = mandatory?.due_in_7 ?? 0;
  const due30Count = mandatory?.due_in_30 ?? 0;
  const indefiniteCount = mandatory?.indefinite ?? 0;
  const okCount = Math.max(0, (mandatory?.total ?? 0) - indefiniteCount - expiredCount - due30Count);
  const watchedCount = expiredCount + due30Count;
  const safeRate = mandatory?.total ? Math.round(((okCount + indefiniteCount) / mandatory.total) * 100) : 100;
  const urgentRate = mandatory?.total ? Math.round((watchedCount / mandatory.total) * 100) : 0;

  const roleTags = [
    roleFlags.isAdmin && (lang === "en" ? "Admin" : "Administrator"),
    !roleFlags.isAdmin && roleFlags.isHr && "HR",
    roleFlags.isManager && (lang === "en" ? "Manager" : "Manager"),
    roleFlags.isEditor && (lang === "en" ? "Editor" : "Edytor"),
  ].filter(Boolean) as string[];

  const poapBreakdown: BreakdownItem[] = [
    {
      label: lang === "en" ? "Editor updates" : "Zadania edytora",
      value: roleFlags.isEditor ? counts?.editor_inbox ?? 0 : 0,
    },
    {
      label: lang === "en" ? "Manager review" : "Weryfikacja managera",
      value: roleFlags.isManager ? counts?.manager_inbox ?? 0 : 0,
    },
    {
      label: lang === "en" ? "HR decisions" : "Decyzje HR",
      value: roleFlags.isHr ? counts?.hr_inbox ?? 0 : 0,
    },
    {
      label: lang === "en" ? "Training proposals" : "Propozycje szkoleń",
      value: roleFlags.isHr ? counts?.hr_training_proposals ?? 0 : counts?.proposal_reviews ?? 0,
    },
  ].filter((item) => item.value > 0 || item.label === (lang === "en" ? "Training proposals" : "Propozycje szkoleń"));

  const mandatoryBreakdown: BreakdownItem[] = [
    {
      label: lang === "en" ? "Overdue" : "Po terminie",
      value: expiredCount,
      tone: "danger",
    },
    {
      label: lang === "en" ? "Next 7 days" : "W ciągu 7 dni",
      value: due7Count,
    },
    {
      label: lang === "en" ? "Next 30 days" : "W ciągu 30 dni",
      value: Math.max(0, due30Count - due7Count),
    },
    {
      label: lang === "en" ? "Indefinite" : "Bezterminowe",
      value: indefiniteCount,
      tone: "success",
    },
    {
      label: lang === "en" ? "Within validity" : "W terminie",
      value: okCount,
      tone: "success",
    },
  ];

  const activityItems = items.slice(0, 6);

  const primaryAction = roleFlags.isEditor || roleFlags.isManager ? "/forms/new" : "/forms/my";
  const primaryActionLabel =
    roleFlags.isEditor || roleFlags.isManager
      ? lang === "en"
        ? "Create request"
        : "Utwórz wniosek"
      : lang === "en"
        ? "Open my requests"
        : "Otwórz moje wnioski";

  const monthNames = lang === "en"
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

  const comparisonCards = useMemo(() => {
    if (!comparison) {
      return [] as Array<{ key: string; title: string; current: string; previous: string; delta: string; icon: ComponentType<{ className?: string }> }>;
    }

    const deltaToLabel = (current: number, previous: number) => {
      const delta = percentDelta(current, previous);
      if (delta === null) return lang === "en" ? "No change" : "Bez zmian";
      if (delta === Infinity) return lang === "en" ? "New baseline" : "Nowa baza odniesienia";
      const sign = delta > 0 ? "+" : "";
      return `${sign}${delta.toFixed(0)}%`;
    };

    return [
      {
        key: "forms",
        title: lang === "en" ? "Requests" : "Wnioski",
        current: formatNumber(comparison.current.forms, lang),
        previous: formatNumber(comparison.previous.forms, lang),
        delta: deltaToLabel(comparison.current.forms, comparison.previous.forms),
        icon: BarChart3,
      },
      {
        key: "participants",
        title: lang === "en" ? "Participants" : "Uczestnicy",
        current: formatNumber(comparison.current.participants, lang),
        previous: formatNumber(comparison.previous.participants, lang),
        delta: deltaToLabel(comparison.current.participants, comparison.previous.participants),
        icon: Users,
      },
      {
        key: "budget",
        title: lang === "en" ? "HR budget" : "Budżet HR",
        current: formatCurrency(comparison.current.approved_budget_total, lang),
        previous: formatCurrency(comparison.previous.approved_budget_total, lang),
        delta: deltaToLabel(comparison.current.approved_budget_total, comparison.previous.approved_budget_total),
        icon: WalletCards,
      },
    ];
  }, [comparison, lang]);

  const chartPoints = useMemo(() => {
    const empty = monthNames.map((label, idx) => ({
      month: idx + 1,
      label,
      current: 0,
      previous: 0,
    }));

    if (!comparison) return empty;

    return comparison.months.map((point, idx) => {
      const current =
        comparisonMetric === "forms"
          ? point.current_forms
          : comparisonMetric === "participants"
            ? point.current_participants
            : point.current_estimated_cost_total;

      const previous =
        comparisonMetric === "forms"
          ? point.previous_forms
          : comparisonMetric === "participants"
            ? point.previous_participants
            : point.previous_estimated_cost_total;

      return {
        month: point.month,
        label: monthNames[idx],
        current,
        previous,
      };
    });
  }, [comparison, comparisonMetric, monthNames]);

  const maxChartValue = Math.max(1, ...chartPoints.flatMap((point) => [point.current, point.previous]));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden">
      <motion.section
        {...sectionMotion}
        className="relative overflow-hidden rounded-[34px] border border-border/60 bg-[linear-gradient(135deg,rgba(129,92,246,0.12),rgba(56,189,248,0.08),transparent)] p-6 shadow-[0_36px_130px_-70px_rgba(129,92,246,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_28%),radial-gradient(circle_at_top_right,hsl(var(--chart-2)/0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent)] md:p-8"
      >
        <div className="pointer-events-none absolute inset-0 mesh-grid opacity-35" />
        <div className="pointer-events-none absolute -left-10 top-6 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 rounded-full bg-chart-2/12 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/62 px-3 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-background/40">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === "en" ? "Operational overview" : "Przegląd operacyjny"}
            </div>

            <BrandWordmark imgClassName="max-w-[260px] md:max-w-[320px]" />

            <div>
              <div className="text-3xl font-semibold tracking-tight md:text-4xl">{t("dashboard.hello", { name: user?.full_name || user?.email || "" })}</div>
              <div className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {lang === "en"
                  ? "Your start view for requests, mandatory trainings and the tasks that currently need action."
                  : "Widok startowy do obsługi wniosków, szkoleń obowiązkowych i zadań, które wymagają działania."}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {roleTags.map((role) => (
                <span key={role} className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-background/45">
                  {role}
                </span>
              ))}
              <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-background/45">
                {lang === "en" ? `Action items: ${pendingTotal}` : `Zadania do obsłużenia: ${pendingTotal}`}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl shadow-[0_24px_60px_-34px_rgba(129,92,246,0.85)]">
                <Link to={primaryAction}>
                  <Workflow className="mr-2 h-4 w-4" />
                  {primaryActionLabel}
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-background/65 dark:border-white/10 dark:bg-background/50">
                <Link to={mandatoryTotal > 0 ? "/mandatory-trainings" : "/training-proposals"}>
                  <BellRing className="mr-2 h-4 w-4" />
                  {lang === "en" ? "Open current alerts" : "Otwórz bieżące alerty"}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <MetricCard
              title={lang === "en" ? "My requests" : "Moje wnioski"}
              value={myFormsTotal}
              hint={lang === "en" ? "All requests assigned to your account." : "Wszystkie wnioski przypisane do Twojego konta."}
              icon={ClipboardList}
            />
            <MetricCard
              title={lang === "en" ? "Items requiring action" : "Elementy wymagające działania"}
              value={pendingTotal}
              hint={lang === "en" ? "Combined view of training request tasks and mandatory training alerts." : "Łączny widok zadań wniosków szkoleniowych i alertów szkoleń obowiązkowych."}
              icon={Layers3}
            />
            <MetricCard
              title={lang === "en" ? "Mandatory training alerts" : "Alerty szkoleń obowiązkowych"}
              value={mandatoryTotal}
              hint={lang === "en" ? "Trainings expiring soon or already overdue." : "Szkolenia, którym kończy się ważność lub są już po terminie."}
              icon={ShieldAlert}
            />
          </div>
        </div>
      </motion.section>

      <motion.section {...sectionMotion} className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] 2xl:gap-6">
        <Card className="glass-card glass-lift min-w-0 rounded-[30px] border-border/60 bg-card/82 dark:border-white/10 dark:bg-card/72">
          <CardHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary dark:border-white/10">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{lang === "en" ? "training request workflow overview" : "Przegląd workflow wniosków szkoleniowych"}</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6">
                  {lang === "en"
                    ? "Current workload for requests, approvals and training proposals."
                    : "Aktualne obciążenie związane z wnioskami, akceptacjami i propozycjami szkoleń."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)] xl:items-start 2xl:gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:gap-5">
              <CircularGauge
                title={lang === "en" ? "Current workload" : "Bieżące obciążenie"}
                value={poapTotal}
                total={Math.max(6, poapTotal || 1)}
                hint={lang === "en" ? "Open training request items assigned to your role." : "Otwarte zadania wniosków szkoleniowych przypisane do Twojej roli."}
              />
              <CircularGauge
                title={lang === "en" ? "Proposal decisions" : "Decyzje dla propozycji"}
                value={counts?.proposal_reviews ?? 0}
                total={Math.max(4, (counts?.proposal_reviews ?? 0) || 1)}
                hint={lang === "en" ? "Decisions ready to review in your workflow." : "Decyzje gotowe do sprawdzenia w Twoim workflow."}
                colorClassName="shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
              />
            </div>

            <BreakdownList
              title={lang === "en" ? "Queue distribution" : "Rozkład kolejki"}
              description={lang === "en" ? "See which stage currently carries the most work." : "Zobacz, który etap procesu jest obecnie najbardziej obciążony."}
              items={poapBreakdown}
            />
          </CardContent>
        </Card>

        <Card className="glass-card glass-lift min-w-0 rounded-[30px] border-border/60 bg-card/82 dark:border-white/10 dark:bg-card/72">
          <CardHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary dark:border-white/10">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{lang === "en" ? "Mandatory trainings" : "Szkolenia obowiązkowe"}</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6">
                  {lang === "en"
                    ? "A quick assessment of expiry risk and the share of records that remain within the safe period."
                    : "Szybka ocena ryzyka wygaśnięcia oraz udziału rekordów, które pozostają w bezpiecznym terminie."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)] xl:items-start 2xl:gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:gap-5">
              <CircularGauge
                title={lang === "en" ? "Within validity" : "Ważne szkolenia"}
                value={okCount}
                total={mandatory?.total ?? 0}
                hint={lang === "en" ? `${safeRate}% of visible records remain outside the 30-day risk window.` : `${safeRate}% widocznych rekordów pozostaje poza 30-dniową strefą ryzyka.`}
                semantic="higher-better"
              />
              <CircularGauge
                title={lang === "en" ? "Risk level" : "Poziom ryzyka"}
                value={watchedCount}
                total={mandatory?.total ?? 0}
                hint={lang === "en" ? `${urgentRate}% requires attention within 30 days or is already overdue.` : `${urgentRate}% wymaga uwagi w ciągu 30 dni albo jest już po terminie.`}
                semantic="lower-better"
              />
            </div>

            <BreakdownList
              title={lang === "en" ? "Expiry distribution" : "Rozkład terminów"}
              description={lang === "en" ? "This view helps distinguish urgent issues from those approaching the deadline." : "Ten widok pomaga odróżnić sprawy pilne od tych, które dopiero zbliżają się do terminu."}
              items={mandatoryBreakdown}
            />
          </CardContent>
        </Card>
      </motion.section>

      <motion.section {...sectionMotion} className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] 2xl:gap-6">
        <Card className="glass-card glass-lift rounded-[30px] border-border/60 bg-card/82 dark:border-white/10 dark:bg-card/72">
          <CardHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary dark:border-white/10">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{lang === "en" ? "Recent activity" : "Ostatnia aktywność"}</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6">
                  {lang === "en"
                    ? "The latest items from Training Hub and the mandatory training module in one place."
                    : "Najnowsze elementy z Training Hub i modułu szkoleń obowiązkowych w jednym miejscu."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activityItems.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border/60 bg-background/40 px-5 py-8 text-sm text-muted-foreground dark:border-white/10 dark:bg-background/35">
                {lang === "en" ? "There are currently no new items requiring your attention." : "Obecnie nie ma nowych elementów wymagających Twojej uwagi."}
              </div>
            ) : (
              <div className="grid gap-3">
                {activityItems.map((item, idx) => {
                  const isMandatory = item.kind === "mandatory_training";
                  return (
                    <motion.div
                      key={`${item.kind}-${item.url}-${idx}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: idx * 0.03 }}
                    >
                      <Link
                        to={item.url}
                        className="group flex items-start gap-4 rounded-[24px] border border-border/60 bg-background/58 px-4 py-4 transition-all hover:-translate-y-0.5 hover:bg-background/78 dark:border-white/10 dark:bg-background/45 dark:hover:bg-background/65"
                      >
                        <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 dark:border-white/10", isMandatory ? "bg-orange-500/10 text-orange-700 dark:text-orange-200" : "bg-primary/10 text-primary") }>
                          {isMandatory ? <ShieldAlert className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium leading-6">{item.title}</div>
                            <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground dark:border-white/10 dark:bg-background/50">
                              {isMandatory ? (lang === "en" ? "Mandatory" : "Obowiązkowe") : "Request"}
                            </span>
                          </div>
                          {item.body ? <div className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</div> : null}
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card glass-lift rounded-[30px] border-border/60 bg-card/82 dark:border-white/10 dark:bg-card/72">
          <CardHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary dark:border-white/10">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{lang === "en" ? "Recently updated requests" : "Ostatnio aktualizowane wnioski"}</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6">
                  {lang === "en"
                    ? "Your latest forms, so you can return to work without searching through lists."
                    : "Twoje ostatnie formularze, aby można było szybko wrócić do pracy bez przeszukiwania list."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentForms.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border/60 bg-background/40 px-5 py-8 text-sm text-muted-foreground dark:border-white/10 dark:bg-background/35">
                {lang === "en" ? "No requests yet. Start by creating your first training request." : "Brak wniosków. Zacznij od utworzenia pierwszego wniosku szkoleniowego."}
              </div>
            ) : (
              <div className="grid gap-3">
                {recentForms.map((form) => (
                  <Link
                    key={form.id}
                    to={`/forms/${form.id}`}
                    className="group flex items-center gap-4 rounded-[24px] border border-border/60 bg-background/58 px-4 py-4 transition-all hover:-translate-y-0.5 hover:bg-background/78 dark:border-white/10 dark:bg-background/45 dark:hover:bg-background/65"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/72 text-sm font-semibold text-primary dark:border-white/10 dark:bg-background/65">
                      #{form.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-medium">{lang === "en" ? "Training request" : "Wniosek szkoleniowy"}</div>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]", statusTone(form.status))}>
                          {t(`status.${form.status}`)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {formatDateTime(form.updated_at || form.created_at, lang)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-background/62 dark:border-white/10 dark:bg-background/50">
                <Link to="/forms/my">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {lang === "en" ? "Open request list" : "Otwórz listę wniosków"}
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-border/60 bg-background/62 dark:border-white/10 dark:bg-background/50">
                <Link to={mandatoryTotal > 0 ? "/mandatory-trainings" : "/training-proposals"}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {lang === "en" ? "Go to current actions" : "Przejdź do bieżących działań"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section {...sectionMotion}>
        <Card className="glass-card glass-lift overflow-hidden rounded-[30px] border-border/60 bg-card/82 dark:border-white/10 dark:bg-card/72">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary dark:border-white/10">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {lang === "en" ? "Year-over-year comparison" : "Porównanie rok do roku"}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm leading-6">
                      {comparisonReady
                        ? (lang === "en"
                            ? "Compare the current year with the previous one and observe changes in volume, participation and budget."
                            : "Porównaj bieżący rok z poprzednim i obserwuj zmiany w liczbie wniosków, uczestników oraz budżecie.")
                        : (lang === "en"
                            ? "This section will become active automatically once the system collects a full previous-year reference." 
                            : "Ta sekcja uaktywni się automatycznie, gdy system zbierze pełne dane odniesienia za poprzedni rok.")}
                    </CardDescription>
                  </div>
                </div>
                {comparison ? (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/60 bg-background/62 px-3 py-1 dark:border-white/10 dark:bg-background/45">
                      {comparison.current_year}
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/62 px-3 py-1 dark:border-white/10 dark:bg-background/45">
                      {comparison.previous_year}
                    </span>
                    {!comparisonReady ? (
                      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-200">
                        {lang === "en" ? "Waiting for a full reference year" : "Oczekiwanie na pełny rok odniesienia"}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-border/60 bg-background/65 dark:border-white/10 dark:bg-background/50"
                onClick={() => setComparisonExpanded((v) => !v)}
              >
                <ChevronDown className={cn("mr-2 h-4 w-4 transition-transform", comparisonExpanded && "rotate-180")} />
                {comparisonExpanded
                  ? (lang === "en" ? "Hide comparison" : "Ukryj porównanie")
                  : (lang === "en" ? "Show comparison" : "Pokaż porównanie")}
              </Button>
            </div>
          </CardHeader>

          {comparisonExpanded ? (
            <CardContent className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              {!comparisonReady ? (
                <div className="xl:col-span-2 rounded-[28px] border border-dashed border-border/60 bg-background/50 p-6 text-sm leading-7 text-muted-foreground dark:border-white/10 dark:bg-background/42">
                  {lang === "en"
                    ? "The annual comparison will appear here automatically when the application has complete data for the current year and at least one earlier full year. At that point, the view will present monthly trends, year-over-year changes and budget dynamics."
                    : "Porównanie roczne pojawi się tutaj automatycznie, gdy aplikacja będzie miała komplet danych za bieżący rok oraz co najmniej jeden wcześniejszy pełny rok. Wtedy widok pokaże trendy miesięczne, zmiany rok do roku i dynamikę budżetu."}
                </div>
              ) : comparisonQ.isLoading ? (
                <div className="xl:col-span-2 flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : comparisonQ.isError ? (
                <div className="xl:col-span-2 flex min-h-[220px] items-center justify-center text-sm text-rose-600 dark:text-rose-300">
                  {lang === "en" ? "Failed to load historical comparison." : "Nie udało się pobrać danych do porównania historycznego."}
                </div>
              ) : (
                <>
                  <div className="rounded-[28px] border border-border/60 bg-background/58 p-5 dark:border-white/10 dark:bg-background/48">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          {comparisonMetric === "forms"
                            ? lang === "en"
                              ? "Monthly request trend"
                              : "Miesięczny trend liczby wniosków"
                            : comparisonMetric === "participants"
                              ? lang === "en"
                                ? "Monthly participant trend"
                                : "Miesięczny trend liczby uczestników"
                              : lang === "en"
                                ? "Monthly planned cost trend"
                                : "Miesięczny trend planowanych kosztów"}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {lang === "en"
                            ? "The current year is highlighted, while the previous year provides the reference line."
                            : "Bieżący rok jest podświetlony, a poprzedni stanowi punkt odniesienia."}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                          { key: "forms" as const, label: lang === "en" ? "Requests" : "Wnioski" },
                          { key: "participants" as const, label: lang === "en" ? "Participants" : "Uczestnicy" },
                          { key: "budget" as const, label: lang === "en" ? "Planned cost" : "Koszt planowany" },
                        ].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setComparisonMetric(option.key)}
                            className={cn(
                              "min-w-[9rem] rounded-2xl border px-4 py-2 text-sm transition-colors",
                              comparisonMetric === option.key
                                ? "border-primary/30 bg-primary/12 text-foreground"
                                : "border-border/60 bg-background/62 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-background/45",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-5 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />{comparison?.previous_year ?? "—"}</span>
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{comparison?.current_year ?? "—"}</span>
                    </div>

                    <div className="grid h-[320px] grid-cols-12 gap-3">
                      {chartPoints.map((point) => {
                        const currentHeight = point.current > 0 ? `${Math.max(8, Math.round((point.current / maxChartValue) * 100))}%` : "6%";
                        const previousHeight = point.previous > 0 ? `${Math.max(8, Math.round((point.previous / maxChartValue) * 100))}%` : "6%";
                        const currentLabel = comparisonMetric === "budget" ? formatCurrency(point.current, lang) : formatNumber(point.current, lang);
                        const previousLabel = comparisonMetric === "budget" ? formatCurrency(point.previous, lang) : formatNumber(point.previous, lang);
                        return (
                          <div key={point.month} className="flex min-w-0 flex-col items-center gap-3">
                            <div className="flex h-full w-full items-end justify-center gap-1 rounded-3xl border border-transparent bg-gradient-to-t from-foreground/[0.03] to-transparent px-1 py-3 dark:from-white/[0.03]">
                              <div
                                className="w-2 rounded-full bg-foreground/20 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.65)] dark:bg-white/14"
                                style={{ height: previousHeight }}
                                title={`${comparison?.previous_year ?? "—"}: ${previousLabel}`}
                              />
                              <div
                                className="w-2.5 rounded-full bg-gradient-to-t from-primary via-violet-400 to-cyan-300 shadow-[0_16px_34px_-16px_rgba(129,92,246,0.85)]"
                                style={{ height: currentHeight }}
                                title={`${comparison?.current_year ?? "—"}: ${currentLabel}`}
                              />
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{point.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {comparisonCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div key={card.key} className="rounded-[28px] border border-border/60 bg-background/58 p-5 dark:border-white/10 dark:bg-background/48">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{card.title}</div>
                              <div className="mt-3 text-2xl font-semibold tracking-tight">{card.current}</div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                {lang === "en" ? "Previous year" : "Poprzedni rok"}: {card.previous}
                              </div>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary dark:border-white/10">
                              <Icon className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="mt-4 inline-flex rounded-full border border-border/60 bg-background/75 px-3 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-background/55">
                            {lang === "en" ? "YoY" : "r/r"}: {card.delta}
                          </div>
                        </div>
                      );
                    })}

                    <div className="rounded-[28px] border border-border/60 bg-background/58 p-5 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-background/48">
                      {lang === "en"
                        ? "This section helps you quickly assess changes in volume, participation and planned spending compared with the previous year."
                        : "Ta sekcja pomaga szybko ocenić zmiany w liczbie wniosków, uczestników i planowanych wydatkach względem poprzedniego roku."}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          ) : null}
        </Card>
      </motion.section>
    </div>
  );
}
