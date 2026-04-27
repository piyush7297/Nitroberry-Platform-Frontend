import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { ReportKPI } from "@/lib/interfaces/index";

export function KPITable({ data }: { data: ReportKPI[] }) {
  return (
    <Table className="border rounded-lg overflow-hidden">
      <TableHeader className="bg-gray-100">
        <TableRow>
          <TableHead>Doer Name</TableHead>
          <TableHead>KPI Score</TableHead>
          <TableHead>Weekly Score</TableHead>
          <TableHead>Total Planned</TableHead>
          <TableHead>Completed</TableHead>
          <TableHead>Task Pending</TableHead>
          <TableHead>Done on Time</TableHead>
          <TableHead>Task done Delay</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((r, idx) => (
          <TableRow key={idx} className={idx % 2 ? "bg-muted/30" : ""}>
            <TableCell>{r.doerName}</TableCell>
            <TableCell>{r.kpiScore}</TableCell>
            <TableCell>{r.weeklyScore}</TableCell>
            <TableCell>{r.totalPlanned}</TableCell>
            <TableCell>{r.completed}</TableCell>
            <TableCell>{r.taskPending}</TableCell>
            <TableCell>{r.doneOnTime}</TableCell>
            <TableCell>{r.taskOnDelay}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
