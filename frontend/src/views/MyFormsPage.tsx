import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Plus, Search } from "lucide-react";
import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useI18n } from "@/app/i18n";
import { useMyForms, useMyAreas } from "@/features/forms/queries";
import { StatusBadge, formatAreaLabel, formatDT } from "@/features/forms/ui";

export function MyFormsPage() {
  const { t, lang } = useI18n();
  const [query, setQuery] = React.useState("");

  const q = useMyForms({ limit: 200, offset: 0 }, true);
  const areasQ = useMyAreas(true);

  const areaMap = new Map<number, string>();
  for (const a of areasQ.data ?? []) areaMap.set(a.id, formatAreaLabel(a, lang));

  const items = (q.data?.items ?? []).filter((f) => {
    if (!query.trim()) return true;
    const ql = query.trim().toLowerCase();
    return (
      String(f.id).includes(ql) ||
      (areaMap.get(f.area_id) ?? "").toLowerCase().includes(ql) ||
      (f.status ?? "").toLowerCase().includes(ql) ||
      (f.last_comment ?? "").toLowerCase().includes(ql)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("nav.dashboard")}
          </Button>
        </Link>

        <Link to="/forms/new">
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            {t("nav.newForm")}
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 opacity-70" />
            {t("nav.myForms")}
          </CardTitle>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[280px] rounded-xl pl-9"
                placeholder={lang === "pl" ? "Szukaj (ID, Area, status, komentarz)…" : "Search (ID, area, status, comment)…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {q.isLoading ? t("common.loading") : `${lang === "en" ? "Result" : "Wynik"}: ${items.length} / total ${q.data?.total ?? 0}`}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {q.isLoading ? (
            <div className="text-muted-foreground">{t("common.loading")}</div>
          ) : q.isError ? (
            <div className="text-rose-600 dark:text-rose-300">
              {lang === "en" ? "Failed to load the list." : "Nie udało się pobrać listy."}
            </div>
          ) : !items.length ? (
            <div className="text-muted-foreground">{lang === "en" ? "No requests." : "Brak wniosków."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="[&>th]:py-2 [&>th]:text-left">
                    <th className="w-[90px]">ID</th>
                    <th className="w-[110px]">{lang === "en" ? "Status" : "Status"}</th>
                    <th className="w-[320px]">Area</th>
                    <th>{lang === "en" ? "Latest comment" : "Ostatni komentarz"}</th>
                    <th className="w-[200px]">{lang === "en" ? "Updated" : "Aktualizacja"}</th>
                    <th className="w-[140px] text-right">{lang === "en" ? "Action" : "Akcja"}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((f) => (
                    <tr key={f.id} className="border-t align-top [&>td]:py-3">
                      <td className="font-medium">{f.id}</td>
                      <td>
                        <StatusBadge
                          status={f.status}
                          hrDecision={f.hr_decision}
                          needsChanges={Boolean(f.last_comment && ["MANAGER", "HR", "ADMIN"].includes((f.last_commented_by_role ?? "").toUpperCase()) && f.status === "DRAFT")}
                        />
                      </td>
                      <td className="text-muted-foreground">{areaMap.get(f.area_id) ?? String(f.area_id)}</td>
                      <td className="text-muted-foreground">
                        <span className="line-clamp-2">{f.last_comment ?? "—"}</span>
                      </td>
                      <td className="text-muted-foreground">{formatDT(f.updated_at ?? f.created_at ?? null)}</td>
                      <td className="text-right">
                        <Link to={`/forms/${f.id}`}>
                          <Button variant="secondary" className="rounded-xl">
                            {lang === "en" ? "Open" : "Otwórz"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
