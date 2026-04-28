"use client";

type DashboardMode = "my" | "company";

export function useDashboardMode() {
  return {
    mode: "company" as DashboardMode,
    setMode: (_: DashboardMode) => {},
  };
}
