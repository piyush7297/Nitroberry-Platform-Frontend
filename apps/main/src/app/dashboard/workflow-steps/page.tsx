"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PlusIcon, ListChecks, Workflow } from "lucide-react";
import { EmptyState } from "@/components/not-found";
import { Pagination } from "../users/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Skeleton } from "@/components/ui/skeleton";
import { RoutesEnum } from "@/lib/enums/routes.enum";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

export default function FMSSteps() {
  const router = useRouter();
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);

  const { hasAccess: canRead, create: canCreate } = useModulePermissions(2);

  // Fetch data
  const { data, isLoading } = useApiQuery(
    ["STEP_LIST", start, limit],
    `${API_ENDPOINTS.FMS_STEP}/assigned-list?start=${start}&limit=${limit}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const,
  );

  const steps = data?.data?.steps || [];
  const total = data?.data?.pagination?.total || 0;

  // Derived stats
  const totalSteps = steps.length;
  const inProgressCount = steps.filter(
    (s: any) => s?.stepStatus === "inProgress",
  ).length;

  // Skeleton UI while loading
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-12" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-6 w-12" />
            </CardHeader>
          </Card>
        </div>

        <Separator />

        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
              <Skeleton className="h-5 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (canRead === false) {
    return <div className="p-4 sm:p-6 mt-4"><PermissionDeniedState /></div>;
  }

  // Empty State
  if (steps.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <EmptyState
          onClick={() => router.push("/dashboard/workflow-templates")}
          buttonTitle="Go to Workflow List"
          title="No Steps Found"
          description="No steps are defined for this Workflow yet."
        />
      </div>
    );
  }



  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Steps</h1>
          <p className="text-sm text-muted-foreground">
            Steps and workflow details for this Workflow.
          </p>
        </div>

        <PermissionGuard moduleId={2} action="create">
          <Button
            onClick={() => router.push("/dashboard/workflow-templates/create")}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4 text-white" />
            Create New Step
          </Button>
        </PermissionGuard>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalSteps}</p>
          </CardContent>
        </Card>

        <Card className="border bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              In Progress Steps
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{inProgressCount}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Workflow Name</TableHead>
              <TableHead>Step Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timeline (min)</TableHead>
              <TableHead>Schedule Start</TableHead>
              <TableHead>Schedule End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step: any, index: number) => (
              <TableRow
                key={step.stepId || index}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() =>
                  router.push(`${RoutesEnum.WORKFLOW_STEPS}/${step.stepId}`)
                }
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>{step?.fmsName || "â€”"}</TableCell>
                <TableCell className="font-medium">
                  {step?.stepName || "â€”"}
                </TableCell>
                <TableCell className="capitalize">
                  {step?.stepStatus || "â€”"}
                </TableCell>
                <TableCell>{step?.timelineInMinutes || "â€”"}</TableCell>
                <TableCell>
                  {step?.scheduleStartDateTime
                    ? new Date(step.scheduleStartDateTime).toLocaleString()
                    : "â€”"}
                </TableCell>
                <TableCell>
                  {step?.scheduleEndDateTime
                    ? new Date(step.scheduleEndDateTime).toLocaleString()
                    : "â€”"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="border-t px-4 pb-4">
          <Pagination
            start={start}
            limit={limit}
            total={total}
            pagination={data?.data?.pagination}
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

