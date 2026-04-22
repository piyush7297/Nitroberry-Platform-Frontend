"use client";

import React, { FC, ReactNode } from "react";
import { usePermissionsContext, ModuleActionPermissions } from "@/context/PermissionsContext";
import { Lock, Loader2 } from "lucide-react";

const PermissionLoadingState = () => (
  <div className="flex w-full min-h-[calc(100vh-10rem)] flex-col items-center justify-center rounded-xl border border-gray-100 bg-white/70 p-12 text-center">
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
    <p className="text-xs font-medium text-muted-foreground">Loading...</p>
  </div>
);

export const PermissionDeniedState = () => {
  const { isLoading } = usePermissionsContext();

  if (isLoading) {
    return <PermissionLoadingState />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh] min-h-[400px] w-full border border-gray-100 bg-gray-50/50 rounded-xl my-4">
      <div className="w-16 h-16 bg-gray-200/50 rounded-full flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
      <p className="text-sm text-gray-500 max-w-sm">You do not have permission to view or manage this module. Please contact your administrator to request access.</p>
    </div>
  );
};

export interface PermissionGuardProps {
  moduleId: number;
  action: keyof ModuleActionPermissions | "access";
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * "hide" completely unmounts the child if permission is denied.
   * "disable" clones the child element and appends a `disabled` prop and `title`.
   */
  mode?: "hide" | "disable";
}

export const PermissionGuard: FC<PermissionGuardProps> = ({
  moduleId,
  action,
  children,
  fallback = null,
  mode = "disable",
}) => {
  const { permissions, isLoading, isAuthenticated } = usePermissionsContext();

  if (!isAuthenticated) return <>{children}</>; // Fallback if no auth logic is present

  const modulePerms = permissions[moduleId] || {
    read: false,
    create: false,
    update: false,
    delete: false,
    viewall: false,
  };

  const hasAccess = action === "access"
    ? modulePerms.viewall
    : !!modulePerms[action];

  if (isLoading) {
    return <>{children}</>; // Maintain layout structure while downloading permissions
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (mode === "hide") {
    return fallback;
  }

  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      disabled: true,
      title: "You do not have permission to perform this action.",
      className: `${child.props.className || ""} opacity-50 cursor-not-allowed pointer-events-none`.trim(),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  return <>{children}</>;
};

export const useModulePermissions = (moduleId: number) => {
  const { permissions, isLoading } = usePermissionsContext();
  const perms = permissions[moduleId] || {
    read: false,
    create: false,
    update: false,
    delete: false,
    viewall: false,
  };
  return { ...perms, isLoading, hasAccess: perms.viewall };
};
