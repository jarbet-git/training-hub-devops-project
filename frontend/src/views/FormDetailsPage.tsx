// src/views/FormDetailsPage.tsx
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CornerUpLeft,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

import { useAuth } from "@/features/auth/context";
import { useI18n } from "@/app/i18n";

import type {
  FormDetails,
  FormItem,
  FormItemCreatePayload,
  FormItemUpdatePayload,
  HrDecision,
  HrWorkflowDecision,
  Priority,
  Quarter,
} from "@/features/forms/types";
import {
  formKeys,
  useAddItem,
  useAreas,
  useBusinessNeeds,
  useCostCentersForArea,
  useFormById,
  useFormHistory,
  useHrReply,
  useHrRequestChanges,
  useManagerApprove,
  useManagerRequestChanges,
  useSubmitToManager,
  useTrainingCategories,
} from "@/features/forms/queries";
import { deleteForm, deleteItem, listTrainingNames, searchTrainingNames, updateItem } from "@/features/forms/api";
import { trainingProposalKeys, useCreateTrainingProposal } from "@/features/trainingProposals/queries";
import { notificationKeys, useMarkNotificationScopesRead } from "@/features/notifications/queries";
import {
  formatAreaLabel,
  formatCostCenterLabel,
  formatDictName,
  formatDT,
  formatMoney,
  Hours,
  InlineKeyValue,
  Money,
  StatusBadge,
} from "@/features/forms/ui";
import { useCollectionWindow } from "@/features/collectionWindow/queries";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function sumCost(form: FormDetails) {
  return form.items.reduce(
    (acc, it) => acc + (it.employees_count ?? 0) * (it.estimated_cost_per_person ?? 0),
    0
  );
}

function sumHours(form: FormDetails) {
  return form.items.reduce(
    (acc, it) => acc + (it.employees_count ?? 0) * (it.estimated_hours_per_person ?? 0),
    0
  );
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}


type WorkflowStatusStripProps = {
  status: string;
  lang: "pl" | "en";
  isHrReturnedForChanges: boolean;
};

