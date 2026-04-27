"use client";

import { TaskStatusEnum, TaskTypeEnum } from "@/lib/enums/routes.enum";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Pagination } from "../users/pagination";
import { MembersCell } from "../users/page";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/not-found";
import { formatDateTime, getStatusInfo, STATUSTABLE } from "@/lib/utils";

interface DelegationsProps {
  tasks: any[];
  isTaskLoading: boolean;
  start: number;
  limit: number;
  total: number;
  pagination: any;
  onPageChange: (newStart: number) => void;
  onLimitChange: (newLimit: number) => void;
}

const TASK_TYPE_OPTIONS = [
  { value: TaskTypeEnum.HELP, label: "Help" },
  { value: TaskTypeEnum.DELEGATION, label: "Delegation" },
  { value: TaskTypeEnum.RECURRING, label: "Recurring" },
  //   { value: TaskTypeEnum.FLOW, label: "Flow" },
  //   { value: TaskTypeEnum.DRAFT_INDENT, label: "Draft Indent" },
];

const TASK_STATUS_OPTIONS = [
  { value: TaskStatusEnum.PENDING, label: "Pending" },
  { value: TaskStatusEnum.COMPLETED, label: "Completed" },
  //   { value: TaskStatusEnum.MISSED, label: "Missed" },
];

const TASK_TYPE_LABEL: Record<number, string> = TASK_TYPE_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<number, string>,
);

const TASK_STATUS_LABEL: Record<number, string> = TASK_STATUS_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<number, string>,
);

const getStatusVariant = (status?: number) => {
  switch (status) {
    case TaskStatusEnum.COMPLETED:
      return "active" as const;
    case TaskStatusEnum.PENDING:
      return "disabled" as const;
    default:
      return "outline" as const;
  }
};
export default function Delegations({
  tasks,
  isTaskLoading,
  start,
  limit,
  total,
  pagination,
  onPageChange,
  onLimitChange,
}: DelegationsProps) {
  const router = useRouter();
  const hasData = tasks.length > 0 || isTaskLoading;

  return (
    <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
      {hasData ? (
        <>
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Task Title</TableHead>
                <TableHead>Assignd User</TableHead>
                <TableHead>Task Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Created At</TableHead>
                {/* <TableHead>Action</TableHead> */}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isTaskLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-gray-500"
                  >
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task: any, index: number) => (
                  <TableRow
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/task-detail/${task.id}`)
                    }
                  >
                    <TableCell>{index + 1}</TableCell>
                    {/* --- Task Title --- */}
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        Created by {task.createdByName || "—"}
                      </div>
                    </TableCell>

                    {/* --- Assigned Users --- */}
                    <TableCell>
                      <MembersCell
                        members={task.assignedUsers}
                        maxVisible={5}
                      />
                    </TableCell>
                    <TableCell>
                      {/* <Badge variant={getStatusVariant(task?.status)}>
                        {task.status ? TASK_STATUS_LABEL[task?.status] : "Unknown"}
                      </Badge> */}
                      <Badge
                        variant={
                          getStatusInfo(STATUSTABLE.TASK_STATUS, task?.status)
                            ?.variant as any
                        }
                      >
                        {
                          getStatusInfo(STATUSTABLE.TASK_STATUS, task?.status)
                            .name
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(task?.startDate)}</TableCell>
                    <TableCell>{formatDateTime(task?.endDate)}</TableCell>

                    {/* --- Created At --- */}
                    <TableCell>
                      {formatDateTime(task.createdAt) || "—"}
                    </TableCell>

                    {/* --- Actions --- */}
                    {/* <TableCell>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/task-detail/${task.id}`)}>
                        View
                      </Button>
                      <Button className="ml-2" variant="outline" size="sm" onClick={() => taskEdit(task.id)}>
                        Edit
                      </Button>
                    </TableCell> */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {tasks.length > 0 && (
            <div className="border-t px-4 pb-4">
              <Pagination
                start={start}
                limit={limit}
                total={total}
                pagination={pagination}
                onPageChange={(newStart) => onPageChange(newStart)}
                onLimitChange={(newLimit) => onLimitChange(newLimit)}
              />
            </div>
          )}
        </>
      ) : (
        <div className="py-12">
          <EmptyState
            title="No tasks found"
            description="No tasks found"
            onClick={() => {}}
            buttonTitle=""
          />
        </div>
      )}
    </div>
  );
}
