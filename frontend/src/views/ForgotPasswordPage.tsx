import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { AppFooter } from "@/components/AppFooter";
import { PublicLanguageSwitcher } from "@/components/PublicLanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forgotPasswordApi } from "@/features/auth/api";
import { useI18n } from "@/app/i18n";

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim()) { toast.error(t("auth.emailPlaceholder")); return; }
    setLoading(true);
    try { await forgotPasswordApi(email.trim()); toast.success(t("auth.requestResetSuccess")); setEmail(""); }
    catch (e: any) { toast.error(e?.message ?? t("common.error")); }
    finally { setLoading(false); }
  }
  return <><PublicLanguageSwitcher /><div className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15),transparent_30%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.08),transparent_35%)]"><div className="flex flex-1 items-center justify-center p-4"><Card className="w-full max-w-md rounded-3xl border-white/10 bg-background/75 shadow-[0_20px_80px_-40px_hsl(var(--foreground)/0.5)] backdrop-blur-xl"><CardHeader className="space-y-4"><BrandLogo size="md" subtitle={t("auth.requestResetTitle")} /><div><CardTitle className="text-2xl">{t("auth.requestResetTitle")}</CardTitle><CardDescription className="mt-2 leading-6">{t("auth.requestResetSubtitle")}</CardDescription></div></CardHeader><CardContent><form className="space-y-4" onSubmit={onSubmit}><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="rounded-2xl pl-10" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} /></div><Button className="w-full rounded-2xl" type="submit" disabled={loading}><Send className="mr-2 h-4 w-4" />{loading ? t("common.sending") : t("auth.requestResetButton")}</Button><Link to="/login" className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground">{t("auth.backToLogin")}</Link></form></CardContent></Card></div><AppFooter /></div></>;
}
