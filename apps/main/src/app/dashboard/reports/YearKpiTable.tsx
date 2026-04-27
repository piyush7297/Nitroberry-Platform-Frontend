import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { ReportYear } from "./types";

export function YearKpiTable({ data }: { data: ReportYear[] }) {
  return (
    <Table className="border rounded-lg overflow-hidden">
      <TableHeader className="bg-gray-100">
        <TableRow>
          <TableHead>Sr. No.</TableHead>
          <TableHead>Employee Name</TableHead>
          <TableHead>Total Planned</TableHead>
          <TableHead>Total Done</TableHead>
          <TableHead>KPI Score of FY(2022-23)</TableHead>
          <TableHead>KPI Score of FY(2023-24)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((r, idx) => (
          <TableRow key={idx} className={idx % 2 ? "bg-muted/30" : ""}>
            <TableCell>{idx + 1}</TableCell>
            <TableCell>{r.empName}</TableCell>
            <TableCell>{r.totalPlanned}</TableCell>
            <TableCell>{r.totalDone}</TableCell>
            <TableCell>{r.kpiScoreYearPreviousYear}</TableCell>
            <TableCell>{r.kpiScoreYearCurrentYear}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
