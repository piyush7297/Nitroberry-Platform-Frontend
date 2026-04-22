"use client";

import React, { useState, useMemo } from "react";
import { EmptyState } from "@/components/not-found";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "../users/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { MembersCell } from "../users/page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { client } from "@/api/client";
import { toast } from "@/hooks/use-toast";
import { Download, Filter, Loader2 } from "lucide-react";
import { UserSearch } from "@/components/user-search";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";
import { PdfIcon, CsvIcon, ExcelIcon } from "@/components/icons/ExportIcons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportScheduleSection } from "./report-schedule-section";

const REPORT_TYPES = [
  { value: 1, label: "Operation Summary Reports" },
  { value: 2, label: "Detailed Reports" },
  { value: 3, label: "Yearly KPI Reports" },
];

const EXPORT_TYPE_OPTIONS = [
  {
    value: "1",
    label: "CSV",
    extension: "csv",
    mimeType: "text/csv",
    icon: CsvIcon
  },
  {
    value: "2",
    label: "PDF",
    extension: "pdf",
    mimeType: "application/pdf",
    icon: PdfIcon
  },
  {
    value: "3",
    label: "Excel",
    extension: "xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    icon: ExcelIcon
  },
] as const;

// TypeScript interfaces for clarity and IDE help
interface ReportStep {
  fmsName: string;
  stepName: string;
  referenceCode: string;
  scheduleEnd: string;
  actualStartDateTime: string;
  actualEnd: string;
  delay: string;
  users: { id: string; fullname: string }[];
  reasonForDelay: string;
}
interface ReportKPI {
  doerName: string;
  kpiScore: string;
  weeklyScore: string;
  totalPlanned: string;
  completed: string;
  taskPending: string;
  doneOnTime: string;
  taskOnDelay: string;
}
interface ReportYear {
  empName: string;
  totalPlanned: string;
  totalDone: string;
  kpiScoreYearPreviousYear: string;
  kpiScoreYearCurrentYear: string;
}

type PagType = {
  start: number;
  limit: number;
  total: number;
  next?: number | null;
  pagination?: any;
};

function getReportPagination(selectedType: number, rawData: any): PagType {
  if (!rawData?.data) return { start: 1, limit: 10, total: 0 };
  if (selectedType === 1) {
    return {
      start: Number(rawData.data.pagination?.start ?? 1),
      limit: Number(rawData.data.pagination?.limit ?? 10),
      total: Number(rawData.data.pagination?.total ?? 0),
      next: rawData.data.pagination?.next,
      pagination: rawData.data.pagination,
    };
  }
  // For types 2/3 with nesting
  const inner = rawData.data.pagination?.pagination || {};
  return {
    start: Number(inner.start ?? 1),
    limit: Number(inner.limit ?? 10),
    total: Number(inner.total ?? 0),
    next: inner.next,
    pagination: inner,
  };
}

function getReportsData<T>(selectedType: number, rawData: any): T[] {
  if (!rawData?.data) return [] as T[];
  if (selectedType === 1) return (rawData.data.reports || []) as T[];
  return (rawData.data.report || []) as T[];
}

