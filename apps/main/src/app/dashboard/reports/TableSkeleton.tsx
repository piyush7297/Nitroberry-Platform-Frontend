import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  cols = 8,
  rows = 8,
}: {
  cols?: number;
  rows?: number;
}) {
  return (
    <Table className="min-h-[200px]">
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="w-full h-4" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <TableRow key={rIdx}>
            {Array.from({ length: cols }).map((_, cIdx) => (
              <TableCell key={cIdx}>
                <Skeleton className="w-full h-4" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
