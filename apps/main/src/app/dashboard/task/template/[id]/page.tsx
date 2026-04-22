"use client";
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RecurringTypeEnum,
  TaskStatusEnum,
  TaskTypeEnum,
} from "@/lib/enums/routes.enum";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "../../../users/pagination";
import { formatDateTime } from "@/lib/utils";
import { MembersCell } from "@/app/dashboard/users/page";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const BREADCRUMBS = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Task Templates", href: "/dashboard/task/template" },
  { name: "Template Details", href: null },
];

const RECURRING_TYPE_LABELS: Record<number, string> = {
  [RecurringTypeEnum.DAILY]: "Daily",
  [RecurringTypeEnum.WEEKLY]: "Weekly",
  [RecurringTypeEnum.MONTHLY]: "Monthly",
  [RecurringTypeEnum.YEARLY]: "Yearly",
  [RecurringTypeEnum.CUSTOM]: "Custom",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const TaskTemplateDetailPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);

  const { hasAccess: canRead, update: canUpdate } = useModulePermissions(12);

  const { data, isLoading } = useApiQuery(
    ["TASK_TEMPLATE_DETAIL", id],
    `${API_ENDPOINTS.TASK_TEMPLATE}${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id && canRead,
    } as const,
  );

  const { data: occurenceData, isLoading: isLoadingOccurence } = useApiQuery(
    ["TASK_TEMPLATE_OCCURENCE_LIST", id, start, limit],
    `${API_ENDPOINTS.TASK_TEMPLATE}${id}/tasks?start=${start}&limit=${limit}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id && canRead,
    } as const,
  );

  const tasks = occurenceData?.data?.task || [];
  const pagination = occurenceData?.data?.pagination || {};
  const total = Number(pagination?.total || 0);

  if (canRead === false) {
    return <div className="p-4 sm:p-6 mt-4"><PermissionDeniedState /></div>;
  }

  if (isLoading) {
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
        No data found for this task template.
      </div>
    );
  }

  const templateInfo = data?.data || {};
  const assignedUsers = templateInfo?.assignedUsers || [];
  const recurringSettings = templateInfo?.recurringSettings || {};

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={BREADCRUMBS} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {templateInfo?.title || "Task Template"}
            {recurringSettings?.recurringType && (
              <Badge variant="secondary">
                {RECURRING_TYPE_LABELS[recurringSettings.recurringType] ||
                  "Unknown"}
              </Badge>
            )}
          </h1>
        </div>
        <PermissionGuard moduleId={12} action="update">
          <Button
            onClick={() => router.push(`/dashboard/task/template/${id}/edit`)}
            className="flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit Template
          </Button>
        </PermissionGuard>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div>
          <div>Created On</div>
          <div className="text-foreground font-medium">
            {formatDate(templateInfo?.createdAt)}
          </div>
        </div>
      </div>

      <Separator />

      {/* Description */}
      {templateInfo?.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {templateInfo.description}
            </p>
          </CardContent>
        </Card>
      )}

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
                  {user.name || "Unknown User"}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No users assigned to this template.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Settings */}
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
                  {recurringSettings.startDate
                    ? formatDate(recurringSettings.startDate)
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">End Date</p>
                <p className="font-medium text-gray-800">
                  {recurringSettings.endDate
                    ? formatDate(recurringSettings.endDate)
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Interval</p>
                <p className="font-medium text-gray-800">
                  {recurringSettings.interval || "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Recurring Type</p>
                <p className="font-medium text-gray-800">
                  {recurringSettings.recurringType
                    ? RECURRING_TYPE_LABELS[recurringSettings.recurringType] ||
                    "Unknown"
                    : "—"}
                </p>
              </div>

              {recurringSettings.daysOfWeek?.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-gray-500 mb-1">Days of Week</p>
                  <div className="flex flex-wrap gap-2">
                    {recurringSettings.daysOfWeek.map((day: number) => (
                      <span
                        key={day}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                      >
                        {DAY_NAMES[day]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Task Occurrences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned Users</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task: any) => {
                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer transition hover:bg-muted/60"
                      onClick={() =>
                        router.push(`/dashboard/task-detail/${task.id}`)
                      }
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex flex-col">
                          <span className="line-clamp-1">
                            {task?.title || "Untitled Template"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(task?.startDate)}</TableCell>
                      <TableCell>{formatDate(task?.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(task?.status)}>
                          {TaskStatusEnum[task?.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TaskTypeEnum[task?.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <MembersCell
                          members={task?.assignedUsers}
                          maxVisible={5}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {task?.createdByName || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(task?.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoadingOccurence && tasks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No task occurrences found.
                    </TableCell>
                  </TableRow>
                )}
                {isLoadingOccurence && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-6 text-muted-foreground"
                    >
                      <p>Loading...</p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskTemplateDetailPage;

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
