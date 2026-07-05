import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useQueryClient } from "@tanstack/react-query";

import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";
import { useManagerInbox, useMyAreas } from "@/features/forms/queries";
import { notificationKeys, useMarkNotificationScopesRead } from "@/features/notifications/queries";
import { StatusBadge, formatAreaLabel, formatDT } from "@/features/forms/ui";

function TableView({
  items,
  areaMap,
  lang,
  onOpen,
}: {
  items: Array<{ id: number; status: string; area_id: number; hr_decision?: string | null; last_comment?: string | null; last_commented_by_role?: string | null; updated_at?: string | null; created_at?: string | null }>;
  areaMap: Map<number, string>;
  lang: "pl" | "en";
  onOpen: (formId: number) => void;
}) {
  if (!items.length) {
    return <div className="text-muted-foreground">{lang === "en" ? "No records." : "Brak rekordów."}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="[&>th]:py-2 [&>th]:text-left">
            <th className="w-[90px]">ID</th>
            <th className="w-[130px]">{lang === "en" ? "Status" : "Status"}</th>
            <th className="w-[260px]">Area</th>
            <th className="w-[320px]">{lang === "en" ? "Latest comment" : "Ostatni komentarz"}</th>
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
                  status={f.status as any}
                  hrDecision={f.hr_decision}
                  needsChanges={Boolean(f.last_comment && ["HR", "ADMIN"].includes((f.last_commented_by_role ?? "").toUpperCase()) && f.status === "MANAGER_REVIEW")}
                />
              </td>
              <td className="text-muted-foreground">{areaMap.get(f.area_id) ?? String(f.area_id)}</td>
              <td className="text-muted-foreground">
                <span className="line-clamp-2">{f.last_comment ?? "—"}</span>
              </td>
              <td className="text-muted-foreground">{formatDT(f.updated_at ?? f.created_at ?? null)}</td>
              <td className="text-right">
                <Button variant="secondary" className="rounded-xl" onClick={() => onOpen(f.id)}>
                  {lang === "en" ? "Open" : "Otwórz"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ManagerInboxPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { t, lang } = useI18n();

  const role = (user?.role ?? "").trim().toUpperCase();
  const isManager = role === "MANAGER" || role === "ADMIN";
  const qc = useQueryClient();
  const markScopesReadM = useMarkNotificationScopesRead();

  const q = useManagerInbox({ limit: 200, offset: 0 }, Boolean(user) && isManager);
  const areasQ = useMyAreas(Boolean(user) && isManager);

  const areaMap = new Map<number, string>();
  for (const a of areasQ.data ?? []) areaMap.set(a.id, formatAreaLabel(a, lang));

  const allItems = q.data?.items ?? [];
  const inboxItems = allItems.filter((x) => x.status === "MANAGER_REVIEW");
  const historyStatuses = new Set(["HR_REVIEW", "REPLIED", "CLOSED"]);
  const historyItems = allItems.filter((x) => historyStatuses.has(x.status));

  const openForm = async (formId: number) => {
    try {
      await markScopesReadM.mutateAsync({ scopes: ["manager_inbox"], formIds: [formId] });
      await qc.invalidateQueries({ queryKey: notificationKeys.summary() });
    } catch {
      // keep navigation responsive even if marking fails
    }
    nav(`/forms/${formId}`);
  };


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
            {t("nav.managerInbox")}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {q.isLoading ? t("common.loading") : `${lang === "en" ? "Result" : "Wynik"}: ${allItems.length} / total ${q.data?.total ?? 0}`}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {!isManager ? (
            <div className="text-rose-600 dark:text-rose-300">
              {lang === "en" ? "No access (MANAGER/ADMIN role required)." : "Brak uprawnień (wymagana rola MANAGER/ADMIN)."}
            </div>
          ) : q.isLoading ? (
            <div className="text-muted-foreground">{t("common.loading")}</div>
          ) : q.isError ? (
            <div className="text-rose-600 dark:text-rose-300">
              {lang === "en" ? "Failed to load the inbox." : "Nie udało się pobrać inboxu."}
            </div>
          ) : (
            <Tabs defaultValue="inbox">
              <TabsList className="rounded-xl">
                <TabsTrigger value="inbox" className="rounded-xl">
                  {lang === "en" ? `To action (${inboxItems.length})` : `Do akcji (${inboxItems.length})`}
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl">
                  {lang === "en" ? `History (${historyItems.length})` : `Historia (${historyItems.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="mt-3">
                <TableView items={inboxItems} areaMap={areaMap} lang={lang} onOpen={openForm} />
              </TabsContent>
              <TabsContent value="history" className="mt-3">
                <TableView items={historyItems} areaMap={areaMap} lang={lang} onOpen={openForm} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
