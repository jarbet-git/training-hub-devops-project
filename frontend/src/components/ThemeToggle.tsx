import { Laptop, Moon, Sun } from "lucide-react";

import { useTheme } from "@/app/theme";
import { useI18n } from "@/app/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const { t } = useI18n();

  const icon = resolved === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button data-tour="theme-toggle" variant="outline" size="icon" className="rounded-2xl border-border/60 bg-background/70 shadow-sm backdrop-blur">
          {icon}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44 rounded-2xl border-border/60 bg-popover/95 backdrop-blur-xl">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          {t("theme.light")} {theme === "light" ? "✓" : ""}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          {t("theme.dark")} {theme === "dark" ? "✓" : ""}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          {t("theme.system")} {theme === "system" ? "✓" : ""}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
