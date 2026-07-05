import { Link } from "react-router-dom";
import { ArrowLeft, Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";
import { useHrAdminFormsList, useHrInbox, useMyAreas } from "@/features/forms/queries";
import { StatusBadge, formatAreaLabel, formatDT } from "@/features/forms/ui";

type FormRow = {
  id: number;
  status: string;
  area_id: number;
  created_by_full_name?: string | null;
  hr_decision?: string | null;
  last_commented_by_role?: string | null;
  last_comment?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function FormsTable({ items, areaMap, lang }: { items: FormRow[]; areaMap: Map<number, string>; lang: "pl" | "en" }) {
  if (!items.length) {
    return <div className="text-muted-foreground">{lang === "en" ? "No results." : "Brak wyników."}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="[&>th]:py-2 [&>th]:text-left">
            <th className="w-[90px]">ID</th>
            <th className="w-[110px]">{lang === "en" ? "Status" : "Status"}</th>
            <th className="w-[280px]">Area</th>
            <th className="w-[220px]">{lang === "en" ? "Sent by" : "Wysłał"}</th>
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
                  status={f.status as any}
                  hrDecision={f.hr_decision}
                  needsChanges={Boolean(f.last_comment && ["HR", "ADMIN"].includes((f.last_commented_by_role ?? "").toUpperCase()) && f.status === "MANAGER_REVIEW")}
                />
              </td>
              <td className="text-muted-foreground">{areaMap.get(f.area_id) ?? String(f.area_id)}</td>
              <td className="text-muted-foreground">{f.created_by_full_name ?? "—"}</td>
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
  );
}

export function HrInboxPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const role = (user?.role ?? "").trim().toUpperCase();
  const isHr = role === "HR" || role === "ADMIN";

  const inboxQ = useHrInbox({ limit: 50, offset: 0 }, Boolean(user) && isHr);
  const historyQ = useHrAdminFormsList({ limit: 50, offset: 0, status_value: "REPLIED" }, Boolean(user) && isHr);

  const areasQ = useMyAreas(Boolean(user) && isHr);
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
            {t("nav.hrInbox")}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {inboxQ.isLoading ? t("common.loading") : `Inbox: ${inboxQ.data?.items?.length ?? 0} / total ${inboxQ.data?.total ?? 0}`}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {!isHr ? (
            <div className="text-rose-600 dark:text-rose-300">
              {lang === "en" ? "No access (HR/ADMIN role required)." : "Brak uprawnień (wymagana rola HR/ADMIN)."}
            </div>
          ) : (
            <Tabs defaultValue="inbox" className="w-full">
              <TabsList className="rounded-xl">
                <TabsTrigger value="inbox" className="rounded-xl">
                  {lang === "en" ? "To decide" : "Do decyzji"}
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl">
                  {lang === "en" ? "History" : "Historia"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="mt-3">
                {inboxQ.isLoading ? (
                  <div className="text-muted-foreground">{t("common.loading")}</div>
                ) : inboxQ.isError ? (
                  <div className="text-rose-600 dark:text-rose-300">
                    {lang === "en" ? "Failed to load the inbox." : "Nie udało się pobrać inboxu."}
                  </div>
                ) : (
                  <FormsTable items={(inboxQ.data?.items ?? []) as any} areaMap={areaMap} lang={lang} />
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-3">
                {historyQ.isLoading ? (
                  <div className="text-muted-foreground">{t("common.loading")}</div>
                ) : historyQ.isError ? (
                  <div className="text-rose-600 dark:text-rose-300">
                    {lang === "en" ? "Failed to load the history." : "Nie udało się pobrać historii."}
                  </div>
                ) : (
                  <FormsTable items={(historyQ.data?.items ?? []) as any} areaMap={areaMap} lang={lang} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
