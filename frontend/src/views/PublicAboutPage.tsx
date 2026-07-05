import { AppFooter } from "@/components/AppFooter";
import { AboutPage } from "@/views/AboutPage";
import { PublicLanguageSwitcher } from "@/components/PublicLanguageSwitcher";

export function PublicAboutPage() {
  return (
    <>
      <PublicLanguageSwitcher />
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_20%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">
        <AboutPage />
      </main>
      <AppFooter />
      </div>
    </>
  );
}
