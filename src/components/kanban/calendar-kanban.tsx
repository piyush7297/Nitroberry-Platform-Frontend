"use client";

import React, { useMemo } from "react";
import { format, startOfWeek, addDays, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarKanbanProps {
  viewType: "day" | "week" | "month";
  selectedDate: Date;
  items: any[];
  renderCard: (item: any) => React.ReactNode;
  onItemClick?: (item: any) => void;
  getDate: (item: any) => Date | string | null | undefined;
  maxVisible?: number;
  onViewMore?: (date: Date, allItems: any[]) => void;
}

export function CalendarKanban({
  viewType,
  selectedDate,
  items,
  renderCard,
  onItemClick,
  getDate,
  maxVisible = 3,
  onViewMore,
}: CalendarKanbanProps) {
  const columns = useMemo(() => {
    if (viewType === "day") {
      return [selectedDate];
    }
    if (viewType === "week") {
      const start = startOfWeek(selectedDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    if (viewType === "month") {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      return eachDayOfInterval({ start, end });
    }
    return [selectedDate];
  }, [viewType, selectedDate]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, any[]>();
    items.forEach((item) => {
      const itemDateRaw = getDate(item);
      if (!itemDateRaw) return;
      const itemDate = new Date(itemDateRaw);
      const key = format(itemDate, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(item);
    });
    return map;
  }, [items, getDate]);

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="w-full overflow-x-auto no-scrollbar pb-4">
      <div className={cn(
        "grid gap-4",
        viewType === "day" ? "grid-cols-1" :
        "grid-cols-7 min-w-[1200px] lg:min-w-0"
      )}>
      {columns.map((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const allColumnItems = groupedItems.get(dateKey) || [];
        const visibleItems = allColumnItems.slice(0, maxVisible);
        const hiddenCount = allColumnItems.length - visibleItems.length;
        const today = isToday(date);

        return (
          <div
            key={dateKey}
            className={cn(
              "flex min-h-[400px] flex-col gap-4 rounded-2xl border p-3 transition-colors",
              today ? "border-primary/30 bg-primary/5" : "border-slate-100 bg-white/70"
            )}
          >
            {/* Column Header */}
            <div className="flex flex-col items-center border-b border-slate-100 pb-2">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                today ? "text-primary" : "text-slate-400"
              )}>
                {format(date, "EEE")}
              </span>
              <div className={cn(
                "mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                today ? "bg-primary text-white shadow-md shadow-primary/30" : "text-slate-800"
              )}>
                {format(date, "d")}
              </div>
            </div>

            {/* Column Content */}
            <div className="flex flex-1 flex-col gap-3">
              {allColumnItems.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-4 text-center text-[10px] text-muted-foreground italic">
                  No tasks
                </div>
              ) : (
                <>
                  {visibleItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => onItemClick?.(item)}
                      className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                    >
                      {renderCard(item)}
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onViewMore?.(date, allColumnItems)}
                      className="mt-auto w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                    >
                      + {hiddenCount} more
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
