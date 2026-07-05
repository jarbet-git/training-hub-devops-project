import * as React from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowActionItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function RowActionsDropdown({
  actions,
  triggerLabel,
}: {
  actions: RowActionItem[];
  triggerLabel: string;
}) {
  const safeActions = (actions ?? []).filter(Boolean);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-xl"
          aria-label={triggerLabel}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {safeActions.map((action, idx) => (
          <DropdownMenuItem
            key={`${action.label}-${idx}`}
            disabled={action.disabled}
            variant={action.destructive ? "destructive" : "default"}
            onSelect={(e) => {
              e.preventDefault();
              if (action.disabled) return;
              action.onSelect();
            }}
          >
            {action.icon ? <span className="inline-flex h-4 w-4 items-center justify-center">{action.icon}</span> : null}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
