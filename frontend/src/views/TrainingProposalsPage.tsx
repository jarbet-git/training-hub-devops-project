import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CircleDot, ClipboardList, Link2, Search, SendHorizontal, Sparkles, X, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableOpenCell, TableOpenHeaderCell } from "@/components/table-open-cell";
import { useI18n } from "@/app/i18n";
import { useAuth } from "@/features/auth/context";
import { formatDictName, formatDT, formatMoney } from "@/features/forms/ui";
import { useTrainingCategories } from "@/features/forms/queries";
import { searchTrainingNames } from "@/features/forms/api";
import { markReviewedTrainingProposalNotificationsSeen } from "@/features/trainingProposals/api";
import {
  trainingProposalKeys,
  useApproveTrainingProposal,
  useCreateTrainingProposal,
  useHrTrainingProposals,
  useLinkTrainingProposal,
  useMyTrainingProposals,
  useRejectTrainingProposal,
} from "@/features/trainingProposals/queries";
import type { TrainingProposal } from "@/features/trainingProposals/types";
import { notificationKeys } from "@/features/notifications/queries";

type ReviewFieldErrors = Partial<Record<"category_id" | "name_pl" | "training_name_id" | "review_comment", string>>;
type CreateFieldErrors = Partial<Record<"name" | "justification", string>>;

function statusColor(status: string) {
  switch (status) {
    case "SUBMITTED": return "secondary" as const;
    case "APPROVED": return "default" as const;
    case "LINKED": return "outline" as const;
    case "REJECTED": return "destructive" as const;
    default: return "secondary" as const;
  }
}

function formatProposalTrainingName(
  row: Pick<TrainingProposal, "linked_training_name_pl" | "linked_training_name_en" | "approved_training_name_pl" | "approved_training_name_en">,
  kind: "linked" | "approved",
  lang: "pl" | "en",
) {
  const pl = kind === "linked" ? row.linked_training_name_pl : row.approved_training_name_pl;
  const en = kind === "linked" ? row.linked_training_name_en : row.approved_training_name_en;
  return (lang === "en" ? (en || pl) : (pl || en)) || pl || en || null;
}

