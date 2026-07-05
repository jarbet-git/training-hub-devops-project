import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/app/i18n";

export function NotFoundPage() {
  const nav = useNavigate();
  const { lang, t } = useI18n();

  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30 p-4">
      <div className="rounded-2xl border bg-background/80 px-6 py-5 shadow-sm backdrop-blur">
        <div className="text-sm font-semibold">404</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {lang === "en" ? "Page not found." : "Nie znaleziono strony."}
        </div>
        <Button className="mt-3 rounded-xl" onClick={() => nav("/")}>
          {lang === "en" ? `Back to ${t("nav.dashboard").toLowerCase()}` : "Wróć do dashboardu"}
        </Button>
      </div>
    </div>
  );
}
