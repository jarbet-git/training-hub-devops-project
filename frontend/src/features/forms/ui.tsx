// src/features/forms/ui.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { AreaOption, CostCenterOption, DictOption, FormStatus, HrDecision } from "@/features/forms/types";
import { useI18n } from "@/app/i18n";

export function formatDictName(
  opt: { name_pl?: string | null; name_en?: string | null; name?: string | null },
  lang: "pl" | "en"
) {
  if (lang === "en") return opt.name_en ?? opt.name_pl ?? opt.name ?? "";
  return opt.name_pl ?? opt.name_en ?? opt.name ?? "";
}

export function formatAreaLabel(area: AreaOption | null | undefined, lang: "pl" | "en") {
  if (!area) return "—";
  const name = formatDictName(area, lang);
  const code = area.code ?? "";
  if (code && name) return `${code} – ${name}`;
  return name || code || "—";
}

export function formatCostCenterLabel(cc: CostCenterOption | null | undefined, lang: "pl" | "en") {
  if (!cc) return "—";
  const name = formatDictName(cc, lang);
  const code = cc.code ?? "";
  if (code && name) return `${code} – ${name}`;
  return name || code || "—";
}

export function formatSimpleOptionLabel(opt: DictOption | null | undefined, lang: "pl" | "en") {
  if (!opt) return "—";
  const name = formatDictName(opt, lang);
  const code = opt.code ?? "";
  if (code && name) return `${code} – ${name}`;
  return name || code || "—";
}

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(0)} PLN`;
}

export function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)} h`;
}

export function formatDT(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const lang = window.localStorage.getItem("poap_lang") === "en" ? "en-GB" : "pl-PL";
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function StatusBadge({
  status,
  hrDecision,
  needsChanges = false,
}: {
  status: FormStatus | string;
  hrDecision?: HrDecision | string | null;
  needsChanges?: boolean;
}) {
  const { t } = useI18n();

  const isCompleted = status === "REPLIED" || status === "CLOSED";
  const isFinalRejected = isCompleted && hrDecision === "REJECTED";
  const label = isFinalRejected
    ? t("decision.REJECTED")
    : needsChanges
      ? t("status.NEEDS_CHANGES")
      : t(`status.${status}`);

  const className = isFinalRejected
    ? "rounded-xl border border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300"
    : needsChanges
      ? "rounded-xl border border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300"
      : isCompleted
        ? "rounded-xl border border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
        : status === "HR_REVIEW"
          ? "rounded-xl border border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300"
          : status === "MANAGER_REVIEW"
            ? "rounded-xl border border-violet-500/30 bg-violet-500/12 text-violet-700 dark:text-violet-300"
            : "rounded-xl border border-border/70 bg-muted/60 text-foreground";

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

export function Money({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span className="text-muted-foreground">—</span>;
  return <span>{n.toFixed(0)} PLN</span>;
}

export function Hours({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span className="text-muted-foreground">—</span>;
  return <span>{n.toFixed(1)} h</span>;
}

export function InlineKeyValue({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-right">{value}</div>
    </div>
  );
}
