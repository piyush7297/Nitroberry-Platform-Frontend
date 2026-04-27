"use client";

import React, { useState } from "react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Pagination } from "../users/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const AuditLogsPage = () => {
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);

  const { hasAccess: canRead } = useModulePermissions(15);

  const { data, isLoading } = useApiQuery(
    ["AUDIT_LOGS", start, limit],
    `${API_ENDPOINTS.AUDIT_LOGS}?start=${start}&limit=${limit}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const,
  );

  const indents = data?.data?.task || [];
  const pagination = data?.data?.pagination || {};
  const total = Number(pagination?.total || 0);

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            List of all audit logs in the system.
          </p>
        </div>
      </div>
      <Separator />

      {/* Table */}
      {isLoading ? (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-52" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-4 pb-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indents.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{item.message}</TableCell>
                  <TableCell>
                    {item?.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : ""}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`${item?.isSuccess ? "text-green-500" : "text-red-500"}`}
                    >
                      {item?.isSuccess ? "Success" : "Failed"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {indents.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    <p>No audit logs found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="border-t px-4 pb-4">
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
        </div>
      )}
    </div>
  );
};
export default AuditLogsPage;

