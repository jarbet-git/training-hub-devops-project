import { useMemo, useState } from "react";
import { ArrowLeft, Download, RefreshCw, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";
import { formatMoney } from "@/features/forms/ui";
import { exportMandatoryTrainings } from "@/features/mandatoryTrainings/api";
import { useMandatoryTrainingSummary, useMandatoryTrainings } from "@/features/mandatoryTrainings/queries";
import type { MandatoryTrainingRow, MandatoryTrainingStatusBucket } from "@/features/mandatoryTrainings/types";

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const locale = window.localStorage.getItem("poap_lang") === "en" ? "en-GB" : "pl-PL";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function bucketVariant(bucket: MandatoryTrainingStatusBucket) {
  switch (bucket) {
    case "expired":
      return "destructive" as const;
    case "due_7":
      return "default" as const;
    case "due_30":
      return "outline" as const;
    case "indefinite":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

function daysLabel(
  days: number | null,
  bucket: MandatoryTrainingStatusBucket,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (bucket === "indefinite") return t("mandatoryTrainings.days.indefinite");
  if (days === null) return "—";
  if (days < 0) return t("mandatoryTrainings.days.overdue", { count: Math.abs(days) });
  if (days === 0) return t("mandatoryTrainings.days.today");
  return t("mandatoryTrainings.days.left", { count: days });
}

function statusLabel(bucket: MandatoryTrainingStatusBucket, t: (key: string, vars?: Record<string, string | number>) => string) {
  return t(`mandatoryTrainings.status.${bucket}`);
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function MandatoryTrainingsTable({ rows }: { rows: MandatoryTrainingRow[] }) {
  const { t } = useI18n();

  if (!rows.length) {
    return <div className="py-8 text-center text-muted-foreground">{t("common.noResults")}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b [&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
            <th>{t("label.employee")}</th>
            <th>{t("label.training")}</th>
            <th>{t("label.mpk")}</th>
            <th>{t("label.costPerPerson")}</th>
            <th>{t("mandatoryTrainings.table.start")}</th>
            <th>{t("mandatoryTrainings.table.expiration")}</th>
            <th>{t("mandatoryTrainings.table.days")}</th>
            <th>{t("label.status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0 [&>td]:px-3 [&>td]:py-3 align-top">
              <td>
                <div className="font-medium">{row.employee_name}</div>
                <div className="text-xs text-muted-foreground">{row.local_sap_id || "—"}</div>
              </td>
              <td>
                <div className="font-medium">{row.training_name}</div>
              </td>
              <td>
                <div className="font-medium">{row.cost_center_code}</div>
                {row.cost_center_name ? <div className="text-xs text-muted-foreground">{row.cost_center_name}</div> : null}
              </td>
              <td>{formatMoney(row.cost_per_person)}</td>
              <td>{formatDateOnly(row.start_date)}</td>
              <td>{row.status_bucket === "indefinite" ? t("mandatoryTrainings.status.indefinite") : formatDateOnly(row.expiration_date)}</td>
              <td className={(row.days_to_expiration ?? 9999) < 0 ? "font-medium text-destructive" : (row.days_to_expiration ?? 9999) <= 7 ? "font-medium" : ""}>
                {daysLabel(row.days_to_expiration, row.status_bucket, t)}
              </td>
              <td>
                <Badge variant={bucketVariant(row.status_bucket)} className="rounded-xl">
                  {statusLabel(row.status_bucket, t)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MandatoryTrainingsPage() {
  const { t, lang } = useI18n();
  const { roleFlags } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const canExport = roleFlags.isManager || roleFlags.isHr || roleFlags.isAdmin;
  const summaryQ = useMandatoryTrainingSummary();
  const listQ = useMandatoryTrainings({ q: search || undefined, status, limit: 500, offset: 0 });

  const rows = listQ.data?.items ?? [];
  const importedAtText = useMemo(() => formatDateOnly(summaryQ.data?.imported_at ?? null), [summaryQ.data?.imported_at]);

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportMandatoryTrainings({
        q: search || undefined,
        status,
        lang,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(t("mandatoryTrainings.export.ready"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("nav.dashboard")}
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={handleExport} disabled={exporting || listQ.isLoading}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? t("mandatoryTrainings.export.downloading") : t("mandatoryTrainings.export.button")}
            </Button>
          ) : null}
          <Button variant="outline" className="rounded-xl" onClick={() => { summaryQ.refetch(); listQ.refetch(); }}>
            <RefreshCw className={`mr-2 h-4 w-4 ${(summaryQ.isFetching || listQ.isFetching) ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      <Card data-tour="mandatory-card" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 opacity-70" />
            {t("mandatoryTrainings.title")}
          </CardTitle>
          <CardDescription>
            {t("mandatoryTrainings.subtitle")}
            {summaryQ.data?.imported_at ? ` · ${t("mandatoryTrainings.lastImport")}: ${importedAtText}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div data-tour="mandatory-summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard title={t("mandatoryTrainings.summary.total")} value={summaryQ.data?.total ?? 0} />
            <SummaryCard title={t("mandatoryTrainings.summary.expired")} value={summaryQ.data?.expired ?? 0} />
            <SummaryCard title={t("mandatoryTrainings.summary.due7")} value={summaryQ.data?.due_in_7 ?? 0} />
            <SummaryCard title={t("mandatoryTrainings.summary.due30")} value={summaryQ.data?.due_in_30 ?? 0} />
            <SummaryCard title={t("mandatoryTrainings.summary.indefinite")} value={summaryQ.data?.indefinite ?? 0} />
          </div>

          <div data-tour="mandatory-search" className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              data-tour="mandatory-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("mandatoryTrainings.searchPlaceholder")}
            />
            <div className="text-sm text-muted-foreground self-center">
              {listQ.isLoading ? t("common.loading") : t("mandatoryTrainings.results", { count: listQ.data?.total ?? 0 })}
            </div>
          </div>

          <Tabs data-tour="mandatory-filters" value={status} onValueChange={setStatus}>
            <TabsList data-tour="mandatory-filters-list" className="flex w-full flex-wrap justify-start gap-1 rounded-xl">
              <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
              <TabsTrigger value="expired">{t("mandatoryTrainings.status.expired")}</TabsTrigger>
              <TabsTrigger value="due_7">{t("mandatoryTrainings.status.due_7")}</TabsTrigger>
              <TabsTrigger value="due_30">{t("mandatoryTrainings.status.due_30")}</TabsTrigger>
              <TabsTrigger value="indefinite">{t("mandatoryTrainings.status.indefinite")}</TabsTrigger>
              <TabsTrigger value="ok">{t("mandatoryTrainings.status.ok")}</TabsTrigger>
            </TabsList>
          </Tabs>

          {listQ.isError ? (
            <div className="text-sm text-destructive">{t("common.error")}</div>
          ) : listQ.isLoading ? (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <div data-tour="mandatory-table"><MandatoryTrainingsTable rows={rows} /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
