import { ChevronDown, LayoutDashboard, LogOut, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/app/i18n";

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { t } = useI18n();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button data-tour="user-menu" variant="outline" className="rounded-2xl border-border/60 bg-background/70 px-2 shadow-sm backdrop-blur">
          <Avatar className="h-7 w-7">
            {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name ?? user.email ?? t("common.user")} /> : null}
            <AvatarFallback>{initials(user?.full_name)}</AvatarFallback>
          </Avatar>
          <span className="ml-2 hidden text-sm md:inline">{user?.full_name ?? t("common.user")}</span>
          <ChevronDown className="ml-2 hidden h-4 w-4 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/60 bg-popover/95 backdrop-blur-xl">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{user?.email ?? "—"}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => nav("/")}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {t("nav.dashboard")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav("/profile")}>
          <Settings2 className="mr-2 h-4 w-4" />
          {t("nav.profile")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
            nav("/login", { replace: true });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
