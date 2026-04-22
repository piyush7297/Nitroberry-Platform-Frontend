import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { MembersCell } from "../users/page";
import type { ReportStep } from "@/lib/interfaces";

export function StepsReportTable({ data }: { data: ReportStep[] }) {
  return (
    <Table className="border rounded-lg overflow-hidden">
      <TableHeader className="bg-gray-100">
        <TableRow>
          <TableHead>Workflow Name</TableHead>
          <TableHead>Step</TableHead>
          <TableHead>Doer</TableHead>
          <TableHead>Reference Code</TableHead>
          <TableHead>Planned</TableHead>
          <TableHead>Actual</TableHead>
          <TableHead>Reason for Delay</TableHead>
          <TableHead>Time delay</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((r, idx) => (
          <TableRow key={idx} className={idx % 2 ? "bg-muted/30" : ""}>
            <TableCell>{r.fmsName}</TableCell>
            <TableCell>{r.stepName}</TableCell>
            <TableCell>
              <MembersCell members={r.users} maxVisible={5} />
            </TableCell>
            <TableCell>{r.referenceCode ?? "-"}</TableCell>
            <TableCell>{r.scheduleEnd ?? "-"}</TableCell>
            <TableCell>{r.actualEnd ?? "-"}</TableCell>
            <TableCell>{r.reasonForDelay ?? "-"}</TableCell>
            <TableCell>{r.delay ?? "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
