"use client";

import { ArrowUpDown, Filter } from "lucide-react";
import type { ReadingStatus, SortOption } from "@/lib/types";
import { READING_STATUSES, SORT_OPTIONS } from "@/lib/types";

interface BookListFiltersProps {
  statusFilter: ReadingStatus | "all";
  onStatusFilterChange: (status: ReadingStatus | "all") => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  hideStatusFilter?: boolean;
}

export function BookListFilters({
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  hideStatusFilter = false,
}: BookListFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {!hideStatusFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {(["all", ...READING_STATUSES.map((s) => s.value)] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => onStatusFilterChange(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  statusFilter === status
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                {status === "all"
                  ? "All"
                  : READING_STATUSES.find((s) => s.value === status)?.label}
              </button>
            ),
          )}
        </div>
      )}

      <div className="relative flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-slate-400" />
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortOption)}
          className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Sort books"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
