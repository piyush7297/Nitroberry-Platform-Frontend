"use client";

import { useSession } from "next-auth/react";
import { RoutesEnum } from "@/lib/enums/routes.enum";
import { usePermissionsContext } from "@/context/PermissionsContext";

// Map menu hrefs to module IDs from API (data.Roles[].moduleId)
const MENU_TO_MODULE_ID_MAP: Record<string, number[]> = {
  "/dashboard": [],
  [RoutesEnum.Workflow]: [9, 4],
  "/dashboard/workflow-templates": [10, 9, 4],
  "/dashboard/setup": [2, 11],
  "/dashboard/users": [2, 11],
  "/dashboard/reports": [17],
  "/dashboard/analytics": [18],
  [RoutesEnum.SOCIAL_HOME]: [],
  [RoutesEnum.SOCIAL]: [],
  [RoutesEnum.TASKS]: [5],
  [RoutesEnum.VAULT]: [5],
  "/dashboard/task/template": [5, 16],
  "/dashboard/shifts": [21],
  "/dashboard/notifications": [],
  "/dashboard/messages": [],
  "/dashboard/settings": [13, 3, 7, 6, 8, 20],
};

export function usePermissions() {
  const { data: session, status: sessionStatus } = useSession();
  const context = usePermissionsContext();

  const {
    permissions: modulePermissions,
    roles,
    isLoading,
    isAuthenticated,
    error,
  } = context;

  // Check if user has permission for a specific module ID and action (defaults to "read").
  const hasPermission = (moduleId: number, action: string = "read"): boolean => {
    return modulePermissions[moduleId]?.[action] === true;
  };

  // Check if user has permission for a menu item
  const canAccessMenu = (href: string): boolean => {
    // If session is still loading, allow access (prevent blocking navigation)
    if (sessionStatus === "loading") {
      return true;
    }

    // If not authenticated or error loading permissions, allow access (fallback)
    if (!isAuthenticated || error) {
      return true;
    }

    // If still loading permissions, allow access (will be filtered once loaded)
    if (isLoading) {
      return true;
    }

    const moduleIds = MENU_TO_MODULE_ID_MAP[href];

    // If not mapped or empty array, allow access (backward compatibility or always allowed)
    if (!moduleIds || moduleIds.length === 0) {
      return true;
    }

    // Module menu access requires View All permission.
    return moduleIds.some((moduleId) => hasPermission(moduleId, "viewall"));
  };

  // Helper directly for Create/Update/Delete buttons depending on the current page route
  const getPathActionPermission = (href: string, action: string): boolean => {
    if (!isAuthenticated || error) return true;
    if (isLoading || sessionStatus === "loading") return true;

    const moduleIds = MENU_TO_MODULE_ID_MAP[href];
    if (!moduleIds || moduleIds.length === 0) return true; // fallback

    return moduleIds.some((moduleId) => hasPermission(moduleId, action));
  };

  return {
    permissions: modulePermissions,
    hasPermission,
    getPathActionPermission,
    canAccessMenu,
    isLoading,
    roles,
    isAuthenticated,
    error,
  };
}
