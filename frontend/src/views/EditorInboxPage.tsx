import { Link } from "react-router-dom";
import { ArrowLeft, Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/features/auth/context";
import { useEditorInbox, useMyAreas } from "@/features/forms/queries";
import { StatusBadge, formatAreaLabel, formatDT } from "@/features/forms/ui";
import { useI18n } from "@/app/i18n";

export function EditorInboxPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const role = (user?.role ?? "").trim().toUpperCase();
  const isEditor = role === "EDITOR" || role === "ADMIN";

  const q = useEditorInbox({ limit: 50, offset: 0 }, Boolean(user) && isEditor);
  const areasQ = useMyAreas(Boolean(user) && isEditor);
  const areaMap = new Map<number, string>();
  for (const a of areasQ.data ?? []) areaMap.set(a.id, formatAreaLabel(a, lang));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("nav.dashboard")}
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4 opacity-70" />
            {t("nav.editorInbox")}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {q.isLoading ? t("common.loading") : `${lang === "en" ? "Result" : "Wynik"}: ${q.data?.items?.length ?? 0} / total ${q.data?.total ?? 0}`}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {!isEditor ? (
            <div className="text-rose-600 dark:text-rose-300">
              {lang === "en" ? "No access (EDITOR/ADMIN role required)." : "Brak uprawnień (wymagana rola EDITOR/ADMIN)."}
            </div>
          ) : q.isLoading ? (
            <div className="text-muted-foreground">{t("common.loading")}</div>
          ) : q.isError ? (
            <div className="text-rose-600 dark:text-rose-300">
              {lang === "en" ? "Failed to load the list." : "Nie udało się pobrać listy."}
            </div>
          ) : !q.data?.items?.length ? (
            <div className="text-muted-foreground">
              {lang === "en" ? "No requests are waiting for correction." : "Brak wniosków do poprawy."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="[&>th]:py-2 [&>th]:text-left">
                    <th className="w-[90px]">ID</th>
                    <th className="w-[120px]">{lang === "en" ? "Status" : "Status"}</th>
                    <th className="w-[280px]">Area</th>
                    <th>{lang === "en" ? "Latest comment" : "Ostatni komentarz"}</th>
                    <th className="w-[200px]">{lang === "en" ? "Updated" : "Aktualizacja"}</th>
                    <th className="w-[140px] text-right">{lang === "en" ? "Action" : "Akcja"}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((f) => (
                    <tr key={f.id} className="border-t align-top [&>td]:py-3">
                      <td className="font-medium">{f.id}</td>
                      <td>
                        <StatusBadge status={f.status} />
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
