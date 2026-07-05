import type { ComponentType } from "react";
import { Bell, BellRing, BriefcaseBusiness, CheckCheck, ChevronRight, FolderClock, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";
import { notificationKeys, useMarkAllNotificationsRead, useMarkNotificationScopesRead, useNotificationSummary } from "@/features/notifications/queries";
import type { NotificationItem } from "@/features/notifications/types";

type GroupBlockProps = {
  title: string;
  total: number;
  icon: ComponentType<{ className?: string }>;
  items: NotificationItem[];
  emptyLabel: string;
  onOpen: (item: NotificationItem) => void;
  dataTour?: string;
};

function GroupBlock({ title, total, icon: Icon, items, emptyLabel, onOpen, dataTour }: GroupBlockProps) {
  return (
    <div data-tour={dataTour} className="space-y-3 rounded-2xl border border-white/10 bg-background/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-sm font-medium">{title}</div>
        </div>
        <Badge variant="secondary" className="rounded-full px-2.5">
          {total > 99 ? "99+" : total}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-background/30 px-3 py-3 text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((item, idx) => (
            <button
              type="button"
              key={`${item.kind}-${item.url}-${idx}`}
              onClick={() => onOpen(item)}
              className="group flex w-full items-start gap-3 rounded-xl border border-white/8 bg-background/50 px-3 py-3 text-left transition-colors hover:bg-background/70"
            >
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary/80 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-5 break-words whitespace-normal">{item.title}</div>
                {item.body ? <div className="mt-1 text-xs leading-5 text-muted-foreground break-words whitespace-normal">{item.body}</div> : null}
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { roleFlags } = useAuth();
  const q = useNotificationSummary();
  const markAllReadM = useMarkAllNotificationsRead();
  const markScopesReadM = useMarkNotificationScopesRead();

  const counts = q.data?.counts;
  const unreadCounts = q.data?.unread_counts ?? counts;
  const items = q.data?.items ?? [];

  const poapTotal =
    (roleFlags.isEditor ? unreadCounts?.editor_inbox ?? 0 : 0) +
    (roleFlags.isManager ? unreadCounts?.manager_inbox ?? 0 : 0) +
    (roleFlags.isHr ? (unreadCounts?.hr_inbox ?? 0) + (unreadCounts?.hr_training_proposals ?? 0) : 0) +
    (unreadCounts?.proposal_reviews ?? 0);

  const mandatoryTotal = unreadCounts?.mandatory_training_alerts ?? 0;
  const total = poapTotal + mandatoryTotal;

  const poapItems = items.filter((item) => item.kind !== "mandatory_training");
  const mandatoryItems = items.filter((item) => item.kind === "mandatory_training");

  const summaryCards = [
    {
      title: "Training Hub",
      value: poapTotal,
      icon: BriefcaseBusiness,
      hint: lang === "en" ? "Unread workflow actions and proposal updates" : "Nieprzeczytane działania workflow i aktualizacje propozycji",
    },
    {
      title: lang === "en" ? "Mandatory" : "Obowiązkowe",
      value: mandatoryTotal,
      icon: ShieldAlert,
      hint: lang === "en" ? "Unread alerts about expiring and overdue trainings" : "Nieprzeczytane alerty o wygasających i przeterminowanych szkoleniach",
    },
  ];

  const scopeByKind: Record<string, string[]> = {
    editor_inbox: ["editor_inbox"],
    manager_inbox: ["manager_inbox"],
    hr_inbox: ["hr_inbox"],
    training_proposal: ["hr_training_proposals"],
    proposal_reviewed: ["proposal_reviews"],
    mandatory_training: ["mandatory_training_alerts"],
  };

  const openNotification = async (item: NotificationItem) => {
    const scopes = scopeByKind[item.kind] ?? [];
    try {
      if (scopes.length > 0) {
        await markScopesReadM.mutateAsync({ scopes, formIds: item.form_id ? [item.form_id] : undefined });
        await qc.invalidateQueries({ queryKey: notificationKeys.summary() });
      }
    } catch {
      // keep navigation responsive even if marking fails
    }
    nav(item.url);
  };

  const handleMarkAllRead = async () => {
    try {
      const result = await markAllReadM.mutateAsync();
      await qc.invalidateQueries({ queryKey: notificationKeys.summary() });
      toast.success(
        lang === "en"
          ? result.updated > 0
            ? `Marked ${result.updated} notification${result.updated === 1 ? "" : "s"} as read.`
            : "Everything is already read."
          : result.updated > 0
            ? `Oznaczono ${result.updated} powiadomień jako przeczytane.`
            : "Wszystkie powiadomienia są już przeczytane.",
      );
    } catch (e: any) {
      toast.error(e?.message ?? (lang === "en" ? "Failed to update notifications." : "Nie udało się zaktualizować powiadomień."));
    }
  };

  const readButtonLabel = lang === "en" ? "Mark all as read" : "Oznacz wszystkie jako przeczytane";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-tour="notifications"
          className="relative rounded-2xl border-border/60 bg-background/72 shadow-sm backdrop-blur transition-colors hover:bg-background/85 dark:border-white/10 dark:bg-background/60"
          aria-label={t("notifications.title")}
        >
          <Bell className="h-4 w-4" />
          {total > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-[0_10px_20px_-10px_hsl(var(--primary)/0.95)]">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[460px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-3xl border-white/10 bg-background/95 p-0 shadow-[0_28px_90px_-44px_hsl(var(--foreground)/0.6)] backdrop-blur-xl"
      >
        <div className="grid max-h-[min(760px,calc(100vh-1rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[inherit]" data-tour="notifications-panel">
          <div
            data-tour="notifications-summary"
            className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <DropdownMenuLabel className="flex items-center gap-2 px-0 text-sm font-semibold">
                  <BellRing className="h-4 w-4 text-primary" />
                  {t("notifications.title")}
                </DropdownMenuLabel>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {lang === "en"
                    ? "Unread items from the training request workflow and mandatory trainings."
                    : "Nieprzeczytane elementy z workflow wniosków szkoleniowych i szkoleń obowiązkowych."}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 shrink-0 rounded-xl px-3"
                disabled={total === 0 || markAllReadM.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleMarkAllRead();
                }}
              >
                {markAllReadM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                {readButtonLabel}
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="rounded-2xl border border-white/10 bg-background/55 p-3 shadow-[0_20px_50px_-40px_hsl(var(--primary)/0.95)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">{card.title}</div>
                        <div className="mt-1 text-2xl font-semibold">{card.value}</div>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-muted-foreground">{card.hint}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <ScrollArea className="min-h-0 h-full px-4 py-4">
            <div className="grid gap-4 pb-4">
              <GroupBlock
                dataTour="notifications-poap-group"
                title={lang === "en" ? "Training Hub module" : "Moduł Training Hub"}
                total={poapTotal}
                icon={FolderClock}
                items={poapItems}
                emptyLabel={lang === "en" ? "All Training Hub notifications are already read." : "Wszystkie powiadomienia modułu Training Hub są już przeczytane."}
                onOpen={(item) => { void openNotification(item); }}
              />

              <GroupBlock
                dataTour="notifications-mandatory-group"
                title={lang === "en" ? "Mandatory trainings" : "Szkolenia obowiązkowe"}
                total={mandatoryTotal}
                icon={ShieldAlert}
                items={mandatoryItems}
                emptyLabel={lang === "en" ? "All mandatory training alerts are already read." : "Wszystkie alerty szkoleń obowiązkowych są już przeczytane."}
                onOpen={(item) => { void openNotification(item); }}
              />
            </div>
          </ScrollArea>

          <div data-tour="notifications-actions" className="border-t border-white/8 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <DropdownMenuItem
                className="rounded-2xl border border-white/8 bg-background/50 px-3 py-3"
                onSelect={(e) => {
                  e.preventDefault();
                  nav("/training-proposals");
                }}
              >
                <FolderClock className="mr-2 h-4 w-4 text-primary" />
                {lang === "en" ? "Open request follow-up" : "Otwórz działania wniosków"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-2xl border border-white/8 bg-background/50 px-3 py-3"
                onSelect={(e) => {
                  e.preventDefault();
                  nav("/mandatory-trainings");
                }}
              >
                <ShieldAlert className="mr-2 h-4 w-4 text-primary" />
                {lang === "en" ? "Open mandatory trainings" : "Otwórz szkolenia obowiązkowe"}
              </DropdownMenuItem>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