function WorkflowStatusStrip({ status, lang, isHrReturnedForChanges }: WorkflowStatusStripProps) {
  const [expanded, setExpanded] = useState(isHrReturnedForChanges);

  useEffect(() => {
    if (isHrReturnedForChanges) setExpanded(true);
  }, [isHrReturnedForChanges]);

  const steps = lang === "en"
    ? [
        { key: "items", title: "Items", description: "Draft and corrections" },
        { key: "manager", title: "Manager", description: "Review and approval" },
        { key: "hr", title: "HR", description: "Decision or return" },
        { key: "done", title: "Done", description: "Closed process" },
      ]
    : [
        { key: "items", title: "Pozycje", description: "Szkic i poprawki" },
        { key: "manager", title: "Manager", description: "Weryfikacja i akceptacja" },
        { key: "hr", title: "HR", description: "Decyzja lub cofnięcie" },
        { key: "done", title: "Koniec", description: "Proces zamknięty" },
      ];

  const currentIndex = status === "DRAFT"
    ? 0
    : status === "MANAGER_REVIEW"
      ? 1
      : status === "HR_REVIEW"
        ? 2
        : 3;

  const currentStep = steps[currentIndex];
  const helper = lang === "en"
    ? isHrReturnedForChanges
      ? "Returned for correction"
      : status === "DRAFT"
        ? "Prepare items"
        : status === "MANAGER_REVIEW"
          ? "Manager review"
          : status === "HR_REVIEW"
            ? "HR decision"
            : "Closed"
    : isHrReturnedForChanges
      ? "Cofnięte do poprawy"
      : status === "DRAFT"
        ? "Przygotowanie pozycji"
        : status === "MANAGER_REVIEW"
          ? "Weryfikacja managera"
          : status === "HR_REVIEW"
            ? "Decyzja HR"
            : "Proces zakończony";

  return (
    <div className="mt-3 max-w-3xl rounded-2xl border border-border/55 bg-background/35 dark:border-white/10 dark:bg-background/25">
      <button
        type="button"
        className="flex w-full flex-col gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/25 sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">{lang === "en" ? "Request status" : "Status wniosku"}</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
            {lang === "en" ? "Workflow stage" : "Etap workflow"}
          </span>
          <span className="font-medium text-foreground">{currentStep.title}</span>
          <span className="text-muted-foreground">• {helper}</span>
          {isHrReturnedForChanges ? (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
              {lang === "en" ? "Returned by HR/Admin" : "Cofnięte przez HR/Admin"}
            </span>
          ) : null}
        </span>

        <span className="flex items-center gap-3 self-start sm:self-center">
          <span className="hidden w-36 items-center gap-1 sm:flex">
            {steps.map((step, index) => {
              const isDoneOrCurrent = index <= currentIndex;
              return (
                <span
                  key={step.key}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    isDoneOrCurrent ? "bg-primary" : "bg-muted dark:bg-white/10"
                  )}
                  title={step.title}
                />
              );
            })}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {expanded
              ? (lang === "en" ? "Hide workflow" : "Ukryj przebieg")
              : (lang === "en" ? "Show workflow" : "Pokaż przebieg")}
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </span>
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-border/55 px-3 pb-3 pt-3 dark:border-white/10">
          <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((step, index) => {
              const isCurrent = index === currentIndex;
              const isDone = index < currentIndex;
              return (
                <div
                  key={step.key}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs transition-colors",
                    isCurrent
                      ? "border-primary/45 bg-primary/15 text-foreground"
                      : isDone
                        ? "border-primary/20 bg-primary/5 text-foreground"
                        : "border-border/60 bg-card/35 text-muted-foreground dark:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                        isCurrent
                          ? "border-primary/45 bg-primary text-primary-foreground"
                          : isDone
                            ? "border-primary/35 bg-primary/20 text-primary"
                            : "border-border/70 bg-background/40 text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="font-semibold">{step.title}</span>
                  </div>
                  <div className="mt-1.5 pl-8 text-[11px] leading-4 opacity-80">{step.description}</div>
                  {isCurrent ? (
                    <div className="mt-2 pl-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {lang === "en" ? "Current stage" : "Aktualny etap"}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "TBD"];

type ItemDraft = {
  cost_center_id: number | null;
  training_category_id: number | null;
  training_name_id: number | null;
  business_need_id: number | null;
  priority: Priority;
  quarter: Quarter;
  employees_count: number;
  employee_full_name: string;
  estimated_cost_per_person: number;
  estimated_hours_per_person: number;
  contact_person: string;
  notes: string;
};

function draftFromItem(it: FormItem): ItemDraft {
  return {
    cost_center_id: it.cost_center_id,
    training_category_id: it.training_category_id,
    training_name_id: it.training_name_id,
    business_need_id: it.business_need_id,
    priority: it.priority,
    quarter: it.quarter,
    employees_count: it.employees_count,
    employee_full_name: it.employee_full_name ?? "",
    estimated_cost_per_person: it.estimated_cost_per_person,
    estimated_hours_per_person: it.estimated_hours_per_person,
    contact_person: it.contact_person ?? "",
    notes: it.notes ?? "",
  };
}

type FieldErrors = Record<string, string>;

function InlineError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function HelpTooltip({ text }: { text: string }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    placement: "top",
  });

  const updatePosition = () => {
    const el = buttonRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportPadding = 16;
    const tooltipWidth = Math.min(352, Math.max(240, window.innerWidth - viewportPadding * 2));
    const tooltipHalfWidth = tooltipWidth / 2;
    const centeredLeft = rect.left + rect.width / 2;
    const minLeft = viewportPadding + tooltipHalfWidth;
    const maxLeft = window.innerWidth - viewportPadding - tooltipHalfWidth;
    const placement: "top" | "bottom" = rect.top < 120 ? "bottom" : "top";

    setPosition({
      top: placement === "top" ? rect.top - 10 : rect.bottom + 10,
      left: Math.min(Math.max(centeredLeft, minLeft), maxLeft),
      placement,
    });
  };

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutsidePointer);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [open]);

  return (
    <span className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={text}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            show();
          }
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>

      {open
        ? createPortal(
            <span
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className={cn(
                "pointer-events-none fixed z-[1000] w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border bg-popover px-4 py-3 text-left text-[13px] leading-5 text-popover-foreground shadow-xl",
                position.placement === "top" ? "-translate-y-full" : "translate-y-0"
              )}
            >
              {text}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

function FieldLabelWithHelp({ label, help }: { label: string; help: string }) {
  return (
    <div className="flex min-h-5 items-center gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <HelpTooltip text={help} />
    </div>
  );
}

function ItemDialogSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function blankDraft(): ItemDraft {
  return {
    cost_center_id: null,
    training_category_id: null,
    training_name_id: null,
    business_need_id: null,
    priority: "MEDIUM",
    quarter: "TBD",
    employees_count: 1,
    employee_full_name: "",
    estimated_cost_per_person: 0,
    estimated_hours_per_person: 0,
    contact_person: "",
    notes: "",
  };
}

function NotesCell(props: {
  text: string | null | undefined;
  expanded: boolean;
  onToggle: () => void;
  moreLabel: string;
  lessLabel: string;
  className?: string;
}) {
  const { text, expanded, onToggle, moreLabel, lessLabel, className } = props;
  const value = (text ?? "").trim();
  const ref = useRef<HTMLDivElement | null>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  // Show "More" only if truly truncated (horizontal overflow)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const overflow = el.scrollWidth > el.clientWidth + 1;
      setIsOverflow(overflow);
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    return () => ro.disconnect();
  }, [value, expanded]);

  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (expanded) {
    return (
      <div className={`space-y-1 ${className ?? ""}`}>
        <div className="whitespace-pre-wrap break-words">{value}</div>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-medium text-primary hover:underline"
        >
          {lessLabel}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <div ref={ref} className="truncate" title={value}>
        {value}
      </div>
      {isOverflow && (
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-medium text-primary hover:underline"
        >
          {moreLabel}
        </button>
      )}
    </div>
  );
}

export function FormDetailsPage() {
  const nav = useNavigate();
  const params = useParams();
  const id = Number(params.id);

  const { user, roleFlags } = useAuth();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const markNotificationScopesReadM = useMarkNotificationScopesRead();

  const cwQ = useCollectionWindow();
  const collectionOpen = cwQ.data?.is_open ?? true;

  const formQ = useFormById(id, Number.isFinite(id));
  const historyQ = useFormHistory(id, Number.isFinite(id));

  const areasQ = useAreas();
  const categoriesQ = useTrainingCategories();
  const businessNeedsQ = useBusinessNeeds();

  const form = formQ.data ?? null;
  const managerNotificationMarkedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id) || !form) return;
    if (!(roleFlags.isManager || roleFlags.isAdmin)) return;
    if (managerNotificationMarkedRef.current === id) return;

    managerNotificationMarkedRef.current = id;
    void (async () => {
      try {
        await markNotificationScopesReadM.mutateAsync({ scopes: ["manager_inbox"], formIds: [id] });
        await qc.invalidateQueries({ queryKey: notificationKeys.summary() });
      } catch {
        managerNotificationMarkedRef.current = null;
      }
    })();
  }, [form, id, markNotificationScopesReadM, qc, roleFlags.isAdmin, roleFlags.isManager]);

  const costCentersQ = useCostCentersForArea(form?.area_id ?? 0, "", !!form?.area_id);

  const areaMap = useMemo(() => new Map((areasQ.data ?? []).map((a) => [a.id, a])), [areasQ.data]);
  const catMap = useMemo(() => new Map((categoriesQ.data ?? []).map((c) => [c.id, c])), [categoriesQ.data]);
  const bnMap = useMemo(() => new Map((businessNeedsQ.data ?? []).map((b) => [b.id, b])), [businessNeedsQ.data]);
  const ccMap = useMemo(() => new Map((costCentersQ.data ?? []).map((cc) => [cc.id, cc])), [costCentersQ.data]);

  const itemCategoryIds = useMemo(() => {
    if (!form) return [] as number[];
    return uniq(form.items.map((it) => it.training_category_id).filter((x) => Number.isFinite(x)) as number[]);
  }, [form]);

  const trainingNamesQueries = useQueries({
    queries: itemCategoryIds.map((catId) => ({
      queryKey: formKeys.trainingNames(catId, ""),
      queryFn: () => listTrainingNames(catId, ""),
      enabled: !!catId,
    })),
  });

  const trainingNameMap = useMemo(() => {
    const m = new Map<
      number,
      { id: number; name_pl?: string | null; name_en?: string | null; default_cost_per_person?: number | null; default_hours_per_person?: number | null }
    >();
    for (const q of trainingNamesQueries) {
      const arr = (q.data as any[]) ?? [];
      for (const tn of arr) m.set(tn.id, tn);
    }
    return m;
  }, [trainingNamesQueries]);

  const isHrReturnedForChanges = useMemo(() => {
    if (!form) return false;
    return Boolean(
      form.status === "MANAGER_REVIEW" &&
      form.last_comment &&
      ["HR", "ADMIN"].includes((form.last_commented_by_role ?? "").toUpperCase())
    );
  }, [form]);

  const canEditItems = useMemo(() => {
    if (!form) return false;
    if (!collectionOpen && !isHrReturnedForChanges) return false;

    // ADMIN: global access
    if (roleFlags.isAdmin) return form.status === "DRAFT" || form.status === "MANAGER_REVIEW";

    // EDITOR: edit own drafts and HR-returned manager-review requests from allowed areas.
    // Backend still enforces exact area access, so the frontend can safely show the action here.
    if (roleFlags.isEditor) {
      if (form.status === "DRAFT") {
        if (user?.id && form.created_by_user_id !== user.id) return false;
        return true;
      }
      return form.status === "MANAGER_REVIEW" && isHrReturnedForChanges;
    }

    // MANAGER: edit during review, plus own drafts (manager może tworzyć własne wnioski)
    if (roleFlags.isManager) {
      const isOwn = Boolean(user?.id) && form.created_by_user_id === user?.id;
      return form.status === "MANAGER_REVIEW" || (form.status === "DRAFT" && isOwn);
    }

    return false;
  }, [form, collectionOpen, isHrReturnedForChanges, roleFlags.isAdmin, roleFlags.isEditor, roleFlags.isManager, user?.id]);

  const canSubmitToManager = useMemo(() => {
    if (!form) return false;
    if (!collectionOpen) return false;

    // Only author can submit (EDITOR or MANAGER) + ADMIN
    if (roleFlags.isAdmin) return form.status === "DRAFT";
    if (!roleFlags.isEditor && !roleFlags.isManager) return false;

    if (form.status !== "DRAFT") return false;
    if (user?.id && form.created_by_user_id !== user.id) return false;
    return true;
  }, [form, collectionOpen, roleFlags.isAdmin, roleFlags.isEditor, roleFlags.isManager, user?.id]);

  const isManagerOwnDraft = useMemo(() => {
    if (!form) return false;
    return roleFlags.isManager && form.status === "DRAFT" && Boolean(user?.id) && form.created_by_user_id === user?.id;
  }, [form, roleFlags.isManager, user?.id]);

  const canManagerApprove = useMemo(() => {
    if (!form) return false;
    if (!roleFlags.isManager) return false;
    if (form.status !== "MANAGER_REVIEW") return false;
    return collectionOpen || isHrReturnedForChanges;
  }, [collectionOpen, form, isHrReturnedForChanges, roleFlags.isManager]);

  const canManagerRequestChanges = useMemo(() => {
    if (!form) return false;
    if (!roleFlags.isManager) return false;
    if (form.status !== "MANAGER_REVIEW") return false;
    // Jeśli HR/Admin cofnął wniosek do managera, manager i edytorzy mogą poprawić
    // pozycje bez zmiany statusu na DRAFT. Pokazywanie drugiego cofnięcia jest mylące
    // i może kończyć się błędem po zamknięciu okna zbierania wniosków.
    if (isHrReturnedForChanges) return false;
    return collectionOpen;
  }, [collectionOpen, form, isHrReturnedForChanges, roleFlags.isManager]);

  const canHrReply = useMemo(() => {
    if (!form) return false;
    if (!roleFlags.isHr) return false;
    return form.status === "HR_REVIEW";
  }, [form, roleFlags.isHr]);

  const managerApproveLabel = isHrReturnedForChanges
    ? (lang === "en" ? "Send again to HR" : "Wyślij ponownie do HR")
    : t("forms.actions.sendToHr");


  const everSubmittedToHr = useMemo(() => {
    if (!form) return false;
    // If currently in/after HR, it's obviously already in HR.
    if (["HR_REVIEW", "REPLIED", "CLOSED"].includes(form.status)) return true;
    const events = historyQ.data ?? [];
    return events.some((e) => e.to_status === "HR_REVIEW");
  }, [form, historyQ.data]);

  const canDeleteForm = useMemo(() => {
    if (!form) return false;
    if (!collectionOpen) return false;
    if (!historyQ.isSuccess) return false; // avoid showing a destructive action without full context
    if (everSubmittedToHr) return false;

    // Allowed until it reaches HR (manager/editor/admin)
    const allowedRole = roleFlags.isAdmin || roleFlags.isEditor || roleFlags.isManager;
    if (!allowedRole) return false;

    // Only early statuses
    if (form.status !== "DRAFT" && form.status !== "MANAGER_REVIEW") return false;

    // Editors can delete only their own
    if (roleFlags.isEditor && user?.id && form.created_by_user_id !== user.id) return false;

    return true;
  }, [collectionOpen, everSubmittedToHr, form, historyQ.isSuccess, roleFlags.isAdmin, roleFlags.isEditor, roleFlags.isManager, user?.id]);

  // ---- mutations ----
  const addItemM = useAddItem(id);
  const updateItemM = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: FormItemUpdatePayload }) => updateItem(id, itemId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.one(id) }),
  });
  const deleteItemM = useMutation({
    mutationFn: (itemId: number) => deleteItem(id, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.one(id) }),
  });

  const deleteFormM = useMutation({
    mutationFn: () => deleteForm(id),
    onSuccess: () => {
      toast.success(t("forms.delete.success"));
      // Invalidate list queries (match by key prefix, regardless of pagination/search params)
      qc.invalidateQueries({ queryKey: ["forms", "my"] });
      qc.invalidateQueries({ queryKey: ["forms", "manager_inbox"] });
      qc.invalidateQueries({ queryKey: ["forms", "hr_inbox"] });
      nav(-1);
    },
  });

  const submitM = useSubmitToManager(id);
  const mgrApproveM = useManagerApprove(id);
  const mgrReqChangesM = useManagerRequestChanges(id);
  const hrReplyM = useHrReply(id);
  const hrRequestChangesM = useHrRequestChanges(id);

  // ---- dialogs ----
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const itemDialogBodyRef = useRef<HTMLDivElement | null>(null);
  const [editingItem, setEditingItem] = useState<FormItem | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(blankDraft());
  const [itemErrors, setItemErrors] = useState<FieldErrors>({});

  // Training picker (global search + optional category filter)
  const [trainingNameSearch, setTrainingNameSearch] = useState("");
  const [trainingNameSearchDebounced, setTrainingNameSearchDebounced] = useState("");
  const [trainingNamePickerOpen, setTrainingNamePickerOpen] = useState(false);
  const [trainingCategoryFilterId, setTrainingCategoryFilterId] = useState<number | null>(null);
  const [selectedTrainingNameLabel, setSelectedTrainingNameLabel] = useState<string>("");


  type RecentTraining = {
    id: number;
    name_pl?: string | null;
    name_en?: string | null;
    category_id?: number | null;
    default_cost_per_person?: number | null;
    default_hours_per_person?: number | null;
    used_at?: number;
  };

  const [recentTrainings, setRecentTrainings] = useState<RecentTraining[]>([]);

  const [managerCommentOpen, setManagerCommentOpen] = useState(false);
  const [managerComment, setManagerComment] = useState("");
  const [managerCommentError, setManagerCommentError] = useState("");

  const confirmD = useConfirmDialog();

  const [hrDialogOpen, setHrDialogOpen] = useState(false);
  const [hrDecision, setHrDecision] = useState<HrWorkflowDecision>("APPROVED");
  const [hrBudget, setHrBudget] = useState<string>("");
  const [hrComment, setHrComment] = useState("");
  const [hrErrors, setHrErrors] = useState<FieldErrors>({});

  const createProposalM = useCreateTrainingProposal();
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalErrors, setProposalErrors] = useState<FieldErrors>({});
  const [proposalDraft, setProposalDraft] = useState({
    name: "",
    justification: "",
    suggested_category_id: 0,
    provider: "",
    external_url: "",
    estimated_cost_per_person: "0",
    estimated_hours_per_person: "0",
    notes: "",
  });

  // ---- notes expanded state ----
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [expandedItemDetails, setExpandedItemDetails] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<"items" | "summary" | "history">("items");

  const showMoreLabel = lang === "pl" ? "Pokaż więcej" : "Show more";
  const showLessLabel = lang === "pl" ? "Pokaż mniej" : "Show less";

  function toggleNotes(itemId: number) {
    setExpandedNotes((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function toggleItemDetails(itemId: number) {
    setExpandedItemDetails((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function loadRecentTrainings(): RecentTraining[] {
    try {
      const raw = localStorage.getItem("poap.recentTrainings");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x) => x && typeof x.id === 'number')
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  function saveRecentTrainings(list: RecentTraining[]) {
    try {
      localStorage.setItem("poap.recentTrainings", JSON.stringify(list.slice(0, 8)));
    } catch {
      // ignore
    }
  }

  function rememberTraining(tn: RecentTraining) {
    setRecentTrainings((prev) => {
      const next = [
        { ...tn, used_at: Date.now() },
        ...prev.filter((x) => x.id !== tn.id),
      ].slice(0, 8);
      saveRecentTrainings(next);
      return next;
    });
  }

  useEffect(() => {
    if (!itemDialogOpen) return;
    setRecentTrainings(loadRecentTrainings());

    const frame = window.requestAnimationFrame(() => {
      itemDialogBodyRef.current?.scrollTo({ top: 0 });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [itemDialogOpen, editingItem?.id]);

  // Debounce the server-side search
  useEffect(() => {
    const t = setTimeout(() => setTrainingNameSearchDebounced(trainingNameSearch), 300);
    return () => clearTimeout(t);
  }, [trainingNameSearch]);

  const effectiveTrainingFilterId = trainingCategoryFilterId ?? draft.training_category_id ?? null;
  const trainingSearchTerm = trainingNameSearchDebounced.trim();
  const trainingSearchEnabled =
    trainingNamePickerOpen && (effectiveTrainingFilterId != null || trainingSearchTerm.length >= 2);

  const trainingSearchQ = useQuery({
    queryKey: ["dict", "training-names", effectiveTrainingFilterId ?? "all", trainingSearchTerm],
    queryFn: () =>
      searchTrainingNames({
        q: trainingSearchTerm.length ? trainingSearchTerm : undefined,
        categoryId: effectiveTrainingFilterId,
        limit: 30,
      }),
    enabled: trainingSearchEnabled,
    staleTime: 30_000,
  });

  // Keep a stable label for the selected training (even when the dropdown list is filtered).
  useEffect(() => {
    if (!draft.training_name_id) {
      setSelectedTrainingNameLabel("");
      return;
    }
    const fromMap = trainingNameMap.get(draft.training_name_id) as any;
    const fromSearch = (trainingSearchQ.data ?? []).find((x) => x.id === draft.training_name_id) as any;
    const tn = fromSearch ?? fromMap;
    if (tn) setSelectedTrainingNameLabel(formatDictName(tn as any, lang));
  }, [draft.training_name_id, trainingNameMap, trainingSearchQ.data, lang]);

  useEffect(() => {
    // Reset search/filter when closing the dialog
    if (!itemDialogOpen) {
      setTrainingNameSearch("");
      setTrainingNameSearchDebounced("");
      setTrainingCategoryFilterId(null);
    }
  }, [itemDialogOpen]);

  useEffect(() => {
    if (!itemDialogOpen) return;
    // on open, ensure defaults
    if (!draft.priority) setDraft((d) => ({ ...d, priority: "MEDIUM" }));
  }, [itemDialogOpen, draft.priority]);

  function openAddItem() {
    setEditingItem(null);
    setDraft(blankDraft());
    setItemErrors({});
    setTrainingCategoryFilterId(null);
    setTrainingNameSearch("");
    setTrainingNameSearchDebounced("");
    setItemDialogOpen(true);
  }

  function openEditItem(it: FormItem) {
    setEditingItem(it);
    setDraft(draftFromItem(it));
    setItemErrors({});
    setTrainingCategoryFilterId(it.training_category_id ?? null);
    setTrainingNameSearch("");
    setTrainingNameSearchDebounced("");
    setItemDialogOpen(true);
  }

  function openTrainingProposalDialog() {
    setProposalErrors({});
    setProposalDraft({
      name: trainingNameSearch.trim() || selectedTrainingNameLabel || "",
      justification: "",
      suggested_category_id: trainingCategoryFilterId ?? draft.training_category_id ?? 0,
      provider: "",
      external_url: "",
      estimated_cost_per_person: String(draft.estimated_cost_per_person ?? 0),
      estimated_hours_per_person: String(draft.estimated_hours_per_person ?? 0),
      notes: "",
    });
    setProposalOpen(true);
  }

  async function onCreateTrainingProposal() {
    const nextErrors: FieldErrors = {};
    if (!proposalDraft.name.trim()) nextErrors.name = t("validation.trainingNameRequired");
    if (!proposalDraft.justification.trim()) nextErrors.justification = t("trainingProposals.validation.justificationRequired");
    setProposalErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await createProposalM.mutateAsync({
        name: proposalDraft.name.trim(),
        justification: proposalDraft.justification.trim(),
        suggested_category_id: proposalDraft.suggested_category_id || null,
        provider: proposalDraft.provider.trim() || null,
        external_url: proposalDraft.external_url.trim() || null,
        estimated_cost_per_person: proposalDraft.estimated_cost_per_person.trim() ? Number(proposalDraft.estimated_cost_per_person) : null,
        estimated_hours_per_person: proposalDraft.estimated_hours_per_person.trim() ? Number(proposalDraft.estimated_hours_per_person) : null,
        notes: proposalDraft.notes.trim() || null,
        form_id: form?.id ?? null,
      });
      toast.success(t("trainingProposals.toast.created"));
      setProposalOpen(false);
      qc.invalidateQueries({ queryKey: trainingProposalKeys.all() });
      qc.invalidateQueries({ queryKey: notificationKeys.summary() });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  function itemTrainingLabel(it: FormItem) {
    const tn = trainingNameMap.get(it.training_name_id);
    const cat = catMap.get(it.training_category_id);
    const tnName = tn ? formatDictName(tn as any, lang) : `#${it.training_name_id}`;
    const catName = cat ? formatDictName(cat as any, lang) : "";
    return {
      title: tnName,
      subtitle: catName,
    };
  }

  async function onSaveItem() {
    if (!form) return;

    const nextErrors: FieldErrors = {};
    if (!draft.cost_center_id) nextErrors.cost_center_id = t("validation.costCenterRequired");
    if (!draft.training_name_id) nextErrors.training_name_id = t("validation.trainingNameRequired");
    if (!draft.training_category_id) nextErrors.training_category_id = t("validation.categoryRequired");
    if (!draft.business_need_id) nextErrors.business_need_id = t("validation.businessNeedRequired");
    if (!draft.employees_count || draft.employees_count < 1) nextErrors.employees_count = t("validation.employeesCount");
    setItemErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payloadBase = {
      cost_center_id: draft.cost_center_id,
      training_category_id: draft.training_category_id,
      training_name_id: draft.training_name_id,
      business_need_id: draft.business_need_id,
      priority: draft.priority,
      quarter: draft.quarter,
      employees_count: draft.employees_count,
      employee_full_name: draft.employee_full_name || null,
      estimated_cost_per_person: draft.estimated_cost_per_person ?? 0,
      estimated_hours_per_person: draft.estimated_hours_per_person ?? 0,
      contact_person: draft.contact_person || null,
      notes: draft.notes || null,
    } as FormItemCreatePayload;

    try {
      if (editingItem) {
        await updateItemM.mutateAsync({ itemId: editingItem.id, payload: payloadBase as FormItemUpdatePayload });
        toast.success(t("forms.item.updated"));
      } else {
        await addItemM.mutateAsync(payloadBase);
        toast.success(t("forms.item.added"));
        qc.invalidateQueries({ queryKey: formKeys.one(id) });
      }
      setItemDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onDeleteItem(itemId: number) {
    confirmD.request({
      title: t("common.confirmDeleteTitle"),
      description: t("forms.item.deleteConfirm"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteItemM.mutateAsync(itemId);
          toast.success(t("forms.item.deleted"));
        } catch (e: any) {
          toast.error(e?.message ?? t("common.error"));
        }
      },
    });
  }

  function onDeleteForm() {
    if (!form) return;
    if (!canDeleteForm) return;

    confirmD.request({
      title: t("forms.delete.confirmTitle"),
      description: t("forms.delete.confirmDesc"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteFormM.mutateAsync();
        } catch (e: any) {
          toast.error(e?.message ?? t("common.error"));
        }
      },
    });
  }

  async function onSubmitToManager() {
    if (!form) return;
    if (form.items.length === 0) {
      toast.error(t("forms.validation.atLeastOneItem"));
      return;
    }
    try {
      await submitM.mutateAsync();
      toast.success(isManagerOwnDraft ? t("forms.sentToHr") : t("forms.submittedToManager"));
      qc.invalidateQueries({ queryKey: formKeys.one(id) });
      qc.invalidateQueries({ queryKey: formKeys.history(id) });
      qc.invalidateQueries({ queryKey: notificationKeys.summary() });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onManagerApprove() {
    if (!form) return;
    if (form.items.length === 0) {
      toast.error(t("forms.validation.atLeastOneItem"));
      return;
    }
    try {
      await mgrApproveM.mutateAsync();
      toast.success(t("forms.sentToHr"));
      qc.invalidateQueries({ queryKey: formKeys.one(id) });
      qc.invalidateQueries({ queryKey: formKeys.history(id) });
      qc.invalidateQueries({ queryKey: notificationKeys.summary() });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onManagerRequestChanges() {
    if (!managerComment.trim()) {
      setManagerCommentError(t("validation.commentRequired"));
      return;
    }
    setManagerCommentError("");
    try {
      await mgrReqChangesM.mutateAsync({ comment: managerComment.trim() });
      toast.success(t("forms.sentBack"));
      setManagerCommentOpen(false);
      setManagerComment("");
      qc.invalidateQueries({ queryKey: formKeys.one(id) });
      qc.invalidateQueries({ queryKey: formKeys.history(id) });
      qc.invalidateQueries({ queryKey: notificationKeys.summary() });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onHrReply() {
    if (!form) return;

    const isReject = hrDecision === "REJECTED";
    const isRequestChanges = hrDecision === "REQUEST_CHANGES";
    const budgetNum = hrBudget.trim() ? Number(hrBudget.trim()) : null;
    const wantsBudget = hrDecision === "APPROVED";

    const nextErrors: FieldErrors = {};
    if ((isReject || isRequestChanges) && !hrComment.trim()) nextErrors.comment = t("validation.commentRequired");
    if (wantsBudget && (budgetNum === null || !Number.isFinite(budgetNum) || budgetNum < 0)) nextErrors.budget_total = t("validation.budgetRequired");
    setHrErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      if (isRequestChanges) {
        await hrRequestChangesM.mutateAsync({ comment: hrComment.trim() });
        toast.success(t("forms.hr.returnedForChanges"));
      } else {
        await hrReplyM.mutateAsync({
          decision: hrDecision as HrDecision,
          budget_total: wantsBudget ? (budgetNum ?? 0) : null,
          comment: hrComment.trim() || null,
        });
        toast.success(t("forms.hrReplied"));
      }

      setHrDialogOpen(false);
      qc.invalidateQueries({ queryKey: formKeys.one(id) });
      qc.invalidateQueries({ queryKey: formKeys.history(id) });
      qc.invalidateQueries({ queryKey: ["forms", "manager_inbox"] });
      qc.invalidateQueries({ queryKey: ["forms", "editor_inbox"] });
      qc.invalidateQueries({ queryKey: ["forms", "hr_inbox"] });
      qc.invalidateQueries({ queryKey: notificationKeys.summary() });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  if (!Number.isFinite(id)) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.notFound")}</div>;
  }

  if (formQ.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (formQ.isError || !form) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.error")}</div>;
  }

  const area = areaMap.get(form.area_id);
  const totalsCost = sumCost(form);
  const totalsHours = sumHours(form);
  const itemsCount = form.items.length;
  const hasItems = itemsCount > 0;
  const summaryTabLabel = lang === "en" ? "Summary & send" : "Podsumowanie i wysyłka";
  const submitActionLabel = isManagerOwnDraft ? t("forms.actions.sendToHr") : t("forms.actions.submitToManager");

  const historyActionLabel = (action: string) => {
    const map: Record<string, string> = {
      FORM_CREATED: lang === "en" ? "Request created" : "Utworzono wniosek",
      FORM_SUBMITTED: lang === "en" ? "Sent to manager" : "Wysłano do managera",
      MANAGER_SELF_SUBMITTED_TO_HR: lang === "en" ? "Sent directly to HR" : "Wysłano bezpośrednio do HR",
      MANAGER_APPROVED: lang === "en" ? "Sent to HR" : "Wysłano do HR",
      MANAGER_REQUEST_CHANGES: lang === "en" ? "Returned by manager" : "Odesłano przez managera",
      HR_REQUEST_CHANGES: lang === "en" ? "Returned by HR" : "Odesłano przez HR",
      HR_REJECTED: lang === "en" ? "Rejected by HR" : "Odrzucono przez HR",
      HR_REPLIED: lang === "en" ? "HR response saved" : "Zapisano odpowiedź HR",
      HR_CLOSED: lang === "en" ? "Closed by HR" : "Zamknięto przez HR",
      ITEM_ADDED: lang === "en" ? "Item added" : "Dodano pozycję",
      ITEM_UPDATED: lang === "en" ? "Item updated" : "Zaktualizowano pozycję",
      ITEM_DELETED: lang === "en" ? "Item deleted" : "Usunięto pozycję",
      HR_ITEM_UPDATED: lang === "en" ? "HR updated item" : "HR zaktualizował pozycję",
    };
    return map[action] ?? action;
  };


  const historyToneClass = (action: string, decision?: string | null) => {
    if (decision === "REJECTED" || action === "HR_REJECTED") return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
    if (action === "MANAGER_REQUEST_CHANGES" || action === "HR_REQUEST_CHANGES") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    if (["HR_REPLIED", "HR_CLOSED"].includes(action)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (["FORM_SUBMITTED", "MANAGER_APPROVED", "MANAGER_SELF_SUBMITTED_TO_HR"].includes(action)) return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    return "border-border/70 bg-muted/55 text-foreground";
  };

  const historyDecisionBadgeClass = (decision?: string | null) => {
    if (decision === "REJECTED") return "rounded-full border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
    if (decision === "APPROVED") return "rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    return "rounded-full";
  };

  const historyStatusNote = (action: string, decision?: string | null) => {
    if (decision === "REJECTED" || action === "HR_REJECTED") return lang === "en" ? "Outcome: rejected" : "Wynik: odrzucono";
    if (action === "MANAGER_REQUEST_CHANGES" || action === "HR_REQUEST_CHANGES") return lang === "en" ? "Outcome: needs changes" : "Wynik: do poprawy";
    if (decision === "APPROVED") return lang === "en" ? "Outcome: approved" : "Wynik: zaakceptowano";
    if (action === "HR_CLOSED") return lang === "en" ? "Outcome: closed" : "Wynik: zamknięto";
    return null;
  };



  const navigationTabs: Array<{
    value: "items" | "summary" | "history";
    label: string;
    hint: string;
  }> = [
    {
      value: "items",
      label: t("forms.tabs.items"),
      hint: lang === "en" ? "Add or edit items" : "Dodaj lub popraw pozycje",
    },
    {
      value: "summary",
      label: summaryTabLabel,
      hint: lang === "en" ? "Check and send" : "Sprawdź i wyślij",
    },
    {
      value: "history",
      label: t("forms.tabs.history"),
      hint: lang === "en" ? "View events" : "Zobacz przebieg",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
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
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold">{t("forms.details.title", { id: String(form.id) })}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge
              status={form.status}
              hrDecision={form.hr_decision}
              needsChanges={Boolean(form.last_comment && ["MANAGER", "HR", "ADMIN"].includes((form.last_commented_by_role ?? "").toUpperCase()) && form.status === "DRAFT")}
            />
            <span>•</span>
            <span>{formatAreaLabel(area ?? null, lang)}</span>
            <span>•</span>
            <span>
              {t("forms.createdAt")}: {formatDT(form.created_at)}
            </span>
            {form.created_by_full_name ? (
              <>
                <span>•</span>
                <span>{lang === "en" ? `Sent by: ${form.created_by_full_name}` : `Wysłał: ${form.created_by_full_name}`}</span>
              </>
            ) : null}
          </div>
          <WorkflowStatusStrip status={form.status} lang={lang} isHrReturnedForChanges={isHrReturnedForChanges} />
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => nav(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>

          {canDeleteForm && (
            <Button variant="destructive" onClick={onDeleteForm} disabled={deleteFormM.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t("forms.delete.button")}
            </Button>
          )}
        </div>
      </div>

      {!collectionOpen &&
        (form.status === "DRAFT" || form.status === "MANAGER_REVIEW") &&
        !isHrReturnedForChanges &&
        (roleFlags.isEditor || roleFlags.isManager) && (
          <Card className="mb-6 border-amber-500/40">
            <CardHeader>
              <CardTitle className="text-base">{t("collectionWindow.closed.title")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{t("collectionWindow.closed.body")}</CardContent>
          </Card>
        )}

      <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "items" | "summary" | "history")} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 items-stretch gap-2 rounded-2xl border border-border/60 bg-card/30 p-1 shadow-sm sm:grid-cols-3">
          {navigationTabs.map((tab, index) => {
            const clipPath =
              index === 0
                ? "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)"
                : index === navigationTabs.length - 1
                  ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 24px 50%)"
                  : "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 24px 50%)";

            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                style={{ clipPath }}
                className={cn(
                  "relative !h-auto min-h-14 w-full flex-none cursor-pointer justify-start gap-3 rounded-xl border border-border/70 bg-background/75 py-3 text-left text-foreground shadow-sm backdrop-blur transition-all sm:rounded-none",
                  index === 0 ? "pl-5 pr-9 sm:rounded-l-2xl" : "pl-8 pr-9",
                  index === navigationTabs.length - 1 ? "sm:rounded-r-2xl sm:pr-5" : "",
                  "hover:border-primary/45 hover:bg-primary/10 hover:text-foreground hover:shadow-md focus-visible:z-20 data-[state=active]:z-10 data-[state=active]:border-primary/45 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_16px_40px_-28px_hsl(var(--primary)/0.95)] dark:bg-card/70 dark:hover:bg-primary/15 dark:data-[state=active]:border-primary/40 dark:data-[state=active]:bg-primary"
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/25 bg-background/25 text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold leading-5">{tab.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-normal leading-4 opacity-70">{tab.hint}</span>
                </span>
                {index < navigationTabs.length - 1 ? <ChevronRight className="h-4 w-4 shrink-0 opacity-70" /> : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ITEMS */}
        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">{t("forms.items.title")}</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">{t("forms.items.subtitle")}</div>
              </div>

              {canEditItems && (
                <Button onClick={openAddItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("forms.items.add")}
                </Button>
              )}
            </CardHeader>

            <CardContent>
              {form.items.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("forms.items.empty")}</div>
              ) : (
                <>
                  {/* MOBILE / NARROW: cards */}
                  <div className="space-y-3 lg:hidden">
                    {form.items.map((it) => {
                      const tl = itemTrainingLabel(it);
                      const bn = bnMap.get(it.business_need_id);
                      const cc = ccMap.get(it.cost_center_id);

                      const bnLabel = bn ? formatDictName(bn as any, lang) : `#${it.business_need_id}`;
                      const ccLabel = formatCostCenterLabel(cc ?? null, lang);

                      const isNotesExpanded = !!expandedNotes[it.id];

                      return (
                        <div key={it.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate" title={tl.title}>
                                {tl.title}
                              </div>
                              {tl.subtitle && (
                                <div className="text-xs text-muted-foreground truncate" title={tl.subtitle}>
                                  {tl.subtitle}
                                </div>
                              )}
                            </div>

                            {canEditItems && (
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditItem(it)}
                                  title={t("common.edit")}
                                  aria-label={t("common.edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => onDeleteItem(it.id)}
                                  title={t("common.delete")}
                                  aria-label={t("common.delete")}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="text-muted-foreground">{t("label.businessNeed")}</div>
                            <div className="truncate" title={bnLabel}>
                              {bnLabel}
                            </div>

                            <div className="text-muted-foreground">{t("label.costCenter")}</div>
                            <div className="truncate" title={ccLabel}>
                              {ccLabel}
                            </div>

                            <div className="text-muted-foreground">{t("label.count")}</div>
                            <div className="whitespace-nowrap">{it.employees_count}</div>

                            <div className="text-muted-foreground">{t("label.costPerPerson")}</div>
                            <div className="whitespace-nowrap">
                              <Money value={it.estimated_cost_per_person} />
                            </div>

                            <div className="text-muted-foreground">{t("label.hoursPerPerson")}</div>
                            <div className="whitespace-nowrap">
                              <Hours value={it.estimated_hours_per_person} />
                            </div>

                            <div className="text-muted-foreground">{t("label.quarter")}</div>
                            <div className="whitespace-nowrap">{t(`quarter.${it.quarter}`)}</div>

                            <div className="text-muted-foreground">{t("label.priority")}</div>
                            <div className="whitespace-nowrap">{t(`priority.${it.priority}`)}</div>

                            <div className="text-muted-foreground">{t("label.contactPerson")}</div>
                            <div className="truncate" title={it.contact_person || ""}>
                              {it.contact_person || <span className="text-muted-foreground">—</span>}
                            </div>

                            <div className="text-muted-foreground">{t("label.notes")}</div>
                            <div className="min-w-0">
                              <NotesCell
                                text={it.notes}
                                expanded={isNotesExpanded}
                                onToggle={() => toggleNotes(it.id)}
                                moreLabel={showMoreLabel}
                                lessLabel={showLessLabel}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP: table (lg+) */}
                  <div className="hidden lg:block">
                    <table className="w-full text-sm">
                      <colgroup>
                        <col className="w-[28%]" />
                        <col className="w-[20%]" />
                        <col className="w-[13%]" />
                        <col className="w-[7%]" />
                        <col className="w-[9%]" />
                        <col className="w-[8%]" />
                        <col className="w-[5%]" />
                        <col className="w-[8%]" />
                        <col className="w-[44px]" />
                        {canEditItems && <col className="w-[56px]" />}
                      </colgroup>

                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="px-3 py-2 text-left text-xs font-medium">{t("label.training")}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">{t("label.businessNeed")}</th>
                          <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">{t("label.costCenter")}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap">{t("label.count")}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap" title={t("label.costPerPerson")}>PLN/os.</th>
                          <th className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap" title={t("label.hoursPerPerson")}>h/os.</th>
                          <th className="px-3 py-2 text-center text-xs font-medium whitespace-nowrap" title={t("label.quarter")}>Q</th>
                          <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">{t("label.priority")}</th>
                          <th className="px-1 py-2 text-center text-xs font-medium">
                            <span className="sr-only">{lang === "pl" ? "Szczegóły" : "Details"}</span>
                          </th>
                          {canEditItems && (
                            <th className="px-1 py-2 text-right text-xs font-medium">
                              <span className="sr-only">{t("label.actions")}</span>
                            </th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {form.items.map((it) => {
                          const tl = itemTrainingLabel(it);
                          const bn = bnMap.get(it.business_need_id);
                          const cc = ccMap.get(it.cost_center_id);
                          const bnLabel = bn ? formatDictName(bn as any, lang) : `#${it.business_need_id}`;
                          const ccLabel = formatCostCenterLabel(cc ?? null, lang);
                          const detailsOpen = !!expandedItemDetails[it.id];
                          const notesText = it.notes?.trim() || "";
                          const contactText = it.contact_person?.trim() || "";

                          return (
                            <Fragment key={it.id}>
                              <tr className={cn("border-b align-top transition-colors", detailsOpen && "border-b-0 bg-muted/20")}> 
                                <td className="px-3 py-3 align-top">
                                  <div className="min-w-0">
                                    <div className="font-medium leading-5 break-words" title={tl.title}>
                                      {tl.title}
                                    </div>
                                    {tl.subtitle ? (
                                      <div className="mt-1 text-xs text-muted-foreground truncate" title={tl.subtitle}>
                                        {tl.subtitle}
                                      </div>
                                    ) : null}
                                  </div>
                                </td>

                                <td className="px-3 py-3 align-top">
                                  <div className="leading-5 break-words" title={bnLabel}>
                                    {bnLabel}
                                  </div>
                                  {notesText ? (
                                    <div className="mt-1 text-xs text-muted-foreground line-clamp-1" title={notesText}>
                                      {notesText}
                                    </div>
                                  ) : null}
                                </td>

                                <td className="px-3 py-3 align-top">
                                  <div className="break-words" title={ccLabel}>{ccLabel}</div>
                                </td>

                                <td className="px-3 py-3 text-right whitespace-nowrap align-top">{it.employees_count}</td>
                                <td className="px-3 py-3 text-right whitespace-nowrap align-top"><Money value={it.estimated_cost_per_person} /></td>
                                <td className="px-3 py-3 text-right whitespace-nowrap align-top"><Hours value={it.estimated_hours_per_person} /></td>
                                <td className="px-3 py-3 text-center whitespace-nowrap align-top">{t(`quarter.${it.quarter}`)}</td>
                                <td className="px-3 py-3 align-top">
                                  <span className={cn(
                                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                                    it.priority === "HIGH" && "border-rose-500/30 bg-rose-500/10 text-rose-300",
                                    it.priority === "MEDIUM" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
                                    it.priority === "LOW" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                                  )}>
                                    {t(`priority.${it.priority}`)}
                                  </span>
                                </td>

                                <td className="px-1 py-2 text-center align-top">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => toggleItemDetails(it.id)}
                                    aria-label={detailsOpen ? (lang === "pl" ? "Ukryj szczegóły" : "Hide details") : (lang === "pl" ? "Pokaż szczegóły" : "Show details")}
                                    title={detailsOpen ? (lang === "pl" ? "Ukryj szczegóły" : "Hide details") : (lang === "pl" ? "Pokaż szczegóły" : "Show details")}
                                  >
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", detailsOpen && "rotate-180")} />
                                  </Button>
                                </td>

                                {canEditItems && (
                                  <td className="px-1 py-2 text-right align-top">
                                    <DropdownMenu modal={false}>
                                      <DropdownMenuTrigger asChild>
                                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t("label.actions")}>
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12}>
                                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openEditItem(it); }}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          {t("common.edit")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={(e) => { e.preventDefault(); onDeleteItem(it.id); }}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          {t("common.delete")}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                )}
                              </tr>

                              {detailsOpen ? (
                                <tr className="border-b bg-muted/20">
                                  <td colSpan={canEditItems ? 10 : 9} className="px-3 pb-3 pt-0">
                                    <div className="rounded-lg border bg-background/70 p-3">
                                      <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                          <div className="text-xs font-medium text-muted-foreground">{t("label.contactPerson")}</div>
                                          <div className="mt-1 text-sm break-words">{contactText || <span className="text-muted-foreground">—</span>}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs font-medium text-muted-foreground">{t("label.notes")}</div>
                                          <div className="mt-1 text-sm break-words whitespace-pre-wrap">{notesText || <span className="text-muted-foreground">—</span>}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {hasItems
                    ? (lang === "en"
                        ? "When the item list is complete, continue to summary and sending."
                        : "Gdy lista pozycji jest kompletna, przejdź do podsumowania i wysyłki.")
                    : (lang === "en"
                        ? "Add at least one item to prepare the request for sending."
                        : "Dodaj co najmniej jedną pozycję, aby przygotować wniosek do wysyłki.")}
                </div>
                <Button
                  type="button"
                  variant={hasItems ? "default" : "secondary"}
                  disabled={!hasItems}
                  onClick={() => setActiveTab("summary")}
                  className="rounded-xl sm:self-end"
                >
                  {lang === "en" ? "Next: summary & send" : "Dalej: podsumowanie i wysyłka"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Item dialog */}
          <Dialog open={itemDialogOpen} onOpenChange={(open) => { setItemDialogOpen(open); if (!open) setItemErrors({}); }}>
            <DialogContent
              className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[90dvh] sm:w-[96vw] sm:max-w-5xl"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                window.requestAnimationFrame(() => {
                  itemDialogBodyRef.current?.scrollTo({ top: 0 });
                });
              }}
            >
              <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:py-5">
                <DialogTitle>{editingItem ? t("forms.item.edit") : t("forms.item.add")}</DialogTitle>
                <DialogDescription>{t("forms.item.description")}</DialogDescription>
              </DialogHeader>

              <div ref={itemDialogBodyRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
                <section className="rounded-2xl border bg-card/40 p-4 shadow-sm">
                  <ItemDialogSectionHeader title={t("forms.item.mainSection")} description={t("forms.item.mainSectionDesc")} />

                  <div className="grid gap-4 md:grid-cols-2">
                {/* Cost center */}
                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.costCenter")} help={t("forms.help.costCenter")} />
                  <Select
                    value={draft.cost_center_id ? String(draft.cost_center_id) : ""}
                    onValueChange={(v) => { setDraft((d) => ({ ...d, cost_center_id: Number(v) })); setItemErrors((s) => ({ ...s, cost_center_id: "" })); }}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!itemErrors.cost_center_id}>
                      <SelectValue placeholder={t("forms.pickCostCenter")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(costCentersQ.data ?? []).map((cc) => (
                        <SelectItem key={cc.id} value={String(cc.id)}>
                          {formatCostCenterLabel(cc, lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <InlineError message={itemErrors.cost_center_id} />
                </div>

                {/* Business Need */}
                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.businessNeed")} help={t("forms.help.businessNeed")} />
                  <Select
                    value={draft.business_need_id ? String(draft.business_need_id) : ""}
                    onValueChange={(v) => { setDraft((d) => ({ ...d, business_need_id: Number(v) })); setItemErrors((s) => ({ ...s, business_need_id: "" })); }}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!itemErrors.business_need_id}>
                      <SelectValue placeholder={t("forms.pickBusinessNeed")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(businessNeedsQ.data ?? []).map((bn) => (
                        <SelectItem key={bn.id} value={String(bn.id)}>
                          {formatDictName(bn as any, lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <InlineError message={itemErrors.business_need_id} />
                </div>

                {/* Training (global search + optional category filter) */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <FieldLabelWithHelp label={t("label.training")} help={t("forms.help.training")} />
                      <div className="text-xs text-muted-foreground">{t("forms.trainingPickerHint")}</div>
                      </div>

                    <div className="w-full md:w-72 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground">{t("label.trainingCategory")}</Label>
                        <HelpTooltip text={t("forms.help.trainingCategory")} />
                      </div>
                      <Select
                        value={trainingCategoryFilterId === null ? "all" : String(trainingCategoryFilterId)}
                        onValueChange={(v) => {
                          const nextCat = v === "all" ? null : Number(v);
                          setTrainingCategoryFilterId(nextCat);

                          // Changing the category filter should reset the chosen training to avoid stale/invalid selection.
                          setDraft((d) => ({
                            ...d,
                            training_category_id: nextCat,
                            training_name_id: null,
                            // Clear defaults that may have been auto-filled from a previously selected training.
                            estimated_cost_per_person: 0,
                            estimated_hours_per_person: 0,
                          }));

                          setTrainingNameSearch("");
                          setTrainingNameSearchDebounced("");
                        }}
                      >
                        <SelectTrigger className="w-full" aria-invalid={!!itemErrors.training_category_id}>
                          <SelectValue placeholder={t("common.all")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.all")}</SelectItem>
                          {(categoriesQ.data ?? []).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {formatDictName(c as any, lang)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DropdownMenu
                    open={trainingNamePickerOpen}
                    onOpenChange={(open) => {
                      setTrainingNamePickerOpen(open);
                      if (open) {
                        // Prefill the category filter for edits; otherwise keep user's previous selection.
                        setTrainingCategoryFilterId((prev) => prev ?? draft.training_category_id ?? null);
                      }
                      setTrainingNameSearch("");
                      setTrainingNameSearchDebounced("");
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className={`w-full justify-between font-normal h-auto min-h-10 py-2 ${itemErrors.training_name_id ? "border-destructive" : ""}`}>
                        <span className="min-w-0 flex-1 text-left whitespace-normal break-words">
                          {draft.training_name_id ? selectedTrainingNameLabel : t("forms.pickTrainingName")}
                        </span>
                        <ChevronDown className="ml-2 mt-1 size-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="start"
                      className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[18rem] p-2"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="pb-2">
                        <Input
                          placeholder={t("forms.searchTraining")}
                          value={trainingNameSearch}
                          onChange={(e) => setTrainingNameSearch(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="max-h-80 overflow-auto -mx-1 px-1">
                        {/* Recently used */}
                        {trainingNameSearch.trim().length === 0 && effectiveTrainingFilterId == null && recentTrainings.length > 0 ? (
                          <div className="pb-2">
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{t("forms.recentTrainings")}</div>
                            {recentTrainings.map((rt) => {
                              const label = formatDictName(rt as any, lang);
                              const cat = rt.category_id ? catMap.get(rt.category_id) : null;
                              const isSelected = draft.training_name_id === rt.id;

                              return (
                                <button
                                  key={rt.id}
                                  type="button"
                                  className={cn(
                                    "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                    isSelected && "bg-accent"
                                  )}
                                  onClick={() => {
                                    setSelectedTrainingNameLabel(label);
                                    setTrainingNamePickerOpen(false);
                                    setTrainingNameSearch("");
                                    setTrainingNameSearchDebounced("");
                                    setTrainingCategoryFilterId(rt.category_id ?? null);

                                    setDraft((d) => ({
                                      ...d,
                                      training_name_id: rt.id,
                                      training_category_id: rt.category_id ?? d.training_category_id,
                                      // Always reset to the selected training defaults to avoid carrying values
                                      // from a previously selected training.
                                      estimated_cost_per_person: rt.default_cost_per_person ?? 0,
                                      estimated_hours_per_person: rt.default_hours_per_person ?? 0,
                                    }));
                                    setItemErrors((s) => ({ ...s, training_name_id: "", training_category_id: "" }));
                                  }}
                                >
                                  <span className="mt-0.5 w-4 shrink-0">{isSelected ? <Check className="size-4" /> : null}</span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block whitespace-normal break-words">{label}</span>
                                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      {cat ? <span>{formatDictName(cat as any, lang)}</span> : null}
                                      <span>·</span>
                                      <span>{formatMoney(rt.default_cost_per_person)} · {rt.default_hours_per_person == null ? "—" : rt.default_hours_per_person.toFixed(1)}h</span>
                                    </span>
                                  </span>
                                </button>
                              );
                            })}

                            <Separator className="my-2" />
                          </div>
                        ) : null}

                        {/* Hint when we don't query yet */}
                        {!trainingSearchEnabled ? (
                          <div className="px-2 py-2 text-sm text-muted-foreground">{t("forms.searchTrainingMinChars")}</div>
                        ) : null}

                        {/* Loading / empty state */}
                        {trainingSearchEnabled && trainingSearchQ.isFetching && (trainingSearchQ.data ?? []).length === 0 ? (
                          <div className="px-2 py-2 text-sm text-muted-foreground">{t("common.loading")}</div>
                        ) : null}
                        {trainingSearchEnabled && !trainingSearchQ.isFetching && (trainingSearchQ.data ?? []).length === 0 ? (
                          <div className="px-2 py-2 text-sm text-muted-foreground">{t("common.noResults")}</div>
                        ) : null}

                        {(trainingSearchQ.data ?? []).map((tn) => {
                          const label = formatDictName(tn as any, lang);
                          const isSelected = draft.training_name_id === tn.id;
                          const cat = tn.category_id ? catMap.get(tn.category_id) : null;

                          return (
                            <button
                              key={tn.id}
                              type="button"
                              className={cn(
                                "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                isSelected && "bg-accent"
                              )}
                              onClick={() => {
                                setSelectedTrainingNameLabel(label);
                                setTrainingNamePickerOpen(false);
                                setTrainingNameSearch("");
                                setTrainingNameSearchDebounced("");
                                setTrainingCategoryFilterId((tn.category_id ?? null) as any);

                                rememberTraining({
                                  id: tn.id,
                                  name_pl: (tn as any).name_pl ?? null,
                                  name_en: (tn as any).name_en ?? null,
                                  category_id: (tn as any).category_id ?? null,
                                  default_cost_per_person: tn.default_cost_per_person ?? null,
                                  default_hours_per_person: tn.default_hours_per_person ?? null,
                                });

                                setDraft((d) => ({
                                  ...d,
                                  training_name_id: tn.id,
                                  training_category_id: (tn.category_id ?? d.training_category_id) as any,
                                  // Always reset to the selected training defaults to avoid carrying values
                                  // from a previously selected training.
                                  estimated_cost_per_person: tn.default_cost_per_person ?? 0,
                                  estimated_hours_per_person: tn.default_hours_per_person ?? 0,
                                }));
                                setItemErrors((s) => ({ ...s, training_name_id: "", training_category_id: "" }));
                              }}
                            >
                              <span className="mt-0.5 w-4 shrink-0">{isSelected ? <Check className="size-4" /> : null}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block whitespace-normal break-words">{label}</span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {cat ? <span>{formatDictName(cat as any, lang)}</span> : null}
                                  <span>·</span>
                                  <span>
                                    {formatMoney(tn.default_cost_per_person)} · {tn.default_hours_per_person == null ? "—" : tn.default_hours_per_person.toFixed(1)}h
                                  </span>
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <InlineError message={itemErrors.training_name_id || itemErrors.training_category_id} />
                  <div className="flex justify-end">
                    <Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={openTrainingProposalDialog}>
                      {t("trainingProposals.openFromForm")}
                    </Button>
                  </div>
                </div>

                {/* Count */}
                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.count")} help={t("forms.help.count")} />
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={draft.employees_count}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => { setDraft((d) => ({ ...d, employees_count: Math.max(1, Number(e.target.value || 1)) })); setItemErrors((s) => ({ ...s, employees_count: "" })); }}
                    aria-invalid={!!itemErrors.employees_count}
                  />
                  <InlineError message={itemErrors.employees_count} />
                </div>

                {/* Employee */}
                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.employee")} help={t("forms.help.employee")} />
                  <Input value={draft.employee_full_name} onChange={(e) => setDraft((d) => ({ ...d, employee_full_name: e.target.value }))} />
                </div>

                {/* Cost / h */}
                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.costPerPerson")} help={t("forms.help.costPerPerson")} />
                  <Input
                    type="number"
                    min={0}
                    value={draft.estimated_cost_per_person}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDraft((d) => ({ ...d, estimated_cost_per_person: Math.max(0, Number(e.target.value || 0)) }))}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.hoursPerPerson")} help={t("forms.help.hoursPerPerson")} />
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={draft.estimated_hours_per_person}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDraft((d) => ({ ...d, estimated_hours_per_person: Math.max(0, Number(e.target.value || 0)) }))}
                  />
                </div>

                {/* Quarter/Priority */}
                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.quarter")} help={t("forms.help.quarter")} />
                  <Select value={draft.quarter} onValueChange={(v) => setDraft((d) => ({ ...d, quarter: v as Quarter }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map((q) => (
                        <SelectItem key={q} value={q}>
                          {t(`quarter.${q}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.priority")} help={t("forms.help.priority")} />
                  <Select value={draft.priority} onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as Priority }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {t(`priority.${p}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-card/40 p-4 shadow-sm">
                  <ItemDialogSectionHeader title={t("forms.item.additionalSection")} description={t("forms.item.additionalSectionDesc")} />

                  <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabelWithHelp label={t("label.contactPerson")} help={t("forms.help.contactPerson")} />
                  <Input value={draft.contact_person} onChange={(e) => setDraft((d) => ({ ...d, contact_person: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldLabelWithHelp label={t("label.notes")} help={t("forms.help.notes")} />
                  <Textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
                </div>
                  </div>
                </section>
              </div>

              <DialogFooter className="shrink-0 border-t bg-background/95 px-4 py-3 sm:px-6 sm:py-4">
                <DialogClose asChild>
                  <Button variant="secondary"><X className="mr-2 h-4 w-4" />{t("common.cancel")}</Button>
                </DialogClose>
                <Button onClick={onSaveItem} disabled={!canEditItems || addItemM.isPending || updateItemM.isPending}>
                  <Check className="mr-2 h-4 w-4" />
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={proposalOpen} onOpenChange={(open) => { setProposalOpen(open); if (!open) setProposalErrors({}); }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("trainingProposals.createTitle")}</DialogTitle>
                <DialogDescription>{t("trainingProposals.createDesc")}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("label.training")}</Label>
                    <Input aria-invalid={!!proposalErrors.name} value={proposalDraft.name} onChange={(e) => { setProposalDraft((s) => ({ ...s, name: e.target.value })); setProposalErrors((s) => ({ ...s, name: "" })); }} />
                  <InlineError message={proposalErrors.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.category")}</Label>
                    <Select value={proposalDraft.suggested_category_id ? String(proposalDraft.suggested_category_id) : "none"} onValueChange={(v) => setProposalDraft((s) => ({ ...s, suggested_category_id: v === "none" ? 0 : Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("common.none")}</SelectItem>
                        {(categoriesQ.data ?? []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{formatDictName(c as any, lang)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("trainingProposals.provider")}</Label>
                    <Input value={proposalDraft.provider} onChange={(e) => setProposalDraft((s) => ({ ...s, provider: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("trainingProposals.justification")}</Label>
                    <Textarea aria-invalid={!!proposalErrors.justification} value={proposalDraft.justification} onChange={(e) => { setProposalDraft((s) => ({ ...s, justification: e.target.value })); setProposalErrors((s) => ({ ...s, justification: "" })); }} />
                  <InlineError message={proposalErrors.justification} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("trainingProposals.url")}</Label>
                    <Input value={proposalDraft.external_url} onChange={(e) => setProposalDraft((s) => ({ ...s, external_url: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.defaultCost")}</Label>
                    <Input type="number" min={0} value={proposalDraft.estimated_cost_per_person} onChange={(e) => setProposalDraft((s) => ({ ...s, estimated_cost_per_person: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("label.defaultHours")}</Label>
                    <Input type="number" min={0} step={0.5} value={proposalDraft.estimated_hours_per_person} onChange={(e) => setProposalDraft((s) => ({ ...s, estimated_hours_per_person: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("label.notes")}</Label>
                    <Textarea value={proposalDraft.notes} onChange={(e) => setProposalDraft((s) => ({ ...s, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary"><X className="mr-2 h-4 w-4" />{t("common.cancel")}</Button>
                </DialogClose>
                <Button onClick={onCreateTrainingProposal} disabled={createProposalM.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  {createProposalM.isPending ? t("common.saving") : t("trainingProposals.submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* SUMMARY */}
        <TabsContent value="summary" className="mt-6">
          {(canSubmitToManager || canManagerApprove || canManagerRequestChanges || canHrReply) && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-background/45 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium">
                  {canSubmitToManager
                    ? (lang === "en" ? "This is the final step for sending the request." : "To jest końcowy krok wysyłki wniosku.")
                    : canHrReply
                      ? (lang === "en" ? "This is where HR sends the final response." : "To właśnie tutaj HR wysyła końcową odpowiedź.")
                      : (lang === "en" ? "This tab contains the decision actions for this workflow step." : "W tej zakładce znajdują się akcje decyzyjne dla tego kroku workflow.")}
                </div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  {canSubmitToManager
                    ? (lang === "en"
                        ? "You can go back and add more items at any time. Send the request only when the list is complete."
                        : "W każdej chwili możesz wrócić i dodać kolejne pozycje. Wyślij wniosek dopiero wtedy, gdy lista będzie kompletna.")
                    : canHrReply
                      ? (lang === "en"
                          ? "Check totals, decision context and then send the HR response for the whole request."
                          : "Sprawdź sumy i kontekst decyzji, a następnie wyślij odpowiedź HR dla całego wniosku.")
                      : (lang === "en"
                          ? "Review the totals and then choose the next step: send forward or return with comments."
                          : "Sprawdź podsumowanie, a następnie wybierz kolejny krok: przekaż dalej albo odeślij z komentarzem.")}
                </div>
              </div>
              {canEditItems ? (
                <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => setActiveTab("items")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("forms.tabs.items")}
                </Button>
              ) : null}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("forms.summary.totals")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InlineKeyValue label={t("forms.summary.items")} value={form.items.length} />
                <InlineKeyValue label={t("forms.summary.totalCost")} value={<Money value={totalsCost} />} />
                <InlineKeyValue label={t("forms.summary.totalHours")} value={<Hours value={totalsHours} />} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("forms.summary.hrDecision")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InlineKeyValue label={t("forms.summary.decision")} value={form.hr_decision ? t(`decision.${form.hr_decision}`) : "—"} />
                <InlineKeyValue label={t("forms.summary.budget")} value={<Money value={form.hr_budget_total ?? null} />} />
                <div className="pt-2 text-sm">
                  <div className="text-xs text-muted-foreground">{t("forms.summary.comment")}</div>
                  <div className="mt-1 whitespace-pre-wrap">{form.hr_comment || <span className="text-muted-foreground">—</span>}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("forms.summary.actions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.status === "REPLIED" ? (
                  <div className="text-sm text-muted-foreground">{t("forms.summary.finished")}</div>
                ) : canSubmitToManager && !hasItems ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-muted/20 p-4 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">
                      {lang === "en" ? "Add at least one item before sending." : "Dodaj co najmniej jedną pozycję przed wysłaniem."}
                    </div>
                    <div className="mt-1 leading-6">
                      {lang === "en"
                        ? "Go back to the items tab, complete the list and return here when the request is ready."
                        : "Wróć do zakładki z pozycjami, uzupełnij listę i wróć tutaj, gdy wniosek będzie gotowy."}
                    </div>
                    <Button variant="secondary" className="mt-3 rounded-xl" onClick={() => setActiveTab("items")}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t("forms.tabs.items")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {canSubmitToManager && (
                      <Button onClick={onSubmitToManager} disabled={submitM.isPending} className="rounded-xl">
                        <Send className="mr-2 h-4 w-4" />
                        {submitActionLabel}
                      </Button>
                    )}

                    {canManagerApprove && (
                      <Button onClick={onManagerApprove} disabled={mgrApproveM.isPending} className="rounded-xl">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {managerApproveLabel}
                      </Button>
                    )}

                    {canManagerRequestChanges && (
                      <Button
                        variant="secondary"
                        onClick={() => setManagerCommentOpen(true)}
                        disabled={mgrReqChangesM.isPending}
                        className="rounded-xl"
                      >
                        <CornerUpLeft className="mr-2 h-4 w-4" />
                        {t("forms.actions.requestChanges")}
                      </Button>
                    )}

                    {canHrReply && (
                      <Button onClick={() => setHrDialogOpen(true)} disabled={hrReplyM.isPending || hrRequestChangesM.isPending} className="rounded-xl">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t("forms.actions.hrReply")}
                      </Button>
                    )}

                    {!canSubmitToManager && !canManagerApprove && !canManagerRequestChanges && !canHrReply && (
                      <div className="text-sm text-muted-foreground">{t("forms.summary.noActions")}</div>
                    )}
                  </div>
                )}

                {(form.status === "DRAFT" || form.status === "MANAGER_REVIEW") && !collectionOpen && !isHrReturnedForChanges && (roleFlags.isEditor || roleFlags.isManager) && (
                  <div className="text-xs text-muted-foreground">{t("collectionWindow.closed.hint")}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manager request changes dialog */}
          <Dialog open={managerCommentOpen} onOpenChange={(open) => { setManagerCommentOpen(open); if (!open) setManagerCommentError(""); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("forms.actions.requestChanges")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label>{t("label.comment")}</Label>
                <Textarea aria-invalid={!!managerCommentError} value={managerComment} onChange={(e) => { setManagerComment(e.target.value); setManagerCommentError(""); }} />
                <InlineError message={managerCommentError} />
                <div className="text-xs text-muted-foreground">{t("forms.actions.requestChangesHint")}</div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary"><X className="mr-2 h-4 w-4" />{t("common.cancel")}</Button>
                </DialogClose>
                <Button onClick={onManagerRequestChanges} disabled={mgrReqChangesM.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  {t("common.send")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* HR reply dialog */}
          <Dialog open={hrDialogOpen} onOpenChange={(open) => { setHrDialogOpen(open); if (!open) setHrErrors({}); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("forms.actions.hrReply")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("label.decision")}</Label>
                  <Select value={hrDecision} onValueChange={(v) => { setHrDecision(v as HrWorkflowDecision); setHrErrors({}); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">{t("decision.APPROVED")}</SelectItem>
                      <SelectItem value="REJECTED">{t("decision.REJECTED")}</SelectItem>
                      <SelectItem value="REQUEST_CHANGES">{t("decision.REQUEST_CHANGES")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">{t("forms.hr.replyModeHint")}</div>
                </div>

                {hrDecision === "APPROVED" && (
                  <div className="space-y-2">
                    <Label>{t("label.budgetTotal")}</Label>
                    <Input aria-invalid={!!hrErrors.budget_total} type="number" min={0} value={hrBudget} onChange={(e) => { setHrBudget(e.target.value); setHrErrors((s) => ({ ...s, budget_total: "" })); }} placeholder="0" />
                  <InlineError message={hrErrors.budget_total} />
                    <div className="text-xs text-muted-foreground">{t("forms.hr.approvedHint")}</div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t("label.comment")}</Label>
                  <Textarea aria-invalid={!!hrErrors.comment} value={hrComment} onChange={(e) => { setHrComment(e.target.value); setHrErrors((s) => ({ ...s, comment: "" })); }} placeholder={t("forms.hr.commentPlaceholder")} />
                  <InlineError message={hrErrors.comment} />
                  {hrDecision === "REJECTED" && (
                    <div className="text-xs text-muted-foreground">{t("forms.hr.rejectRequiresComment")}</div>
                  )}
                  {hrDecision === "REQUEST_CHANGES" && (
                    <div className="text-xs text-muted-foreground">{t("forms.hr.requestChangesRequiresComment")}</div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary"><X className="mr-2 h-4 w-4" />{t("common.cancel")}</Button>
                </DialogClose>
                <Button onClick={onHrReply} disabled={hrReplyM.isPending || hrRequestChangesM.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  {t("common.send")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("forms.history.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQ.isLoading ? (
                <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
              ) : historyQ.isError ? (
                <div className="text-sm text-muted-foreground">{t("common.error")}</div>
              ) : (
                <div className="space-y-3">
                  {(historyQ.data ?? []).map((ev) => {
                    const decision = typeof ev.meta?.decision === "string" ? ev.meta.decision : null;
                    const budgetTotal = typeof ev.meta?.budget_total === "number" ? ev.meta.budget_total : null;
                    const actorLabel = [ev.actor_full_name, ev.actor_role].filter(Boolean).join(" · ");
                    const statusNote = historyStatusNote(ev.action, decision);

                    return (
                      <div key={ev.id} className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
                        <div className="flex gap-3">
                          <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full border", historyToneClass(ev.action, decision))} />

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 space-y-1">
                                <div className="text-sm font-semibold leading-6">{historyActionLabel(ev.action)}</div>
                                <div className="text-xs text-muted-foreground">{actorLabel || (lang === "en" ? "System" : "System")}</div>
                              </div>
                              <div className="shrink-0 text-xs text-muted-foreground">{formatDT(ev.created_at)}</div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {ev.item_id ? <Badge variant="outline" className="rounded-full">{lang === "en" ? `Item #${ev.item_id}` : `Pozycja #${ev.item_id}`}</Badge> : null}
                              {decision ? <Badge variant="outline" className={historyDecisionBadgeClass(decision)}>{t(`decision.${decision}`)}</Badge> : null}
                              {budgetTotal !== null ? <Badge variant="outline" className="rounded-full">{formatMoney(budgetTotal)}</Badge> : null}
                            </div>

                            {(ev.from_status || ev.to_status || statusNote) ? (
                              <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {(ev.from_status || ev.to_status) ? (
                                    <>
                                      <span>{lang === "en" ? "Workflow status" : "Status workflow"}</span>
                                      <StatusBadge status={ev.from_status ?? "DRAFT"} />
                                      <span>→</span>
                                      <StatusBadge status={ev.to_status ?? "DRAFT"} />
                                    </>
                                  ) : null}
                                  {statusNote ? (
                                    <>
                                      {(ev.from_status || ev.to_status) ? <span className="mx-1 opacity-40">•</span> : null}
                                      <span>{statusNote}</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            {ev.comment ? (
                              <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm whitespace-pre-wrap">
                                {ev.comment}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
