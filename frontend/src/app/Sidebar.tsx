import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, PlusCircle, FileText, Inbox, Settings, BellPlus, ShieldAlert, CircleHelp, BadgeInfo, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/context";
import { useI18n } from "@/app/i18n";
import { useNotificationSummary } from "@/features/notifications/queries";
import { BrandLogo } from "@/components/BrandLogo";

type SidebarProps = { onNavigate?: () => void };
function roleFlags(role?: string) { const r = (role ?? "").trim().toUpperCase(); return { isAdmin: r === "ADMIN", isHr: r === "HR" || r === "ADMIN", isManager: r === "MANAGER" || r === "ADMIN", isEditor: r === "EDITOR" || r === "ADMIN" }; }
export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth(); const { t } = useI18n(); const { isAdmin, isHr, isManager, isEditor } = roleFlags(user?.role); const notifQ = useNotificationSummary(!!user); const counts = notifQ.data?.unread_counts ?? notifQ.data?.counts;
  const items: Array<{to:string;label:string;icon:ComponentType<{className?:string}>;show:boolean;badge?:number;tourId?:string;}> = [
    { to: "/", label: t("nav.dashboard"), icon: LayoutDashboard, show: true },
    { to: "/forms/new", label: t("nav.newForm"), icon: PlusCircle, show: isEditor || isManager, tourId: "new-request" },
    { to: "/forms/my", label: t("nav.myForms"), icon: FileText, show: true },
    { to: "/profile", label: t("nav.profile"), icon: UserCircle2, show: true },
    { to: "/editor/inbox", label: t("nav.editorInbox"), icon: Inbox, show: isEditor, badge: counts?.editor_inbox ?? 0 },
    { to: "/manager/inbox", label: t("nav.managerInbox"), icon: Inbox, show: isManager, badge: counts?.manager_inbox ?? 0 },
    { to: "/hr/inbox", label: t("nav.hrInbox"), icon: Inbox, show: isHr, badge: counts?.hr_inbox ?? 0 },
    { to: "/mandatory-trainings", label: t("nav.mandatoryTrainings"), icon: ShieldAlert, show: isEditor || isManager || isHr, badge: counts?.mandatory_training_alerts ?? 0, tourId: "mandatory-trainings" },
    { to: "/training-proposals", label: t("nav.trainingProposals"), icon: BellPlus, show: isEditor || isManager || isHr, badge: isHr ? (counts?.hr_training_proposals ?? 0) : (counts?.proposal_reviews ?? 0) },
    { to: "/help", label: t("nav.help"), icon: CircleHelp, show: true },
    { to: "/admin", label: t("nav.admin"), icon: Settings, show: isAdmin || isHr },
    { to: "/about", label: t("nav.about"), icon: BadgeInfo, show: true },
  ];
  return <div className="flex h-full flex-col"><div className="border-b border-border/50 dark:border-white/8 p-4"><BrandLogo size="md" subtitle={t("app.tagline")} /><div className="mt-3 rounded-2xl border border-border/60 bg-background/55 dark:border-white/8 dark:bg-background/40 px-3 py-2 text-xs text-muted-foreground">{user ? `${user.full_name ?? user.email} · ${user.role}` : ''}</div></div><nav data-tour="sidebar-nav" className="flex flex-1 flex-col gap-1 px-2 py-3">{items.filter((x) => x.show).map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} onClick={() => onNavigate?.()} data-tour={item.tourId} className={({isActive}) => cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors', isActive ? 'bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_rgba(129,92,246,0.18)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}><Icon className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.badge && item.badge > 0 ? <Badge variant="secondary" className="ml-auto min-w-5 justify-center rounded-full px-1">{item.badge > 99 ? '99+' : item.badge}</Badge> : null}</NavLink>; })}</nav></div>;
}
