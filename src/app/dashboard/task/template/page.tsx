"use client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../../users/pagination";
import { formatDateTime } from "@/lib/utils";
import { RecurringTypeEnum } from "@/lib/enums/routes.enum";
import { EmptyState } from "@/components/not-found";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const RECURRING_TYPE_LABELS: Record<number, string> = {
  [RecurringTypeEnum.DAILY]: "Daily",
  [RecurringTypeEnum.WEEKLY]: "Weekly",
  [RecurringTypeEnum.MONTHLY]: "Monthly",
  [RecurringTypeEnum.YEARLY]: "Yearly",
  [RecurringTypeEnum.CUSTOM]: "Custom",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TaskTemplatePage = () => {
  const router = useRouter();
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);

  const { hasAccess: canRead, create: canCreate } = useModulePermissions(12);

  const taskQuery = useMemo(() => {
    const params = new URLSearchParams({
      start: String(start),
      limit: String(limit),
    });
    return `${API_ENDPOINTS.TASK_TEMPLATE}?${params.toString()}`;
  }, [start, limit]);

  const { data, isLoading } = useApiQuery(
    ["TASK_TEMPLATE_LIST", start, limit],
    taskQuery,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const,
  );

  const tasks = data?.data?.task || [];
  const pagination = data?.data?.pagination || {};
  const total = Number(pagination?.total || tasks.length || 0);

  const renderSkeleton = () => (
    <Table className="border">
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Recurring Settings</TableHead>
          <TableHead>Created By</TableHead>
          <TableHead>Created On</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, idx) => (
          <TableRow key={idx}>
            {Array.from({ length: 4 }).map((__, cellIdx) => (
              <TableCell key={cellIdx}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const formatRecurringSettings = (settings: any) => {
    if (!settings || Object.keys(settings).length === 0) {
      return <span className="text-muted-foreground">â€”</span>;
    }

    const recurringTypeLabel =
      RECURRING_TYPE_LABELS[settings.recurringType] || "Unknown";
    const startDate = settings.startDate
      ? new Date(settings.startDate).toLocaleDateString()
      : "â€”";
    const endDate = settings.endDate
      ? new Date(settings.endDate).toLocaleDateString()
      : "â€”";
    const interval = settings.interval || "â€”";
    const daysOfWeek = settings.daysOfWeek || [];

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {recurringTypeLabel}
          </Badge>
          {interval !== "â€”" && (
            <span className="text-xs text-muted-foreground">
              Interval: {interval}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          <div>Start: {startDate}</div>
          <div>End: {endDate}</div>
        </div>
        {daysOfWeek.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {daysOfWeek.map((day: number) => (
              <span
                key={day}
                className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
              >
                {DAY_NAMES[day]}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTasks = () => {
    if (!tasks.length) {
      return (
        <EmptyState
          onClick={() => {}}
          buttonTitle=""
          title="No Task Templates Found"
          description="No recurring task templates have been created yet."
        />
      );
    }

    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Recurring Settings</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task: any) => {
              const recurringSettings = task?.recurringSettings || {};
              const createdBy = task?.createdByName || "â€”";
              const createdAt = task?.createdAt;

              return (
                <TableRow
                  key={task.id}
                  className="cursor-pointer transition hover:bg-muted/60"
                  onClick={() =>
                    router.push(`/dashboard/task/template/${task.id}`)
                  }
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex flex-col">
                      <span className="line-clamp-1">
                        {task?.title || "Untitled Template"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatRecurringSettings(recurringSettings)}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {createdBy}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
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
    );
  };

  if (canRead === false) {
    return <div className="p-4 sm:p-6 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 space-y-6 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Task Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage recurring task templates.
          </p>
        </div>
        <PermissionGuard moduleId={12} action="create">
          <Button
            onClick={() => router.push("/dashboard/task/template/create")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </PermissionGuard>
      </div>

      {isLoading ? renderSkeleton() : renderTasks()}
    </div>
  );
};

export default TaskTemplatePage;

