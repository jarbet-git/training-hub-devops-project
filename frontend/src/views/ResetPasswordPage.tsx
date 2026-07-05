import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { AppFooter } from "@/components/AppFooter";
import { PublicLanguageSwitcher } from "@/components/PublicLanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetPasswordApi, validateResetTokenApi } from "@/features/auth/api";
import { useI18n } from "@/app/i18n";

export function ResetPasswordPage() {
  const { t } = useI18n(); const nav = useNavigate(); const [params] = useSearchParams(); const token = useMemo(() => params.get("token") ?? "", [params]);
  const [validating, setValidating] = useState(true); const [tokenValid, setTokenValid] = useState(false); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; (async () => { if (!token) { setTokenValid(false); setValidating(false); return; } try { const res = await validateResetTokenApi(token); if (active) setTokenValid(Boolean(res.valid)); } catch { if (active) setTokenValid(false); } finally { if (active) setValidating(false); } })(); return () => { active = false; }; }, [token]);
  async function onSubmit(e: FormEvent) { e.preventDefault(); if (saving) return; if (!password || !confirm) { toast.error(t("profile.password.fillAll")); return; } if (password !== confirm) { toast.error(t("profile.password.mismatch")); return; } setSaving(true); try { await resetPasswordApi(token, password); toast.success(t("auth.resetSuccess")); nav("/login", { replace: true }); } catch (e: any) { toast.error(e?.message ?? t("common.error")); } finally { setSaving(false); } }
  return <><PublicLanguageSwitcher /><div className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15),transparent_30%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.08),transparent_35%)]"><div className="flex flex-1 items-center justify-center p-4"><Card className="w-full max-w-md rounded-3xl border-white/10 bg-background/75 shadow-[0_20px_80px_-40px_hsl(var(--foreground)/0.5)] backdrop-blur-xl"><CardHeader className="space-y-4"><BrandLogo size="md" subtitle={t("auth.resetTitle")} /><div><CardTitle className="text-2xl">{t("auth.resetTitle")}</CardTitle><CardDescription className="mt-2 leading-6">{validating ? t("common.loading") : tokenValid ? t("auth.resetSubtitle") : t("auth.resetTokenInvalid")}</CardDescription></div></CardHeader><CardContent>{tokenValid ? <form className="space-y-4" onSubmit={onSubmit}><div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="rounded-2xl pl-10" type="password" placeholder={t("profile.password.new")} value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="relative"><ShieldCheck className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="rounded-2xl pl-10" type="password" placeholder={t("auth.confirmPassword")} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div><Button className="w-full rounded-2xl" type="submit" disabled={saving || validating}>{saving ? t("common.saving") : t("auth.resetButton")}</Button></form> : null}<Link to="/login" className="mt-4 block text-center text-sm text-muted-foreground transition-colors hover:text-foreground">{t("auth.backToLogin")}</Link></CardContent></Card></div><AppFooter /></div></>;
}