export function TrainingProposalsPage() {
  const { t, lang } = useI18n();
  const { roleFlags } = useAuth();
  const isHr = roleFlags.isHr;
  const canCreateProposal = roleFlags.isEditor || roleFlags.isManager || roleFlags.isAdmin;
  const qc = useQueryClient();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const focusId = Number(sp.get("focus") || 0) || null;

  const [hrTab, setHrTab] = useState<"pending" | "reviewed">("pending");
  const [userTab, setUserTab] = useState<"all" | "submitted" | "reviewed">("all");
  const [selected, setSelected] = useState<TrainingProposal | null>(null);
  const [reviewMode, setReviewMode] = useState<"approve" | "link" | "reject">("approve");

  const catsQ = useTrainingCategories();
  const cats = catsQ.data ?? [];
  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const myQ = useMyTrainingProposals(undefined, !isHr);
  const hrQ = useHrTrainingProposals(undefined, isHr);

  const rows = useMemo(() => {
    const source = (isHr ? hrQ.data : myQ.data) ?? [];
    if (isHr) {
      return source.filter((x) => hrTab === "pending" ? x.status === "SUBMITTED" : x.status !== "SUBMITTED");
    }
    return source.filter((x) => {
      if (userTab === "submitted") return x.status === "SUBMITTED";
      if (userTab === "reviewed") return x.status !== "SUBMITTED";
      return true;
    });
  }, [isHr, hrQ.data, myQ.data, hrTab, userTab]);

  useEffect(() => {
    if (!focusId || !rows.length) return;
    const hit = rows.find((x) => x.id === focusId) ?? ((isHr ? hrQ.data : myQ.data) ?? []).find((x) => x.id === focusId);
    if (hit) setSelected(hit);
  }, [focusId, rows, isHr, hrQ.data, myQ.data]);

  const createProposalM = useCreateTrainingProposal();
  const approveM = useApproveTrainingProposal();
  const linkM = useLinkTrainingProposal();
  const rejectM = useRejectTrainingProposal();

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    name: "",
    justification: "",
    suggested_category_id: 0,
    provider: "",
    external_url: "",
    estimated_cost_per_person: "0",
    estimated_hours_per_person: "0",
    notes: "",
  });
  const [createErrors, setCreateErrors] = useState<CreateFieldErrors>({});

  const [approveDraft, setApproveDraft] = useState({
    category_id: 0,
    name_pl: "",
    name_en: "",
    default_cost_per_person: "0",
    default_hours_per_person: "0",
    review_comment: "",
  });
  const [linkDraft, setLinkDraft] = useState({ training_name_id: 0, review_comment: "" });
  const [rejectDraft, setRejectDraft] = useState({ review_comment: "" });
  const [approveErrors, setApproveErrors] = useState<ReviewFieldErrors>({});
  const [linkErrors, setLinkErrors] = useState<ReviewFieldErrors>({});
  const [rejectErrors, setRejectErrors] = useState<ReviewFieldErrors>({});
  const [trainingSearch, setTrainingSearch] = useState("");

  const trainingSearchQ = useQuery({
    queryKey: ["dict", "training-name-proposal-search", trainingSearch],
    queryFn: () => searchTrainingNames({ q: trainingSearch, categoryId: null, limit: 20 }),
    enabled: reviewMode === "link" && trainingSearch.trim().length >= 2 && !!selected,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (isHr) return;
    let active = true;
    (async () => {
      try {
        const res = await markReviewedTrainingProposalNotificationsSeen();
        if (active && (res?.updated ?? 0) > 0) {
          await qc.invalidateQueries({ queryKey: notificationKeys.summary() });
        }
      } catch {
        // ignore mark-as-seen failures
      }
    })();
    return () => {
      active = false;
    };
  }, [isHr, qc]);

  useEffect(() => {
    if (!selected) return;
    setApproveDraft({
      category_id: selected.suggested_category_id ?? 0,
      name_pl: selected.name ?? "",
      name_en: selected.name_en ?? "",
      default_cost_per_person: String(selected.estimated_cost_per_person ?? 0),
      default_hours_per_person: String(selected.estimated_hours_per_person ?? 0),
      review_comment: "",
    });
    setLinkDraft({ training_name_id: 0, review_comment: "" });
    setRejectDraft({ review_comment: "" });
    setApproveErrors({});
    setLinkErrors({});
    setRejectErrors({});
    setTrainingSearch("");
    setReviewMode("approve");
  }, [selected]);

  function openCreateProposalDialog() {
    setCreateErrors({});
    setCreateDraft({
      name: "",
      justification: "",
      suggested_category_id: 0,
      provider: "",
      external_url: "",
      estimated_cost_per_person: "0",
      estimated_hours_per_person: "0",
      notes: "",
    });
    setCreateOpen(true);
  }

  async function refreshAfterReview() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: trainingProposalKeys.all() }),
      qc.invalidateQueries({ queryKey: notificationKeys.summary() }),
    ]);
  }

  async function onCreateTrainingProposal() {
    const nextErrors: CreateFieldErrors = {};
    if (!createDraft.name.trim()) nextErrors.name = t("validation.trainingNameRequired");
    if (!createDraft.justification.trim()) nextErrors.justification = t("trainingProposals.validation.justificationRequired");
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await createProposalM.mutateAsync({
        name: createDraft.name.trim(),
        justification: createDraft.justification.trim(),
        suggested_category_id: createDraft.suggested_category_id || null,
        provider: createDraft.provider.trim() || null,
        external_url: createDraft.external_url.trim() || null,
        estimated_cost_per_person: createDraft.estimated_cost_per_person.trim() ? Number(createDraft.estimated_cost_per_person) : null,
        estimated_hours_per_person: createDraft.estimated_hours_per_person.trim() ? Number(createDraft.estimated_hours_per_person) : null,
        notes: createDraft.notes.trim() || null,
        form_id: null,
      });
      toast.success(t("trainingProposals.toast.created"));
      setCreateOpen(false);
      setUserTab("submitted");
      await refreshAfterReview();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onApprove() {
    if (!selected) return;

    const nextErrors: ReviewFieldErrors = {};
    if (!approveDraft.category_id) nextErrors.category_id = t("validation.categoryRequired");
    if (!approveDraft.name_pl.trim()) nextErrors.name_pl = t("validation.trainingNameRequired");
    setApproveErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await approveM.mutateAsync({
        id: selected.id,
        payload: {
          category_id: approveDraft.category_id,
          name_pl: approveDraft.name_pl.trim(),
          name_en: approveDraft.name_en.trim() || null,
          default_cost_per_person: Number(approveDraft.default_cost_per_person || 0),
          default_hours_per_person: Number(approveDraft.default_hours_per_person || 0),
          review_comment: approveDraft.review_comment.trim() || null,
        },
      });
      toast.success(t("trainingProposals.toast.approved"));
      setSelected(null);
      setSp((prev) => {
        prev.delete("focus");
        return prev;
      });
      await refreshAfterReview();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onLink() {
    if (!selected) return;

    const nextErrors: ReviewFieldErrors = {};
    if (!linkDraft.training_name_id) nextErrors.training_name_id = t("validation.trainingNameRequired");
    setLinkErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await linkM.mutateAsync({
        id: selected.id,
        payload: { training_name_id: linkDraft.training_name_id, review_comment: linkDraft.review_comment.trim() || null },
      });
      toast.success(t("trainingProposals.toast.linked"));
      setSelected(null);
      setSp((prev) => {
        prev.delete("focus");
        return prev;
      });
      await refreshAfterReview();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onReject() {
    if (!selected) return;

    const nextErrors: ReviewFieldErrors = {};
    if (!rejectDraft.review_comment.trim()) nextErrors.review_comment = t("validation.commentRequired");
    setRejectErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await rejectM.mutateAsync({ id: selected.id, payload: { review_comment: rejectDraft.review_comment.trim() } });
      toast.success(t("trainingProposals.toast.rejected"));
      setSelected(null);
      setSp((prev) => {
        prev.delete("focus");
        return prev;
      });
      await refreshAfterReview();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  function openRow(x: TrainingProposal) {
    setSelected(x);
    setSp((prev) => {
      prev.set("focus", String(x.id));
      return prev;
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-3 sm:p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-2xl font-semibold tracking-tight">{t("trainingProposals.title")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("trainingProposals.subtitle")}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => nav(-1)} className="rounded-2xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
        </div>
      </div>

      <Card className="mb-6 overflow-hidden rounded-[26px] border-white/10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] shadow-[0_24px_80px_-56px_hsl(var(--primary)/0.9)]">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              {lang === "en" ? "What next" : "Co dalej"}
            </div>
            <div className="text-lg font-semibold leading-tight">
              {isHr
                ? (lang === "en" ? "Review the details first, then choose the HR action" : "Najpierw przejrzyj szczegóły, a potem wybierz akcję HR")
                : (lang === "en" ? "Complete the proposal, then send it to HR" : "Uzupełnij propozycję, a potem wyślij ją do HR")}
            </div>
            <div className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {isHr
                ? (lang === "en"
                    ? "Open a submitted proposal, read the justification and then choose one of the review actions: approve it, link it to an existing training or return it with a comment."
                    : "Otwórz zgłoszoną propozycję, przeczytaj uzasadnienie, a następnie wybierz jedną z akcji: zaakceptuj ją, powiąż z istniejącym szkoleniem albo odeślij z komentarzem.")
                : (lang === "en"
                    ? "You can still update the details before sending. Submit the proposal only when the name, justification and key parameters are complete."
                    : "Możesz jeszcze dopracować szczegóły przed wysłaniem. Wyślij propozycję dopiero wtedy, gdy nazwa, uzasadnienie i najważniejsze parametry będą kompletne.")}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-background/45 px-2.5 py-1">{isHr ? (lang === "en" ? "Step 1: review details" : "Krok 1: przejrzyj szczegóły") : (lang === "en" ? "Step 1: complete the proposal" : "Krok 1: uzupełnij propozycję")}</span>
              <span className="rounded-full border border-white/10 bg-background/45 px-2.5 py-1">{isHr ? (lang === "en" ? "Step 2: decide" : "Krok 2: podejmij decyzję") : (lang === "en" ? "Step 2: send to HR" : "Krok 2: wyślij do HR")}</span>
            </div>
          </div>
          {canCreateProposal ? (
            <Button onClick={openCreateProposalDialog} size="sm" className="rounded-full px-4 lg:self-start">
              <Sparkles className="mr-2 h-4 w-4" />
              {t("trainingProposals.createButton")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-[26px] border-border/60 bg-card/80 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10">
        <CardHeader className="gap-2">
          <CardTitle className="text-base">{isHr ? t("trainingProposals.hrQueue") : t("trainingProposals.myTitle")}</CardTitle>
          {!isHr && canCreateProposal ? (
            <p className="text-sm text-muted-foreground">{t("trainingProposals.createDesc")}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          {isHr ? (
            <Tabs value={hrTab} onValueChange={(v) => setHrTab(v as "pending" | "reviewed") }>
              <TabsList className="flex w-full flex-wrap justify-start gap-2 md:w-auto">
                <TabsTrigger value="pending" className="gap-2"><ClipboardList className="h-4 w-4" />{t("trainingProposals.tabs.pending")}</TabsTrigger>
                <TabsTrigger value="reviewed" className="gap-2"><CheckCircle2 className="h-4 w-4" />{t("trainingProposals.tabs.reviewed")}</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4">
                <ProposalTable rows={rows} onOpen={openRow} catMap={catMap} lang={lang} t={t} showRequester />
              </TabsContent>
              <TabsContent value="reviewed" className="mt-4">
                <ProposalTable rows={rows} onOpen={openRow} catMap={catMap} lang={lang} t={t} showRequester />
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs value={userTab} onValueChange={(v) => setUserTab(v as "all" | "submitted" | "reviewed") }>
              <TabsList className="flex w-full flex-wrap justify-start gap-2 md:w-auto">
                <TabsTrigger value="all" className="gap-2"><CircleDot className="h-4 w-4" />{t("common.all")}</TabsTrigger>
                <TabsTrigger value="submitted" className="gap-2"><ClipboardList className="h-4 w-4" />{t("trainingProposals.tabs.pending")}</TabsTrigger>
                <TabsTrigger value="reviewed" className="gap-2"><CheckCircle2 className="h-4 w-4" />{t("trainingProposals.tabs.reviewed")}</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <ProposalTable rows={rows} onOpen={openRow} catMap={catMap} lang={lang} t={t} />
              </TabsContent>
              <TabsContent value="submitted" className="mt-4">
                <ProposalTable rows={rows} onOpen={openRow} catMap={catMap} lang={lang} t={t} />
              </TabsContent>
              <TabsContent value="reviewed" className="mt-4">
                <ProposalTable rows={rows} onOpen={openRow} catMap={catMap} lang={lang} t={t} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateErrors({});
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("trainingProposals.createTitle")}</DialogTitle>
            <DialogDescription>{t("trainingProposals.createDesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("label.training")} className="md:col-span-2" error={createErrors.name}>
              <Input
                aria-invalid={!!createErrors.name}
                value={createDraft.name}
                onChange={(e) => {
                  setCreateDraft((s) => ({ ...s, name: e.target.value }));
                  setCreateErrors((s) => ({ ...s, name: undefined }));
                }}
              />
            </Field>
            <Field label={t("label.category")}>
              <Select
                value={createDraft.suggested_category_id ? String(createDraft.suggested_category_id) : "none"}
                onValueChange={(v) => setCreateDraft((s) => ({ ...s, suggested_category_id: v === "none" ? 0 : Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {formatDictName(c as any, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("trainingProposals.provider")}>
              <Input value={createDraft.provider} onChange={(e) => setCreateDraft((s) => ({ ...s, provider: e.target.value }))} />
            </Field>
            <Field label={t("trainingProposals.justification")} className="md:col-span-2" error={createErrors.justification}>
              <Textarea
                aria-invalid={!!createErrors.justification}
                value={createDraft.justification}
                onChange={(e) => {
                  setCreateDraft((s) => ({ ...s, justification: e.target.value }));
                  setCreateErrors((s) => ({ ...s, justification: undefined }));
                }}
              />
            </Field>
            <Field label={t("trainingProposals.url")} className="md:col-span-2">
              <Input value={createDraft.external_url} onChange={(e) => setCreateDraft((s) => ({ ...s, external_url: e.target.value }))} />
            </Field>
            <Field label={t("label.defaultCost")}>
              <Input
                type="number"
                min={0}
                value={createDraft.estimated_cost_per_person}
                onChange={(e) => setCreateDraft((s) => ({ ...s, estimated_cost_per_person: e.target.value }))}
              />
            </Field>
            <Field label={t("label.defaultHours")}>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={createDraft.estimated_hours_per_person}
                onChange={(e) => setCreateDraft((s) => ({ ...s, estimated_hours_per_person: e.target.value }))}
              />
            </Field>
            <Field label={t("label.notes")} className="md:col-span-2">
              <Textarea value={createDraft.notes} onChange={(e) => setCreateDraft((s) => ({ ...s, notes: e.target.value }))} />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              {t("common.cancel")}
            </Button>
            <Button onClick={onCreateTrainingProposal} disabled={createProposalM.isPending}>
              <SendHorizontal className="mr-2 h-4 w-4" />
              {createProposalM.isPending ? t("common.saving") : t("trainingProposals.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setSp((prev) => {
              prev.delete("focus");
              return prev;
            });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{t("trainingProposals.detailsDesc")}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Info label={t("label.status")} value={<Badge variant={statusColor(String(selected.status))}>{t(`trainingProposals.status.${selected.status}`)}</Badge>} />
                  <Info label={t("trainingProposals.requester")} value={selected.requester_full_name || `#${selected.requester_user_id}`} />
                  <Info label={t("label.category")} value={selected.suggested_category_id ? formatDictName(catMap.get(selected.suggested_category_id) as any, lang) : t("common.none")} />
                  <Info label={t("label.date")} value={formatDT(selected.created_at)} />
                </div>

                <Info label={t("trainingProposals.justification")} value={selected.justification} multiline />
                {selected.provider ? <Info label={t("trainingProposals.provider")} value={selected.provider} /> : null}
                {selected.external_url ? <Info label={t("trainingProposals.url")} value={selected.external_url} multiline /> : null}
                {(selected.estimated_cost_per_person != null || selected.estimated_hours_per_person != null) ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Info label={t("label.defaultCost")} value={selected.estimated_cost_per_person != null ? formatMoney(selected.estimated_cost_per_person) : "—"} />
                    <Info label={t("label.defaultHours")} value={selected.estimated_hours_per_person != null ? `${selected.estimated_hours_per_person.toFixed(1)} h` : "—"} />
                  </div>
                ) : null}
                {selected.notes ? <Info label={t("label.notes")} value={selected.notes} multiline /> : null}
                {selected.review_comment ? <Info label={t("label.comment")} value={selected.review_comment} multiline /> : null}
                {selected.status === "APPROVED" && formatProposalTrainingName(selected, "approved", lang) ? (
                  <Info label={t("trainingProposals.approvedTraining")} value={formatProposalTrainingName(selected, "approved", lang) as string} />
                ) : null}
                {selected.status === "LINKED" && formatProposalTrainingName(selected, "linked", lang) ? (
                  <Info label={t("trainingProposals.linkedTraining")} value={formatProposalTrainingName(selected, "linked", lang) as string} />
                ) : null}
              </div>

              {isHr && selected.status === "SUBMITTED" ? (
                <>
                  <div className="mb-4 rounded-2xl border border-white/10 bg-muted/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                      {lang === "en" ? "What next" : "Co dalej"}
                    </div>
                    <div className="mt-2 text-sm font-medium">
                      {lang === "en" ? "Review the details and then choose a review action below." : "Najpierw przejrzyj szczegóły, a potem wybierz akcję przeglądu poniżej."}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {lang === "en"
                        ? "Approve the proposal, link it to an existing training or reject it with a comment when the requester should correct it."
                        : "Zaakceptuj propozycję, powiąż ją z istniejącym szkoleniem albo odrzuć z komentarzem, gdy zgłaszający powinien wprowadzić poprawki."}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 rounded-xl border p-4">
                  <div className="text-sm font-medium">{t("trainingProposals.reviewTitle")}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={reviewMode === "approve" ? "default" : "outline"} onClick={() => { setReviewMode("approve"); setApproveErrors({}); }}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t("trainingProposals.actionApprove")}
                    </Button>
                    <Button type="button" variant={reviewMode === "link" ? "default" : "outline"} onClick={() => { setReviewMode("link"); setLinkErrors({}); }}>
                      <Link2 className="mr-2 h-4 w-4" />
                      {t("trainingProposals.actionLink")}
                    </Button>
                    <Button type="button" variant={reviewMode === "reject" ? "destructive" : "outline"} onClick={() => { setReviewMode("reject"); setRejectErrors({}); }}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("trainingProposals.actionReject")}
                    </Button>
                  </div>

                  {reviewMode === "approve" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label={t("label.category")} error={approveErrors.category_id}>
                          <Select
                            value={approveDraft.category_id ? String(approveDraft.category_id) : ""}
                            onValueChange={(v) => {
                              setApproveDraft((s) => ({ ...s, category_id: Number(v) }));
                              setApproveErrors((s) => ({ ...s, category_id: undefined }));
                            }}
                          >
                            <SelectTrigger aria-invalid={!!approveErrors.category_id}>
                              <SelectValue placeholder={t("forms.pickCategory")} />
                            </SelectTrigger>
                            <SelectContent>
                              {cats.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {formatDictName(c as any, lang)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label={t("label.nameEn")}>
                          <Input value={approveDraft.name_en} onChange={(e) => setApproveDraft((s) => ({ ...s, name_en: e.target.value }))} />
                        </Field>
                        <Field label={t("label.training")} className="md:col-span-2" error={approveErrors.name_pl}>
                          <Input
                            aria-invalid={!!approveErrors.name_pl}
                            value={approveDraft.name_pl}
                            onChange={(e) => {
                              setApproveDraft((s) => ({ ...s, name_pl: e.target.value }));
                              setApproveErrors((s) => ({ ...s, name_pl: undefined }));
                            }}
                          />
                        </Field>
                        <Field label={t("label.defaultCost")}>
                          <Input type="number" min={0} value={approveDraft.default_cost_per_person} onChange={(e) => setApproveDraft((s) => ({ ...s, default_cost_per_person: e.target.value }))} />
                        </Field>
                        <Field label={t("label.defaultHours")}>
                          <Input type="number" min={0} step={0.5} value={approveDraft.default_hours_per_person} onChange={(e) => setApproveDraft((s) => ({ ...s, default_hours_per_person: e.target.value }))} />
                        </Field>
                      </div>
                      <Field label={t("label.comment")}>
                        <Textarea value={approveDraft.review_comment} onChange={(e) => setApproveDraft((s) => ({ ...s, review_comment: e.target.value }))} />
                      </Field>
                      <DialogFooter>
                        <Button onClick={onApprove} disabled={approveM.isPending}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {approveM.isPending ? t("common.saving") : t("trainingProposals.actionApprove")}
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : null}

                  {reviewMode === "link" ? (
                    <div className="grid gap-4">
                      <Field label={t("trainingProposals.searchExisting")} error={linkErrors.training_name_id}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input className="pl-9" value={trainingSearch} onChange={(e) => setTrainingSearch(e.target.value)} placeholder={t("forms.searchTraining")} />
                        </div>
                      </Field>
                      <div className={`max-h-52 overflow-auto rounded-xl border ${linkErrors.training_name_id ? "border-destructive" : ""}`}>
                        {trainingSearch.trim().length < 2 ? <div className="px-3 py-3 text-sm text-muted-foreground">{t("forms.searchTrainingMinChars")}</div> : null}
                        {trainingSearch.trim().length >= 2 && (trainingSearchQ.data ?? []).map((tn) => (
                          <button
                            key={tn.id}
                            type="button"
                            className={`flex w-full items-start justify-between gap-3 border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted/40 ${linkDraft.training_name_id === tn.id ? "bg-muted/50" : ""}`}
                            onClick={() => {
                              setLinkDraft((s) => ({ ...s, training_name_id: tn.id }));
                              setLinkErrors((s) => ({ ...s, training_name_id: undefined }));
                            }}
                          >
                            <div>
                              <div className="font-medium">{formatDictName(tn as any, lang)}</div>
                              <div className="text-xs text-muted-foreground">{formatMoney(tn.default_cost_per_person)} · {tn.default_hours_per_person == null ? "—" : tn.default_hours_per_person.toFixed(1)}h</div>
                            </div>
                            {linkDraft.training_name_id === tn.id ? <Badge>{t("common.yes")}</Badge> : null}
                          </button>
                        ))}
                      </div>
                      <Field label={t("label.comment")}>
                        <Textarea value={linkDraft.review_comment} onChange={(e) => setLinkDraft((s) => ({ ...s, review_comment: e.target.value }))} placeholder={t("trainingProposals.linkCommentHint")} />
                      </Field>
                      <DialogFooter>
                        <Button onClick={onLink} disabled={linkM.isPending}>
                          <Link2 className="mr-2 h-4 w-4" />
                          {linkM.isPending ? t("common.saving") : t("trainingProposals.actionLink")}
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : null}

                  {reviewMode === "reject" ? (
                    <div className="grid gap-4">
                      <Field label={t("label.comment")} error={rejectErrors.review_comment}>
                        <Textarea
                          aria-invalid={!!rejectErrors.review_comment}
                          value={rejectDraft.review_comment}
                          onChange={(e) => {
                            setRejectDraft({ review_comment: e.target.value });
                            setRejectErrors((s) => ({ ...s, review_comment: undefined }));
                          }}
                          placeholder={t("trainingProposals.rejectHint")}
                        />
                      </Field>
                      <DialogFooter>
                        <Button variant="destructive" onClick={onReject} disabled={rejectM.isPending}>
                          <XCircle className="mr-2 h-4 w-4" />
                          {rejectM.isPending ? t("common.saving") : t("trainingProposals.actionReject")}
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : null}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, multiline = false }: { label: string; value: ReactNode; multiline?: boolean }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={multiline ? "whitespace-pre-wrap break-words text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}

function Field({ label, children, className, error }: { label: string; children: ReactNode; className?: string; error?: string }) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ProposalTable({
  rows,
  onOpen,
  catMap,
  lang,
  t,
  showRequester = false,
}: {
  rows: TrainingProposal[];
  onOpen: (x: TrainingProposal) => void;
  catMap: Map<number, any>;
  lang: "pl" | "en";
  t: (k: string, vars?: Record<string, string>) => string;
  showRequester?: boolean;
}) {
  if (!rows.length) {
    return <div className="rounded-xl border p-6 text-sm text-muted-foreground">{t("common.noResults")}</div>;
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.map((x) => (
          <Card key={x.id} className="rounded-3xl border-border/60 bg-card/80 shadow-none dark:border-white/10">
            <CardContent className="grid gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium leading-6 break-words">{x.name}</div>
                  <div className="mt-1 line-clamp-3 text-sm text-muted-foreground">{x.justification}</div>
                </div>
                <Badge variant={statusColor(String(x.status))} className="shrink-0">
                  {t(`trainingProposals.status.${x.status}`)}
                </Badge>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/55 p-3 dark:border-white/10">
                <Info label={t("label.category")} value={x.suggested_category_id ? formatDictName(catMap.get(x.suggested_category_id) as any, lang) : t("common.none")} />
                {showRequester ? <Info label={t("trainingProposals.requester")} value={x.requester_full_name || `#${x.requester_user_id}`} /> : null}
                <Info label={t("label.date")} value={formatDT(x.reviewed_at || x.created_at)} />
              </div>

              <Button variant="outline" className="w-full" onClick={() => onOpen(x)}>
                <Search className="mr-2 h-4 w-4" />
                {t("common.open")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border bg-background md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-3 py-2 text-left">{t("label.training")}</th>
              <th className="px-3 py-2 text-left">{t("label.category")}</th>
              {showRequester ? <th className="px-3 py-2 text-left">{t("trainingProposals.requester")}</th> : null}
              <th className="px-3 py-2 text-left">{t("label.status")}</th>
              <th className="px-3 py-2 text-left">{t("label.date")}</th>
              <TableOpenHeaderCell label={t("common.open")} />
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id} className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40" onClick={() => onOpen(x)}>
                <td className="px-3 py-3 align-top">
                  <div className="font-medium">{x.name}</div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">{x.justification}</div>
                </td>
                <td className="px-3 py-3 align-top">{x.suggested_category_id ? formatDictName(catMap.get(x.suggested_category_id) as any, lang) : <span className="text-muted-foreground">{t("common.none")}</span>}</td>
                {showRequester ? <td className="px-3 py-3 align-top">{x.requester_full_name || `#${x.requester_user_id}`}</td> : null}
                <td className="px-3 py-3 align-top"><Badge variant={statusColor(String(x.status))}>{t(`trainingProposals.status.${x.status}`)}</Badge></td>
                <td className="px-3 py-3 align-top whitespace-nowrap">{formatDT(x.reviewed_at || x.created_at)}</td>
                <TableOpenCell label={t("common.open")} onOpen={() => onOpen(x)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
