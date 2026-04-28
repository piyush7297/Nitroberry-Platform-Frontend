"use client";

import { useSession } from "next-auth/react";
import { usePermissionsContext } from "@/context/PermissionsContext";

const MENU_TO_MODULE_ID_MAP: Record<string, number[]> = {
  "/dashboard/users": [2, 11],
  "/dashboard/setup": [2, 11],
  "/dashboard/audit-logs": [15],
};

export function usePermissions() {
  const { data: session, status: sessionStatus } = useSession();
  const { permissions: modulePermissions, roles, isLoading, isAuthenticated, error } =
    usePermissionsContext();

  const hasPermission = (moduleId: number, action = "read"): boolean =>
    modulePermissions[moduleId]?.[action] === true;

  const canAccessMenu = (href: string): boolean => {
    if (sessionStatus === "loading" || isLoading || !isAuthenticated || error) return true;
    const path = href.split("?")[0];
    const moduleIds = MENU_TO_MODULE_ID_MAP[path];
    if (!moduleIds || moduleIds.length === 0) return true;
    return moduleIds.some((id) => hasPermission(id, "viewall"));
  };

  return { permissions: modulePermissions, hasPermission, canAccessMenu, isLoading, roles, isAuthenticated, error };
}
