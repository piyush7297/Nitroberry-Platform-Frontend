"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  start: number;
  limit: number;
  total: number; // total items (or jobTitles.length)
  pagination?: any | null; // pagination.next from API
  onPageChange: (newStart: number) => void;
  onLimitChange: (newLimit: number) => void;
  limits?: number[]; // optional array of limit options
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
  const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const paginationTotal =
    toFiniteNumber(pagination?.totalItems) ??
    toFiniteNumber(pagination?.totalCount) ??
    toFiniteNumber(pagination?.total) ??
    toFiniteNumber(pagination?.count);

  const resolvedTotal = paginationTotal ?? total;

  const resolvedTotalPages =
    toFiniteNumber(pagination?.totalPages) ??
    toFiniteNumber(pagination?.pages) ??
    toFiniteNumber(pagination?.lastPage) ??
    Math.max(1, Math.ceil((resolvedTotal || 0) / Math.max(limit, 1)));

  const nextPageFromPagination =
    toFiniteNumber(pagination?.next) ??
    toFiniteNumber(pagination?.nextPage) ??
    toFiniteNumber(pagination?.next?.page) ??
    toFiniteNumber(pagination?.next?.start);

  const hasExplicitHasMore =
    typeof pagination?.hasMore === "boolean"
      ? pagination.hasMore
      : typeof pagination?.hasNext === "boolean"
        ? pagination.hasNext
        : typeof pagination?.next === "boolean"
          ? pagination.next
          : null;

  const canGoNext =
    hasExplicitHasMore !== null
      ? hasExplicitHasMore
      : nextPageFromPagination !== null
        ? nextPageFromPagination > start
        : start < resolvedTotalPages;

  return (
    <div className="flex items-center justify-between mt-4">
      {/* Left: Limit select */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Rows per page:</span>
        <Select
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
        >
          <SelectTrigger size="sm" className="w-[75px] text-sm">
            <SelectValue placeholder={String(limit)} />
          </SelectTrigger>
          <SelectContent>
            {limits.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: Pagination controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onPageChange(Math.max(start - 1, 1))}
          disabled={start === 1}
        >
          Prev
        </Button>

        <span className="text-sm text-gray-700">
          Page {start} of {resolvedTotalPages}
        </span>

        <Button
          size="sm"
          onClick={() => {
            const nextPage = nextPageFromPagination ?? start + 1;
            onPageChange(nextPage);
          }}
          disabled={!canGoNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
