import { useMemo, useState } from "react";
import { FileUp, RefreshCw, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/app/i18n";
import { useAdminImportMandatoryTrainings, useAdminMandatoryTrainingImportSummary } from "./queries";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const locale = window.localStorage.getItem("poap_lang") === "en" ? "en-GB" : "pl-PL";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function AdminMandatoryTrainingsTab() {
  const { t } = useI18n();
  const summaryQ = useAdminMandatoryTrainingImportSummary();
  const importM = useAdminImportMandatoryTrainings();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const summary = summaryQ.data;
  const unmapped = useMemo(() => summary?.unmapped_cost_center_codes ?? [], [summary]);

  async function onImport() {
    if (!selectedFile) {
      toast.error(t("mandatoryTrainings.admin.import.pickFile"));
      return;
    }
    try {
      const res = await importM.mutateAsync(selectedFile);
      toast.success(
        t("mandatoryTrainings.admin.import.success", {
          count: res.rows_imported,
        })
      );
      setSelectedFile(null);
      const input = document.getElementById("mandatory-trainings-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  return (
    <div className="space-y-4">
      <Card data-tour="admin-mandatory-import" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4 opacity-70" />
            {t("mandatoryTrainings.admin.title")}
          </CardTitle>
          <CardDescription>{t("mandatoryTrainings.admin.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div data-tour="admin-mandatory-upload" className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              id="mandatory-trainings-file-input"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" onClick={() => summaryQ.refetch()} disabled={summaryQ.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${summaryQ.isFetching ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </Button>
            <Button data-tour="admin-mandatory-import-button" onClick={onImport} disabled={!selectedFile || importM.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {importM.isPending ? t("mandatoryTrainings.admin.import.uploading") : t("mandatoryTrainings.admin.import.button")}
            </Button>
          </div>

          {selectedFile ? (
            <div className="text-xs text-muted-foreground">
              {t("mandatoryTrainings.admin.import.selectedFile")}: <span className="font-medium text-foreground">{selectedFile.name}</span>
            </div>
          ) : null}

          <div data-tour="admin-mandatory-stats" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title={t("mandatoryTrainings.summary.total")} value={summary?.total_records ?? 0} />
            <StatCard title={t("mandatoryTrainings.summary.expired")} value={summary?.expired_count ?? 0} />
            <StatCard title={t("mandatoryTrainings.summary.due7")} value={summary?.due_in_7_count ?? 0} />
            <StatCard title={t("mandatoryTrainings.summary.due30")} value={summary?.due_in_30_count ?? 0} />
            <StatCard title={t("mandatoryTrainings.summary.indefinite")} value={summary?.indefinite_count ?? 0} />
          </div>

          <div className="rounded-2xl border bg-muted/10 p-4 text-sm">
            <div><span className="text-muted-foreground">{t("mandatoryTrainings.admin.lastImport.file")}: </span>{summary?.filename || "—"}</div>
            <div><span className="text-muted-foreground">{t("mandatoryTrainings.admin.lastImport.when")}: </span>{formatDateTime(summary?.imported_at)}</div>
            <div><span className="text-muted-foreground">{t("mandatoryTrainings.admin.lastImport.by")}: </span>{summary?.imported_by_full_name || "—"}</div>
            <div><span className="text-muted-foreground">{t("mandatoryTrainings.admin.lastImport.rows")}: </span>{summary?.rows_total ?? 0}</div>
            <div><span className="text-muted-foreground">{t("mandatoryTrainings.admin.lastImport.imported")}: </span>{summary?.rows_imported ?? 0}</div>
            <div><span className="text-muted-foreground">{t("mandatoryTrainings.admin.lastImport.skipped")}: </span>{summary?.rows_skipped ?? 0}</div>
            <div><span className="text-muted-foreground">{t("mandatoryTrainings.admin.lastImport.unmapped")}: </span>{summary?.rows_unmapped ?? 0}</div>
          </div>

          <div data-tour="admin-mandatory-unmapped" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <TriangleAlert className="h-4 w-4" />
              {t("mandatoryTrainings.admin.unmapped.title")}
            </div>
            {unmapped.length === 0 ? (
              <div className="text-muted-foreground">{t("mandatoryTrainings.admin.unmapped.empty")}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unmapped.map((code) => (
                  <Badge key={code} variant="secondary" className="rounded-full">{code}</Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
