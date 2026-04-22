"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useState, useMemo } from "react";
import { EmptyState } from "@/components/not-found";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "../../users/pagination";

export default function Permissions() {
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: permissionsList, isLoading } = useApiQuery(
    ["PERMISSIONS_LIST", start, limit],
    `${API_ENDPOINTS.COMMON_ROLES_PERMISSIONS}?start=${start}&limit=${limit}&type=1`,
    { refetchOnWindowFocus: false, retry: 1 } as const,
  );

  const roles = permissionsList?.data?.Roles || [];
  const pagination = permissionsList?.data?.pagination || {};
  const total = Number(pagination?.total || 0);

  // Group permissions by module with actions as columns
  const tableData = useMemo(() => {
    const moduleMap = new Map();

    roles.forEach((role: any) => {
      if (!moduleMap.has(role.moduleId)) {
        moduleMap.set(role.moduleId, {
          moduleName: role.moduleName,
          moduleId: role.moduleId,
          create: null,
          read: null,
          update: null,
          delete: null,
          viewAll: null,
        });
      }

      const module = moduleMap.get(role.moduleId);
      if (role.permissions && role.permissions.length > 0) {
        role.permissions.forEach((permission: any) => {
          const actionName = permission.actionName
            .toLowerCase()
            .replace(/\s+/g, "");
          if (
            ["create", "read", "update", "delete", "viewall"].includes(
              actionName,
            )
          ) {
            module[actionName] = {
              isAllowed: permission.isAllowed,
              locationIds: permission.locationIds || [],
              permissionId: permission.id,
            };
          }
        });
      }
    });

    return Array.from(moduleMap.values());
  }, [roles]);

  return (
    <section className="w-full space-y-5">
      <div className="border-b border-gray-200">
        <h1 className="text-xl font-semibold">Permissions</h1>
        <p className="text-gray-600 text-sm font-normal mb-4">
          Allowed and denied permissions for modules.
        </p>
      </div>
      {/* Loading State */}
      {isLoading ? (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Create</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Update</TableHead>
                <TableHead>Delete</TableHead>
                <TableHead>View All</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : tableData.length === 0 ? (
        <EmptyState
          onClick={() => { }}
          buttonTitle=""
          title="No permissions"
          description="No permissions found for this role."
        />
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Create</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Update</TableHead>
                <TableHead>Delete</TableHead>
                <TableHead>View All</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.moduleId}>
                  <TableCell className="font-medium">{row.moduleName}</TableCell>
                  {["create", "read", "update", "delete", "viewall"].map(
                    (action) => {
                      const permission = row[action];
                      return (
                        <TableCell key={action}>
                          {permission ? (
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={
                                  permission.isAllowed ? "active" : "disabled"
                                }
                                className="text-xs w-fit"
                              >
                                {permission.isAllowed
                                  ? "Allowed"
                                  : "Not Allowed"}
                              </Badge>
                              {permission.locationIds &&
                                permission.locationIds.length > 0 ? (
                                <span className="text-xs text-gray-500">
                                  {permission.locationIds.length} location
                                  {permission.locationIds.length > 1 ? "s" : ""}
                                </span>
                              ) : permission.locationIds &&
                                permission.locationIds.length === 0 ? (
                                <span className="text-xs text-gray-400 italic">
                                  All locations
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                      );
                    },
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && tableData.length > 0 && (
        <div className="border-t">
          <Pagination
            start={start}
            limit={limit}
            total={total}
            pagination={pagination}
            onPageChange={(newStart) => setStart(newStart)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setStart(1);
            }}
          />
        </div>
      )}
    </section>
  );
}
