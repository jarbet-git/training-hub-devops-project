import { useI18n } from "@/app/i18n";
import { cn } from "@/lib/utils";

type BrandLogoProps = { size?: "sm" | "md" | "lg"; showText?: boolean; className?: string; subtitle?: string };
const SIZE_MAP = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-20 w-20" } as const;
const TEXT_MAP = { sm: "text-base", md: "text-lg", lg: "text-2xl" } as const;

export function BrandLogo({ size = "md", showText = true, className, subtitle }: BrandLogoProps) {
  const { t } = useI18n();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-primary/20 via-background to-primary/5 shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.7)]", SIZE_MAP[size])}>
        <img src="/logo.svg" alt={t("app.name")} className="h-full w-full object-contain p-2" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.22),transparent_35%)]" />
      </div>
      {showText ? (
        <div className="min-w-0">
          <div className={cn("font-semibold tracking-tight", TEXT_MAP[size])}>{t("app.name")}</div>
          <div className="text-xs text-muted-foreground">{subtitle ?? t("app.tagline")}</div>
        </div>
      ) : null}
    </div>
  );
}
