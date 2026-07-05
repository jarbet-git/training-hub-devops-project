import { Globe } from "lucide-react";

// src/components/LanguageToggle.tsx
import { Button } from "@/components/ui/button";
import { useI18n } from "@/app/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const next = lang === "pl" ? "en" : "pl";

  return (
    <Button
      data-tour="language-toggle"
      variant="outline"
      className="rounded-2xl border-border/60 bg-background/72 shadow-sm backdrop-blur transition-colors hover:bg-background/85 dark:border-white/10 dark:bg-background/60"
      onClick={() => setLang(next)}
      title={lang === "pl" ? "Switch to English" : "Przełącz na polski"}
    >
      <Globe className="mr-2 h-4 w-4" />
      {lang.toUpperCase()}
    </Button>
  );
}
