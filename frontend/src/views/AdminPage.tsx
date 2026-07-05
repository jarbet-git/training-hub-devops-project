// src/views/AdminPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  FileDown,
  Layers,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Users as UsersIcon,
  Map as MapIcon,
  MoreHorizontal,
  Upload,
  Mail,
  Copy,
  Send,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Usunięto nieużywany Textarea
import { Switch } from "@/components/ui/switch"; // DODANO
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription, // DODANO
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/features/auth/context";
import { useI18n } from "@/app/i18n";
import { formatDictName, formatMoney, formatAreaLabel } from "@/features/forms/ui";
import { useAreas } from "@/features/forms/queries";
import { ApiError } from "@/lib/http";
import { copyTextToClipboard } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { SelectedColumnsOrder } from "@/components/SelectedColumnsOrder";

import {
  adminCreateExportPreset,
  adminDeleteExportPreset,
  adminExportForms,
  adminListExportPresets,
  adminUpdateExportPreset,
  type ExportPreset,
} from "@/features/admin/api";
import {
  useAdminAreas,
  useAdminBusinessNeeds,
  useAdminCollectionWindow,
  useAdminCostCenters,
  useAdminCreateArea,
  useAdminCreateBusinessNeed,
  useAdminCreateCostCenter,
  useAdminCreateTrainingCategory,
  useAdminCreateTrainingName,
  useAdminCreateUser,
  useAdminDeleteArea,
  useAdminDeleteBusinessNeed,
  useAdminDeleteCostCenter,
  useAdminDeleteTrainingCategory,
  useAdminDeleteTrainingName,
  useAdminSetCollectionWindow,
  useAdminTrainingCategories,
  useAdminTrainingNames,
  useAdminTrainingNamesSearch,
  useAdminUpdateArea,
  useAdminUpdateBusinessNeed,
  useAdminUpdateCostCenter,
  useAdminUpdateTrainingCategory,
  useAdminUpdateTrainingName,
  useAdminUpdateUser,
  useAdminUsers,
  useAdminResendUserInvite,
  useAdminGenerateUserActivationLink,
} from "@/features/admin/queries";
import { AdminMandatoryTrainingsTab } from "@/features/mandatoryTrainings/AdminMandatoryTrainingsTab";
import { AdminMailTab } from "@/features/adminMail/AdminMailTab";

import type {
  AdminUser,
  AdminUserCreate,
  AdminUserUpdate,
  AreaAdmin,
  BusinessNeedAdmin,
  CostCenterAdmin,
  TrainingCategoryAdmin,
  TrainingNameAdmin,
} from "@/features/admin/types";

function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-lg font-semibold">{title}</div>
        {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

type FormErrors = Partial<Record<string, string>>;

function InlineError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function FieldRow({ children, error }: { children: React.ReactNode; error?: string }) {
  return <div className="grid gap-2">{children}{error ? <InlineError message={error} /> : null}</div>;
}

function SmallTable({ children }: { children: React.ReactNode }) {
  return <div className="scrollbar-app overflow-x-auto rounded-xl border bg-background">{children}</div>;
}

function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm">{children}</table>;
}

// POPRAWKA: Dodano React.ComponentProps<"th"> aby obsługiwać colSpan
function TH({ children, className = "", ...props }: React.ComponentProps<"th">) {
  return (
    <th className={`px-3 py-3 text-left font-medium text-muted-foreground ${className}`} {...props}>
      {children}
    </th>
  );
}

// POPRAWKA: Dodano React.ComponentProps<"td"> aby obsługiwać colSpan
function TD({ children, className = "", ...props }: React.ComponentProps<"td">) {
  return (
    <td className={`px-3 py-3 align-top ${className}`} {...props}>
      {children}
    </td>
  );
}

// Usunięto nieużywaną funkcję CodeName

