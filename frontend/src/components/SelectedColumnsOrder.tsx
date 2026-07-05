import * as React from "react";

import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";

import { useI18n } from "@/app/i18n";

import { Button } from "@/components/ui/button";

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr;
  const next = arr.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function SelectedColumnsOrder(props: {
  value: string[];
  labelByKey: Map<string, string>;
  defaultOrder: string[];
  onChange: (next: string[]) => void;
  onClear?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const { value, labelByKey, defaultOrder, onChange, onClear, className } = props;

  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);

  const canClear = value.length > 0;

  function resetOrder() {
    const set = new Set(value);
    const next = defaultOrder.filter((k) => set.has(k));
    onChange(next);
  }

  function sortAZ() {
    const next = [...value].sort((a, b) => {
      const la = labelByKey.get(a) ?? a;
      const lb = labelByKey.get(b) ?? b;
      return la.localeCompare(lb);
    });
    onChange(next);
  }

  function removeKey(k: string) {
    onChange(value.filter((x) => x !== k));
  }

  function moveUp(k: string) {
    const idx = value.indexOf(k);
    if (idx <= 0) return;
    onChange(arrayMove(value, idx, idx - 1));
  }

  function moveDown(k: string) {
    const idx = value.indexOf(k);
    if (idx < 0 || idx >= value.length - 1) return;
    onChange(arrayMove(value, idx, idx + 1));
  }

  function onDragStart(k: string) {
    setDragKey(k);
  }

  function onDragEnter(k: string) {
    if (!dragKey) return;
    setOverKey(k);
  }

  function onDrop(k: string) {
    if (!dragKey) return;
    const from = value.indexOf(dragKey);
    const to = value.indexOf(k);
    if (from >= 0 && to >= 0) {
      onChange(arrayMove(value, from, to));
    }
    setDragKey(null);
    setOverKey(null);
  }

  function onDragEnd() {
    setDragKey(null);
    setOverKey(null);
  }

  return (
    <div className={className ?? ""}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{t("admin.reports.columnsOrderTitle")}</div>
          <div className="text-xs text-muted-foreground">{t("admin.reports.columnsOrderHelp")}</div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetOrder} disabled={!value.length}>
            {t("admin.reports.columnsOrderReset")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={sortAZ} disabled={!value.length}>
            {t("admin.reports.columnsOrderSort")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={!canClear || !onClear}
          >
            {t("admin.reports.columnsOrderClear")}
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border bg-muted/10">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="text-xs text-muted-foreground">{t("admin.reports.columnsOrderCount", { count: value.length })}</div>
          <div className="text-xs text-muted-foreground">{t("admin.reports.columnsOrderHint")}</div>
        </div>

        {value.length ? (
          <ul className="max-h-64 overflow-auto p-2">
            {value.map((k) => {
              const label = labelByKey.get(k) ?? k;
              const isOver = overKey === k && dragKey && dragKey !== k;

              return (
                <li
                  key={k}
                  className={
                    "group mb-2 last:mb-0 rounded-lg border bg-background px-2 py-1.5 " +
                    (dragKey === k ? "opacity-60" : "") +
                    (isOver ? " ring-2 ring-primary/40" : "")
                  }
                  draggable
                  onDragStart={() => onDragStart(k)}
                  onDragEnter={() => onDragEnter(k)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(k)}
                  onDragEnd={onDragEnd}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm" title={label}>
                        {label}
                      </div>
                    </div>

                    {/* Up/Down (helpful on touch devices where native drag may not work) */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveUp(k)}
                        disabled={value.indexOf(k) === 0}
                        aria-label={t("admin.reports.columnsOrderMoveUp")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveDown(k)}
                        disabled={value.indexOf(k) === value.length - 1}
                        aria-label={t("admin.reports.columnsOrderMoveDown")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeKey(k)}
                      aria-label={t("common.delete")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">{t("admin.reports.columnsOrderEmpty")}</div>
        )}
      </div>
    </div>
  );
}
