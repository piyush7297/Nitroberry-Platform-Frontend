"use client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Recurring({ tasks, refetch, isTaskLoading }: any) {
  return (
    <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-gray-100">
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Task Title</TableHead>
            <TableHead>Assignd User</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isTaskLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                Loading tasks...
              </TableCell>
            </TableRow>
          ) : tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                No tasks found.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task: any) => (
              <TableRow key={task.id} className="hover:bg-gray-50">
                {/* --- Task Title --- */}
                <TableCell>
                  <div className="font-medium text-gray-900">{task.title}</div>
                  <div className="text-xs text-gray-500">
                    Created by {task.createdByName || "—"}
                  </div>
                </TableCell>

                {/* --- Assigned Users --- */}
                <TableCell>
                  {task.assignedUsers?.length ? (
                    <div className="space-y-1">
                      {task.assignedUsers.map((user: any) => (
                        <div key={user.id} className="text-sm text-gray-700">
                          {user.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </TableCell>

                {/* --- Created At --- */}
                <TableCell>
                  {task.cratedAt
                    ? new Date(task.cratedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </TableCell>

                {/* --- Actions --- */}
                <TableCell className="text-right">
                  -
                  {/* <Button variant="outline" size="sm">
                    Edit
                  </Button> */}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
