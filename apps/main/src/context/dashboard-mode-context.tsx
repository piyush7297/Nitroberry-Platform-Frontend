"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useSession } from "next-auth/react";
import { RoleLabels, Roles } from "@/lib/enums/routes.enum";

type DashboardMode = "my" | "company";

type DashboardModeContextValue = {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  isAdmin: boolean;
  canAccessCompanyDashboard: boolean;
  isCompanyDashboardPermissionLoading: boolean;
};

const COMPANY_VIEW_MODULE_IDS = [9, 10, 12, 5];

const normalizeActionName = (actionName?: string) =>
  actionName?.toLowerCase().replace(/\s+/g, "") ?? "";

const resolveRoleIdentifier = (user: any) => {
  if (!user) {
    return undefined;
  }
  if (user.role?.id != null) {
    const rawRoleId = user.role.id;
    if (typeof rawRoleId === "number") {
      return rawRoleId;
    }
    if (typeof rawRoleId === "string") {
      const numericId = Number(rawRoleId);
      return Number.isNaN(numericId) ? undefined : numericId;
    }
  }
  if (user.roleId != null) {
    if (typeof user.roleId === "number") {
      return user.roleId;
    }
    if (typeof user.roleId === "string") {
      const numericId = Number(user.roleId);
      return Number.isNaN(numericId) ? undefined : numericId;
    }
  }
  if (typeof user.role_id === "number") {
    return user.role_id;
  }
  if (typeof user.role_id === "string") {
    const numericId = Number(user.role_id);
    return Number.isNaN(numericId) ? undefined : numericId;
  }
  return undefined;
};

const DashboardModeContext = createContext<
  DashboardModeContextValue | undefined
>(undefined);

export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const isRoleAdmin = (roleValue: unknown) => {
    if (typeof roleValue === "number") {
      return roleValue === Roles.ADMIN || roleValue === Roles.OWNER;
    }
    if (typeof roleValue === "string") {
      const normalized = roleValue.toLowerCase();
      return (
        normalized === (RoleLabels[Roles.ADMIN]?.toLowerCase() ?? "admin") ||
        normalized === (RoleLabels[Roles.OWNER]?.toLowerCase() ?? "owner") ||
        normalized === "admin" ||
        normalized === "owner"
      );
    }
    return false;
  };

  const isAdmin =
    isRoleAdmin(user?.role_id) ||
    isRoleAdmin(user?.roleId) ||
    isRoleAdmin(user?.role) ||
    isRoleAdmin(user?.roleName);

  const roleIdentifier = resolveRoleIdentifier(user);
  const rolePermissionsPath = roleIdentifier
    ? `${API_ENDPOINTS.ROLE_PERMISSIONS}/${roleIdentifier}?type=1&start=1&limit=100&status=true`
    : `${API_ENDPOINTS.COMMON_ROLES_PERMISSIONS}?start=1&limit=100&type=1`;
  const rolePermissionsQueryKey = roleIdentifier
    ? ["ROLE_PERMISSIONS", roleIdentifier]
    : ["COMMON_ROLE_PERMISSIONS"];
  const { data: rolePermissionsData, isLoading: rolePermissionsLoading } =
    useApiQuery(rolePermissionsQueryKey, rolePermissionsPath, {
      enabled: !!rolePermissionsPath,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const);
  const hasCompanyViewPermission = useMemo(() => {
    const modules = rolePermissionsData?.data?.Roles || [];
    if (!Array.isArray(modules) || modules.length === 0) {
      return false;
    }
    return modules.some((module: any) => {
      const moduleId = Number(module.moduleId);
      if (!COMPANY_VIEW_MODULE_IDS.includes(moduleId)) {
        return false;
      }
      if (!Array.isArray(module.permissions)) {
        return false;
      }
      return module.permissions.some(
        (perm: any) =>
          normalizeActionName(perm.actionName) === "viewall" && perm.isAllowed,
      );
    });
  }, [rolePermissionsData]);

  const [mode, setModeState] = useState<DashboardMode>("my");

  const canAccessCompanyDashboard = hasCompanyViewPermission;

  const setMode = (nextMode: DashboardMode) => {
    if (nextMode === "company" && !canAccessCompanyDashboard) {
      setModeState("my");
      return;
    }
    setModeState(nextMode);
  };

  useEffect(() => {
    if (!canAccessCompanyDashboard && mode !== "my") {
      setModeState("my");
    }
  }, [canAccessCompanyDashboard, mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isAdmin,
      canAccessCompanyDashboard,
      isCompanyDashboardPermissionLoading: rolePermissionsLoading,
    }),
    [mode, isAdmin, canAccessCompanyDashboard, rolePermissionsLoading],
  );

  return (
    <DashboardModeContext.Provider value={value}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const context = useContext(DashboardModeContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardMode must be used within a DashboardModeProvider",
    );
  }
  return context;
}
