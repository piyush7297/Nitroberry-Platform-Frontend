"use client";

"use client";

import { useEffect } from "react";
import { useDashboardMode } from "@/context/dashboard-mode-context";

export function CompanyModeSetter() {
  const { setMode, isAdmin, canAccessCompanyDashboard } = useDashboardMode();

  useEffect(() => {
    if (!isAdmin || !canAccessCompanyDashboard) {
      return;
    }

    setMode("company");

    return () => {
      setMode("my");
    };
  }, [isAdmin, canAccessCompanyDashboard, setMode]);

  return null;
}
