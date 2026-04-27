import { cn } from "@/lib/utils";

/** Grey rounded track wrapping tab buttons — matches Setup module. */
export const pageTabsTrackClassName =
  "flex min-w-0 items-center gap-1 rounded-lg bg-gray-50 p-1";

export function pageTabButtonClassName(active: boolean) {
  return cn(
    "cursor-pointer flex-shrink-0 rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "border-primary bg-white text-primary shadow-sm"
      : "border-transparent text-gray-600 hover:bg-white/50 hover:text-gray-900",
  );
}

export function pageTabBadgeClassName(active: boolean) {
  return cn(
    "ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
    active
      ? "border border-primary/50 bg-primary/10 text-primary"
      : "border border-gray-300 bg-gray-200 text-gray-700",
  );
}
