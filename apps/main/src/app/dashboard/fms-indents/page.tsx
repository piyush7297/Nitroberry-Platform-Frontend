"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/not-found";
import { Pagination } from "../users/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

export default function FMSIndents() {
  const router = useRouter();

  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);

  const { hasAccess: canRead, create: canCreate } = useModulePermissions(6);

  const { data, isLoading } = useApiQuery(
    ["INDENTS_LIST", start, limit],
    `${API_ENDPOINTS.FMS_INDENT_LISTS}?start=${start}&limit=${limit}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const,
  );

  const indents = data?.data?.data || [];
  const pagination = data?.data?.pagination || {};
  const total = Number(pagination?.total || 0);

  // --- Skeleton Loader ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>

        <Separator />

        <div className="rounded-md border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
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
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end pt-4">
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
      </div>
    );
  }

  if (canRead === false) {
    return <div className="p-4 sm:p-6 mt-4"><PermissionDeniedState /></div>;
  }

  // --- Empty State ---
  if (indents.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <EmptyState
          onClick={() => {}}
          buttonTitle={canCreate ? "Create New Workflow" : ""}
          title="No Workflow Indents Found"
          description="You havenâ€™t created any Workflow templates yet. Start by creating your first one."
        />
      </div>
    );
  }

  // --- Actual Table ---
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Indent Lists</h1>
          <p className="text-sm text-muted-foreground">
            List of all available Workflow Indent templates in the system.
          </p>
        </div>

        <PermissionGuard moduleId={6} action="create">
          <Button
            onClick={() => router.push("/dashboard/workflow-templates")}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4 text-white" />
            Create Indent
          </Button>
        </PermissionGuard>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* <Card className="border bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Indent Fields

                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold">{total}</p>
                    </CardContent>
                </Card> */}
        {/* <Card className="border bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Indent Fields
                        </CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold">{totalIndents}</p>
                    </CardContent>
                </Card> */}
      </div>

      <Separator />

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indents.map((item: any) => (
              <TableRow key={item.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{item.fms}</TableCell>
                <TableCell>{formatDateTime(item?.createdAt)}</TableCell>
                <TableCell>{item?.status}</TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/fms-indents/${item.id}`)
                  }
                >
                  {"View"}
                </TableCell>
              </TableRow>
            ))}
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
    </div>
  );
}

