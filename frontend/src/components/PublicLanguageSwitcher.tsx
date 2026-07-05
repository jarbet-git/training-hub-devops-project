import { LanguageToggle } from "@/components/LanguageToggle";

export function PublicLanguageSwitcher() {
  return (
    <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
      <LanguageToggle />
    </div>
  );
}