type RowAction = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  const safeActions = (actions ?? []).filter(Boolean);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
          aria-label="Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {safeActions.map((a, idx) => (
          <DropdownMenuItem
            key={idx}
            disabled={a.disabled}
            onSelect={(e) => {
              e.preventDefault();
              if (a.disabled) return;
              a.onSelect();
            }}
            className={a.destructive ? "text-destructive focus:text-destructive" : undefined}
          >
            {a.icon ? <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">{a.icon}</span> : null}
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



// ---------------- USERS TAB ----------------

function UsersTab() {
  const { t, lang } = useI18n();
  const { roleFlags, user: me } = useAuth();

  const areasQ = useAdminAreas();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("");
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");

  const usersQ = useAdminUsers({ q: q || undefined, role: role || undefined });
  const createM = useAdminCreateUser();
  const updateM = useAdminUpdateUser();
  const resendInviteM = useAdminResendUserInvite();
  const copyActivationLinkM = useAdminGenerateUserActivationLink();

  const areas = areasQ.data ?? [];
  const areaLabelById = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of areas) {
      const name = formatDictName(a, lang);
      m.set(a.id, a.code && name ? `${a.code} – ${name}` : name || a.code || "—");
    }
    return m;
  }, [areas, lang]);

  const canCreateAdmin = roleFlags.isAdmin;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const [createModel, setCreateModel] = useState<AdminUserCreate>({
    email: "",
    full_name: "",
    role: "EDITOR",
    is_active: true,
    area_ids: [],
  });

  const [editModel, setEditModel] = useState<AdminUserUpdate>({
    email: "",
    full_name: "",
    role: "EDITOR",
    is_active: true,
    area_ids: [],
  });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  const allUsers = usersQ.data ?? [];
  const activeUsers = useMemo(() => allUsers.filter((u) => u.is_active), [allUsers]);
  const inactiveUsers = useMemo(() => allUsers.filter((u) => !u.is_active), [allUsers]);

  const StatusPill = ({ active }: { active: boolean }) => {
    return (
      <span
        className={
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
          (active
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300")
        }
        title={active ? t("common.active") : t("common.inactive")}
      >
        {active ? t("common.active") : t("common.inactive")}
      </span>
    );
  };

  function openEdit(u: AdminUser) {
    setEditing(u);
    setEditErrors({});
    setEditModel({
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      is_active: u.is_active,
      area_ids: u.area_ids,
    });
    setEditOpen(true);
  }

  function toggleArea(modelAreaIds: number[], id: number) {
    const set = new Set(modelAreaIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    return Array.from(set.values()).sort((a, b) => a - b);
  }

  function roleRequiresArea(role?: string) {
    return role !== "ADMIN" && role !== "HR";
  }

  function validateUser(model: Pick<AdminUserCreate, "email" | "full_name" | "area_ids" | "role">) {
    const errors: FormErrors = {};
    if (!model.email.trim()) errors.email = t("validation.emailRequired");
    if (!model.full_name?.trim()) errors.full_name = t("validation.fullNameRequired");
    if (roleRequiresArea(model.role) && !model.area_ids.length) errors.area_ids = t("validation.areasRequiredForScopedRole");
    return errors;
  }

  async function doCreate() {
    const nextErrors = validateUser(createModel);
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await createM.mutateAsync({
        ...createModel,
        email: createModel.email.trim(),
        full_name: (createModel.full_name ?? "").trim(),
      });
      toast.success(t("admin.toast.userCreated"));
      setCreateOpen(false);
      setCreateModel({ email: "", full_name: "", role: "EDITOR", is_active: true, area_ids: [] });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function doUpdate() {
    if (!editing) return;
    const nextErrors = validateUser({
      email: editModel.email ?? "",
      full_name: editModel.full_name ?? "",
      role: editModel.role ?? "EDITOR",
      area_ids: editModel.area_ids ?? [],
    });
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      const payload: AdminUserUpdate = {
        ...editModel,
        email: editModel.email?.trim(),
        full_name: editModel.full_name?.trim(),
      };

      // Only ADMIN can activate/deactivate users. Also block self-deactivation in UI.
      const isSelf = !!me && editing.id === me.id;
      if (!roleFlags.isAdmin || isSelf) delete payload.is_active;

      await updateM.mutateAsync({ userId: editing.id, payload });
      toast.success(t("admin.toast.userUpdated"));
      setEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  const UsersTable = ({ rows }: { rows: AdminUser[] }) => {
    return (
      <SmallTable>
        <Table>
          <thead>
            <tr className="border-b">
              <TH>{t("label.email")}</TH>
              <TH>{t("label.fullName")}</TH>
              <TH>{t("label.role")}</TH>
              <TH>{t("label.status")}</TH>
              <TH>{t("label.areas")}</TH>
              <TH className="text-right">{t("common.actions")}</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} onClick={() => openEdit(u)} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer">
                <TD className="font-medium">{u.email}</TD>
                <TD>{u.full_name}</TD>
                <TD>
                  <Badge variant="secondary" className="rounded-xl">
                    {u.role}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex flex-wrap items-center gap-2">
                    {u.is_pending_activation ? (
                      <Badge className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/10">
                        {t("admin.users.pendingActivation")}
                      </Badge>
                    ) : (
                      <StatusPill active={u.is_active} />
                    )}
                  </div>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {u.area_ids.map((id) => (
                      <Badge key={id} variant="outline" className="rounded-xl">
                        {areaLabelById.get(id) ?? id}
                      </Badge>
                    ))}
                  </div>
                </TD>
                <TD className="text-right">
  <RowActionsMenu
    actions={[
      { label: t("common.edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(u) },
      ...(u.is_pending_activation ? [
        {
          label: t("admin.users.resendInvite"),
          icon: <Send className="h-4 w-4" />,
          onSelect: async () => {
            try {
              await resendInviteM.mutateAsync(u.id);
              toast.success(t("admin.toast.inviteResent"));
            } catch (e: any) {
              toast.error(e?.message ?? t("common.error"));
            }
          },
        },
        {
          label: t("admin.users.copyActivationLink"),
          icon: <Copy className="h-4 w-4" />,
          onSelect: async () => {
            try {
              const res = await copyActivationLinkM.mutateAsync(u.id);
              await copyTextToClipboard(res.activation_link);
              toast.success(t("admin.toast.activationLinkCopied"));
            } catch (e: any) {
              toast.error(e?.message ?? t("admin.toast.copyFailed"));
            }
          },
        },
      ] : []),
    ]}
  />
</TD>
              </tr>
            ))}
            {usersQ.isLoading ? (
              <tr>
                <TD colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("common.loading")}
                </TD>
              </tr>
            ) : null}
            {!usersQ.isLoading && rows.length === 0 ? (
              <tr>
                <TD colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("common.noResults")}
                </TD>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </SmallTable>
    );
  };

  return (
    <div className="grid gap-4">
      <SectionHeader
        title={t("admin.users.title")}
        subtitle={t("admin.users.subtitle")}
        right={
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setCreateErrors({});
                setCreateModel({
                  email: "",
                  full_name: "",
                  role: "EDITOR",
                  is_active: true,
                  area_ids: [],
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.users.create")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("admin.users.create")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldRow error={createErrors.email}>
                    <Label>{t("label.email")}</Label>
                    <Input
                      aria-invalid={!!createErrors.email}
                      value={createModel.email}
                      onChange={(e) => { setCreateModel((s) => ({ ...s, email: e.target.value })); setCreateErrors((s) => ({ ...s, email: undefined })); }}
                      placeholder="user@example.com"
                    />
                  </FieldRow>
                  <FieldRow error={createErrors.full_name}>
                    <Label>{t("label.fullName")}</Label>
                    <Input
                      aria-invalid={!!createErrors.full_name}
                      value={createModel.full_name ?? ""}
                      onChange={(e) => { setCreateModel((s) => ({ ...s, full_name: e.target.value })); setCreateErrors((s) => ({ ...s, full_name: undefined })); }}
                      placeholder="Jan Kowalski"
                    />
                  </FieldRow>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">{t("admin.users.inviteInfo")}</div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldRow>
                    <Label>{t("label.role")}</Label>
                    <Select value={createModel.role} onValueChange={(v) => { setCreateModel((s) => ({ ...s, role: v as any })); setCreateErrors((s) => ({ ...s, area_ids: undefined })); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        {canCreateAdmin ? <SelectItem value="ADMIN">Admin</SelectItem> : null}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>

                <FieldRow>
                  <Label>{t("label.active")}</Label>
                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">{t("admin.users.activeHint")}</div>
                    <div className="flex items-center gap-3">
                      <StatusPill active={!!createModel.is_active} />
                      <Switch checked={!!createModel.is_active} onCheckedChange={(v) => setCreateModel((s) => ({ ...s, is_active: v }))} />
                    </div>
                  </div>
                </FieldRow>

                <FieldRow error={createErrors.area_ids}>
                  <Label>{t("label.areas")}</Label>
                  <div className="scrollbar-app max-h-56 overflow-auto rounded-xl border p-3">
                    <div className="grid gap-2">
                      {areas.map((a) => {
                        const checked = createModel.area_ids.includes(a.id);
                        const label = areaLabelById.get(a.id) ?? String(a.id);
                        return (
                          <label key={a.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => { setCreateModel((s) => ({ ...s, area_ids: toggleArea(s.area_ids, a.id) })); setCreateErrors((s) => ({ ...s, area_ids: undefined })); }}
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{roleRequiresArea(createModel.role) ? t("admin.users.areasHintRequired") : t("admin.users.areasHintOptional")}</div>
                </FieldRow>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("common.cancel")}</Button>
                </DialogClose>
                <Button onClick={doCreate} disabled={createM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createM.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <FieldRow>
              <Label>{t("common.search")}</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.users.searchPlaceholder")} />
            </FieldRow>
            <FieldRow>
              <Label>{t("label.role")}</Label>
              <Select value={role || "ALL"} onValueChange={(v) => setRole(v === "ALL" ? "" : v)}>
                <SelectTrigger className="md:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
          <div className="mt-4">
            <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as any)}>
              <TabsList>
                <TabsTrigger value="active">
                  {t("admin.users.activeTab")}<span className="ml-2 text-xs text-muted-foreground">{activeUsers.length}</span>
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  {t("admin.users.inactiveTab")}<span className="ml-2 text-xs text-muted-foreground">{inactiveUsers.length}</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-3">
                <UsersTable rows={activeUsers} />
              </TabsContent>
              <TabsContent value="inactive" className="mt-3">
                <UsersTable rows={inactiveUsers} />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("common.edit")} — {editing?.email}
            </DialogTitle>
            {me && editing?.id === me.id ? <DialogDescription>{t("admin.users.selfDeactivateHint")}</DialogDescription> : null}
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldRow error={editErrors.email}>
                <Label>{t("label.email")}</Label>
                <Input aria-invalid={!!editErrors.email} value={editModel.email ?? ""} onChange={(e) => { setEditModel((s) => ({ ...s, email: e.target.value })); setEditErrors((s) => ({ ...s, email: undefined })); }} />
              </FieldRow>
              <FieldRow error={editErrors.full_name}>
                <Label>{t("label.fullName")}</Label>
                <Input aria-invalid={!!editErrors.full_name} value={editModel.full_name ?? ""} onChange={(e) => { setEditModel((s) => ({ ...s, full_name: e.target.value })); setEditErrors((s) => ({ ...s, full_name: undefined })); }} />
              </FieldRow>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldRow>
                <Label>{t("label.role")}</Label>
                <Select value={(editModel.role as any) ?? "EDITOR"} onValueChange={(v) => { setEditModel((s) => ({ ...s, role: v as any })); setEditErrors((s) => ({ ...s, area_ids: undefined })); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    {canCreateAdmin ? <SelectItem value="ADMIN">Admin</SelectItem> : null}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            <FieldRow>
              <Label>{t("label.active")}</Label>
              {roleFlags.isAdmin ? (
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">{t("admin.users.activeHint")}</div>
                  <div className="flex items-center gap-3">
                    <StatusPill active={!!editModel.is_active} />
                    <Switch
                      disabled={!!me && !!editing && editing.id === me.id}
                      checked={!!editModel.is_active}
                      onCheckedChange={(v) => setEditModel((s) => ({ ...s, is_active: v }))}
                    />
                  </div>
                </div>
              ) : (
                <StatusPill active={!!editModel.is_active} />
              )}
            </FieldRow>

            <FieldRow error={editErrors.area_ids}>
              <Label>{t("label.areas")}</Label>
              <div className="scrollbar-app max-h-56 overflow-auto rounded-xl border p-3">
                <div className="grid gap-2">
                  {areas.map((a) => {
                    const checked = (editModel.area_ids ?? []).includes(a.id);
                    const label = areaLabelById.get(a.id) ?? String(a.id);
                    return (
                      <label key={a.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => { setEditModel((s) => ({ ...s, area_ids: toggleArea(s.area_ids ?? [], a.id) })); setEditErrors((s) => ({ ...s, area_ids: undefined })); }}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{roleRequiresArea((editModel.role as any) ?? "EDITOR") ? t("admin.users.areasHintRequired") : t("admin.users.areasHintOptional")}</div>
            </FieldRow>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button onClick={doUpdate} disabled={updateM.isPending}>
              {updateM.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ---------------- AREAS TAB ----------------

function AreasTab() {
  const { t } = useI18n(); // Usunięto nieużywany 'lang'

  const q = useAdminAreas();
  const createM = useAdminCreateArea();
  const updateM = useAdminUpdateArea();
  const delM = useAdminDeleteArea();

  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const all = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return all;
    return all.filter((a) => `${a.code} ${a.name_pl ?? ""} ${a.name_en ?? ""}`.toLowerCase().includes(s));
  }, [q.data, search]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [model, setModel] = useState({ code: "", name_pl: "", name_en: "" });
  const [editing, setEditing] = useState<AreaAdmin | null>(null);
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const confirmD = useConfirmDialog();

  function validateAreaModel() {
    const errors: FormErrors = {};
    if (!model.code.trim()) errors.code = t("validation.codeRequired");
    if (!model.name_pl.trim()) errors.name_pl = t("validation.namePlRequired");
    if (!model.name_en.trim()) errors.name_en = t("validation.nameEnRequired");
    return errors;
  }

  async function doCreate() {
    const nextErrors = validateAreaModel();
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await createM.mutateAsync({ code: model.code.trim(), name_pl: model.name_pl.trim(), name_en: model.name_en.trim() });
      toast.success(t("admin.toast.areaCreated"));
      setCreateOpen(false);
      setModel({ code: "", name_pl: "", name_en: "" });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  function openEdit(a: AreaAdmin) {
    setEditing(a);
    setEditErrors({});
    setModel({ code: a.code, name_pl: a.name_pl ?? "", name_en: a.name_en ?? "" });
    setEditOpen(true);
  }

  async function doUpdate() {
    if (!editing) return;
    const nextErrors = validateAreaModel();
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await updateM.mutateAsync({ areaId: editing.id, payload: { code: model.code.trim(), name_pl: model.name_pl.trim(), name_en: model.name_en.trim() } });
      toast.success(t("admin.toast.areaUpdated"));
      setEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function doDelete(a: AreaAdmin) {
    confirmD.request({
      title: t("common.confirmDeleteTitle"),
      description: t("common.confirmDelete"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await delM.mutateAsync(a.id);
          toast.success(t("admin.toast.areaDeleted"));
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 409) {
            toast.error(e.message);
            return;
          }
          toast.error(e?.message ?? t("common.error"));
        }
      },
    });
  }

  return (
    <div className="grid gap-4">
      <ConfirmDialog
        open={confirmD.open}
        onOpenChange={(open) => (open ? confirmD.setOpen(true) : confirmD.cancel())}
        title={confirmD.title}
        description={confirmD.description}
        confirmText={confirmD.confirmText}
        cancelText={confirmD.cancelText}
        onConfirm={confirmD.confirm}
        isLoading={confirmD.isLoading}
        destructive={confirmD.destructive}
      />
      <SectionHeader
        title={t("admin.areas.title")}
        subtitle={t("admin.areas.subtitle")}
        right={
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setEditing(null);
                setCreateErrors({});
                setModel({ code: "", name_pl: "", name_en: "" });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.areas.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("admin.areas.create")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <FieldRow error={createErrors.code}>
                  <Label>{t("label.code")}</Label>
                  <Input aria-invalid={!!createErrors.code} value={model.code} onChange={(e) => { setModel((s) => ({ ...s, code: e.target.value })); setCreateErrors((s) => ({ ...s, code: undefined })); }} placeholder="PL_AFC" />
                </FieldRow>
                <FieldRow error={createErrors.name_pl}>
                  <Label>{t("label.namePl")}</Label>
                  <Input aria-invalid={!!createErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setCreateErrors((s) => ({ ...s, name_pl: undefined })); }} placeholder="Finanse" />
                </FieldRow>
                <FieldRow error={createErrors.name_en}>
                  <Label>{t("label.nameEn")}</Label>
                  <Input aria-invalid={!!createErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setCreateErrors((s) => ({ ...s, name_en: undefined })); }} placeholder="Finance" />
                </FieldRow>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("common.cancel")}</Button>
                </DialogClose>
                <Button onClick={doCreate} disabled={createM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createM.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-2">
            <Label>{t("common.search")}</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.areas.searchPlaceholder")} />
          </div>
          <div className="mt-4">
            <SmallTable>
              <Table>
                <thead>
                  <tr className="border-b">
                    <TH>{t("label.code")}</TH>
                    <TH>{t("label.namePl")}</TH>
                    <TH>{t("label.nameEn")}</TH>
                    <TH className="text-right">{t("common.actions")}</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} onClick={() => openEdit(a)} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer">
                      <TD className="font-medium">{a.code}</TD>
                      <TD>{a.name_pl ?? <span className="text-muted-foreground">—</span>}</TD>
                      <TD>{a.name_en ?? <span className="text-muted-foreground">—</span>}</TD>
                      <TD className="text-right">
                        <RowActionsMenu
    actions={[
      { label: t("common.edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(a) },
      { label: t("common.delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => doDelete(a), destructive: true },
    ]}
  />
                      </TD>
                    </tr>
                  ))}
                  {q.isLoading ? (
                    <tr>
                      <TD colSpan={4} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TD>
                    </tr>
                  ) : null}
                  {!q.isLoading && rows.length === 0 ? (
                    <tr>
                      <TD colSpan={4} className="py-8 text-center text-muted-foreground">{t("common.noResults")}</TD>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </SmallTable>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.edit")} — {editing?.code}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldRow error={editErrors.code}>
              <Label>{t("label.code")}</Label>
              <Input aria-invalid={!!editErrors.code} value={model.code} onChange={(e) => { setModel((s) => ({ ...s, code: e.target.value })); setEditErrors((s) => ({ ...s, code: undefined })); }} />
            </FieldRow>
            <FieldRow error={editErrors.name_pl}>
              <Label>{t("label.namePl")}</Label>
              <Input aria-invalid={!!editErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setEditErrors((s) => ({ ...s, name_pl: undefined })); }} />
            </FieldRow>
            <FieldRow error={editErrors.name_en}>
              <Label>{t("label.nameEn")}</Label>
              <Input aria-invalid={!!editErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setEditErrors((s) => ({ ...s, name_en: undefined })); }} />
            </FieldRow>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button onClick={doUpdate} disabled={updateM.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateM.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- COST CENTERS TAB ----------------

function CostCentersTab() {
  const { t, lang } = useI18n();
  const areasQ = useAdminAreas();
  const areas = areasQ.data ?? [];

  // keep selection as string to support an "All areas" option
  const [areaKey, setAreaKey] = useState<string>("");

  // keep selection valid when areas load/change
  React.useEffect(() => {
    if (!areas.length) return;
    if (!areaKey) {
      setAreaKey(String(areas[0]!.id));
      return;
    }
    if (areaKey === "all") return;
    const id = Number(areaKey);
    if (!id || !areas.some((a) => a.id === id)) {
      setAreaKey(String(areas[0]!.id));
    }
  }, [areas, areaKey]);

  const isAll = areaKey === "all";
  const selectedAreaId = isAll ? null : (Number(areaKey) || null);

  const [search, setSearch] = useState("");
  const trimmed = search.trim();

  // For "All areas" we do server-side search only (avoid loading the whole dataset)
  const canSearchAll = trimmed.length >= 2;
  const listEnabled = isAll ? canSearchAll : !!selectedAreaId;

  const q = useAdminCostCenters(
    isAll
      ? { q: trimmed, limit: 200 }
      : { area_id: selectedAreaId ?? undefined, limit: 500 },
    listEnabled
  );

  const rows = useMemo(() => {
    const all = q.data ?? [];
    if (isAll) {
      if (!canSearchAll) return [];
      return all;
    }
    const s = trimmed.toLowerCase();
    if (!s) return all;
    return all.filter((cc) => `${cc.code} ${cc.name_pl ?? ""} ${cc.name_en ?? ""}`.toLowerCase().includes(s));
  }, [q.data, trimmed, isAll, canSearchAll]);

  const colCount = isAll ? 5 : 4;

  // Mutations (areaId only needed for create; update/delete are by ID)
  const createM = useAdminCreateCostCenter(selectedAreaId ?? 0);
  const updateM = useAdminUpdateCostCenter(selectedAreaId ?? 0);
  const delM = useAdminDeleteCostCenter(selectedAreaId ?? 0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenterAdmin | null>(null);
  const [model, setModel] = useState({ code: "", name_pl: "", name_en: "" });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const confirmD = useConfirmDialog();

  function validateCostCenterModel(requireArea: boolean) {
    const errors: FormErrors = {};
    if (requireArea && !selectedAreaId) errors.area_id = t("admin.costCenters.pickAreaFirst");
    if (!model.code.trim()) errors.code = t("validation.codeRequired");
    if (!model.name_pl.trim()) errors.name_pl = t("validation.namePlRequired");
    if (!model.name_en.trim()) errors.name_en = t("validation.nameEnRequired");
    return errors;
  }

  async function doCreate() {
    const nextErrors = validateCostCenterModel(true);
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await createM.mutateAsync({ code: model.code.trim(), name_pl: model.name_pl.trim(), name_en: model.name_en.trim() });
      toast.success(t("admin.toast.costCenterCreated"));
      setCreateOpen(false);
      setModel({ code: "", name_pl: "", name_en: "" });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  function openEdit(cc: CostCenterAdmin) {
    setEditing(cc);
    setEditErrors({});
    setModel({ code: cc.code, name_pl: cc.name_pl ?? "", name_en: cc.name_en ?? "" });
    setEditOpen(true);
  }

  async function doUpdate() {
    if (!editing) return;
    const nextErrors = validateCostCenterModel(false);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await updateM.mutateAsync({ ccId: editing.id, payload: { code: model.code.trim(), name_pl: model.name_pl.trim(), name_en: model.name_en.trim() } });
      toast.success(t("admin.toast.costCenterUpdated"));
      setEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function doDelete(cc: CostCenterAdmin) {
    confirmD.request({
      title: t("common.confirmDeleteTitle"),
      description: t("common.confirmDelete"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await delM.mutateAsync(cc.id);
          toast.success(t("admin.toast.costCenterDeleted"));
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 409) {
            toast.error(e.message);
            return;
          }
          toast.error(e?.message ?? t("common.error"));
        }
      },
    });
  }

  const areaLabel = useMemo(() => {
    if (!selectedAreaId) return "—";
    const a = areas.find((x) => x.id === selectedAreaId);
    if (!a) return "—";
    const name = formatDictName(a, lang);
    return a.code && name ? `${a.code} – ${name}` : name || a.code || "—";
  }, [areas, selectedAreaId, lang]);

  const areaLabelById = (id: number) => {
    const a = areas.find((x) => x.id === id);
    if (!a) return "—";
    const name = formatDictName(a, lang);
    return a.code && name ? `${a.code} – ${name}` : name || a.code || "—";
  };

  return (
    <div className="grid gap-4">
      <ConfirmDialog
        open={confirmD.open}
        onOpenChange={(open) => (open ? confirmD.setOpen(true) : confirmD.cancel())}
        title={confirmD.title}
        description={confirmD.description}
        confirmText={confirmD.confirmText}
        cancelText={confirmD.cancelText}
        onConfirm={confirmD.confirm}
        isLoading={confirmD.isLoading}
        destructive={confirmD.destructive}
      />
      <SectionHeader
        title={t("admin.costCenters.title")}
        subtitle={t("admin.costCenters.subtitle")}
        right={
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setEditing(null);
                setCreateErrors({});
                setModel({ code: "", name_pl: "", name_en: "" });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!selectedAreaId || isAll}>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.costCenters.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("admin.costCenters.create")} — {areaLabel}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <FieldRow error={createErrors.area_id}>
                  <div className="text-xs text-muted-foreground">{areaLabel}</div>
                </FieldRow>
                <FieldRow error={createErrors.code}>
                  <Label>{t("label.code")}</Label>
                  <Input aria-invalid={!!createErrors.code} value={model.code} onChange={(e) => { setModel((s) => ({ ...s, code: e.target.value })); setCreateErrors((s) => ({ ...s, code: undefined })); }} placeholder="MPK123" />
                </FieldRow>
                <FieldRow error={createErrors.name_pl}>
                  <Label>{t("label.namePl")}</Label>
                  <Input aria-invalid={!!createErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setCreateErrors((s) => ({ ...s, name_pl: undefined })); }} />
                </FieldRow>
                <FieldRow error={createErrors.name_en}>
                  <Label>{t("label.nameEn")}</Label>
                  <Input aria-invalid={!!createErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setCreateErrors((s) => ({ ...s, name_en: undefined })); }} />
                </FieldRow>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("common.cancel")}</Button>
                </DialogClose>
                <Button onClick={doCreate} disabled={createM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createM.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow>
              <Label>{t("label.area")}</Label>
              <div className="grid gap-2">
                <Select value={areaKey} onValueChange={setAreaKey}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.costCenters.pickAreaFirst")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.costCenters.allAreas")}</SelectItem>
                    {areas.map((a) => {
                      const label = formatAreaLabel(a as any, lang);
                      return (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {isAll ? (
                  <p className="text-xs text-muted-foreground">{t("admin.costCenters.allAreasHint")}</p>
                ) : null}
              </div>
            </FieldRow>
            <FieldRow>
              <Label>{t("common.search")}</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.costCenters.searchPlaceholder")} />
            </FieldRow>
          </div>

          <div className="mt-4">
            <SmallTable>
              <Table>
                <thead>
                  <tr className="border-b">
                    <TH>{t("label.code")}</TH>
                    <TH>{t("label.namePl")}</TH>
                    <TH>{t("label.nameEn")}</TH>
                    {isAll ? <TH>{t("label.area")}</TH> : null}
                    <TH className="text-right">{t("common.actions")}</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((cc) => (
                    <tr key={cc.id} onClick={() => openEdit(cc)} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer">
                      <TD className="font-medium">{cc.code}</TD>
                      <TD>{cc.name_pl ?? <span className="text-muted-foreground">—</span>}</TD>
                      <TD>{cc.name_en ?? <span className="text-muted-foreground">—</span>}</TD>
                      {isAll ? <TD className="max-w-[24rem] truncate" title={areaLabelById(cc.area_id)}>{areaLabelById(cc.area_id)}</TD> : null}
                      <TD className="text-right">
                        <RowActionsMenu
                          actions={[
                            { label: t("common.edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(cc) },
                            { label: t("common.delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => doDelete(cc), destructive: true },
                          ]}
                        />
                      </TD>
                    </tr>
                  ))}

                  {q.isLoading ? (
                    <tr>
                      <TD colSpan={isAll ? 5 : 4} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TD>
                    </tr>
                  ) : null}

                  {!q.isLoading && isAll && !canSearchAll ? (
                    <tr>
                      <TD colSpan={colCount} className="py-8 text-center text-muted-foreground">{t("admin.costCenters.allAreasHint")}</TD>
                    </tr>
                  ) : null}

                  {!q.isLoading && rows.length === 0 && !(isAll && !canSearchAll) ? (
                    <tr>
                      <TD colSpan={isAll ? 5 : 4} className="py-8 text-center text-muted-foreground">{t("common.noResults")}</TD>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </SmallTable>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("common.edit")} — {editing?.code}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldRow error={editErrors.code}>
              <Label>{t("label.code")}</Label>
              <Input aria-invalid={!!editErrors.code} value={model.code} onChange={(e) => { setModel((s) => ({ ...s, code: e.target.value })); setEditErrors((s) => ({ ...s, code: undefined })); }} />
            </FieldRow>
            <FieldRow error={editErrors.name_pl}>
              <Label>{t("label.namePl")}</Label>
              <Input aria-invalid={!!editErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setEditErrors((s) => ({ ...s, name_pl: undefined })); }} />
            </FieldRow>
            <FieldRow error={editErrors.name_en}>
              <Label>{t("label.nameEn")}</Label>
              <Input aria-invalid={!!editErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setEditErrors((s) => ({ ...s, name_en: undefined })); }} />
            </FieldRow>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button onClick={doUpdate} disabled={updateM.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateM.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- TRAINING CATEGORIES TAB ----------------

function TrainingCategoriesTab() {
  const { t } = useI18n();

  const q = useAdminTrainingCategories();
  const createM = useAdminCreateTrainingCategory();
  const updateM = useAdminUpdateTrainingCategory();
  const delM = useAdminDeleteTrainingCategory();

  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const all = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return all;
    return all.filter((c) => `${c.name_pl} ${c.name_en}`.toLowerCase().includes(s));
  }, [q.data, search]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingCategoryAdmin | null>(null);
  const [model, setModel] = useState({ name_pl: "", name_en: "" });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const confirmD = useConfirmDialog();

  function validateCategoryModel() {
    const errors: FormErrors = {};
    if (!model.name_pl.trim()) errors.name_pl = t("validation.namePlRequired");
    if (!model.name_en.trim()) errors.name_en = t("validation.nameEnRequired");
    return errors;
  }

  async function doCreate() {
    const nextErrors = validateCategoryModel();
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await createM.mutateAsync({ name_pl: model.name_pl.trim(), name_en: model.name_en.trim() });
      toast.success(t("admin.toast.categoryCreated"));
      setCreateOpen(false);
      setModel({ name_pl: "", name_en: "" });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  function openEdit(c: TrainingCategoryAdmin) {
    setEditing(c);
    setEditErrors({});
    setModel({ name_pl: c.name_pl, name_en: c.name_en });
    setEditOpen(true);
  }

  async function doUpdate() {
    if (!editing) return;
    const nextErrors = validateCategoryModel();
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await updateM.mutateAsync({ catId: editing.id, payload: { name_pl: model.name_pl.trim(), name_en: model.name_en.trim() } });
      toast.success(t("admin.toast.categoryUpdated"));
      setEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function doDelete(c: TrainingCategoryAdmin) {
    confirmD.request({
      title: t("common.confirmDeleteTitle"),
      description: t("common.confirmDelete"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await delM.mutateAsync(c.id);
          toast.success(t("admin.toast.categoryDeleted"));
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 409) {
            toast.error(e.message);
            return;
          }
          toast.error(e?.message ?? t("common.error"));
        }
      },
    });
  }

  return (
    <div className="grid gap-4">
      <ConfirmDialog
        open={confirmD.open}
        onOpenChange={(open) => (open ? confirmD.setOpen(true) : confirmD.cancel())}
        title={confirmD.title}
        description={confirmD.description}
        confirmText={confirmD.confirmText}
        cancelText={confirmD.cancelText}
        onConfirm={confirmD.confirm}
        isLoading={confirmD.isLoading}
        destructive={confirmD.destructive}
      />
      <SectionHeader
        title={t("admin.categories.title")}
        subtitle={t("admin.categories.subtitle")}
        right={
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setEditing(null);
                setCreateErrors({});
                setModel({ name_pl: "", name_en: "" });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.categories.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("admin.categories.create")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <FieldRow error={createErrors.name_pl}>
                  <Label>{t("label.namePl")}</Label>
                  <Input aria-invalid={!!createErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setCreateErrors((s) => ({ ...s, name_pl: undefined })); }} />
                </FieldRow>
                <FieldRow error={createErrors.name_en}>
                  <Label>{t("label.nameEn")}</Label>
                  <Input aria-invalid={!!createErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setCreateErrors((s) => ({ ...s, name_en: undefined })); }} />
                </FieldRow>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
                <Button onClick={doCreate} disabled={createM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createM.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <FieldRow>
            <Label>{t("common.search")}</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.categories.searchPlaceholder")} />
          </FieldRow>
          <div className="mt-4">
            <SmallTable>
              <Table>
                <thead>
                  <tr className="border-b">
                    <TH>{t("label.namePl")}</TH>
                    <TH>{t("label.nameEn")}</TH>
                    <TH className="text-right">{t("common.actions")}</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} onClick={() => openEdit(c)} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer">
                      <TD className="font-medium">{c.name_pl}</TD>
                      <TD>{c.name_en}</TD>
                      <TD className="text-right">
                        <RowActionsMenu
    actions={[
      { label: t("common.edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(c) },
      { label: t("common.delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => doDelete(c), destructive: true },
    ]}
  />
                      </TD>
                    </tr>
                  ))}
                  {q.isLoading ? (
                    <tr><TD colSpan={3} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TD></tr>
                  ) : null}
                  {!q.isLoading && rows.length === 0 ? (
                    <tr><TD colSpan={3} className="py-8 text-center text-muted-foreground">{t("common.noResults")}</TD></tr>
                  ) : null}
                </tbody>
              </Table>
            </SmallTable>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.edit")} — {editing?.name_pl}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldRow error={editErrors.name_pl}>
              <Label>{t("label.namePl")}</Label>
              <Input aria-invalid={!!editErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setEditErrors((s) => ({ ...s, name_pl: undefined })); }} />
            </FieldRow>
            <FieldRow error={editErrors.name_en}>
              <Label>{t("label.nameEn")}</Label>
              <Input aria-invalid={!!editErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setEditErrors((s) => ({ ...s, name_en: undefined })); }} />
            </FieldRow>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={doUpdate} disabled={updateM.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateM.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- TRAINING NAMES TAB ----------------

function TrainingNamesTab() {
  const { t, lang } = useI18n();

  const catsQ = useAdminTrainingCategories();
  const cats = catsQ.data ?? [];

  // 0 = wszystkie kategorie (globalne wyszukiwanie)
  const [catId, setCatId] = useState<number>(cats[0]?.id ?? 0);
  React.useEffect(() => {
    if (!cats.length) return;
    // nie nadpisuj "0 = wszystkie"
    if (catId === 0) return;
    if (!catId) setCatId(cats[0]!.id);
  }, [cats, catId]);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  React.useEffect(() => {
    const tmr = window.setTimeout(() => setSearchDebounced(search), 250);
    return () => window.clearTimeout(tmr);
  }, [search]);

  const s = searchDebounced.trim();
  const isAllCats = catId === 0;

  const listQ = useAdminTrainingNames(catId, s || undefined, !isAllCats && !!catId);
  const searchQ = useAdminTrainingNamesSearch({ q: s, limit: 100 }, isAllCats && s.length >= 2);
  const qAny = isAllCats ? searchQ : listQ;
  const rows = qAny.data ?? [];
  const colCount = isAllCats ? 6 : 5;
  const createCatId = catId || cats[0]?.id || 0;

  const createM = useAdminCreateTrainingName(createCatId);
  const updateM = useAdminUpdateTrainingName();
  const delM = useAdminDeleteTrainingName();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingNameAdmin | null>(null);
  const [model, setModel] = useState({ name_pl: "", name_en: "", default_cost_per_person: 0, default_hours_per_person: 0 });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const confirmD = useConfirmDialog();

  const catLabel = useMemo(() => {
    if (catId === 0) return t("admin.trainingNames.allCategories");
    const c = cats.find((x) => x.id === catId);
    if (!c) return "—";
    return lang === "en" ? c.name_en : c.name_pl;
  }, [cats, catId, lang, t]);

  const catsById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  function validateTrainingNameModel(requireCategory: boolean) {
    const errors: FormErrors = {};
    if (requireCategory && !catId) errors.category_id = t("admin.trainingNames.pickCategoryFirst");
    if (!model.name_pl.trim()) errors.name_pl = t("validation.namePlRequired");
    if (!model.name_en.trim()) errors.name_en = t("validation.nameEnRequired");
    return errors;
  }

  async function doCreate() {
    const nextErrors = validateTrainingNameModel(true);
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await createM.mutateAsync({
        name_pl: model.name_pl.trim(),
        name_en: model.name_en.trim(),
        default_cost_per_person: Number(model.default_cost_per_person) || 0,
        default_hours_per_person: Number(model.default_hours_per_person) || 0,
      });
      toast.success(t("admin.toast.trainingNameCreated"));
      setCreateOpen(false);
      setModel({ name_pl: "", name_en: "", default_cost_per_person: 0, default_hours_per_person: 0 });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  function openEdit(x: TrainingNameAdmin) {
    setEditing(x);
    setEditErrors({});
    setModel({
      name_pl: x.name_pl,
      name_en: x.name_en,
      default_cost_per_person: x.default_cost_per_person,
      default_hours_per_person: x.default_hours_per_person,
    });
    setEditOpen(true);
  }

  async function doUpdate() {
    if (!editing) return;
    const nextErrors = validateTrainingNameModel(false);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await updateM.mutateAsync({
        tnId: editing.id,
        payload: {
          name_pl: model.name_pl.trim(),
          name_en: model.name_en.trim(),
          default_cost_per_person: Number(model.default_cost_per_person) || 0,
          default_hours_per_person: Number(model.default_hours_per_person) || 0,
        },
      });
      toast.success(t("admin.toast.trainingNameUpdated"));
      setEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function doDelete(x: TrainingNameAdmin) {
    confirmD.request({
      title: t("common.confirmDeleteTitle"),
      description: t("common.confirmDelete"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await delM.mutateAsync(x.id);
          toast.success(t("admin.toast.trainingNameDeleted"));
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 409) {
            toast.error(e.message);
            return;
          }
          toast.error(e?.message ?? t("common.error"));
        }
      },
    });
  }

  return (
    <div className="grid gap-4">
      <ConfirmDialog
        open={confirmD.open}
        onOpenChange={(open) => (open ? confirmD.setOpen(true) : confirmD.cancel())}
        title={confirmD.title}
        description={confirmD.description}
        confirmText={confirmD.confirmText}
        cancelText={confirmD.cancelText}
        onConfirm={confirmD.confirm}
        isLoading={confirmD.isLoading}
        destructive={confirmD.destructive}
      />
      <SectionHeader
        title={t("admin.trainingNames.title")}
        subtitle={t("admin.trainingNames.subtitle")}
        right={
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setEditing(null);
                setCreateErrors({});
                setModel({ name_pl: "", name_en: "", default_cost_per_person: 0, default_hours_per_person: 0 });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!catId}>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.trainingNames.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("admin.trainingNames.create")} — {catLabel}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <FieldRow error={createErrors.category_id}>
                  <div className="text-xs text-muted-foreground">{catLabel}</div>
                </FieldRow>
                <FieldRow error={createErrors.name_pl}>
                  <Label>{t("label.namePl")}</Label>
                  <Input aria-invalid={!!createErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setCreateErrors((s) => ({ ...s, name_pl: undefined })); }} />
                </FieldRow>
                <FieldRow error={createErrors.name_en}>
                  <Label>{t("label.nameEn")}</Label>
                  <Input aria-invalid={!!createErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setCreateErrors((s) => ({ ...s, name_en: undefined })); }} />
                </FieldRow>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldRow>
                    <Label>{t("label.defaultCost")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={String(model.default_cost_per_person)}
                      onChange={(e) => setModel((s) => ({ ...s, default_cost_per_person: Number(e.target.value) }))}
                    />
                  </FieldRow>
                  <FieldRow>
                    <Label>{t("label.defaultHours")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={String(model.default_hours_per_person)}
                      onChange={(e) => setModel((s) => ({ ...s, default_hours_per_person: Number(e.target.value) }))}
                    />
                  </FieldRow>
                </div>

                <div className="text-xs text-muted-foreground">{t("admin.trainingNames.defaultsHint")}</div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
                <Button onClick={doCreate} disabled={createM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createM.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow>
              <Label>{t("label.category")}</Label>
              <Select value={String(catId)} onValueChange={(v) => setCatId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.trainingNames.pickCategoryFirst")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("admin.trainingNames.allCategories")}</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {lang === "en" ? c.name_en : c.name_pl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow>
              <Label>{t("common.search")}</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.trainingNames.searchPlaceholder")} />
            </FieldRow>
          </div>

          <div className="mt-4">
            <SmallTable>
              <Table>
                <thead>
                  <tr className="border-b">
                    <TH>{t("label.namePl")}</TH>
                    {isAllCats ? <TH>{t("label.category")}</TH> : null}
                    <TH>{t("label.nameEn")}</TH>
                    <TH>{t("label.defaultCost")}</TH>
                    <TH>{t("label.defaultHours")}</TH>
                    <TH className="text-right">{t("common.actions")}</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.id} onClick={() => openEdit(x)} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer">
                      <TD className="font-medium">{x.name_pl}</TD>
                      {isAllCats ? (
                        <TD>{(lang === "en" ? catsById.get(x.category_id)?.name_en : catsById.get(x.category_id)?.name_pl) ?? "—"}</TD>
                      ) : null}
                      <TD>{x.name_en}</TD>
                      <TD>{formatMoney(x.default_cost_per_person)}</TD>
                      <TD>{x.default_hours_per_person.toFixed(1)} h</TD>
                      <TD className="text-right">
                        <RowActionsMenu
    actions={[
      { label: t("common.edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(x) },
      { label: t("common.delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => doDelete(x), destructive: true },
    ]}
  />
                      </TD>
                    </tr>
                  ))}
                  {qAny.isLoading ? (
                    <tr><TD colSpan={colCount} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TD></tr>
                  ) : null}
                  {!qAny.isLoading && rows.length === 0 ? (
                    <tr><TD colSpan={colCount} className="py-8 text-center text-muted-foreground">{isAllCats && s.length < 2 ? t("admin.trainingNames.searchAllHint") : t("common.noResults")}</TD></tr>
                  ) : null}
                </tbody>
              </Table>
            </SmallTable>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.edit")} — {editing?.name_pl}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldRow error={editErrors.name_pl}>
              <Label>{t("label.namePl")}</Label>
              <Input aria-invalid={!!editErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setEditErrors((s) => ({ ...s, name_pl: undefined })); }} />
            </FieldRow>
            <FieldRow error={editErrors.name_en}>
              <Label>{t("label.nameEn")}</Label>
              <Input aria-invalid={!!editErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setEditErrors((s) => ({ ...s, name_en: undefined })); }} />
            </FieldRow>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldRow>
                <Label>{t("label.defaultCost")}</Label>
                <Input type="number" min={0} value={String(model.default_cost_per_person)} onChange={(e) => setModel((s) => ({ ...s, default_cost_per_person: Number(e.target.value) }))} />
              </FieldRow>
              <FieldRow>
                <Label>{t("label.defaultHours")}</Label>
                <Input type="number" min={0} step={0.5} value={String(model.default_hours_per_person)} onChange={(e) => setModel((s) => ({ ...s, default_hours_per_person: Number(e.target.value) }))} />
              </FieldRow>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={doUpdate} disabled={updateM.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateM.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- BUSINESS NEEDS TAB ----------------

function BusinessNeedsTab() {
  const { t } = useI18n(); // Usunięto nieużywany 'lang'

  const q = useAdminBusinessNeeds();
  const createM = useAdminCreateBusinessNeed();
  const updateM = useAdminUpdateBusinessNeed();
  const delM = useAdminDeleteBusinessNeed();

  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const all = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return all;
    return all.filter((x) => `${x.name_pl} ${x.name_en}`.toLowerCase().includes(s));
  }, [q.data, search]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessNeedAdmin | null>(null);
  const [model, setModel] = useState({ name_pl: "", name_en: "" });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const confirmD = useConfirmDialog();

  function validateBusinessNeedModel() {
    const errors: FormErrors = {};
    if (!model.name_pl.trim()) errors.name_pl = t("validation.namePlRequired");
    if (!model.name_en.trim()) errors.name_en = t("validation.nameEnRequired");
    return errors;
  }

  async function doCreate() {
    const nextErrors = validateBusinessNeedModel();
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await createM.mutateAsync({ name_pl: model.name_pl.trim(), name_en: model.name_en.trim() });
      toast.success(t("admin.toast.businessNeedCreated"));
      setCreateOpen(false);
      setModel({ name_pl: "", name_en: "" });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  function openEdit(x: BusinessNeedAdmin) {
    setEditing(x);
    setEditErrors({});
    setModel({ name_pl: x.name_pl, name_en: x.name_en });
    setEditOpen(true);
  }

  async function doUpdate() {
    if (!editing) return;
    const nextErrors = validateBusinessNeedModel();
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await updateM.mutateAsync({ id: editing.id, payload: { name_pl: model.name_pl.trim(), name_en: model.name_en.trim() } });
      toast.success(t("admin.toast.businessNeedUpdated"));
      setEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function doDelete(x: BusinessNeedAdmin) {
    confirmD.request({
      title: t("common.confirmDeleteTitle"),
      description: t("common.confirmDelete"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await delM.mutateAsync(x.id);
          toast.success(t("admin.toast.businessNeedDeleted"));
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 409) {
            toast.error(e.message);
            return;
          }
          toast.error(e?.message ?? t("common.error"));
        }
      },
    });
  }

  return (
    <div className="grid gap-4">
      <ConfirmDialog
        open={confirmD.open}
        onOpenChange={(open) => (open ? confirmD.setOpen(true) : confirmD.cancel())}
        title={confirmD.title}
        description={confirmD.description}
        confirmText={confirmD.confirmText}
        cancelText={confirmD.cancelText}
        onConfirm={confirmD.confirm}
        isLoading={confirmD.isLoading}
        destructive={confirmD.destructive}
      />
      <SectionHeader
        title={t("admin.businessNeeds.title")}
        subtitle={t("admin.businessNeeds.subtitle")}
        right={
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setEditing(null);
                setCreateErrors({});
                setModel({ name_pl: "", name_en: "" });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.businessNeeds.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("admin.businessNeeds.create")}</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <FieldRow error={createErrors.name_pl}>
                  <Label>{t("label.namePl")}</Label>
                  <Input aria-invalid={!!createErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setCreateErrors((s) => ({ ...s, name_pl: undefined })); }} />
                </FieldRow>
                <FieldRow error={createErrors.name_en}>
                  <Label>{t("label.nameEn")}</Label>
                  <Input aria-invalid={!!createErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setCreateErrors((s) => ({ ...s, name_en: undefined })); }} />
                </FieldRow>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
                <Button onClick={doCreate} disabled={createM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createM.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <FieldRow>
            <Label>{t("common.search")}</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.businessNeeds.searchPlaceholder")} />
          </FieldRow>

          <div className="mt-4">
            <SmallTable>
              <Table>
                <thead>
                  <tr className="border-b">
                    <TH>{t("label.namePl")}</TH>
                    <TH>{t("label.nameEn")}</TH>
                    <TH className="text-right">{t("common.actions")}</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.id} onClick={() => openEdit(x)} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer">
                      <TD className="font-medium">{x.name_pl}</TD>
                      <TD>{x.name_en}</TD>
                      <TD className="text-right">
                        <RowActionsMenu
    actions={[
      { label: t("common.edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(x) },
      { label: t("common.delete"), icon: <Trash2 className="h-4 w-4" />, onSelect: () => doDelete(x), destructive: true },
    ]}
  />
                      </TD>
                    </tr>
                  ))}
                  {q.isLoading ? (
                    <tr><TD colSpan={3} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TD></tr>
                  ) : null}
                  {!q.isLoading && rows.length === 0 ? (
                    <tr><TD colSpan={3} className="py-8 text-center text-muted-foreground">{t("common.noResults")}</TD></tr>
                  ) : null}
                </tbody>
              </Table>
            </SmallTable>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("common.edit")} — {editing?.name_pl}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <FieldRow error={editErrors.name_pl}><Label>{t("label.namePl")}</Label><Input aria-invalid={!!editErrors.name_pl} value={model.name_pl} onChange={(e) => { setModel((s) => ({ ...s, name_pl: e.target.value })); setEditErrors((s) => ({ ...s, name_pl: undefined })); }} /></FieldRow>
            <FieldRow error={editErrors.name_en}><Label>{t("label.nameEn")}</Label><Input aria-invalid={!!editErrors.name_en} value={model.name_en} onChange={(e) => { setModel((s) => ({ ...s, name_en: e.target.value })); setEditErrors((s) => ({ ...s, name_en: undefined })); }} /></FieldRow>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={doUpdate} disabled={updateM.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateM.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- COLLECTION WINDOW TAB ----------------

function CollectionWindowTab() {
  const { t } = useI18n();

  const q = useAdminCollectionWindow();
  const setM = useAdminSetCollectionWindow();

  const isOpen = q.data?.is_open ?? false;

  async function toggle(next: boolean) {
    try {
      await setM.mutateAsync(next);
      toast.success(next ? t("admin.toast.windowOpened") : t("admin.toast.windowClosed"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  return (
    <div className="grid gap-4">
      <SectionHeader title={t("admin.window.title")} subtitle={t("admin.window.subtitle")} />
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">{t("admin.window.current")}</Label>
                <div className="text-lg font-semibold">{isOpen ? t("admin.window.open") : t("admin.window.closed")}</div>
                <p className="text-sm text-muted-foreground">{t("admin.window.hint")}</p>
              </div>
              <Switch checked={isOpen} onCheckedChange={toggle} disabled={setM.isPending || q.isLoading} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- REPORTS TAB ----------------

function ReportsTab() {
  const { t } = useI18n();
  const { roleFlags, user } = useAuth();
  const { data: areas = [], isLoading: areasLoading } = useAreas();

  const STATUS_OPTIONS = React.useMemo(
    () => [
      { value: "DRAFT", label: t("status.DRAFT") },
      { value: "MANAGER_REVIEW", label: t("status.MANAGER_REVIEW") },
      { value: "HR_REVIEW", label: t("status.HR_REVIEW") },
      { value: "REPLIED", label: t("status.REPLIED") },
    ],
    [t]
  );

  const DECISION_OPTIONS = React.useMemo(
    () => [
      { value: "APPROVED", label: t("decision.APPROVED") },
      { value: "REJECTED", label: t("decision.REJECTED") },
      { value: "NONE", label: t("decision.NONE") },
    ],
    [t]
  );

  const ALL_COLUMN_KEYS = React.useMemo(
    () => [
      "area",
      "mpk",
      "training",
      "category",
      "business_need",
      "employees_count",
      "cost_per_person",
      "total_cost",
      "hours_per_person",
      "total_hours",
      "quarter",
      "priority",
      "employee",
      "contact_person",
      "notes",
      "form_status",
      "hr_decision",
      "hr_budget_total",
      "hr_comment",
      "created_at",
    ],
    []
  );

  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [exportLang, setExportLang] = useState<"pl" | "en">("pl");
  const [downloading, setDownloading] = useState(false);

  // Multi-filters
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [selectedDecisions, setSelectedDecisions] = useState<string[]>([]);

  // Date filter
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Columns / presets
  const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMN_KEYS);
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // UX
  const [showPresets, setShowPresets] = useState(false);
  const [showSelectedFilters, setShowSelectedFilters] = useState(true);

  // preset CRUD dialogs
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetDialogMode, setPresetDialogMode] = useState<"create" | "edit">("create");
  const [presetName, setPresetName] = useState("");
  const [presetErrors, setPresetErrors] = useState<FormErrors>({});
  const [presetShare, setPresetShare] = useState(false);
  const [presetEditingId, setPresetEditingId] = useState<number | null>(null);
  const [presetColumnsDraft, setPresetColumnsDraft] = useState<string[]>(ALL_COLUMN_KEYS);

  const [presetFormatDraft, setPresetFormatDraft] = useState<"xlsx" | "csv">("xlsx");
  const [presetLangDraft, setPresetLangDraft] = useState<"pl" | "en">("pl");
  const [presetSaveFilters, setPresetSaveFilters] = useState(false);

  const columnsMeta = React.useMemo(
    () => ({
      area: { pl: "Obszar", en: "Area" },
      mpk: { pl: "MPK", en: "Cost center" },
      training: { pl: "Szkolenie", en: "Training" },
      category: { pl: "Kategoria", en: "Category" },
      business_need: { pl: "Potrzeba biznesowa", en: "Business need" },
      employees_count: { pl: "Liczba osób", en: "Employees" },
      cost_per_person: { pl: "Koszt/os. (PLN)", en: "Cost/person (PLN)" },
      total_cost: { pl: "Koszt całk. (PLN)", en: "Total cost (PLN)" },
      hours_per_person: { pl: "Godziny/os. (h)", en: "Hours/person (h)" },
      total_hours: { pl: "Godziny całk. (h)", en: "Total hours (h)" },
      quarter: { pl: "Kwartał", en: "Quarter" },
      priority: { pl: "Priorytet", en: "Priority" },
      employee: { pl: "Pracownik", en: "Employee" },
      contact_person: { pl: "Osoba kontaktowa", en: "Contact person" },
      notes: { pl: "Uwagi", en: "Notes" },
      form_status: { pl: "Status wniosku", en: "Form status" },
      hr_decision: { pl: "Decyzja HR", en: "HR decision" },
      hr_budget_total: { pl: "Budżet HR (PLN)", en: "HR budget (PLN)" },
      hr_comment: { pl: "Komentarz HR", en: "HR comment" },
      created_at: { pl: "Utworzono", en: "Created" },
    }),
    []
  );

  const columnGroupKeyByColumn = React.useMemo(
    () => ({
      area: "org",
      mpk: "org",

      training: "training",
      category: "training",
      business_need: "training",

      employees_count: "metrics",
      cost_per_person: "metrics",
      total_cost: "metrics",
      hours_per_person: "metrics",
      total_hours: "metrics",

      quarter: "planning",
      priority: "planning",

      employee: "people",
      contact_person: "people",

      hr_decision: "hr",
      hr_budget_total: "hr",
      hr_comment: "hr",

      notes: "meta",
      form_status: "meta",
      created_at: "meta",
    }),
    []
  );

  const columnGroupLabels = React.useMemo(
    () => ({
      org: t("admin.reports.columnsGroup.organization"),
      training: t("admin.reports.columnsGroup.training"),
      metrics: t("admin.reports.columnsGroup.metrics"),
      planning: t("admin.reports.columnsGroup.planning"),
      people: t("admin.reports.columnsGroup.people"),
      hr: t("admin.reports.columnsGroup.hr"),
      meta: t("admin.reports.columnsGroup.meta"),
    }),
    [t]
  );

  const columnOptions = React.useMemo(
    () =>
      ALL_COLUMN_KEYS.map((k) => {
        const groupKey = (columnGroupKeyByColumn as any)[k] as keyof typeof columnGroupLabels | undefined;
        const group = groupKey ? (columnGroupLabels as any)[groupKey] : undefined;

        return {
          value: k,
          label: (columnsMeta as any)[k]?.[exportLang] ?? k,
          group,
        };
      }),
    [ALL_COLUMN_KEYS, columnsMeta, exportLang, columnGroupKeyByColumn, columnGroupLabels]
  );

  const areaOptions = React.useMemo(
    () =>
      (areas || []).map((a: any) => ({
        value: Number(a.id),
        label: `${a.code} — ${a.name_pl}`,
      })),
    [areas]
  );

  const invalidDateRange = React.useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    return dateFrom > dateTo;
  }, [dateFrom, dateTo]);

  function mergeSelectionKeepingOrder(prev: string[], nextFromPicker: string[]) {
    const prevSet = new Set(prev);
    const nextSet = new Set(nextFromPicker);

    const kept = prev.filter((k) => nextSet.has(k));
    const added = nextFromPicker.filter((k) => !prevSet.has(k));
    return [...kept, ...added];
  }

  function resetFilters() {
    setSelectedStatuses([]);
    setSelectedAreaIds([]);
    setSelectedDecisions([]);
    setDateFrom("");
    setDateTo("");
  }

  function buildCurrentFilters() {
    return {
      statuses: selectedStatuses.length ? selectedStatuses : undefined,
      area_ids: selectedAreaIds.length ? selectedAreaIds : undefined,
      hr_decisions: selectedDecisions.length ? selectedDecisions : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
  }

  async function loadPresets() {
    setPresetsLoading(true);
    try {
      const list = await adminListExportPresets();
      setPresets(list);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    } finally {
      setPresetsLoading(false);
    }
  }

  useEffect(() => {
    loadPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(id: number | null, presetOverride?: ExportPreset | null) {
    setSelectedPresetId(id);
    if (id === null) return;

    const p = presetOverride ?? presets.find((x) => x.id === id);
    if (!p) return;

    if (p.columns?.length) {
      setSelectedColumns(p.columns);
    }

    // Apply saved format/lang always
    if (p.export_format) setFormat(p.export_format);
    if (p.export_lang) setExportLang(p.export_lang);

    // Apply saved filters (if present)
    const f: any = p.filters ?? null;
    if (f) {
      const nextStatuses = Array.isArray(f.statuses) ? f.statuses.filter((x: any) => typeof x === "string") : [];
      const nextDecisions = Array.isArray(f.hr_decisions) ? f.hr_decisions.filter((x: any) => typeof x === "string") : [];
      const nextAreaIds = Array.isArray(f.area_ids) ? f.area_ids.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : [];

      setSelectedStatuses(nextStatuses);
      setSelectedDecisions(nextDecisions);
      setSelectedAreaIds(nextAreaIds);

      setDateFrom(typeof f.date_from === "string" ? f.date_from : "");
      setDateTo(typeof f.date_to === "string" ? f.date_to : "");
    }

    toast.success(t("admin.reports.presetApplied"));
  }

  async function handleDownload() {
    if (invalidDateRange) {
      toast.error(t("admin.reports.dateRangeInvalid"));
      return;
    }

    setDownloading(true);
    try {
      const preset = selectedPresetId ? presets.find((p) => p.id === selectedPresetId) : null;
      const usePresetId = !!preset && JSON.stringify(preset.columns) === JSON.stringify(selectedColumns);

      const { blob, filename } = await adminExportForms({
        format,
        lang: exportLang,
        statuses: selectedStatuses.length ? selectedStatuses : null,
        area_ids: selectedAreaIds.length ? selectedAreaIds : null,
        hr_decisions: selectedDecisions.length ? selectedDecisions : null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        preset_id: usePresetId ? selectedPresetId : null,
        columns: usePresetId ? null : selectedColumns,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(t("admin.toast.exportReady"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    } finally {
      setDownloading(false);
    }
  }

  function openCreatePreset() {
    setPresetDialogMode("create");
    setPresetEditingId(null);
    setPresetName("");
    setPresetShare(false);
    setPresetColumnsDraft(selectedColumns);

    // always saved in preset
    setPresetFormatDraft(format);
    setPresetLangDraft(exportLang);

    // optional
    setPresetSaveFilters(false);

    setPresetErrors({});
    setPresetDialogOpen(true);
  }

  function openEditPreset(p: ExportPreset) {
    setPresetDialogMode("edit");
    setPresetEditingId(p.id);
    setPresetName(p.name);
    setPresetShare(p.is_shared);
    setPresetColumnsDraft(p.columns);

    // always saved in preset
    setPresetFormatDraft(p.export_format ?? format);
    setPresetLangDraft(p.export_lang ?? exportLang);

    // optional
    setPresetSaveFilters(Boolean(p.filters));

    setPresetErrors({});
    setPresetDialogOpen(true);
  }

  async function submitPreset() {
    const name = presetName.trim();
    const nextErrors: FormErrors = {};
    if (!name) nextErrors.name = t("admin.reports.presetNameRequired");
    if (!presetColumnsDraft.length) nextErrors.columns = t("admin.reports.presetColumnsRequired");
    setPresetErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name,
      columns: presetColumnsDraft,
      export_format: presetFormatDraft,
      export_lang: presetLangDraft,
      filters: presetSaveFilters ? buildCurrentFilters() : null,
      is_shared: roleFlags.isAdmin ? presetShare : false,
    };

    try {
      if (presetDialogMode === "create") {
        const created = await adminCreateExportPreset(payload);
        toast.success(t("admin.reports.presetSaved"));
        await loadPresets();

        // Auto-apply freshly created preset
        applyPreset(created.id, created);
      } else if (presetEditingId) {
        const updated = await adminUpdateExportPreset(presetEditingId, payload);
        toast.success(t("admin.reports.presetUpdated"));
        await loadPresets();

        applyPreset(updated.id, updated);
      }

      setPresetDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function deletePreset(p: ExportPreset) {
    try {
      await adminDeleteExportPreset(p.id);
      toast.success(t("admin.reports.presetDeleted"));
      if (selectedPresetId === p.id) {
        setSelectedPresetId(null);
      }
      await loadPresets();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  const canEditPreset = (p: ExportPreset) => {
    if (p.created_by_user_id === null) return roleFlags.isAdmin;
    if (roleFlags.isAdmin) return true;
    return p.created_by_user_id === (user?.id ?? -1);
  };

  const selectedAreasById = React.useMemo(() => {
    const map = new Map<number, any>();
    (areas || []).forEach((a: any) => map.set(Number(a.id), a));
    return map;
  }, [areas]);

  const selectedFilterBadges = React.useMemo(() => {
    const badges: Array<{ key: string; label: string; onRemove: () => void }> = [];

    // statuses
    for (const s of selectedStatuses) {
      const label = STATUS_OPTIONS.find((x) => x.value === s)?.label ?? s;
      badges.push({
        key: `st:${s}`,
        label: `${t("label.status")}: ${label}`,
        onRemove: () => setSelectedStatuses((prev) => prev.filter((x) => x !== s)),
      });
    }

    // decisions
    for (const d of selectedDecisions) {
      const label = DECISION_OPTIONS.find((x) => x.value === d)?.label ?? d;
      badges.push({
        key: `dec:${d}`,
        label: `${t("label.decision")}: ${label}`,
        onRemove: () => setSelectedDecisions((prev) => prev.filter((x) => x !== d)),
      });
    }

    // areas
    for (const id of selectedAreaIds) {
      const a = selectedAreasById.get(Number(id));
      const label = a ? `${a.code} — ${a.name_pl}` : String(id);
      badges.push({
        key: `area:${id}`,
        label: `${t("label.area")}: ${label}`,
        onRemove: () => setSelectedAreaIds((prev) => prev.filter((x) => x !== id)),
      });
    }

    // dates
    if (dateFrom) {
      badges.push({
        key: "date_from",
        label: `${t("label.dateFrom")}: ${dateFrom}`,
        onRemove: () => setDateFrom(""),
      });
    }
    if (dateTo) {
      badges.push({
        key: "date_to",
        label: `${t("label.dateTo")}: ${dateTo}`,
        onRemove: () => setDateTo(""),
      });
    }

    // format/lang (info-only, no remove)
    badges.push({
      key: "fmt",
      label: `${t("label.format")}: ${format.toUpperCase()}`,
      onRemove: () => {},
    });
    badges.push({
      key: "lang",
      label: `${t("label.language")}: ${exportLang.toUpperCase()}`,
      onRemove: () => {},
    });

    return badges;
  }, [DECISION_OPTIONS, STATUS_OPTIONS, dateFrom, dateTo, exportLang, format, selectedAreaIds, selectedAreasById, selectedDecisions, selectedStatuses, t]);

  const hasAnyUserFilter = selectedStatuses.length || selectedDecisions.length || selectedAreaIds.length || dateFrom || dateTo;

  const columnLabelByKey = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of columnOptions as any[]) m.set(String(o.value), String(o.label));
    return m;
  }, [columnOptions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.reports.title")}</CardTitle>
        <CardDescription>{t("admin.reports.subtitle")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-6">
          {/* Filters */}
          <div className="grid gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{t("admin.reports.filtersTitle")}</div>
                <div className="text-xs text-muted-foreground">{t("admin.reports.filtersHelp")}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSelectedFilters((v) => !v)}>
                  {showSelectedFilters ? t("admin.reports.hideSelected") : t("admin.reports.showSelected")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetFilters} disabled={!hasAnyUserFilter}>
                  {t("admin.reports.resetFilters")}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("label.status")}</Label>
                <MultiSelectDropdown
                  label={t("label.status")}
                  placeholder={t("common.all")}
                  options={STATUS_OPTIONS}
                  value={selectedStatuses}
                  onChange={setSelectedStatuses}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t("label.area")}</Label>
                <MultiSelectDropdown
                  label={t("label.area")}
                  placeholder={t("common.all")}
                  options={areaOptions}
                  value={selectedAreaIds}
                  onChange={setSelectedAreaIds}
                  disabled={areasLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t("label.dateFrom")}</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>{t("label.dateTo")}</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>{t("label.decision")}</Label>
                <MultiSelectDropdown
                  label={t("label.decision")}
                  placeholder={t("common.all")}
                  options={DECISION_OPTIONS}
                  value={selectedDecisions}
                  onChange={setSelectedDecisions}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t("label.language")}</Label>
                <Select value={exportLang} onValueChange={(v) => setExportLang(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="PL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pl">PL</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>{t("label.format")}</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="XLSX" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {invalidDateRange ? <div className="text-sm text-destructive">{t("admin.reports.dateRangeInvalid")}</div> : null}

            {/* Selected filters badges */}
            {showSelectedFilters ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-2 text-xs text-muted-foreground">{t("admin.reports.selectedFilters")}</div>

                <div className="scrollbar-app flex flex-wrap gap-2 max-h-28 overflow-auto">
                  {selectedFilterBadges.map((b) => (
                    <Badge
                      key={b.key}
                      variant="secondary"
                      className="max-w-[360px] truncate pr-1"
                      title={b.label}
                    >
                      <span className="truncate">{b.label}</span>

                      {b.key === "fmt" || b.key === "lang" ? null : (
                        <button
                          type="button"
                          className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted/60"
                          onClick={b.onRemove}
                          aria-label={t("common.delete")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <Separator />

          {/* Layout */}
          <div className="grid gap-3">
            <div>
              <div className="text-sm font-medium">{t("admin.reports.layoutTitle")}</div>
              <div className="text-xs text-muted-foreground">{t("admin.reports.layoutHelp")}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("admin.reports.presetLabel")}</Label>
                <Select
                  value={selectedPresetId ? String(selectedPresetId) : "manual"}
                  onValueChange={(v) => {
                    if (v === "manual") {
                      setSelectedPresetId(null);
                      return;
                    }
                    applyPreset(Number(v));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={presetsLoading ? t("common.loading") : t("admin.reports.presetPick")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t("admin.reports.presetManual")}</SelectItem>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={loadPresets}>
                    {t("common.refresh")}
                  </Button>
                  <Button type="button" onClick={openCreatePreset}>
                    {t("admin.reports.presetSaveMine")}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">{t("admin.reports.columnsHint")}</p>
              </div>

              <div className="grid gap-2">
                <Label>{t("admin.reports.columnsLabel")}</Label>
                <MultiSelectDropdown
                  label={t("admin.reports.columnsLabel")}
                  placeholder={t("common.all")}
                  options={columnOptions}
                  value={selectedColumns}
                  onChange={(nextFromPicker) => {
                    setSelectedColumns((prev) => mergeSelectionKeepingOrder(prev, nextFromPicker));
                    // columns changed => no longer strictly matches a preset
                    setSelectedPresetId(null);
                  }}
                />

                <SelectedColumnsOrder
                  value={selectedColumns}
                  labelByKey={columnLabelByKey}
                  defaultOrder={ALL_COLUMN_KEYS}
                  onChange={(next) => {
                    setSelectedColumns(next);
                    setSelectedPresetId(null);
                  }}
                  onClear={() => {
                    setSelectedColumns([]);
                    setSelectedPresetId(null);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Download */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleDownload} disabled={downloading || invalidDateRange || !selectedColumns.length}>
                {downloading ? t("admin.reports.downloading") : t("admin.reports.download")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("admin.reports.hint")}</span>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => setShowPresets((v) => !v)}>
              {showPresets ? t("admin.reports.hidePresets") : t("admin.reports.showPresets")}
            </Button>
          </div>

          {/* Presets list (collapsed by default) */}
          {showPresets ? (
            <div className="grid gap-3">
              <div>
                <div className="text-sm font-medium">{t("admin.reports.presetsTitle")}</div>
                <div className="text-xs text-muted-foreground">{t("admin.reports.presetsHelp")}</div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] gap-2 p-4">
                  <div className="text-sm text-muted-foreground">{t("admin.reports.presetName")}</div>
                  <div className="text-sm text-muted-foreground">{t("label.actions")}</div>

                  {presets.map((p) => {
                    const editable = canEditPreset(p);
                    const isSystem = p.created_by_user_id === null;

                    return (
                      <React.Fragment key={p.id}>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-medium" title={p.name}>
                              {p.name}
                            </div>

                            {p.is_shared ? (
                              <Badge variant="secondary" className="text-xs">
                                {t("admin.reports.presetShared")}
                              </Badge>
                            ) : null}

                            {isSystem ? (
                              <Badge variant="secondary" className="text-xs">
                                {t("admin.reports.presetSystem")}
                              </Badge>
                            ) : null}

                            <Badge variant="outline" className="text-xs">
                              {(p.export_format || "xlsx").toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {(p.export_lang || "pl").toUpperCase()}
                            </Badge>

                            {p.filters ? (
                              <Badge variant="outline" className="text-xs">
                                {t("admin.reports.presetHasFilters")}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {t("admin.reports.presetsColumnsCount", { count: p.columns.length })}
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(p.id)}>
                            {t("common.use")}
                          </Button>
                          <Button type="button" variant="outline" size="sm" disabled={!editable} onClick={() => openEditPreset(p)}>
                            {t("common.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={!editable && !(isSystem && roleFlags.isAdmin)}
                            onClick={() => deletePreset(p)}
                          >
                            {t("common.delete")}
                          </Button>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Preset dialog */}
        <Dialog open={presetDialogOpen} onOpenChange={(open) => { setPresetDialogOpen(open); if (!open) setPresetErrors({}); }}>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>
                {presetDialogMode === "create" ? t("admin.reports.presetDialogNewTitle") : t("admin.reports.presetDialogEditTitle")}
              </DialogTitle>
              <DialogDescription>{t("admin.reports.presetDialogDesc")}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <FieldRow error={presetErrors.name}>
                <Label>{t("admin.reports.presetName")}</Label>
                <Input aria-invalid={!!presetErrors.name} value={presetName} onChange={(e) => { setPresetName(e.target.value); setPresetErrors((s) => ({ ...s, name: undefined })); }} placeholder={t("admin.reports.presetNamePlaceholder")} />
              </FieldRow>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("label.format")}</Label>
                  <Select value={presetFormatDraft} onValueChange={(v) => setPresetFormatDraft(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="XLSX" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">XLSX</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{t("label.language")}</Label>
                  <Select value={presetLangDraft} onValueChange={(v) => setPresetLangDraft(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="PL" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">PL</SelectItem>
                      <SelectItem value="en">EN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <FieldRow error={presetErrors.columns}>
                <Label>{t("admin.reports.presetColumns")}</Label>
                <MultiSelectDropdown
                  label={t("admin.reports.presetColumns")}
                  placeholder={t("common.all")}
                  options={columnOptions}
                  value={presetColumnsDraft}
                  onChange={(nextFromPicker) => { setPresetColumnsDraft((prev) => mergeSelectionKeepingOrder(prev, nextFromPicker)); setPresetErrors((s) => ({ ...s, columns: undefined })); }}
                />

                <SelectedColumnsOrder
                  value={presetColumnsDraft}
                  labelByKey={columnLabelByKey}
                  defaultOrder={ALL_COLUMN_KEYS}
                  onChange={(next) => { setPresetColumnsDraft(next); setPresetErrors((s) => ({ ...s, columns: undefined })); }}
                  onClear={() => { setPresetColumnsDraft([]); }}
                />
              </FieldRow>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{t("admin.reports.saveFiltersTitle")}</div>
                  <div className="text-xs text-muted-foreground">{t("admin.reports.saveFiltersDesc")}</div>
                </div>
                <Switch checked={presetSaveFilters} onCheckedChange={setPresetSaveFilters} />
              </div>

              {roleFlags.isAdmin ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">{t("admin.reports.presetShareTitle")}</div>
                    <div className="text-xs text-muted-foreground">{t("admin.reports.presetShareDesc")}</div>
                  </div>
                  <Switch checked={presetShare} onCheckedChange={setPresetShare} />
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setPresetDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={submitPreset}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
// ---------------- ADMIN PAGE ----------------

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "users";
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <div className="mb-6">
        <div className="text-2xl font-semibold">{t("nav.admin")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</div>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          const next = new URLSearchParams(searchParams);
          next.set("tab", value);
          setSearchParams(next, { replace: true });
        }}
        className="w-full"
      >
        <TabsList className="flex w-full flex-wrap items-start justify-start gap-1">
          <TabsTrigger value="users">
            <span className="inline-flex items-center">
              <UsersIcon className="mr-2 h-4 w-4" />
              {t("admin.users.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="areas">
            <span className="inline-flex items-center">
              <MapIcon className="mr-2 h-4 w-4" />
              {t("admin.areas.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cost_centers">
            <span className="inline-flex items-center">
              <Building2 className="mr-2 h-4 w-4" />
              {t("admin.costCenters.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="categories">
            <span className="inline-flex items-center">
              <Layers className="mr-2 h-4 w-4" />
              {t("admin.categories.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="training_names">
            <span className="inline-flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              {t("admin.trainingNames.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="business_needs">
            <span className="inline-flex items-center">
              <Briefcase className="mr-2 h-4 w-4" />
              {t("admin.businessNeeds.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="window">
            <span className="inline-flex items-center">
              <CalendarClock className="mr-2 h-4 w-4" />
              {t("admin.window.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="mandatory_trainings">
            <span className="inline-flex items-center">
              <Upload className="mr-2 h-4 w-4" />
              {t("admin.mandatoryTrainings.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="mail">
            <span className="inline-flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              {t("admin.mail.tab")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="reports">
            <span className="inline-flex items-center">
              <FileDown className="mr-2 h-4 w-4" />
              {t("admin.reports.tab")}
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="areas"><AreasTab /></TabsContent>
          <TabsContent value="cost_centers"><CostCentersTab /></TabsContent>
          <TabsContent value="categories"><TrainingCategoriesTab /></TabsContent>
          <TabsContent value="training_names"><TrainingNamesTab /></TabsContent>
          <TabsContent value="business_needs"><BusinessNeedsTab /></TabsContent>
          <TabsContent value="window"><CollectionWindowTab /></TabsContent>
          <TabsContent value="mandatory_trainings"><AdminMandatoryTrainingsTab /></TabsContent>
          <TabsContent value="mail"><AdminMailTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}