import { useI18n } from "@/app/i18n";
import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  imgClassName?: string;
  caption?: string;
  centered?: boolean;
};

export function BrandWordmark({ className, imgClassName, caption, centered = false }: BrandWordmarkProps) {
  const { t } = useI18n();

  return (
    <div className={cn("space-y-3", centered && "text-center", className)}>
      <img
        src="/logo-text.svg"
        alt={t("app.name")}
        className={cn("h-auto w-full max-w-[320px] object-contain", centered && "mx-auto", imgClassName)}
      />
      {caption ? <div className="text-sm leading-6 text-muted-foreground">{caption}</div> : null}
    </div>
  );
}
