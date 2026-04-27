"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Separator } from "@/components/ui/separator";
import { Pagination } from "../users/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, getStatusInfo, STATUSTABLE } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarClock,
  CheckSquare,
  ChevronDown,
  Download,
  KanbanSquare,
  LayoutGrid,
  ListChecks,
  Loader,
  Mail,
  MoreVertical,
  Share2,
  Table2,
  TicketX,
  TimerIcon,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FMSINDENTSTATUS, FMSSTATUSVALUE, PRIORITY_ENUM, RoutesEnum } from "@/lib/enums/routes.enum";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import * as XLSX from "xlsx";
import { HTTP_METHODS } from "@/api/methods";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const statusOptions = [
  { value: FMSINDENTSTATUS.APPROVED, label: "Approved" },
  { value: FMSINDENTSTATUS.REJECTED, label: "Pending" },
  { value: FMSINDENTSTATUS.INPROGRESS, label: "In Progress" },
  { value: FMSINDENTSTATUS.CANCELLED, label: "Cancelled" },
];

const downloadExcelFile = (excelData: ArrayBuffer, filename: string) => {
  // Read workbook from binary
  const workbook = XLSX.read(excelData, { type: "array" });

  // Write workbook to Excel binary
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadPdfFile = (data: ArrayBuffer, filename: string) => {
  const blob = new Blob([data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

const kanbanColumns = [
  {
    id: "approved",
    label: "Approved",
    cardBg: "bg-green-50",
    headerBg: "bg-green-100",
    accentText: "text-green-700",
    countBadge: "bg-green-200 text-green-800",
    borderAccent: "border-green-200",
  },
  {
    id: "inProgress",
    label: "In Progress",
    cardBg: "bg-yellow-50",
    headerBg: "bg-yellow-100",
    accentText: "text-yellow-700",
    countBadge: "bg-yellow-200 text-yellow-800",
    borderAccent: "border-yellow-200",
  },
  {
    id: "pending",
    label: "Pending",
    cardBg: "bg-red-50",
    headerBg: "bg-red-100",
    accentText: "text-red-700",
    countBadge: "bg-red-200 text-red-800",
    borderAccent: "border-red-200",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    cardBg: "bg-gray-50",
    headerBg: "bg-gray-100",
    accentText: "text-gray-600",
    countBadge: "bg-gray-200 text-gray-700",
    borderAccent: "border-gray-300",
  },
];

type ViewType = "grid" | "table" | "kanban";
const STEP_STATUS_ENUM = [
  { value: FMSSTATUSVALUE.COMPLETED, label: "Completed" },
  { value: FMSSTATUSVALUE.CANCELLED, label: "Cancelled" },
  { value: FMSSTATUSVALUE.NOTSTARTED, label: "Not Started" },
  { value: FMSSTATUSVALUE.INPROGRESS, label: "In Progress" },
  { value: FMSSTATUSVALUE.NOTAPPLICABLE, label: "Not Applicable" },
];
const FMSPage = () => {
  const router = useRouter();

  const { hasAccess: canRead, update: canUpdate } = useModulePermissions(1);

  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<number[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [stepStatus, setStepStatus] = useState<number[]>([]);
  const [view, setView] = useState<ViewType>("table");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFmsItem, setSelectedFmsItem] = useState<any>(null);
  const [exportIndentData, setExportIndentData] = useState(true);
  const [exportAllStepData, setExportAllStepData] = useState(true);
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [exportType, setExportType] = useState<"csv" | "excel" | "pdf">("csv");
  const [shareEmail, setShareEmail] = useState<string[]>([]);
  const [currentEmailInput, setCurrentEmailInput] = useState("");
  const [shareExpiry, setShareExpiry] = useState("");
  const [shareAllStepData, setShareAllStepData] = useState(true);
  const [shareSelectedSteps, setShareSelectedSteps] = useState<string[]>([]);
  const [shareError, setShareError] = useState<string | null>(null);

  const [cancelFmsDialogOpen, setCancelFmsDialogOpen] = useState(false);
  const [selectedCancelFmsItem, setSelectedCancelFmsItem] = useState<any>(null);
  const [cancelComment, setCancelComment] = useState("");
  const [isCancellingFms, setIsCancellingFms] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { data, isLoading, refetch } = useApiQuery(
    [
      "INDENTS_LIST_FMS",
      start,
      limit,
      status.join(","),
      view,
      priorityFilter.join(","),
      stepStatus.join(","),
    ],
    `${API_ENDPOINTS.FMS}?start=${start}&limit=${limit}&status=${status.length > 0 ? status.join(",") : ""
    }&type=${view === "kanban" ? 1 : 2}&priority=${priorityFilter.join(
      ",",
    )}&fmsStepStatus=${stepStatus.join(",")}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const,
  );

  const shareGanttChart = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.FMS_GANTT_CHART_SHARE,
  );

  const cancelFms = useStatusMutation(
    HTTP_METHODS.PATCH,
    ({ id }) => `${API_ENDPOINTS.FMS_CANCEL}/${id}/cancel`,
  );
  // Fetch FMS details when dialog opens
  const shouldFetchFmsDetails =
    !!selectedFmsItem?.id && (exportDialogOpen || shareDialogOpen);

  const todayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  const maxShareExpiryDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split("T")[0];
  }, []);

  const { data: fmsDetailsData } = useApiQuery(
    ["FmsExportDetails", selectedFmsItem?.id],
    selectedFmsItem?.id ? `fms/${selectedFmsItem.id}` : "",
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: shouldFetchFmsDetails && canRead,
    } as const,
  );

  const fmsSteps = fmsDetailsData?.data?.steps || [];
  const totalShareableSteps = fmsSteps.length;
  const selectedShareCount = shareAllStepData
    ? totalShareableSteps
    : shareSelectedSteps.length;
  const selectedExportCount = exportAllStepData
    ? totalShareableSteps
    : selectedSteps.length;
  const formattedShareExpiry = shareExpiry ? formatDateTime(shareExpiry) : null;

  // Filter columns based on selected status
  const filteredColumns = useMemo(() => {
    if (status.length === 0) {
      return kanbanColumns;
    }
    return kanbanColumns.filter((column) => {
      if (column.id === "approved") {
        return status.includes(FMSINDENTSTATUS.APPROVED);
      } else if (column.id === "inProgress") {
        return status.includes(FMSINDENTSTATUS.INPROGRESS);
      } else if (column.id === "pending") {
        return status.includes(FMSINDENTSTATUS.REJECTED);
      } else if (column.id === "cancelled") {
        return status.includes(FMSINDENTSTATUS.CANCELLED);
      }
      return false;
    });
  }, [status]);

  const indents = data?.data?.fmsList || [];
  const pagination = data?.data?.pagination || {};
  const total = Number(pagination?.total || 0);

  // Group items by status
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {
      approved: [],
      inProgress: [],
      pending: [],
    };
    if (indents && Object.keys(indents).length > 0 && view === "kanban") {
      groups.approved.push(...indents.approved.fmsList);
      groups.inProgress.push(...indents.inProgress.fmsList);
      groups.pending.push(...indents.rejected.fmsList);
    } else if (indents && Array.isArray(indents) && indents.length > 0) {
      indents.forEach((item: any) => {
        const s = Number(item.status);
        if (s === FMSINDENTSTATUS.APPROVED) {
          groups.approved.push(item);
        } else if (s === FMSINDENTSTATUS.INPROGRESS || s === FMSINDENTSTATUS.CANCELLED) {
          groups.inProgress.push(item);
        } else {
          groups.pending.push(item);
        }
      });
    }

    return groups;
  }, [indents]);

  // Export mutation - we'll handle it manually to get blob response

  const handleStatusToggle = (statusValue: number) => {
    setStart(1);
    setStatus((prev) =>
      prev.includes(statusValue)
        ? prev.filter((s) => s !== statusValue)
        : [...prev, statusValue],
    );
  };

  const handlePriorityToggle = (priorityValue: string) => {
    setStart(1);
    setPriorityFilter((prev) =>
      prev.includes(priorityValue)
        ? prev.filter((p) => p !== priorityValue)
        : [...prev, priorityValue],
    );
  };

  const handleStepStatusToggle = (stepStatusValue: number) => {
    setStart(1);
    setStepStatus((prev) =>
      prev.includes(stepStatusValue)
        ? prev.filter((s) => s !== stepStatusValue)
        : [...prev, stepStatusValue],
    );
  };



  const formatFmsStatus = (status?: string) => {
    if (!status) return "Not Started";
    return status.replace(/([A-Z])/g, " $1").trim();
  };

  const handleExportClick = (item: any) => {
    setSelectedFmsItem(item);
    setExportDialogOpen(true);
    setExportIndentData(true);
    setExportAllStepData(true);
    setSelectedSteps([]);
    setExportType("csv");
  };

  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
    setExportIndentData(true);
    setExportAllStepData(true);
    setSelectedSteps([]);
    setExportType("csv");
    if (!shareDialogOpen) {
      setSelectedFmsItem(null);
    }
  };

  const handleStepToggle = (stepId: string) => {
    setSelectedSteps((prev) =>
      prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId],
    );
  };

  const handleShareClick = (item: any) => {
    setSelectedFmsItem(item);
    setShareDialogOpen(true);
    setShareEmail([]);
    setCurrentEmailInput("");
    setShareExpiry("");
    setShareAllStepData(true);
    setShareSelectedSteps([]);
    setShareError(null);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setShareEmail([]);
    setCurrentEmailInput("");
    setShareExpiry("");
    setShareAllStepData(true);
    setShareSelectedSteps([]);
    setShareError(null);
    if (!exportDialogOpen) {
      setSelectedFmsItem(null);
    }
  };

  const handleShareStepToggle = (stepId: string) => {
    setShareSelectedSteps((prev) =>
      prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId],
    );
  };

  const handleClearShareSelection = () => {
    setShareSelectedSteps([]);
  };

  const handleClearExportSelection = () => {
    setSelectedSteps([]);
  };


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
    if (!selectedFmsItem?.id) return;

    setIsExporting(true);

    // Map export type: csv -> 1, excel -> 3, pdf -> 2
    const typeMap: Record<"csv" | "excel" | "pdf", number> = {
      csv: 1,
      excel: 3,
      pdf: 2,
    };

    // File extension and MIME type mapping
    const fileConfig: Record<
      "csv" | "excel" | "pdf",
      { extension: string; mimeType: string }
    > = {
      csv: { extension: "csv", mimeType: "text/csv" },
      excel: {
        extension: "xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      pdf: { extension: "pdf", mimeType: "application/pdf" },
    };

    const payload = {
      id: selectedFmsItem.id,
      type: typeMap[exportType],
      indentData: {
        export: exportIndentData,
      },
      stepData: {
        exportAll: exportAllStepData,
        stepIds: exportAllStepData ? [] : selectedSteps,
      },
    };

    try {
      // const response = await client.post(API_ENDPOINTS.FMS_EXPORT, payload);
      const response = await client.post(API_ENDPOINTS.FMS_EXPORT, payload, {
        responseType: "arraybuffer",
      });
      const config = fileConfig[exportType];
      const fmsName = selectedFmsItem.fms || "fms_export";
      const sanitizedFmsName = fmsName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `${sanitizedFmsName}_${new Date().toISOString().split("T")[0]
        }.${config.extension}`;

      // Create blob with correct MIME type
      if (exportType === "excel") {
        downloadExcelFile(response.data, filename);
      } else if (exportType === "pdf") {
        downloadPdfFile(response.data, filename);
      } else {
        const blobWithType = new Blob([response.data], {
          type: config.mimeType,
        });
        downloadFile(blobWithType, filename);
      }

      handleCloseExportDialog();
    } catch (error: any) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddEmail = () => {
    const trimmedEmail = currentEmailInput.trim();
    if (!trimmedEmail) {
      setShareError("Please enter an email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setShareError("Please enter a valid email address.");
      return;
    }

    if (shareEmail.includes(trimmedEmail)) {
      setShareError("This email has already been added.");
      return;
    }

    setShareError(null);
    setShareEmail((prev) => [...prev, trimmedEmail]);
    setCurrentEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setShareEmail((prev) => prev.filter((email) => email !== emailToRemove));
  };


  const handleShareSubmit = async () => {
    if (!selectedFmsItem?.id) return;

    setShareError(null);

    if (shareEmail.length === 0) {
      setShareError("At least one email is required.");
      return;
    }

    if (!shareExpiry) {
      setShareError("Link expiry date is required.");
      return;
    }

    const expiryDate = new Date(shareExpiry);
    const maxAllowedExpiry = new Date();
    maxAllowedExpiry.setFullYear(maxAllowedExpiry.getFullYear() + 1);

    if (expiryDate > maxAllowedExpiry) {
      setShareError("Link expiry cannot be more than 1 year from today.");
      return;
    }

    if (!shareAllStepData && shareSelectedSteps.length === 0) {
      setShareError("Select at least one step.");
      return;
    }

    setIsSharing(true);
    const payload = {
      id: selectedFmsItem.id,
      email: shareEmail,
      expireAt: shareExpiry,
      isCompleted: false,
      // stepData: {
      //   includeAll: shareAllStepData,
      //   stepIds: shareAllStepData ? [] : shareSelectedSteps,
      // },
      stepIds: shareAllStepData ? [] : shareSelectedSteps,
      delay: null,
    };
    console.log(payload, "payload share");
    shareGanttChart.mutate(payload, {
      onSuccess: async () => {
        handleCloseShareDialog();
        setIsSharing(false);
        toast({
          title: "Success!",
          description: "Share link sent to the emails successfully",
          variant: "default",
        });
      },
      onError: (err) => {
        setIsSharing(false);
      },
    });
  };

  const handleViewTimeline = (item: any) => {
    router.push(`${RoutesEnum.Workflow}/gantt-chart/${item.id}`);
  };

  const handleCancelFms = (item: any) => {
    setSelectedCancelFmsItem(item);
    setCancelFmsDialogOpen(true);
    setCancelComment("");
  };
  const handleCloseCancelFmsDialog = () => {
    setCancelFmsDialogOpen(false);
    setSelectedCancelFmsItem(null);
    setCancelComment("");
  };

  const handleCancelFmsSubmit = async () => {
    if (!selectedCancelFmsItem?.id) {
      toast({
        title: "Error!",
        description: "Please select an workflow to cancel",
        variant: "destructive",
      });
      return;
    }
    setIsCancellingFms(true);
    cancelFms.mutate(
      {
        id: selectedCancelFmsItem.id,
        comment: cancelComment || "test",
        status: "cancelled",
      },
      {
        onSuccess: () => {
          toast({
            title: "Success!",
            description: "Workflow cancelled successfully",
            variant: "default",
          });
          setIsCancellingFms(false);
          refetch();
          handleCloseCancelFmsDialog();
        },
        onError: (err) => {
          setIsCancellingFms(false);
          toast({
            title: "Error!",
            description: "Failed to cancel workflow",
            variant: "destructive",
          });
        },
      },
    );
  };

  const toProgressNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  const calculateProgressMetrics = (progress: any) => {
    const totalSteps = Math.max(0, Math.trunc(toProgressNumber(progress?.totalSteps)));
    const notApplicableCount = Math.max(
      0,
      Math.trunc(toProgressNumber(progress?.notApplicable)),
    );
    const applicableSteps = Math.max(0, totalSteps - notApplicableCount);

    const rawCompleted = Math.max(
      0,
      Math.trunc(toProgressNumber(progress?.completed)),
    );
    const completedCount =
      applicableSteps > 0 ? Math.min(rawCompleted, applicableSteps) : rawCompleted;

    const percentage =
      applicableSteps === 0
        ? totalSteps > 0
          ? 100
          : 0
        : Math.min(100, Math.max(0, (completedCount / applicableSteps) * 100));

    return {
      totalSteps,
      notApplicableCount,
      applicableSteps,
      completedCount,
      percentage,
    };
  };

  const ProgressMeter = ({ progress }: { progress: any }) => {
    const metrics = calculateProgressMetrics(progress);
    if (metrics.totalSteps === 0) return null;

    const notApplicableCount = metrics.notApplicableCount;
    const applicableSteps = metrics.applicableSteps;
    const completedCount = metrics.completedCount;
    const percentage = metrics.percentage;

    const inProgressCount = Math.max(
      0,
      Math.trunc(toProgressNumber(progress?.inProgress)),
    );
    const scheduledCount = Math.max(
      0,
      Math.trunc(toProgressNumber(progress?.scheduled)),
    );
    const notStartedCount = Math.max(
      0,
      Math.trunc(toProgressNumber(progress?.notStarted)),
    );

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900">
              Steps Progress
            </span>
            <span className="text-xs text-gray-500">
              {applicableSteps === 0
                ? `No applicable steps${notApplicableCount > 0 ? `, ${notApplicableCount} not applicable` : ""}`
                : `(${completedCount}/${applicableSteps} finished${notApplicableCount > 0 ? `, ${notApplicableCount} not applicable` : ""})`}
            </span>
          </div>
          <span className="text-xs font-bold text-green-600">
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {(inProgressCount > 0 || scheduledCount > 0 || notStartedCount > 0 || notApplicableCount > 0) && (
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            {inProgressCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                {inProgressCount} in progress
              </span>
            )}
            {scheduledCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {scheduledCount} scheduled
              </span>
            )}
            {notStartedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                {notStartedCount} not started
              </span>
            )}
            {notApplicableCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                {notApplicableCount} not applicable
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTableView = () => {
    // Get all items in a flat array (not grouped by status)
    const allItems = Array.isArray(indents) ? indents : [];

    return (
      <div className="space-y-6">
        {isLoading ? (
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Workflow Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : allItems.length === 0 ? (
          <EmptyState
            onClick={() => { }}
            buttonTitle=""
            title=" "
            description="You haven't created any workflow templates yet. Start by creating your first one."
          />
        ) : (
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Reference Code</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Workflow Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map((item: any) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    router.push(`${RoutesEnum.Workflow}/${item.id}`)
                  }
                >
                  <TableCell className="font-medium capitalize">
                    {item.fms || "workflow-1"}
                  </TableCell>
                  <TableCell>{item?.refrenceCode || "â€”"}</TableCell>
                  <TableCell>
                    {PRIORITY_ENUM[item.prority] || "Unknown"}
                  </TableCell>

                  <TableCell className="capitalize">
                    <Badge
                      variant={
                        getStatusInfo(
                          STATUSTABLE.FMS_STATUS,
                          item.status as any,
                        ).variant as any
                      }
                    >
                      {
                        getStatusInfo(
                          STATUSTABLE.FMS_STATUS,
                          item.status as any,
                        ).name
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    <Badge
                      variant={
                        getStatusInfo(
                          STATUSTABLE.FLOWSTEP,
                          item.fmsStepStatus as any,
                        ).variant as any
                      }
                    >
                      {
                        getStatusInfo(
                          STATUSTABLE.FLOWSTEP,
                          item.fmsStepStatus as any,
                        ).name
                      }
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {item.progress ? (
                      (() => {
                        const metrics = calculateProgressMetrics(item.progress);

                        if (metrics.totalSteps === 0) {
                          return (
                            <span className="text-xs text-muted-foreground italic">
                              No steps assigned
                            </span>
                          );
                        }

                        if (metrics.applicableSteps === 0) {
                          return (
                            <span className="text-sm">No applicable steps (100%)</span>
                          );
                        }

                        return (
                          <span className="text-sm">
                            {metrics.completedCount}/{metrics.applicableSteps} ({Math.round(metrics.percentage)}%)
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        No steps assigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(item?.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="p-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportClick(item);
                          }}
                        >
                          <Download className="w-4 h-4" /> Export Workflow
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareClick(item);
                          }}
                        >
                          <Share2 className="w-4 h-4" /> Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTimeline(item);
                          }}
                        >
                          <TimerIcon className="w-4 h-4" /> View Timeline
                        </DropdownMenuItem>
                        {Number(item?.fmsStatus) !== FMSINDENTSTATUS.CANCELLED && (
                          <DropdownMenuItem
                            className="flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelFms(item);
                            }}
                          >
                            <TicketX className="w-4 h-4" /> Cancel Workflow
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  const renderGridView = () => (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : indents.length === 0 ? (
        <EmptyState
          onClick={() => { }}
          buttonTitle=""
          title=" "
          description="You haven't created any workflow templates yet. Start by creating your first one."
        />
      ) : (
        filteredColumns.map((column) => {
          const columnItems = groupedItems[column.id] || [];
          if (columnItems.length === 0) return null;

          return (
            <div key={column.id} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {columnItems.map((item: any) => (
                  <div
                    key={item.id}
                    className={`${column.cardBg} rounded-xl border ${column.borderAccent} p-4 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-md cursor-pointer`}
                    onClick={() =>
                      router.push(`${RoutesEnum.Workflow}/${item.id}`)
                    }
                  >
                    <h3 className="font-semibold text-base text-gray-900 mb-3 capitalize">
                      {item.fms || "workflow-1"}
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Priority</span>
                          <span>Workflow Status</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                          <span>
                            {PRIORITY_ENUM[item.prority] || "Unknown"}
                          </span>
                          <span className="text-right capitalize">
                            {formatFmsStatus(item.fmsStepStatus)}
                          </span>
                        </div>
                      </div>
                      {item.progress && (
                        <div className="space-y-1">
                          {item.progress.totalSteps > 0 ? (
                            <ProgressMeter progress={item.progress} />
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Progress</p>
                              <span className="text-xs text-muted-foreground italic">
                                No steps assigned yet
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Created At</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDateTime(item?.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderKanbanView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {filteredColumns.map((column) => {
          const columnItems = groupedItems[column.id] || [];
          return (
            <div
              key={column.id}
              className="flex h-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm backdrop-blur"
            >
              <div
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${column.headerBg}`}
              >
                <span className={`text-sm font-semibold ${column.accentText}`}>
                  {column.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${column.countBadge}`}
                >
                  {columnItems.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                {columnItems.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-6 text-center text-sm text-muted-foreground">
                    No items yet
                  </div>
                ) : (
                  columnItems.map((item: any) => (
                    <div
                      key={item.id}
                      className={`${column.cardBg} rounded-xl border ${column.borderAccent} p-4 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-md cursor-pointer`}
                      onClick={() =>
                        router.push(`${RoutesEnum.Workflow}/${item.id}`)
                      }
                    >
                      <h3 className="font-semibold text-base text-gray-900 mb-3 capitalize">
                        {item.fms || "workflow-1"}
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Priority</span>
                            <span>Workflow Status</span>
                          </div>
                          <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                            <span>
                              {PRIORITY_ENUM[item.prority] || "Unknown"}
                            </span>
                            <span className="text-right capitalize">
                              {formatFmsStatus(item.fmsStepStatus)}
                            </span>
                          </div>
                        </div>
                        {item.progress && (
                          <div className="space-y-1">
                            {item.progress.totalSteps > 0 ? (
                              <ProgressMeter progress={item.progress} />
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500">
                                  Progress
                                </p>
                                <span className="text-xs text-muted-foreground italic">
                                  No steps assigned yet
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Created At</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDateTime(item?.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );



  return (
    <div className="p-6 space-y-4">
      {canRead === false ? (
        <div className="mt-4">
          <PermissionDeniedState />
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Lists</h1>
          <p className="text-sm text-muted-foreground">
            List of all available workflow templates in the system.
          </p>
        </div>
      </div>
      <Separator />
      <div className="flex items-center gap-3">
        <Select
          value={view}
          onValueChange={(value) => {
            (setView(value as ViewType), setStart(1));
            setStatus([]);
            setPriorityFilter([]);
            setStepStatus([]);
          }}
        >
          <SelectTrigger size="sm">
            <div className="flex items-center gap-2">
              {view === "grid" && <LayoutGrid className="w-4 h-4" />}
              {view === "table" && <Table2 className="w-4 h-4" />}
              {view === "kanban" && <KanbanSquare className="w-4 h-4" />}
              <span>
                View:{" "}
                {view === "grid"
                  ? "Grid"
                  : view === "table"
                    ? "Table"
                    : "Kanban"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                <span>Grid</span>
              </div>
            </SelectItem>
            <SelectItem value="table">
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4" />
                <span>Table</span>
              </div>
            </SelectItem>
            <SelectItem value="kanban">
              <div className="flex items-center gap-2">
                <KanbanSquare className="w-4 h-4" />
                <span>Kanban</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-36 justify-between"
            >
              {status.length > 0
                ? `${status.length} selected`
                : "Select status"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1 space-y-1">
            {statusOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50"
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={status.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-42 justify-between"
            >
              {priorityFilter.length > 0
                ? `${priorityFilter.length} selected`
                : "Select priority"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-42 p-1 space-y-1">
            {Object.entries(PRIORITY_ENUM).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50"
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={priorityFilter.includes(key)}
                    onCheckedChange={() => handlePriorityToggle(key)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-42 justify-between"
            >
              {stepStatus.length > 0
                ? `${stepStatus.length} selected`
                : "Select step status"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-42 p-1 space-y-1">
            {STEP_STATUS_ENUM.map((item) => (
              <div
                key={item.value}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50"
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={stepStatus.includes(item.value)}
                    onCheckedChange={() => handleStepStatusToggle(item.value)}
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* View Content */}
      {view === "table" && renderTableView()}
      {view === "grid" && renderGridView()}
      {view === "kanban" && renderKanbanView()}

      {/* Pagination */}
      {indents.length > 0 && (
        <div className="border-t pt-4">
          <Pagination
            start={start}
            limit={limit}
            total={total}
            pagination={pagination}
            onPageChange={(newStart) => setStart(newStart)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setStart(1);
            }}
          />
        </div>
      )}

      {/* Export FMS Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={handleCloseExportDialog}>
        <DialogContent className="max-w-3xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold mb-1">
              Export workflow snapshot
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Package workflow details into CSV, Excel, or PDF for offline
              sharing.
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Download className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {exportAllStepData
                      ? "Exporting entire workflow"
                      : "Custom step export"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {exportIndentData
                      ? "Indent form data will be bundled with step insights."
                      : "Only workflow steps will be included in the file."}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <Badge className="border border-slate-200 bg-white text-slate-700">
                      Steps: {selectedExportCount}/{totalShareableSteps || 0}
                    </Badge>
                    <Badge className="border border-slate-200 bg-white text-slate-700">
                      Format: {exportType.toUpperCase()}
                    </Badge>
                    <Badge
                      className={`border border-slate-200 bg-white text-slate-700 ${exportIndentData ? "text-emerald-700" : ""
                        }`}
                    >
                      Indent data {exportIndentData ? "included" : "excluded"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/30">
                <div
                  className="flex items-start justify-between gap-3"
                  onClick={() => setExportIndentData(!exportIndentData)}
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Indent data
                    </p>
                    <p className="text-sm text-slate-500">
                      Include request form inputs in the export.
                    </p>
                  </div>
                  <Checkbox
                    id="export-indent"
                    checked={exportIndentData}
                    onCheckedChange={(checked) =>
                      setExportIndentData(checked as boolean)
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/30">
                <div
                  className="flex items-start justify-between gap-3"
                  onClick={() => setExportAllStepData(!exportAllStepData)}
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Step coverage
                    </p>
                    <p className="text-sm text-slate-500">
                      Export every step or hand-pick milestones.
                    </p>
                  </div>
                  <Checkbox
                    id="export-all-steps"
                    checked={exportAllStepData}
                    onCheckedChange={(checked) =>
                      setExportAllStepData(checked as boolean)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-slate-900">
                    Step selection
                  </p>
                  <p className="text-sm text-slate-500">
                    {exportAllStepData
                      ? "All steps will be exported."
                      : "Pick the exact steps to include in the file."}
                  </p>
                </div>
                {!exportAllStepData && selectedExportCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={handleClearExportSelection}
                  >
                    Clear selection
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <Badge variant="outline" className="bg-white">
                  Total steps: {totalShareableSteps}
                </Badge>
                <Badge variant="secondary" className="bg-white text-slate-700">
                  Exporting: {selectedExportCount}
                </Badge>
              </div>

              {!exportAllStepData && totalShareableSteps > 0 ? (
                <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-white p-3 max-h-64 overflow-y-auto">
                  <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <CheckSquare className="h-4 w-4 text-slate-500" />
                    Select steps to include
                  </Label>
                  {fmsSteps.map((step: any) => {
                    const stepLabel = step.name || `Step ${step.sequence}`;
                    return (
                      <div
                        key={step.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 transition hover:border-primary/40"
                      >
                        <label
                          htmlFor={`step-${step.id}`}
                          className="flex w-full cursor-pointer items-start gap-3"
                        >
                          <Checkbox
                            id={`step-${step.id}`}
                            checked={selectedSteps.includes(step.id)}
                            onCheckedChange={() => handleStepToggle(step.id)}
                            className="mt-1"
                          />
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold capitalize text-slate-900">
                                {stepLabel}
                              </span>
                              {step.sequence && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Seq {step.sequence}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              Include notes, attachments, and timestamps for
                              this step.
                            </span>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {totalShareableSteps
                    ? "Every step will be exported."
                    : "No steps available for this workflow yet."}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Label className="text-base font-semibold">Export format</Label>
              <p className="text-sm text-slate-500">
                Choose the file type that best suits your downstream tooling.
              </p>
              <RadioGroup
                value={exportType}
                onValueChange={(value) =>
                  setExportType(value as "csv" | "excel" | "pdf")
                }
                className="mt-4 grid gap-3 sm:grid-cols-3"
              >
                {[
                  {
                    value: "csv",
                    label: "CSV",
                    helper: "Spreadsheet friendly",
                  },
                  { value: "excel", label: "Excel", helper: "Rich formatting" },
                  { value: "pdf", label: "PDF", helper: "Share-ready" },
                ].map((option) => (
                  <label
                    key={option.value}
                    htmlFor={option.value}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium ${exportType === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 text-slate-700"
                      } flex flex-col gap-1 cursor-pointer`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="sr-only"
                      />
                      <span>{option.label}</span>
                    </div>
                    <span className="text-xs font-normal text-slate-500">
                      {option.helper}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseExportDialog}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <PermissionGuard moduleId={1} action="update">
              <Button onClick={handleExportSubmit} disabled={isExporting}>
                {isExporting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                Export
              </Button>
            </PermissionGuard>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={handleCloseShareDialog}>
        <DialogContent className="max-w-3xl sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold mb-1">
              Share{" "}
              {selectedFmsItem?.fmsName ?? selectedFmsItem?.name ?? "Workflow"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Send a read-only timeline link to collaborators and keep everyone
              aligned on progress.
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Share2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {shareAllStepData
                      ? "Sharing entire workflow"
                      : "Custom step share"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {shareAllStepData
                      ? `Recipients can review all ${totalShareableSteps || 0
                      } steps with live status.`
                      : `${selectedShareCount} of ${totalShareableSteps || 0
                      } steps will be visible in the shared snapshot.`}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <Badge className="border border-slate-200 bg-white text-slate-700">
                      Steps: {selectedShareCount}/{totalShareableSteps || 0}
                    </Badge>
                    {formattedShareExpiry && (
                      <Badge className="border border-amber-200 bg-amber-50 text-amber-700">
                        Expires {formattedShareExpiry}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-1">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="share-email"
                      type="email"
                      placeholder="teammate@email.com"
                      className="pl-9 h-10"
                      value={currentEmailInput}
                      onChange={(event) =>
                        setCurrentEmailInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddEmail();
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="default"
                    size="default"
                    disabled={!currentEmailInput.trim()}
                    onClick={handleAddEmail}
                    type="button"
                    className="shrink-0 h-10"
                  >
                    Add email
                  </Button>
                </div>
                {shareEmail.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 min-h-[60px]">
                    {shareEmail.map((email) => (
                      <div
                        key={email}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-md"
                      >
                        <span className="text-sm font-medium">{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="ml-0.5 rounded-full hover:bg-slate-300 p-0.5 transition-colors focus:outline-none"
                          aria-label={`Remove ${email}`}
                        >
                          <X className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  We'll email a secure link with view-only access.
                </p>
              </div>

              <div className="space-y-2">
                {/* <Label htmlFor="share-expiry" className="text-base font-medium flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  Link expiry
                </Label> */}
                <div className="relative">
                  <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="share-expiry"
                    type="date"
                    min={todayDate}
                    max={maxShareExpiryDate}
                    className="pl-10"
                    value={shareExpiry}
                    onChange={(event) => setShareExpiry(event.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Expiry can be set up to 1 year from today.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-slate-900">
                    Workflow step visibility
                  </p>
                  <p className="text-sm text-slate-500">
                    Choose whether to share the full workflow or cherry-pick
                    milestones.
                  </p>
                </div>
                <label
                  htmlFor="share-all-steps"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 whitespace-nowrap"
                >
                  <Checkbox
                    id="share-all-steps"
                    checked={shareAllStepData}
                    onCheckedChange={(checked) => {
                      const isChecked = checked as boolean;
                      setShareAllStepData(isChecked);
                      if (isChecked) {
                        setShareSelectedSteps([]);
                      }
                    }}
                  />
                  Share entire workflow
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <Badge variant="outline" className="bg-white">
                  Total steps: {totalShareableSteps}
                </Badge>
                <Badge variant="secondary" className="bg-white text-slate-700">
                  Sharing: {selectedShareCount}
                </Badge>
                {!shareAllStepData && selectedShareCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={handleClearShareSelection}
                  >
                    Clear selection
                  </Button>
                )}
              </div>

              {!shareAllStepData && totalShareableSteps > 0 ? (
                <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-white p-3 max-h-64 overflow-y-auto">
                  <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <ListChecks className="h-4 w-4 text-slate-500" />
                    Select steps to include
                  </Label>
                  {fmsSteps.map((step: any) => {
                    const stepLabel = step.name || `Step ${step.sequence}`;
                    return (
                      <div
                        key={step.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 transition hover:border-primary/40"
                      >
                        <label
                          htmlFor={`share-step-${step.id}`}
                          className="flex w-full cursor-pointer items-start gap-3"
                        >
                          <Checkbox
                            id={`share-step-${step.id}`}
                            checked={shareSelectedSteps.includes(step.id)}
                            onCheckedChange={() =>
                              handleShareStepToggle(step.id)
                            }
                            className="mt-1"
                          />
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold capitalize text-slate-900">
                                {stepLabel}
                              </span>
                              {step.sequence && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Seq {step.sequence}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              Share progress and attachments for this step.
                            </span>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {totalShareableSteps
                    ? "All steps will be visible to the recipient."
                    : "No steps available for this workflow yet."}
                </p>
              )}
            </div>

            {shareError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {shareError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseShareDialog}
              disabled={isSharing}
            >
              Cancel
            </Button>
            <PermissionGuard moduleId={1} action="update">
              <Button onClick={handleShareSubmit} disabled={isSharing}>
                {isSharing && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                Share
              </Button>
            </PermissionGuard>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelFmsDialogOpen}
        onOpenChange={handleCloseCancelFmsDialog}
      >
        <DialogContent className="max-w-3xl sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold mb-1">
              Cancel Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <TicketX className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Cancel workflow
                  </p>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to cancel this workflow?
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-comment">Reason for Cancellation</Label>
              <Input
                id="cancel-comment"
                type="text"
                placeholder="Enter reason for cancellation..."
                value={cancelComment}
                onChange={(e) => setCancelComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCancelFmsDialog}>
              Cancel
            </Button>
            <PermissionGuard moduleId={1} action="update">
              <Button
                onClick={handleCancelFmsSubmit}
                disabled={cancelComment.trim() === "" || isCancellingFms}
              >
                {isCancellingFms && (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                )}
                Cancel Workflow
              </Button>
            </PermissionGuard>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};

export default FMSPage;

