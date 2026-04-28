"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useApiQuery } from "@nitroberry/api-client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useSession } from "next-auth/react";

export interface ModuleActionPermissions {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  viewall: boolean;
  [key: string]: boolean;
}

export interface PermissionsContextType {
  permissions: Record<number, ModuleActionPermissions>;
  roles: any[];
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated" && !!session?.user;

  const { data: permissionsData, isLoading: isApiLoading, error } = useApiQuery(
    ["USER_PERMISSIONS"],
    `${API_ENDPOINTS.COMMON_ROLES_PERMISSIONS}?start=1&limit=100&type=1`,
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      gcTime: Infinity,
      enabled: isAuthenticated,
      retry: 1,
    } as any,
  );

  const rawData = permissionsData?.data;
  const roles = isAuthenticated && !error
    ? (Array.isArray(rawData) ? rawData : rawData?.Roles || [])
    : [];

  const modulePermissions = useMemo(() => {
    const permissionsMap: Record<number, ModuleActionPermissions> = {};
    roles.forEach((role: any) => {
      const moduleId = Number(role.moduleId);
      if (Number.isNaN(moduleId)) return;
      if (!permissionsMap[moduleId]) {
        permissionsMap[moduleId] = { read: false, create: false, update: false, delete: false, viewall: false };
      }
      if (role.permissions?.length > 0) {
        role.permissions.forEach((p: any) => {
          const action = p.actionName?.toLowerCase().replace(/\s+/g, "");
          if (action) permissionsMap[moduleId][action] = p.isAllowed === true;
        });
      }
    });
    return permissionsMap;
  }, [roles]);

  const value: PermissionsContextType = {
    permissions: modulePermissions,
    roles,
    isLoading: isApiLoading || sessionStatus === "loading",
    isAuthenticated,
    error,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissionsContext = () => {
  const context = useContext(PermissionsContext);
  if (!context) throw new Error("usePermissionsContext must be used within a PermissionsProvider");
  return context;
};
