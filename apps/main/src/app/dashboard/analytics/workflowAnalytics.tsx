import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MembersCell } from "../users/page";
import { getStatusInfo, STATUSTABLE } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function WorkflowAnalytics({ data }: { data: any[] }) {
  return (
    <Table>
      <TableHeader className="bg-gray-100">
        <TableRow>
          <TableHead className="text-sm px-2 py-2">Workflow Name</TableHead>
          <TableHead className="text-sm px-2 py-2">Step Name</TableHead>
          <TableHead className="text-sm px-2 py-2">Reference Code</TableHead>
          <TableHead className="text-sm px-2 py-2">Step Status</TableHead>
          <TableHead className="text-sm px-2 py-2">Assigned Users</TableHead>
          <TableHead className="text-sm px-2 py-2">Scheduled Date</TableHead>
          <TableHead className="text-sm px-2 py-2">Actual Date</TableHead>
          <TableHead className="text-sm px-2 py-2">
            Performance Status
          </TableHead>
          <TableHead className="text-sm px-2 py-2">Delay Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item: any) => (
          <TableRow key={item.stepId} className="hover:bg-gray-50">
            <TableCell className="font-medium max-w-[120px] text-sm px-2 py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate cursor-default">
                    {item.fmsName || "N/A"}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs break-words">
                    {item.fmsName || "N/A"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className="max-w-[110px] text-sm px-2 py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate cursor-default">
                    {item.stepName || "N/A"}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs break-words">
                    {item.stepName || "N/A"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className="max-w-[100px] text-sm px-2 py-2">
              {item.referenceNumber || "N/A"}
            </TableCell>
            <TableCell className="max-w-[90px] px-2 py-2">
              <Badge
                variant={
                  getStatusInfo(STATUSTABLE.FLOWSTEP, item.stepStatus)
                    ?.variant as any
                }
                className="text-xs"
              >
                {getStatusInfo(STATUSTABLE.FLOWSTEP, item.stepStatus)?.name}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[120px] px-2 py-2">
              <MembersCell members={item.assignedUsers} maxVisible={3} />
            </TableCell>
            <TableCell className="max-w-[110px] text-sm px-2 py-2">
              {item.scheduledDate ? (
                <div className="flex flex-col">
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(item.scheduledDate))}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Intl.DateTimeFormat("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }).format(new Date(item.scheduledDate))}
                  </span>
                </div>
              ) : (
                "N/A"
              )}
            </TableCell>
            <TableCell className="max-w-[110px] text-sm px-2 py-2">
              {item.actualDate ? (
                <div className="flex flex-col">
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(item.actualDate))}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Intl.DateTimeFormat("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }).format(new Date(item.actualDate))}
                  </span>
                </div>
              ) : (
                "N/A"
              )}
            </TableCell>
            <TableCell className="max-w-[100px] text-sm px-2 py-2">
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
            <TableCell className="max-w-[90px] text-sm px-2 py-2">
              {item.delayDuration || "N/A"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
