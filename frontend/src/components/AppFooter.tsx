import { Link, useLocation } from "react-router-dom";
import { useI18n } from "@/app/i18n";
import { APP_ABOUT } from "@/content/about";

export function AppFooter() {
  const { t } = useI18n();
  const location = useLocation();
  const isPublicContext = ["/login", "/forgot-password", "/reset-password", "/about-public", "/help-public"].includes(location.pathname);
  const aboutHref = isPublicContext ? "/about-public" : "/about";
  const helpHref = isPublicContext ? "/help-public" : "/help";
  const changelogHref = `${aboutHref}#changelog`;
  return (
    <footer className="border-t border-white/10 bg-background/40 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>{APP_ABOUT.productName}</span>
          <span>•</span>
          <span>{APP_ABOUT.companyName}</span>
          <span>•</span>
          <span>{APP_ABOUT.internalLabel}</span>
          <span>•</span>
          <span>{t("footer.author")}: {APP_ABOUT.authorName}</span>
          <span>•</span>
          <span>v{APP_ABOUT.currentVersion}</span>
        </div>
        <div data-tour="footer-links" className="flex flex-wrap items-center gap-4">
          <Link to={helpHref} className="transition-colors hover:text-foreground">{t("footer.help")}</Link>
          <Link to={aboutHref} className="transition-colors hover:text-foreground">{t("footer.about")}</Link>
          <a href={changelogHref} className="transition-colors hover:text-foreground">{t("footer.changelog")}</a>
        </div>
      </div>
    </footer>
  );
}