function TableSkeleton({
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

// === TABLES ===
function StepsReportTable({ data }: { data: ReportStep[] }) {
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

function KPITable({ data }: { data: ReportKPI[] }) {
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

function YearKpiTable({ data }: { data: ReportYear[] }) {
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

export default function Reports() {
  const [selectedType, setSelectedType] = useState<number>(1);
  const [page, setPage] = useState<Record<number, number>>({
    1: 1,
    2: 1,
    3: 1,
  });
  const [limit, setLimit] = useState<Record<number, number>>({
    1: 10,
    2: 1000,
    3: 10,
  });
  const [filters, setFilters] = useState({
    fmsIds: "",
    doerIds: "",
    stepIds: "",
    delayStatus: false,
    minDelay: "",
    maxDelay: "",
    fromDate: "",
    toDate: "",
    referenceCode: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<"1" | "2" | "3">("1");
  const [isExporting, setIsExporting] = useState(false);

  const { hasAccess: canRead, create: canCreate } = useModulePermissions(14);

  const handleApplyFilters = () => {
    setPage((prev) => ({ ...prev, [selectedType]: 1 }));
    setAppliedFilters(filters);
    setIsFilterOpen(false);
  };

  const buildQuery = useMemo(() => {
    const params = new URLSearchParams({
      type: String(selectedType),
      start: String(page[selectedType]),
      limit: String(limit[selectedType]),
    });

    if (appliedFilters.fmsIds) params.append("fmsIds", appliedFilters.fmsIds);
    if (appliedFilters.doerIds)
      params.append("doerIds", appliedFilters.doerIds);
    if (appliedFilters.stepIds)
      params.append("stepIds", appliedFilters.stepIds);
    if (appliedFilters.referenceCode)
      params.append("refrenceCode", appliedFilters.referenceCode);
    params.append("delayStatus", String(appliedFilters.delayStatus));
    if (appliedFilters.minDelay)
      params.append("minDelay", appliedFilters.minDelay);
    if (appliedFilters.maxDelay)
      params.append("maxDelay", appliedFilters.maxDelay);
    if (appliedFilters.fromDate)
      params.append("fromDate", appliedFilters.fromDate);
    if (appliedFilters.toDate) params.append("toDate", appliedFilters.toDate);

    return params.toString();
  }, [selectedType, page, limit, appliedFilters]);

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportSubmit = async () => {
    const selectedOption = EXPORT_TYPE_OPTIONS.find(
      (option) => option.value === selectedExportType,
    );
    if (!selectedOption) return;

    setIsExporting(true);
    try {
      const exportParams = new URLSearchParams(buildQuery);
      exportParams.set("isReportGenerated", "true");
      exportParams.set("reportType", selectedExportType);

      const response = await client.get(
        `${API_ENDPOINTS.REPORTS}/?${exportParams.toString()}`,
        { responseType: "arraybuffer" },
      );

      const fileName = `reports_type_${selectedType}_${new Date().toISOString().split("T")[0]}.${selectedOption.extension}`;
      const blob = new Blob([response.data], { type: selectedOption.mimeType });
      downloadFile(blob, fileName);

      toast({
        title: "Success!",
        description: "Report export started.",
        variant: "default",
      });
      setIsExportOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed!",
        description:
          error?.response?.data?.message ||
          "Could not export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const { data: rawData, isLoading } = useApiQuery(
    [
      "Reports",
      selectedType,
      page[selectedType],
      limit[selectedType],
      appliedFilters,
    ],
    `${API_ENDPOINTS.REPORTS}/?${buildQuery}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );

  // Memoize pagination info + rows
  const pag = useMemo(
    () => getReportPagination(selectedType, rawData),
    [selectedType, rawData],
  );
  const reports1 = useMemo(
    () => getReportsData<ReportStep>(1, rawData),
    [rawData],
  );
  const reports2 = useMemo(
    () => getReportsData<ReportKPI>(2, rawData),
    [rawData],
  );
  const reports3 = useMemo(
    () => getReportsData<ReportYear>(3, rawData),
    [rawData],
  );

  let tableRender = null;
  if (selectedType === 1) tableRender = <StepsReportTable data={reports1} />;
  else if (selectedType === 2) tableRender = <KPITable data={reports2} />;
  else if (selectedType === 3) tableRender = <YearKpiTable data={reports3} />;

  // For skeleton: set column count per type
  const skeletonCols = selectedType === 1 ? 7 : selectedType === 2 ? 8 : 6;

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 space-y-3 sm:p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and filter reports by type, or set up automated schedules.
          </p>
        </div>
      </div>
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="schedule">Report schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-3 outline-none">
      <Separator />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-xs">
          <Select
            value={String(selectedType)}
            onValueChange={(v) => setSelectedType(Number(v))}
          >
            <SelectTrigger size="sm" className="w-60">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type.value} value={String(type.value)}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <PermissionGuard moduleId={14} action="read">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 w-full sm:w-auto"
              onClick={() => setIsExportOpen(true)}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </PermissionGuard>
          {selectedType === 1 && (
            <PermissionGuard moduleId={14} action="read">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                onClick={() => setIsFilterOpen(true)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </PermissionGuard>
          )}
        </div>
      </div>

      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the format for exporting the current report view.
            </p>

            <RadioGroup
              value={selectedExportType}
              onValueChange={(value) =>
                setSelectedExportType(value as "1" | "2" | "3")
              }
              className="space-y-2"
            >
              {EXPORT_TYPE_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Label
                    key={option.value}
                    htmlFor={`export-type-${option.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors hover:bg-slate-50"
                  >
                    <RadioGroupItem
                      id={`export-type-${option.value}`}
                      value={option.value}
                    />
                    <IconComponent className="h-6 w-6 text-slate-700" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsExportOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <PermissionGuard moduleId={14} action="read">
              <Button
                type="button"
                onClick={handleExportSubmit}
                disabled={isExporting}
              >
                {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
                Export
              </Button>
            </PermissionGuard>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            <div className="space-y-1.5 col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="fmsIds">FMS IDs</Label>
                <Input
                  id="fmsIds"
                  placeholder="Comma separated"
                  value={filters.fmsIds}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, fmsIds: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stepIds">Step IDs</Label>
              <Input
                id="stepIds"
                placeholder="Comma separated"
                value={filters.stepIds}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, stepIds: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referenceCode">Reference codes</Label>
              <Input
                id="referenceCode"
                placeholder="Comma separated"
                value={filters.referenceCode}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    referenceCode: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minDelay">Min delay (days)</Label>
              <Input
                id="minDelay"
                type="number"
                placeholder="e.g. 1"
                value={filters.minDelay}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minDelay: e.target.value }))
                }
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxDelay">Max delay (days)</Label>
              <Input
                id="maxDelay"
                type="number"
                placeholder="e.g. 10"
                value={filters.maxDelay}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, maxDelay: e.target.value }))
                }
                min={0}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fromDate">From date</Label>
              <Input
                id="fromDate"
                type="date"
                value={filters.fromDate}
                max="9999-12-31"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toDate">To date</Label>
              <Input
                id="toDate"
                type="date"
                value={filters.toDate}
                max="9999-12-31"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, toDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="doerIds">Doer IDs</Label>
                <UserSearch
                  search={userSearch}
                  setSearch={setUserSearch}
                  onSelect={setSelectedUser}
                  isFocused={showUserDropdown}
                  setIsFocused={setShowUserDropdown}
                  showDropdown={showUserDropdown}
                  setShowDropdown={setShowUserDropdown}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onFocus={() => setShowUserDropdown(true)}
                  onBlur={() => setShowUserDropdown(false)}
                  marginTop="-mt-4"
                  placeholder="Search doer"
                  selectedUserIds={selectedUser?.id ? [selectedUser.id] : []}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delayStatus" className="flex items-center gap-2">
                <input
                  id="delayStatus"
                  type="checkbox"
                  checked={filters.delayStatus}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      delayStatus: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground">
                  Only delayed
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFilters({
                  fmsIds: "",
                  doerIds: "",
                  stepIds: "",
                  delayStatus: false,
                  minDelay: "",
                  maxDelay: "",
                  fromDate: "",
                  toDate: "",
                  referenceCode: "",
                });
                setAppliedFilters({
                  fmsIds: "",
                  doerIds: "",
                  stepIds: "",
                  delayStatus: false,
                  minDelay: "",
                  maxDelay: "",
                  fromDate: "",
                  toDate: "",
                  referenceCode: "",
                });
                setPage((prev) => ({ ...prev, [selectedType]: 1 }));
                setIsFilterOpen(false);
              }}
            >
              Clear
            </Button>
            <Button type="button" onClick={handleApplyFilters}>
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isLoading ? (
        <TableSkeleton cols={skeletonCols} rows={8} />
      ) : (selectedType === 1 && reports1.length === 0) ||
        (selectedType === 2 && reports2.length === 0) ||
        (selectedType === 3 && reports3.length === 0) ? (
        <div className="flex justify-center items-center h-[60vh]">
          <EmptyState
            onClick={() => console.log("Add Report")}
            buttonTitle={canCreate ? "Create New Report" : ""}
            title="No Reports Yet"
            description="You havenâ€™t generated any reports yet. Create your first report to get started."
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg">
            {tableRender}
            <div className="border-t px-4 pb-4">
              <Pagination
                start={pag.start}
                limit={pag.limit}
                total={pag.total}
                pagination={pag}
                onPageChange={(newStart) =>
                  setPage((prev) => ({ ...prev, [selectedType]: newStart }))
                }
                onLimitChange={(newLimit) =>
                  setLimit((prev) => ({ ...prev, [selectedType]: newLimit }))
                }
              />
            </div>
          </div>
        </>
      )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 outline-none">
          <ReportScheduleSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

