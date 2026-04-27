"use client";

import React from "react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nitroberry/ui";

interface PaginationProps {
  start: number;
  limit: number;
  total: number;
  pagination?: any | null;
  onPageChange: (newStart: number) => void;
  onLimitChange: (newLimit: number) => void;
  limits?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  start,
  limit,
  total,
  pagination,
  onPageChange,
  onLimitChange,
  limits = [10, 20, 50, 100],
}) => {
  const toN = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const p = Number(v);
      return Number.isFinite(p) ? p : null;
    }
    return null;
  };

  const resolvedTotal =
    toN(pagination?.totalItems) ??
    toN(pagination?.totalCount) ??
    toN(pagination?.total) ??
    total;

  const resolvedTotalPages =
    toN(pagination?.totalPages) ??
    toN(pagination?.pages) ??
    Math.max(1, Math.ceil(resolvedTotal / Math.max(limit, 1)));

  const nextPage =
    toN(pagination?.next) ??
    toN(pagination?.nextPage) ??
    toN(pagination?.next?.start);

  const hasMore =
    typeof pagination?.hasMore === "boolean"
      ? pagination.hasMore
      : typeof pagination?.hasNext === "boolean"
        ? pagination.hasNext
        : nextPage !== null
          ? nextPage > start
          : start < resolvedTotalPages;

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Rows per page:</span>
        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger size="sm" className="w-[75px] text-sm">
            <SelectValue placeholder={String(limit)} />
          </SelectTrigger>
          <SelectContent>
            {limits.map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onPageChange(Math.max(start - 1, 1))} disabled={start === 1}>
          Prev
        </Button>
        <span className="text-sm text-gray-700">Page {start} of {resolvedTotalPages}</span>
        <Button size="sm" onClick={() => onPageChange(nextPage ?? start + 1)} disabled={!hasMore}>
          Next
        </Button>
      </div>
    </div>
  );
};
