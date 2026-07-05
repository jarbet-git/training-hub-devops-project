// src/views/CreateFormPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/features/auth/context";
import { useI18n } from "@/app/i18n";
import { useCreateForm, useMyAreas } from "@/features/forms/queries";
import { formatAreaLabel } from "@/features/forms/ui";
import { useCollectionWindow } from "@/features/collectionWindow/queries";

export function CreateFormPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useI18n();

  const cwQ = useCollectionWindow();
  const isOpen = cwQ.data?.is_open ?? true;

  const myAreasQ = useMyAreas();
  const areas = myAreasQ.data ?? [];
  const areaOptions = useMemo(() => areas.map((a) => ({ value: String(a.id), label: formatAreaLabel(a, lang) })), [areas, lang]);

  const [areaId, setAreaId] = useState<string>(areaOptions[0]?.value ?? "");
  const [areaError, setAreaError] = useState<string>("");
  const createFormM = useCreateForm();

  const canCreate = !!user && user.is_active && isOpen && areaOptions.length > 0;

  async function onCreate() {
    if (!canCreate) return;
    const id = Number(areaId);
    if (!Number.isFinite(id) || id <= 0) {
      setAreaError(t("forms.pickArea"));
      return;
    }

    try {
      const form = await createFormM.mutateAsync({ area_id: id });
      toast.success(t("forms.created"));
      nav(`/forms/${form.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  if (myAreasQ.isLoading || cwQ.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <div data-tour="create-form-header" className="mb-6">
        <div className="text-2xl font-semibold">{t("forms.new.title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("forms.new.subtitle")}</div>
      </div>

      {!isOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">{t("collectionWindow.closed.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t("collectionWindow.closed.body")}</CardContent>
        </Card>
      )}

      <Card data-tour="create-form-card">
        <CardHeader>
          <CardTitle className="text-base">{t("forms.new.pickArea")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {areaOptions.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("forms.new.noAreas")}</div>
          ) : (
            <div data-tour="create-form-area" className="space-y-2">
              <div className="text-sm font-medium">{t("label.area")}</div>
              <Select value={areaId} onValueChange={(value) => { setAreaId(value); setAreaError(""); }}>
                <SelectTrigger data-tour="create-form-area-trigger" aria-invalid={!!areaError}>
                  <SelectValue placeholder={t("forms.pickArea")} />
                </SelectTrigger>
                <SelectContent>
                  {areaOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {areaError ? <p className="text-xs text-destructive">{areaError}</p> : null}
            </div>
          )}

          <div data-tour="create-form-actions" className="flex gap-2">
            <Button data-tour="create-form-submit" onClick={onCreate} disabled={!canCreate || createFormM.isPending}>
              {t("forms.new.create")}
            </Button>
            <Button variant="secondary" onClick={() => nav(-1)}>
              {t("common.back")}
            </Button>
          </div>

          {!user?.is_active && <div className="text-xs text-destructive">{t("auth.inactive")}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
