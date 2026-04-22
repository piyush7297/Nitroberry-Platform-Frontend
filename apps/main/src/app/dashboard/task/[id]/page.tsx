"use client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskTypeEnum, TaskStatusEnum } from "@/lib/enums/routes.enum";
import { Pagination } from "@/app/dashboard/users/pagination";

const BREADCRUMBS = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Tasks", href: "/dashboard/task" },
  { name: "Task Details", href: null },
];

const TASK_TYPE_LABELS: Record<number, string> = {
  [TaskTypeEnum.HELP]: "Help",
  [TaskTypeEnum.DELEGATION]: "Delegation",
  [TaskTypeEnum.RECURRING]: "Recurring",
  [TaskTypeEnum.FLOW]: "Flow",
  [TaskTypeEnum.DRAFT_INDENT]: "Draft Indent",
} as const;

const TASK_STATUS_LABELS: Record<number, string> = {
  [TaskStatusEnum.PENDING]: "Pending",
  [TaskStatusEnum.COMPLETED]: "Completed",
  [TaskStatusEnum.MISSED]: "Missed",
} as const;

const getStatusVariant = (status?: number) => {
  switch (status) {
    case TaskStatusEnum.COMPLETED:
      return "active" as const;
    case TaskStatusEnum.PENDING:
      return "disabled" as const;
    case TaskStatusEnum.MISSED:
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TaskDetailPage = () => {
  const { id } = useParams();
  const [occurrenceStart, setOccurrenceStart] = useState(1);
  const [occurrenceLimit, setOccurrenceLimit] = useState(10);

  const { data, isLoading } = useApiQuery(
    [`TaskDetail-${id}`, occurrenceStart, occurrenceLimit],
    `${API_ENDPOINTS.TASKS}/${id}?start=${occurrenceStart}&limit=${occurrenceLimit}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id,
    } as const,
  );

  // Check if we have initial data (to distinguish between initial load and pagination/limit changes)
  // isPaginationLoading will be true when changing pages OR changing the limit
  const hasInitialData = data?.data;
  const isInitialLoading = isLoading && !hasInitialData;
  const isPaginationLoading = isLoading && hasInitialData;

  if (isInitialLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No data found for this task.
      </div>
    );
  }

  const taskInfo = data?.data || {};
  const taskOccurrences = data?.data?.taskOccurrences || [];
  const pagination = data?.data?.pagination || {};
  const assignedUsers = taskInfo?.assignedUsers || [];
  const recurringSettings = taskInfo?.recurringSettings || {};
  const total = Number(pagination?.total || taskOccurrences.length || 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={BREADCRUMBS} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2 capitalize">
            {taskInfo?.name || "Task"}
            {taskInfo?.type && (
              <Badge variant="secondary">
                {TASK_TYPE_LABELS[taskInfo.type] || "Unknown"}
              </Badge>
            )}
          </h1>
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
        <div>
          <div>Created On</div>
          <div className="text-foreground font-medium">
            {formatDate(taskInfo?.createdAt)}
          </div>
        </div>
        <div>
          <div>Created By</div>
          <div className="text-foreground font-medium">
            {taskInfo?.createdByName || "—"}
          </div>
        </div>
        <div>
          <div>Task Type</div>
          <div className="text-foreground font-medium">
            {taskInfo?.type
              ? TASK_TYPE_LABELS[taskInfo.type] || "Unknown"
              : "—"}
          </div>
        </div>
      </div>

      <Separator />

      {/* Assigned Users */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Users</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedUsers.length > 0 ? (
            <div className="space-y-2">
              {assignedUsers.map((user: any) => (
                <div key={user.id} className="text-sm text-foreground">
                  {user.name || user.firstName || "Unknown User"}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No users assigned to this task.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Settings */}
      {/* {Object.keys(recurringSettings).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recurring Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gray-50 p-4 rounded-md">
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                {JSON.stringify(recurringSettings, null, 2)}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            )} */}

      {Object.keys(recurringSettings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recurring Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Start Date</p>
                <p className="font-medium text-gray-800">
                  {new Date(recurringSettings.startDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-gray-500">End Date</p>
                <p className="font-medium text-gray-800">
                  {new Date(recurringSettings.endDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Interval</p>
                <p className="font-medium text-gray-800">
                  {recurringSettings.interval}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Recurring Type</p>
                <p className="font-medium text-gray-800">
                  {recurringSettings.recurringType === TaskTypeEnum.HELP
                    ? "Help"
                    : recurringSettings.recurringType ===
                        TaskTypeEnum.DELEGATION
                      ? "Delegation"
                      : recurringSettings.recurringType ===
                          TaskTypeEnum.RECURRING
                        ? "Recurring"
                        : "Custom"}
                </p>
              </div>

              {recurringSettings.daysOfWeek?.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-gray-500 mb-1">Days of Week</p>
                  <div className="flex flex-wrap gap-2">
                    {recurringSettings.daysOfWeek.map((day: any) => {
                      const dayNames = [
                        "Sun",
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                      ];
                      return (
                        <span
                          key={day}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                        >
                          {dayNames[day]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Occurrences */}
      {taskOccurrences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Task Occurrences</CardTitle>
          </CardHeader>
          <CardContent>
            {isPaginationLoading ? (
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason for Delay</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: occurrenceLimit }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : taskOccurrences.length > 0 ? (
              <>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason for Delay</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taskOccurrences.map((occurrence: any, index: number) => {
                        const statusLabel =
                          TASK_STATUS_LABELS[occurrence?.status] || "Unknown";
                        return (
                          <TableRow key={occurrence.id || index}>
                            <TableCell className="font-medium">
                              {formatDate(occurrence?.startDate)}
                            </TableCell>
                            <TableCell>
                              {formatDate(occurrence?.endDate)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusVariant(occurrence?.status)}
                              >
                                {statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {occurrence?.reasonForDelay || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateTime(occurrence?.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="mt-4">
                  <Pagination
                    start={occurrenceStart}
                    limit={occurrenceLimit}
                    total={total}
                    pagination={pagination}
                    onPageChange={(newStart) => setOccurrenceStart(newStart)}
                    onLimitChange={(newLimit) => {
                      setOccurrenceLimit(newLimit);
                      setOccurrenceStart(1);
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No task occurrences found.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskDetailPage;
