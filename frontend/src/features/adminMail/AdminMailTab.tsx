import { useState } from "react";
import { Mail, RefreshCw, Send, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/app/i18n";
import { useAdminMailLogs, useAdminMailStatus, useAdminSendTestMail } from "./queries";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge variant={ok ? "default" : "secondary"} className="rounded-full">
      {ok ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldX className="mr-1 h-3.5 w-3.5" />}
      {label}
    </Badge>
  );
}

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

export function AdminMailTab() {
  const { t } = useI18n();
  const statusQ = useAdminMailStatus();
  const logsQ = useAdminMailLogs(8);
  const testM = useAdminSendTestMail();
  const [toEmail, setToEmail] = useState("");

  async function onSendTest() {
    if (!toEmail.trim()) {
      toast.error(t("admin.mail.test.pickEmail"));
      return;
    }
    try {
      const res = await testM.mutateAsync({ to_email: toEmail.trim() });
      if (res.success) {
        toast.success(t("admin.mail.test.success"));
      } else {
        toast.error(res.message || t("admin.mail.test.failed"));
      }
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  const status = statusQ.data;
  const logs = logsQ.data ?? [];

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 opacity-70" />
            {t("admin.mail.title")}
          </CardTitle>
          <CardDescription>{t("admin.mail.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill ok={!!status?.enabled} label={t("admin.mail.status.enabled")} />
            <StatusPill ok={!!status?.configured} label={t("admin.mail.status.configured")} />
            <StatusPill ok={!!status?.relay_mode} label={t("admin.mail.status.relay")} />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder={t("admin.mail.test.placeholder")} />
            <Button variant="outline" onClick={() => { statusQ.refetch(); logsQ.refetch(); }} disabled={statusQ.isFetching || logsQ.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${(statusQ.isFetching || logsQ.isFetching) ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </Button>
            <Button onClick={onSendTest} disabled={testM.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {testM.isPending ? t("common.sending") : t("admin.mail.test.button")}
            </Button>
          </div>

          <div className="rounded-2xl border bg-muted/10 p-4 text-sm grid gap-1 md:grid-cols-2">
            <div><span className="text-muted-foreground">Host: </span>{status?.host || "—"}</div>
            <div><span className="text-muted-foreground">Port: </span>{status?.port ?? "—"}</div>
            <div><span className="text-muted-foreground">TLS: </span>{status?.use_tls ? "Yes" : "No"}</div>
            <div><span className="text-muted-foreground">SSL: </span>{status?.use_ssl ? "Yes" : "No"}</div>
            <div><span className="text-muted-foreground">From: </span>{status?.from_email || "—"}</div>
            <div><span className="text-muted-foreground">Auth: </span>{status?.has_credentials ? "Yes" : "No"}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("admin.mail.logs.title")}</CardTitle>
          <CardDescription>{t("admin.mail.logs.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!logs.length ? (
            <div className="text-sm text-muted-foreground">{t("common.noResults")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b [&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                    <th>{t("label.date")}</th>
                    <th>{t("label.status")}</th>
                    <th>{t("label.email")}</th>
                    <th>{t("label.comment")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0 [&>td]:px-3 [&>td]:py-3 align-top">
                      <td>{formatDateTime(row.created_at)}</td>
                      <td>
                        <Badge variant={row.success ? "default" : "destructive"} className="rounded-full">
                          {row.success ? t("admin.mail.logs.sent") : t("admin.mail.logs.failed")}
                        </Badge>
                      </td>
                      <td>
                        <div className="font-medium">{row.recipients}</div>
                        <div className="text-xs text-muted-foreground">{row.subject}</div>
                      </td>
                      <td className="text-xs text-muted-foreground">{row.error_message || "—"}</td>
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
