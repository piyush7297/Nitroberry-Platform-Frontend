import React, { memo } from "react";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/not-found";
import { Badge } from "@/components/ui/badge";
import { TaskStatusEnum } from "@/shared/enums/routes.enum";
import { getBadgeVariant } from "@/lib/utils";

interface DraftIndentTabComponentsProps {
  draftIndentTasks: any[];
  isDraftIndentTaskLoading: boolean;
  start: number;
  limit: number;
  total: number;
  pagination: any;
  onPageChange: (newStart: number) => void;
  onLimitChange: (newLimit: number) => void;
}

const DraftIndentTabComponents = ({
  draftIndentTasks,
  isDraftIndentTaskLoading,
  start,
  limit,
  total,
  pagination,
  onPageChange,
  onLimitChange,
}: DraftIndentTabComponentsProps) => {
  const router = useRouter();
  const hasData = draftIndentTasks.length > 0 || isDraftIndentTaskLoading;

  return (
    <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
      {hasData ? (
        <>
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Task Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isDraftIndentTaskLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-6 text-gray-500"
                  >
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : (
                draftIndentTasks.map((task: any, index: any) => (
                  <TableRow
                    key={task.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/fms-indents/draft-list/${task.id}`,
                      )
                    }
                  >
                    <TableCell>{index + 1}</TableCell>

                    {/* --- Task Title --- */}
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {task.fms}
                      </div>
                    </TableCell>

                    {/* --- Assigned Users --- */}
                    <TableCell>
                      <Badge variant={getBadgeVariant(task?.verifierStatus)}>
                        {task?.verifierStatus}
                      </Badge>
                    </TableCell>

                    {/* --- Created At --- */}
                    <TableCell>
                      {task.createdAt
                        ? new Date(task.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {draftIndentTasks.length > 0 && (
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
            title="No Draft Indents Found"
            description="You haven't created any draft indents yet."
            onClick={() => {}}
            buttonTitle=""
          />
        </div>
      )}
    </div>
  );
};

export const DraftIndentTab = memo(DraftIndentTabComponents);
