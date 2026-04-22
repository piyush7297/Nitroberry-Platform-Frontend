import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PRIORITY_ENUM } from "@/lib/enums/routes.enum";
import { MembersCell } from "../users/page";
import { Badge } from "@/components/ui/badge";
import { getBadgeVariant, getStatusInfo, STATUSTABLE } from "@/lib/utils";

export function TaskAnalytics({ data }: { data: any[] }) {
  return (
    <Table>
      <TableHeader className="bg-gray-100">
        <TableRow>
          <TableHead>Task Name</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned Users</TableHead>
          <TableHead>Scheduled Date</TableHead>
          <TableHead>Actual Date</TableHead>
          <TableHead>Performance Status</TableHead>
          <TableHead>Delay Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item: any) => (
          <TableRow key={item.taskId} className="hover:bg-gray-50">
            {/* Task Name */}
            <TableCell className="font-medium">
              {item.taskName || "N/A"}
            </TableCell>

            {/* Priority */}
            <TableCell>
              <Badge
                variant={
                  getStatusInfo(STATUSTABLE.PRIORITY, item.priority)
                    ?.variant as any
                }
              >
                {getStatusInfo(STATUSTABLE.PRIORITY, item.priority)?.name}
              </Badge>
            </TableCell>

            {/* Status */}
            <TableCell>
              <Badge
                variant={
                  getStatusInfo(STATUSTABLE.TASK_STATUS, item.status)
                    ?.variant as any
                }
              >
                {getStatusInfo(STATUSTABLE.TASK_STATUS, item.status)?.name}
              </Badge>
            </TableCell>

            {/* Assigned Users */}
            <TableCell>
              <MembersCell members={item.assignedUsers} maxVisible={5} />
            </TableCell>

            {/* Scheduled Date */}
            <TableCell>
              {item.scheduledDate
                ? new Date(item.scheduledDate).toLocaleDateString()
                : "N/A"}
            </TableCell>

            {/* Actual Date */}
            <TableCell>
              {item.actualDate
                ? new Date(item.actualDate).toLocaleDateString()
                : "N/A"}
            </TableCell>

            {/* Performance Status */}
            <TableCell>
              <span
                className={`${
                  item.performanceStatus === "Completed"
                    ? "text-green-600"
                    : item.performanceStatus === "Pending"
                      ? "text-yellow-600"
                      : item.performanceStatus === "Delayed"
                        ? "text-red-600"
                        : "text-gray-600"
                }`}
              >
                {item.performanceStatus || "N/A"}
              </span>
            </TableCell>

            {/* Delay Duration */}
            <TableCell>{item.delayDuration || "N/A"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
