import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TableOpenHeaderCell({ label }: { label: string }) {
  return (
    <th className="w-[56px] py-2 text-right">
      <span className="sr-only">{label}</span>
    </th>
  );
}

export function TableOpenCell({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <td className="py-3 text-right align-top">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-xl text-muted-foreground transition hover:text-foreground"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </td>
  );
}
