import * as React from "react";

import { Check, ChevronDown } from "lucide-react";

import { useI18n } from "@/app/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MultiSelectOption<T extends string | number> = {
  value: T;
  label: string;
  /** Optional group label shown as a header inside the dropdown. */
  group?: string;
};

type GroupedOptions<T extends string | number> = Array<{ group?: string; items: MultiSelectOption<T>[] }>;

export function MultiSelectDropdown<T extends string | number>(props: {
  label: string;
  placeholder: string;
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  maxMenuHeightClassName?: string;
}) {
  const { label, placeholder, options, value, onChange, disabled } = props;

  const { t } = useI18n();

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const summary = React.useMemo(() => {
    if (!value.length) return placeholder;
    if (value.length === 1) {
      const one = options.find((o) => o.value === value[0]);
      return one?.label ?? placeholder;
    }
    return t("common.selectedCount", { count: value.length });
  }, [options, placeholder, value, t]);

  const groupedOptions: GroupedOptions<T> = React.useMemo(() => {
    // Preserve first-seen order of groups (and items).
    const groups: GroupedOptions<T> = [];
    const idx = new Map<string, number>();

    for (const opt of options) {
      const key = (opt.group ?? "").trim();
      const groupKey = key || "__ungrouped__";

      if (!idx.has(groupKey)) {
        idx.set(groupKey, groups.length);
        groups.push({ group: key || undefined, items: [] });
      }

      groups[idx.get(groupKey)!].items.push(opt);
    }

    return groups;
  }, [options]);

  const filteredGroupedOptions: GroupedOptions<T> = React.useMemo(() => {
    if (!q) return groupedOptions;
    const next: GroupedOptions<T> = [];
    for (const g of groupedOptions) {
      const groupMatches = (g.group ?? "").toLowerCase().includes(q);
      const items = g.items.filter((opt) => {
        if (groupMatches) return true;
        return (opt.label ?? "").toLowerCase().includes(q);
      });
      if (items.length) next.push({ group: g.group, items });
    }
    return next;
  }, [groupedOptions, q]);

  const allValues = React.useMemo(() => options.map((o) => o.value), [options]);

  function emitFromSet(next: Set<T>) {
    // Keep stable ordering based on `options` order.
    onChange(options.filter((o) => next.has(o.value)).map((o) => o.value));
  }

  function toggle(v: T) {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else next.add(v);

    emitFromSet(next);
  }

  function toggleAll() {
    const next = new Set(selectedSet);
    const allSelected = allValues.length > 0 && allValues.every((v) => next.has(v));
    if (allSelected) {
      next.clear();
    } else {
      for (const v of allValues) next.add(v);
    }
    emitFromSet(next);
  }

  function toggleGroup(group?: string) {
    const key = (group ?? "").trim();
    const g = key || undefined;
    const groupItems = (groupedOptions.find((x) => x.group === g) ?? { items: [] as MultiSelectOption<T>[] }).items;
    const groupValues = groupItems.map((x) => x.value);
    const next = new Set(selectedSet);
    const allSelected = groupValues.length > 0 && groupValues.every((v) => next.has(v));
    if (allSelected) {
      for (const v of groupValues) next.delete(v);
    } else {
      for (const v of groupValues) next.add(v);
    }
    emitFromSet(next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" disabled={disabled}>
          <span className="truncate">{summary}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span className="truncate">{label}</span>
          <Button type="button" variant="ghost" size="sm" onClick={toggleAll} disabled={disabled || !options.length}>
            {allValues.length && allValues.every((v) => selectedSet.has(v)) ? t("common.unselectAll") : t("common.selectAll")}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="h-9"
            autoFocus
          />
        </div>
        <DropdownMenuSeparator />

        <div className={props.maxMenuHeightClassName ?? "max-h-64 overflow-auto"}>
          {filteredGroupedOptions.length ? (
            filteredGroupedOptions.map((g, gi) => (
            <div key={g.group ?? `__ungrouped__-${gi}`}>
              {g.group ? (
                <div className="sticky top-0 z-10 bg-popover px-2 py-1 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-muted-foreground truncate" title={g.group}>
                    {g.group}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleGroup(g.group);
                    }}
                  >
                    {g.items.length && g.items.every((x) => selectedSet.has(x.value)) ? t("common.unselectAllInGroup") : t("common.selectAllInGroup")}
                  </Button>
                </div>
              ) : null}

              {g.items.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={String(opt.value)}
                  checked={selectedSet.has(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                  // keep menu open while checking
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="truncate">{opt.label}</span>
                </DropdownMenuCheckboxItem>
              ))}

              {gi < filteredGroupedOptions.length - 1 ? <div className="my-1 h-px bg-border" /> : null}
            </div>
          ))
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground">{t("common.noResults")}</div>
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!value.length}
          onSelect={(e) => {
            e.preventDefault();
            onChange([]);
          }}
        >
          <Check className="mr-2 h-4 w-4 opacity-0" />
          {t("common.clearAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
