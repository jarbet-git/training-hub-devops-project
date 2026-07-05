import { useEffect, useState } from "react";
import { BellRing, Camera, KeyRound, Languages, Save, Trash2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/context";
import { useI18n, type Language } from "@/app/i18n";
import { useTheme } from "@/app/theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useChangeMyPassword, useDeleteMyAvatar, useUpdateMyPreferences, useUploadMyAvatar } from "@/features/profile/queries";
import type { UserTheme } from "@/features/auth/types";

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

export function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const { t, setLang } = useI18n();
  const { setTheme } = useTheme();
  const updatePrefsM = useUpdateMyPreferences();
  const changePasswordM = useChangeMyPassword();
  const uploadAvatarM = useUploadMyAvatar();
  const deleteAvatarM = useDeleteMyAvatar();

  const [preferredLanguage, setPreferredLanguage] = useState<Language>(user?.preferred_language ?? "pl");
  const [preferredTheme, setPreferredTheme] = useState<UserTheme>(user?.preferred_theme ?? "system");
  const [emailNotificationsHrResponse, setEmailNotificationsHrResponse] = useState<boolean>(user?.email_notifications_hr_response ?? true);
  const [emailNotificationsProposalReview, setEmailNotificationsProposalReview] = useState<boolean>(user?.email_notifications_proposal_review ?? true);
  const [emailNotificationsWeeklyMandatoryDigest, setEmailNotificationsWeeklyMandatoryDigest] = useState<boolean>(user?.email_notifications_weekly_mandatory_digest ?? true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setPreferredLanguage(user?.preferred_language ?? "pl");
    setPreferredTheme(user?.preferred_theme ?? "system");
    setEmailNotificationsHrResponse(user?.email_notifications_hr_response ?? true);
    setEmailNotificationsProposalReview(user?.email_notifications_proposal_review ?? true);
    setEmailNotificationsWeeklyMandatoryDigest(user?.email_notifications_weekly_mandatory_digest ?? true);
  }, [
    user?.preferred_language,
    user?.preferred_theme,
    user?.email_notifications_hr_response,
    user?.email_notifications_proposal_review,
    user?.email_notifications_weekly_mandatory_digest,
  ]);

  const avatarUrl = user?.avatar_url ?? null;

  async function saveAllPreferences() {
    await updatePrefsM.mutateAsync({
      preferred_language: preferredLanguage,
      preferred_theme: preferredTheme,
      email_notifications_hr_response: emailNotificationsHrResponse,
      email_notifications_proposal_review: emailNotificationsProposalReview,
      email_notifications_weekly_mandatory_digest: emailNotificationsWeeklyMandatoryDigest,
    });
    setLang(preferredLanguage);
    setTheme(preferredTheme);
    await refreshMe();
  }

  async function onSavePreferences() {
    try {
      await saveAllPreferences();
      toast.success(t("profile.preferences.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onSaveNotifications() {
    try {
      await saveAllPreferences();
      toast.success(t("profile.preferences.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t("profile.password.fillAll"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.password.mismatch"));
      return;
    }
    try {
      await changePasswordM.mutateAsync({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("profile.password.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onAvatarChange(file?: File | null) {
    if (!file) return;
    try {
      await uploadAvatarM.mutateAsync(file);
      await refreshMe();
      toast.success(t("profile.avatar.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function onDeleteAvatar() {
    try {
      await deleteAvatarM.mutateAsync();
      await refreshMe();
      toast.success(t("profile.avatar.deleted"));
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="h-4 w-4 opacity-70" />
              {t("profile.title")}
            </CardTitle>
            <CardDescription>{t("profile.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/20 p-5 text-center">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={user?.full_name ?? "avatar"} /> : null}
                <AvatarFallback className="text-xl">{initials(user?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{user?.full_name}</div>
                <div className="text-sm text-muted-foreground">{user?.email}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{user?.role}</div>
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="avatar-file">{t("profile.avatar.label")}</Label>
              <Input id="avatar-file" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="rounded-xl" asChild>
                  <label htmlFor="avatar-file" className="cursor-pointer">
                    <Camera className="mr-2 h-4 w-4" />
                    {t("profile.avatar.upload")}
                  </label>
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl" onClick={onDeleteAvatar} disabled={!avatarUrl || deleteAvatarM.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("profile.avatar.remove")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Languages className="h-4 w-4 opacity-70" />
                {t("profile.preferences.title")}
              </CardTitle>
              <CardDescription>{t("profile.preferences.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("profile.preferences.language")}</Label>
                <Select value={preferredLanguage} onValueChange={(v) => setPreferredLanguage(v as Language)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pl">Polski</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("profile.preferences.theme")}</Label>
                <Select value={preferredTheme} onValueChange={(v) => setPreferredTheme(v as UserTheme)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("theme.light")}</SelectItem>
                    <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                    <SelectItem value="system">{t("theme.system")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button className="rounded-xl" onClick={onSavePreferences} disabled={updatePrefsM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updatePrefsM.isPending ? t("common.saving") : t("profile.preferences.save")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="h-4 w-4 opacity-70" />
                {t("profile.notifications.title")}
              </CardTitle>
              <CardDescription>{t("profile.notifications.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t("profile.notifications.hrResponse")}</Label>
                  </div>
                  <Switch checked={emailNotificationsHrResponse} onCheckedChange={setEmailNotificationsHrResponse} />
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t("profile.notifications.proposalReview")}</Label>
                  </div>
                  <Switch checked={emailNotificationsProposalReview} onCheckedChange={setEmailNotificationsProposalReview} />
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t("profile.notifications.weeklyMandatoryDigest")}</Label>
                    <p className="text-sm text-muted-foreground">{t("profile.notifications.weeklyHint")}</p>
                  </div>
                  <Switch checked={emailNotificationsWeeklyMandatoryDigest} onCheckedChange={setEmailNotificationsWeeklyMandatoryDigest} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="rounded-xl" onClick={onSaveNotifications} disabled={updatePrefsM.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updatePrefsM.isPending ? t("common.saving") : t("profile.notifications.save")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 opacity-70" />
                {t("profile.password.title")}
              </CardTitle>
              <CardDescription>{t("profile.password.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label>{t("profile.password.current")}</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("profile.password.new")}</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("profile.password.confirm")}</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button className="rounded-xl" onClick={onChangePassword} disabled={changePasswordM.isPending}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {changePasswordM.isPending ? t("common.saving") : t("profile.password.button")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
