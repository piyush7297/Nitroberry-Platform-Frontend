"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  label: string;
  headerBg: string;
  accentText: string;
  countBadge: string;
  cardBg: string;
  borderAccent: string;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: any[];
  onItemClick?: (item: any) => void;
  renderCard: (item: any) => React.ReactNode;
  groupByKey: string | ((item: any) => string);
}

export function KanbanBoard({
  columns,
  items,
  onItemClick,
  renderCard,
  groupByKey,
}: KanbanBoardProps) {
  const getGroupedItems = () => {
    const groups: Record<string, any[]> = {};
    columns.forEach((col) => (groups[col.id] = []));

    items.forEach((item) => {
      const groupId = typeof groupByKey === "function" ? groupByKey(item) : item[groupByKey];
      if (groups[groupId]) {
        groups[groupId].push(item);
      } else {
        // Fallback for items that don't match any column
        // Maybe put them in the first column or ignore
      }
    });

    return groups;
  };

  const groupedItems = getGroupedItems();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4 min-h-[500px]">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm backdrop-blur transition-all"
        >
          {/* Column Header */}
          <div
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2",
              column.headerBg
            )}
          >
            <span className={cn("text-sm font-semibold", column.accentText)}>
              {column.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                column.countBadge
              )}
            >
              {groupedItems[column.id]?.length || 0}
            </span>
          </div>

          {/* Column Content */}
          <div className="flex flex-1 flex-col gap-3">
            {groupedItems[column.id]?.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-6 text-center text-sm text-muted-foreground">
                No items yet
              </div>
            ) : (
              groupedItems[column.id]?.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => onItemClick?.(item)}
                  className={cn(
                    "rounded-xl border p-4 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-md cursor-pointer",
                    column.cardBg,
                    column.borderAccent
                  )}
                >
                  {renderCard(item)}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
