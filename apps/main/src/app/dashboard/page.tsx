"use client";

import React, { useEffect, useState } from "react";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Filter, Loader, X, Check as CheckIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DashboardDateFilter,
  FMSINDENTSTATUS,
  FMSSTATUSVALUE,
  PRIORITY_ENUM,
  RoutesEnum,
  TaskTypeEnum,
} from "@/lib/enums/routes.enum";
import {
  KanbanSquare,
  LayoutGrid,
  Table2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
} from "lucide-react";
import { KanbanBoard, KanbanColumn } from "@/components/kanban/kanban-board";
import { CalendarKanban } from "@/components/kanban/calendar-kanban";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Pagination } from "./users/pagination";
import {
  pageTabButtonClassName,
  pageTabsTrackClassName,
} from "@/components/ui/page-tabs";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Delegations from "./tabs/delegations";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HTTP_METHODS } from "@/api/methods";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DraftIndentTab } from "./tabs/draftIndentTab";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/not-found";
import { Badge } from "@/components/ui/badge";
import { getStatusInfo, STATUSTABLE } from "@/lib/utils";
import { useDashboardMode } from "@/context/dashboard-mode-context";
import { MembersCell } from "./users/page";
import { UserSearch } from "@/components/user-search";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";

const tabs = [
  { label: "Workflow", value: TaskTypeEnum.FLOW },
  { label: "Draft Indent", value: TaskTypeEnum.DRAFT_INDENT },
  { label: "Delegations", value: TaskTypeEnum.DELEGATION },
  { label: "My Task", value: TaskTypeEnum.MY_TASKS },
  // { label: "Recurring", value: TaskTypeEnum.RECURRING },
];

const TAB_QUERY_TO_TYPE: Record<string, TaskTypeEnum> = {
  workflow: TaskTypeEnum.FLOW,
  "draft-indent": TaskTypeEnum.DRAFT_INDENT,
  delegations: TaskTypeEnum.DELEGATION,
  "my-task": TaskTypeEnum.MY_TASKS,
};

const TAB_TYPE_TO_QUERY: Partial<Record<TaskTypeEnum, string>> = {
  [TaskTypeEnum.FLOW]: "workflow",
  [TaskTypeEnum.DRAFT_INDENT]: "draft-indent",
  [TaskTypeEnum.DELEGATION]: "delegations",
  [TaskTypeEnum.MY_TASKS]: "my-task",
};

const stats = [
  { label: "Pending Steps", key: "pendingSteps" },
  { label: "In Progress Steps", key: "inProgressSteps" },
  { label: "Completed Steps", key: "completedSteps" },
  { label: "Overdue (Completed)", key: "overdueStepsComplete" },
  { label: "Overdue (Not Completed)", key: "overdueStepsNotComplete" },
];

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentFinancialYearStartYear = (baseDate: Date): number => {
  return baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
};

const getDateRangeByFilter = (
  filter: DashboardDateFilter,
  specificYear: string,
  currentStartDate: string,
  currentEndDate: string,
) => {
  const today = new Date();

  switch (filter) {
    case DashboardDateFilter.TODAY: {
      const day = toDateInputValue(today);
      return { startDate: day, endDate: day };
    }

    case DashboardDateFilter.LAST_WEEK: {
      const end = new Date(today);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) };
    }

    case DashboardDateFilter.LAST_MONTH: {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) };
    }

    case DashboardDateFilter.LAST_YEAR: {
      const year = today.getFullYear() - 1;
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    }

    case DashboardDateFilter.SPECIFIC_YEAR: {
      const parsedYear = Number(specificYear);
      const year = Number.isFinite(parsedYear) ? parsedYear : today.getFullYear();
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    }

    case DashboardDateFilter.CUSTOM_RANGE:
      return {
        startDate: currentStartDate,
        endDate: currentEndDate,
      };

    case DashboardDateFilter.THIS_MONTH: {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: toDateInputValue(start), endDate: toDateInputValue(today) };
    }

    case DashboardDateFilter.CURRENT_FINANCIAL_YEAR: {
      const startYear = getCurrentFinancialYearStartYear(today);
      const start = new Date(startYear, 3, 1);
      return { startDate: toDateInputValue(start), endDate: toDateInputValue(today) };
    }

    case DashboardDateFilter.LAST_FINANCIAL_YEAR: {
      const currentFyStartYear = getCurrentFinancialYearStartYear(today);
      const start = new Date(currentFyStartYear - 1, 3, 1);
      const end = new Date(currentFyStartYear, 2, 31);
      return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) };
    }

    default:
      return {
        startDate: currentStartDate,
        endDate: currentEndDate,
      };
  }
};

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

const workflowKanbanColumns: KanbanColumn[] = [
  { id: "approved", label: "Approved", headerBg: "bg-green-100", accentText: "text-green-700", countBadge: "bg-green-200 text-green-800", cardBg: "bg-green-50", borderAccent: "border-green-200" },
  { id: "inProgress", label: "In Progress", headerBg: "bg-yellow-100", accentText: "text-yellow-700", countBadge: "bg-yellow-200 text-yellow-800", cardBg: "bg-yellow-50", borderAccent: "border-yellow-200" },
  { id: "pending", label: "Pending", headerBg: "bg-red-100", accentText: "text-red-700", countBadge: "bg-red-200 text-red-800", cardBg: "bg-red-50", borderAccent: "border-red-200" },
  { id: "cancelled", label: "Cancelled", headerBg: "bg-gray-100", accentText: "text-gray-600", countBadge: "bg-gray-200 text-gray-700", cardBg: "bg-gray-50", borderAccent: "border-gray-300" },
];

const draftIndentKanbanColumns: KanbanColumn[] = [
  { id: "approved", label: "Approved", headerBg: "bg-green-100", accentText: "text-green-700", countBadge: "bg-green-200 text-green-800", cardBg: "bg-green-50", borderAccent: "border-green-200" },
  { id: "review", label: "Review", headerBg: "bg-yellow-100", accentText: "text-yellow-700", countBadge: "bg-yellow-200 text-yellow-800", cardBg: "bg-yellow-50", borderAccent: "border-yellow-200" },
  { id: "pending", label: "Pending", headerBg: "bg-red-100", accentText: "text-red-700", countBadge: "bg-red-200 text-red-800", cardBg: "bg-red-50", borderAccent: "border-red-200" },
  { id: "cancelled", label: "Cancelled", headerBg: "bg-gray-100", accentText: "text-gray-600", countBadge: "bg-gray-200 text-gray-700", cardBg: "bg-gray-50", borderAccent: "border-gray-300" },
];

const delegationKanbanColumns: KanbanColumn[] = [
  { id: "approved", label: "Approved", headerBg: "bg-green-100", accentText: "text-green-700", countBadge: "bg-green-200 text-green-800", cardBg: "bg-green-50", borderAccent: "border-green-200" },
  { id: "inProgress", label: "In Progress", headerBg: "bg-yellow-100", accentText: "text-yellow-700", countBadge: "bg-yellow-200 text-yellow-800", cardBg: "bg-yellow-50", borderAccent: "border-yellow-200" },
  { id: "pending", label: "Pending", headerBg: "bg-red-100", accentText: "text-red-700", countBadge: "bg-red-200 text-red-800", cardBg: "bg-red-50", borderAccent: "border-red-200" },
  { id: "cancelled", label: "Cancelled", headerBg: "bg-gray-100", accentText: "text-gray-600", countBadge: "bg-gray-200 text-gray-700", cardBg: "bg-gray-50", borderAccent: "border-gray-300" },
];

const todayStr = format(new Date(), "yyyy-MM-dd");
const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
const yesterdayStr = format(addDays(new Date(), -1), "yyyy-MM-dd");

const dummyKanbanData = {
  [TaskTypeEnum.FLOW]: [
    { id: "f1", title: "Procurement Workflow", status: "pending", priority: "High", step: "Review Items", ref: "REF-001", date: todayStr },
    { id: "f2", title: "Site Inspection", status: "inProgress", priority: "Medium", step: "On-site Visit", ref: "REF-002", date: tomorrowStr },
    { id: "f3", title: "Vendor Onboarding", status: "approved", priority: "Low", step: "Final Approval", ref: "REF-003", date: yesterdayStr },
    { id: "f4", title: "Equipment Maintenance", status: "cancelled", priority: "Critical", step: "Service Check", ref: "REF-004", date: todayStr },
    { id: "f5", title: "Budget Approval", status: "pending", priority: "High", step: "Finance Review", ref: "REF-005", date: todayStr },
    { id: "f6", title: "Facility Audit", status: "inProgress", priority: "Medium", step: "Site Assessment", ref: "REF-006", date: todayStr },
    { id: "f7", title: "IT Asset Procurement", status: "pending", priority: "High", step: "Vendor Quote", ref: "REF-007", date: tomorrowStr },
    { id: "f8", title: "Safety Compliance Check", status: "approved", priority: "Low", step: "Documentation", ref: "REF-008", date: tomorrowStr },
  ],
  [TaskTypeEnum.DRAFT_INDENT]: [
    { id: "d1", title: "Monthly Stationery", status: "pending", creator: "Piyush", date: todayStr },
    { id: "d2", title: "New Laptop Request", status: "review", creator: "Admin", date: tomorrowStr },
    { id: "d3", title: "Project Alpha Supplies", status: "approved", creator: "Manager", date: yesterdayStr },
    { id: "d4", title: "Office Furniture Order", status: "pending", creator: "Piyush", date: todayStr },
    { id: "d5", title: "Printer Cartridges", status: "review", creator: "Rahul", date: todayStr },
    { id: "d6", title: "Lab Equipment Renewal", status: "pending", creator: "Admin", date: tomorrowStr },
  ],
  [TaskTypeEnum.DELEGATION]: [
    { id: "t1", title: "Audit Report", status: "pending", assignee: "John Doe", dueDate: todayStr },
    { id: "t2", title: "Client Presentation", status: "inProgress", assignee: "Jane Smith", dueDate: tomorrowStr },
    { id: "t3", title: "Code Review", status: "review", assignee: "Piyush", dueDate: yesterdayStr },
    { id: "t4", title: "Weekly Sync", status: "approved", assignee: "Team", dueDate: todayStr },
    { id: "t5", title: "Vendor Negotiation", status: "pending", assignee: "Rahul", dueDate: todayStr },
    { id: "t6", title: "Q2 Planning", status: "inProgress", assignee: "Anjali", dueDate: todayStr },
    { id: "t7", title: "Budget Review", status: "pending", assignee: "Sonia", dueDate: tomorrowStr },
  ],
  [TaskTypeEnum.MY_TASKS]: [
    { id: "m1", title: "Write Documentation", status: "pending", dueDate: todayStr },
    { id: "m2", title: "Bug Fix: Login Page", status: "inProgress", dueDate: tomorrowStr },
    { id: "m3", title: "Design Feedback", status: "approved", dueDate: yesterdayStr },
    { id: "m4", title: "API Integration Test", status: "pending", dueDate: todayStr },
    { id: "m5", title: "Performance Optimization", status: "inProgress", dueDate: todayStr },
    { id: "m6", title: "Release Notes Draft", status: "pending", dueDate: tomorrowStr },
  ],
};

const formatTimeline = (
  minutes: number | string | null | undefined,
): string => {
  if (
    !minutes ||
    minutes === "—" ||
    minutes === null ||
    minutes === undefined
  ) {
    return "—";
  }

  const totalMinutes =
    typeof minutes === "string" ? parseInt(minutes, 10) : minutes;

  if (isNaN(totalMinutes) || totalMinutes < 0) {
    return "—";
  }

  if (totalMinutes === 0) {
    return "0 min";
  }

  const weeks = Math.floor(totalMinutes / (7 * 24 * 60));
  const days = Math.floor((totalMinutes % (7 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  const parts: string[] = [];

  if (weeks > 0) {
    parts.push(`${weeks} ${weeks === 1 ? "week" : "weeks"}`);
  }
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  }
  if (mins > 0 || parts.length === 0) {
    parts.push(`${mins} ${mins === 1 ? "min" : "min"}`);
  }

  return parts.join(", ");
};

export default function DashboardStats() {
  const searchParams = useSearchParams();
  const getTabFromQuery = (): TaskTypeEnum => {
    const tabParam = searchParams.get("tab")?.toLowerCase();
    return TAB_QUERY_TO_TYPE[tabParam || ""] ?? TaskTypeEnum.FLOW;
  };
  const [activeTab, setActiveTab] = useState<TaskTypeEnum | null>(getTabFromQuery);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [calendarViewType, setCalendarViewType] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMoreSheet, setViewMoreSheet] = useState<{
    open: boolean;
    title: string;
    items: any[];
    renderCard: (item: any) => React.ReactNode;
    onItemClick?: (item: any) => void;
  }>({ open: false, title: "", items: [], renderCard: () => null });

  const shiftDate = (direction: "prev" | "next") => {
    const factor = direction === "next" ? 1 : -1;
    let newDate = new Date(selectedDate);
    if (calendarViewType === "day") newDate.setDate(newDate.getDate() + factor);
    else if (calendarViewType === "week") newDate.setDate(newDate.getDate() + 7 * factor);
    else if (calendarViewType === "month") newDate.setMonth(newDate.getMonth() + factor);
    setSelectedDate(newDate);
  };

  const getViewTitle = () => {
    if (calendarViewType === "day") {
      return format(selectedDate, "EEEE, d MMMM yyyy");
    }
    if (calendarViewType === "week") {
      const start = startOfWeek(selectedDate);
      const end = addDays(start, 6);
      return `${format(start, "d MMM")} - ${format(end, "d MMM yyyy")}`;
    }
    if (calendarViewType === "month") {
      return format(selectedDate, "MMMM yyyy");
    }
    return "";
  };
  const {
    mode: dashboardMode,
    setMode: setDashboardMode,
    canAccessCompanyDashboard,
  } = useDashboardMode();
  const isCompanyView =
    canAccessCompanyDashboard && dashboardMode === "company";
  const isAdminParam = `&isAdmin=${isCompanyView ? true : false}`;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const tabFromQuery = getTabFromQuery();
    setActiveTab((prev) => (prev === tabFromQuery ? prev : tabFromQuery));
  }, [searchParams]);
  const initialFilterDates = getDateRangeByFilter(
    DashboardDateFilter.THIS_MONTH,
    String(currentYear),
    toDateInputValue(new Date()),
    toDateInputValue(new Date()),
  );

  const [activeFilters, setActiveFilters] = useState({
    dateFilter: DashboardDateFilter.THIS_MONTH,
    specificYear: String(currentYear),
    startDate: initialFilterDates.startDate,
    endDate: initialFilterDates.endDate,
  });

  const [tempFilters, setTempFilters] = useState({ ...activeFilters });
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const [taskStart, setTaskStart] = useState(1);
  const [taskLimit, setTaskLimit] = useState(10);

  const [draftIndentStart, setDraftIndentStart] = useState(1);
  const [draftIndentLimit, setDraftIndentLimit] = useState(10);
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [pillUsers, setPillUsers] = useState<any[]>([]);
  const { create: canCreateTask, update: canUpdateTask } = useModulePermissions(5);

  const {
    data,
    isLoading,
    refetch: refetchStats,
  } = useApiQuery(
    [
      "Dashboard_Stats",
      activeFilters.specificYear,
      activeFilters.startDate,
      activeFilters.endDate,
      activeFilters.dateFilter,
      dashboardMode,
    ],
    `${API_ENDPOINTS.STATISTICS_DASHBOARD}?specificYear=${activeFilters.specificYear}&startDate=${activeFilters.startDate}&endDate=${activeFilters.endDate}&dateFilter=${activeFilters.dateFilter}${isAdminParam}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  // let users = userlist?.data?.users || [];

  const [status, setStatus] = useState<number[]>([FMSSTATUSVALUE.INPROGRESS, FMSSTATUSVALUE.SCHEDULED]);
  const [draftIndentStatus, setDraftIndentStatus] = useState<number[]>([
    FMSINDENTSTATUS.INPROGRESS,
  ]);

  const handleStatusToggle = (statusValue: number) => {
    setStatus((prev) =>
      prev.includes(statusValue)
        ? prev.filter((s) => s !== statusValue)
        : [...prev, statusValue],
    );
  };

  const handleDraftIndentStatusToggle = (statusValue: number) => {
    setDraftIndentStatus((prev) =>
      prev.includes(statusValue)
        ? prev.filter((s) => s !== statusValue)
        : [...prev, statusValue],
    );
  };
  const {
    data: userStep,
    isLoading: userLoading,
    refetch: refetchSteps,
  } = useApiQuery(
    ["USER_STEP_LIST", start, limit, status.join(","), dashboardMode],
    `${API_ENDPOINTS.FMS_STEP
    }/assigned-list?start=${start}&limit=${limit}&status=${status.join(
      ",",
    )}${isAdminParam}`,
    {
      refetchOnWindowFocus: true,
      retry: 1,
      enabled: activeTab === TaskTypeEnum.FLOW,
    } as const,
  );

  const statsData = data?.data || {};
  const steps = userStep?.data?.steps || [];
  const displayedStats = isCompanyView ? statsData : statsData;
  let displayedSteps =
    steps && steps.length > 0
      ? [...steps].sort((a, b) => Number(a.sequence) - Number(b.sequence))
      : [];
  const total = data?.data?.pagination?.total || 0;

  const handleDashboardModeChange = (mode: "my" | "company") => {
    if (mode === "company" && !canAccessCompanyDashboard) {
      return;
    }

    setDashboardMode(mode);

    if (mode === "company") {
      if (!pathname.startsWith("/dashboard/company")) {
        router.push("/dashboard/company");
      }
    } else {
      if (pathname.startsWith("/dashboard/company")) {
        router.push("/dashboard");
      }
    }
  };

  const handleApplyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setOpen(false);
  };

  // Refresh all dashboard data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshTasks = [refetchStats()];

      if (activeTab === TaskTypeEnum.FLOW) {
        refreshTasks.push(refetchSteps());
      }

      if (
        activeTab === TaskTypeEnum.DELEGATION ||
        activeTab === TaskTypeEnum.MY_TASKS
      ) {
        refreshTasks.push(refetch());
      }

      if (activeTab === TaskTypeEnum.DRAFT_INDENT) {
        refreshTasks.push(refetchDraftIndents());
      }

      await Promise.all(refreshTasks);
    } finally {
      setIsRefreshing(false);
    }
  };

  const [iscreateopen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    assignedUsers: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    type: "",
    id: "",
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleUser = (user: any) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(user.id)
        ? prev.assignedUsers.filter((id) => id !== user.id)
        : [...prev.assignedUsers, user.id],
    }));
    setPillUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const createDelegation = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.TASKS,
  );

  const updateDelegation = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.TASKS}/${formData.id}`,
  );

  // Helper function to convert date string to local datetime ISO string
  const convertDateToLocalISO = (
    dateString: string | null,
    isEndDate: boolean = false,
  ): string | null => {
    if (!dateString) return null;

    // Create a date object at local midnight for the given date
    const date = new Date(dateString + (isEndDate ? "T23:59:59" : "T00:00:00"));

    // Get timezone offset in minutes (negative for timezones ahead of UTC, positive for behind)
    // getTimezoneOffset() returns: -300 for EST (UTC-5), +330 for IST (UTC+5:30)
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMinutesRemainder = Math.abs(offsetMinutes) % 60;

    // Invert the sign: if offsetMinutes is -300 (UTC-5), we want "-05:00"
    const offsetSign = offsetMinutes <= 0 ? "+" : "-";
    const timezoneOffset = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutesRemainder).padStart(2, "0")}`;

    // Format: YYYY-MM-DDTHH:mm:ss+HH:mm (local time with timezone offset)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;
  };

  const handleSubmit = () => {
    setLoading(true);
    if (formData.id) {
      const payload = {
        assignedUsers: formData.assignedUsers,
        startDate: convertDateToLocalISO(formData.startDate, false),
        recurringSettings: {
          endDate: convertDateToLocalISO(formData.endDate, true),
        },
        endDate: convertDateToLocalISO(formData.endDate, true),
        priority: formData.priority || null,
      };
      updateDelegation.mutate(payload, {
        onSuccess: () => {
          setLoading(false);
          setCreateOpen(false);
          // Refresh dashboard data after updating task
          handleRefresh();
        },
        onError: (err) => {
          setLoading(false);
        },
      });
    } else {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: parseInt(formData.type), //TaskTypeEnum.DELEGATION,
        assignedUsers: formData.assignedUsers,
        startDate: convertDateToLocalISO(formData.startDate, false),
        endDate: convertDateToLocalISO(formData.endDate, true),
        priority: formData.priority || null,
      };

      createDelegation.mutate(payload, {
        onSuccess: () => {
          setFormData({
            title: "",
            description: "",
            priority: "",
            assignedUsers: [],
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            type: "",
            id: "",
          });
          setLoading(false);
          setCreateOpen(false);
          // Refresh dashboard data after creating task
          handleRefresh();
        },
        onError: (err) => {
          console.error("Failed to create delegation:", err);
          setLoading(false);
          // setCreateOpen(false);
        },
      });
    }
  };

  const {
    data: tasksData,
    isLoading: isTaskLoading,
    refetch,
  } = useApiQuery(
    ["TASKS", taskStart, taskLimit, activeTab, dashboardMode],
    `${API_ENDPOINTS.TASKS
    }?start=${taskStart}&limit=${taskLimit}&status=1,3&type=${activeTab === TaskTypeEnum.DELEGATION
      ? TaskTypeEnum.DELEGATION
      : `${TaskTypeEnum.HELP},${TaskTypeEnum.RECURRING}`
    }&createdByTask=false&sortBy=createdAt&sortOrder=desc${isAdminParam}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled:
        activeTab === TaskTypeEnum.DELEGATION ||
        activeTab === TaskTypeEnum.MY_TASKS,
    } as const,
  );
  const allTasks = tasksData?.data?.task || [];
  const TaskPagination = tasksData?.data?.pagination || {};
  // const delegationTasks = allTasks.filter(
  //   (t: any) => t.type === TaskTypeEnum.DELEGATION
  // );

  // const helpTasks = allTasks.filter((t: any) => t.type === TaskTypeEnum.HELP);

  // const recurringTasks = allTasks.filter(
  //   (t: any) => t.type === TaskTypeEnum.RECURRING
  // );

  // const taskEdit = (taskId: string) => {
  //   const task = delegationTasks.find((t: any) => t.id === taskId);
  //   if (task) {
  //     setCreateOpen(true);
  //     setFormData({
  //       title: task.title,
  //       description: task.description,
  //       type: task.type.toString(),
  //       priority: task.priority,
  //       assignedUsers: task.assignedUsers.map((u: any) => u.id),
  //       startDate: task.startDate,
  //       endDate: task.endDate,
  //       id: task.id,
  //     });
  //   }
  // }

  const createTaskModal = () => {
    setLoading(false);
    setFormData({
      title: "",
      description: "",
      priority: "",
      assignedUsers: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      type: "",
      id: "",
    });
    setCreateOpen(true);
  };

  const {
    data: draftIndentTasksData,
    isLoading: isDraftIndentTaskLoading,
    refetch: refetchDraftIndents,
  } = useApiQuery(
    [
      `DRAFT_INDENT_TASKS-${draftIndentStart}-${draftIndentLimit}-${draftIndentStatus.join(
        ",",
      )}-${dashboardMode}`,
    ],
    `${API_ENDPOINTS.FMS_INDENT_DRAFT_LIST
    }?sortBy=createdAt&sortOrder=asc&start=${draftIndentStart}&limit=${draftIndentLimit}&status=${draftIndentStatus.join(
      ",",
    )}${isAdminParam}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: activeTab === TaskTypeEnum.DRAFT_INDENT,
    } as const,
  );
  const draftIndentTasks = draftIndentTasksData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-12" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-6 w-12" />
            </CardHeader>
          </Card>
        </div>

        <Separator />

        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
              <Skeleton className="h-5 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and analyze system performance, user activity, and workflow
            progress with detailed insights and filters.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {canAccessCompanyDashboard && (
            <div className="inline-flex rounded-full border bg-muted">
              <Button
                type="button"
                size="sm"
                variant={!isCompanyView ? "default" : "ghost"}
                className={`rounded-full px-4 ${!isCompanyView ? "" : "text-muted-foreground"
                  }`}
                onClick={() => handleDashboardModeChange("my")}
              >
                My Dashboard
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isCompanyView ? "default" : "ghost"}
                className={`rounded-full px-4 ${isCompanyView ? "" : "text-muted-foreground"
                  }`}
                onClick={() => handleDashboardModeChange("company")}
              >
                Company Dashboard
              </Button>
            </div>
          )}

          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-lg shadow border-l-4 border-gray-200"
            >
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))
          : stats.map((stat) => (
            <div
              key={stat.key}
              className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-transform transform hover:-translate-y-1 border-l-4 border-primary"
            >
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-semibold text-primary mt-1">
                {displayedStats?.[stat.key] ?? "0"}
              </p>
            </div>
          ))}
      </div>
      <div className="space-y-6">
        {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[180px]"
            />

            <Select onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date ? date.toLocaleDateString() : "dd/mm/yyyy"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <CalendarComponent mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>
        </div> */}

        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className={cn(pageTabsTrackClassName, "min-w-fit")}>
              <nav
                className="flex gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Tabs"
              >
                {tabs.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className={pageTabButtonClassName(activeTab === item.value)}
                    onClick={() => {
                      setActiveTab(item.value);

                      const params = new URLSearchParams(searchParams.toString());
                      const tabValue = TAB_TYPE_TO_QUERY[item.value as TaskTypeEnum];
                      if (tabValue) {
                        params.set("tab", tabValue);
                        router.replace(`${pathname}?${params.toString()}`);
                      }

                      if (
                        item.value === TaskTypeEnum.MY_TASKS ||
                        item.value === TaskTypeEnum.DELEGATION
                      ) {
                        setTaskStart(1);
                        setTaskLimit(10);
                      }
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-3 ml-auto">
              <Select
                value={viewMode}
                onValueChange={(val) => setViewMode(val as "table" | "kanban")}
              >
                <SelectTrigger size="sm" className="w-[160px]">
                  <div className="flex items-center gap-2">
                    {viewMode === "table" ? (
                      <Table2 className="w-4 h-4" />
                    ) : (
                      <CalendarDays className="w-4 h-4" />
                    )}
                    <span>
                      View: {viewMode === "table" ? "Table" : "Calendar"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4" />
                      <span>Table</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="kanban">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      <span>Calendar</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <PermissionGuard moduleId={5} action="create">
                <Button size="sm" onClick={createTaskModal}>
                  Create Task
                </Button>
              </PermissionGuard>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {viewMode === "kanban" && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1 py-1 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                  {getViewTitle()}
                </h2>
                <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 ml-1 pl-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                    {TAB_TYPE_TO_QUERY[activeTab as TaskTypeEnum]?.replace('-', ' ')} BOARD
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => shiftDate("prev")}
                    className="h-8 w-8 hover:bg-slate-50 text-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                    className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => shiftDate("next")}
                    className="h-8 w-8 hover:bg-slate-50 text-slate-500"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Select
                  value={calendarViewType}
                  onValueChange={(val) => setCalendarViewType(val as any)}
                >
                  <SelectTrigger size="sm" className="h-[38px] w-[130px] rounded-xl border-slate-200 font-medium">
                    <div className="flex items-center gap-2">
                       {calendarViewType === 'day' && <Clock className="h-3.5 w-3.5 opacity-60" />}
                       {calendarViewType === 'week' && <CalendarDays className="h-3.5 w-3.5 opacity-60" />}
                       {calendarViewType === 'month' && <CalendarClock className="h-3.5 w-3.5 opacity-60" />}
                       <span className="capitalize">{calendarViewType}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="day" className="focus:bg-slate-50">Day</SelectItem>
                    <SelectItem value="week" className="focus:bg-slate-50">Week</SelectItem>
                    <SelectItem value="month" className="focus:bg-slate-50">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {viewMode === "kanban" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === TaskTypeEnum.FLOW && (
              <CalendarKanban
                viewType={calendarViewType}
                selectedDate={selectedDate}
                items={displayedSteps.length > 0 ? displayedSteps : dummyKanbanData[TaskTypeEnum.FLOW]}
                getDate={(item) => item.date || item.createdAt || '2024-04-18'}
                renderCard={(item) => (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-gray-900 mb-3 capitalize group-hover:text-primary transition-colors line-clamp-2">
                      {item.title || item.fmsName}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                         <span>Priority</span>
                         <span className={cn(
                           "rounded-full px-1.5 py-0.5 font-bold uppercase",
                           item.priority === 'High' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                         )}>
                           {item.priority || 'Medium'}
                         </span>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Step</p>
                         <p className="text-xs font-semibold text-gray-700">{item.step || item.stepName}</p>
                      </div>
                    </div>
                  </div>
                )}
                onItemClick={(item) => {
                  if (item.stepId) router.push(`${RoutesEnum.WORKFLOW_STEPS}/${item.stepId}`);
                }}
                onViewMore={(date, allItems) => {
                  setViewMoreSheet({
                    open: true,
                    title: `Workflows — ${date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
                    items: allItems,
                    renderCard: (item) => (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-gray-900 capitalize">{item.title || item.fmsName}</h3>
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>Priority</span>
                          <span className={cn("rounded-full px-1.5 py-0.5 font-bold uppercase", item.priority === 'High' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700")}>{item.priority || 'Medium'}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Step: <span className="normal-case font-semibold text-gray-700">{item.step || item.stepName}</span></p>
                      </div>
                    ),
                    onItemClick: (item) => { if (item.stepId) router.push(`${RoutesEnum.WORKFLOW_STEPS}/${item.stepId}`); },
                  });
                }}
              />
            )}

            {activeTab === TaskTypeEnum.DRAFT_INDENT && (
              <CalendarKanban
                viewType={calendarViewType}
                selectedDate={selectedDate}
                items={draftIndentTasks.length > 0 ? draftIndentTasks : dummyKanbanData[TaskTypeEnum.DRAFT_INDENT]}
                getDate={(item) => item.date || item.createdAt || '2024-04-18'}
                renderCard={(item) => (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-gray-900 mb-2 capitalize group-hover:text-primary transition-colors line-clamp-2">
                       {item.title || item.fms}
                    </h3>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                          {item.creator?.[0] || 'U'}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 italic">By {item.creator || 'User'}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 rounded-md",
                        item.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {item.status || item.verifierStatus || 'Draft'}
                      </span>
                    </div>
                  </div>
                )}
                onItemClick={(item) => {
                  if (item.id) router.push(`/dashboard/fms-indents/draft-list/${item.id}`);
                }}
                onViewMore={(date, allItems) => {
                  setViewMoreSheet({
                    open: true,
                    title: `Draft Indents — ${date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
                    items: allItems,
                    renderCard: (item) => (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-gray-900 capitalize">{item.title || item.fms}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 italic">By {item.creator || 'User'}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 rounded-md", item.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{item.status || 'Draft'}</span>
                        </div>
                      </div>
                    ),
                    onItemClick: (item) => { if (item.id) router.push(`/dashboard/fms-indents/draft-list/${item.id}`); },
                  });
                }}
              />
            )}

            {(activeTab === TaskTypeEnum.DELEGATION || activeTab === TaskTypeEnum.MY_TASKS) && (
              <CalendarKanban
                viewType={calendarViewType}
                selectedDate={selectedDate}
                items={allTasks.length > 0 ? allTasks : dummyKanbanData[activeTab as keyof typeof dummyKanbanData]}
                getDate={(item) => item.dueDate || item.date || item.createdAt || '2024-04-18'}
                renderCard={(item) => (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-gray-900 mb-2 capitalize group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
                           {item.assignee?.[0] || 'U'}
                         </div>
                         <span className="text-[11px] font-medium text-slate-600">{item.assignee || 'Member'}</span>
                       </div>
                    </div>
                  </div>
                )}
                onItemClick={(item) => {
                  if (item.id) router.push(`/dashboard/task-detail/${item.id}`);
                }}
                onViewMore={(date, allItems) => {
                  setViewMoreSheet({
                    open: true,
                    title: `Tasks — ${date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
                    items: allItems,
                    renderCard: (item) => (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-gray-900 capitalize">{item.title}</h3>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
                            {item.assignee?.[0] || 'U'}
                          </div>
                          <span className="text-[11px] text-slate-600">{item.assignee || 'Member'}</span>
                        </div>
                      </div>
                    ),
                    onItemClick: (item) => { if (item.id) router.push(`/dashboard/task-detail/${item.id}`); },
                  });
                }}
              />
            )}
          </div>
        )}

        {/* View More Side Drawer */}
        <Sheet open={viewMoreSheet.open} onOpenChange={(open) => setViewMoreSheet((prev) => ({ ...prev, open }))}>
          <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-xl">
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle className="text-base font-bold">{viewMoreSheet.title}</SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  {viewMoreSheet.items.length} {viewMoreSheet.items.length === 1 ? "item" : "items"} on this day
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {viewMoreSheet.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => {
                      viewMoreSheet.onItemClick?.(item);
                      setViewMoreSheet((prev) => ({ ...prev, open: false }));
                    }}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    {viewMoreSheet.renderCard(item)}
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {viewMode === "table" && activeTab === TaskTypeEnum.FLOW && (
          <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
            {displayedSteps.length > 0 ? (
              <>
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Workflow Name</TableHead>
                      <TableHead>Step Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Step No.</TableHead>
                      <TableHead>Reference ID</TableHead>
                      {isCompanyView && <TableHead>User Name</TableHead>}
                      <TableHead>Schedule Start</TableHead>
                      <TableHead>Schedule End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedSteps.map((step: any, index: number) => {
                      const scheduleEndDate = step?.scheduleEndDateTime
                        ? new Date(step.scheduleEndDateTime)
                        : null;
                      const isOverdue = Boolean(
                        scheduleEndDate && scheduleEndDate < new Date(),
                      );

                      return (
                        <TableRow
                          key={step.stepId || index}
                          className={`${isCompanyView ? "cursor-default" : "cursor-pointer"
                            } transition-colors`}
                          onClick={() => {
                            // if (isCompanyView) return;
                            router.push(
                              `${RoutesEnum.WORKFLOW_STEPS}/${step.stepId}`,
                            );
                          }}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{step?.fmsName || "—"}</TableCell>
                          <TableCell className="font-medium truncate max-w-[150px]">
                            {step?.stepName || "—"}
                          </TableCell>
                          <TableCell className="capitalize">
                            {/* {formatStatus(step?.stepStatus)} */}
                            <Badge
                              variant={
                                getStatusInfo(
                                  STATUSTABLE.FLOWSTEP,
                                  step?.stepStatus as any,
                                ).variant as any
                              }
                            >
                              {
                                getStatusInfo(
                                  STATUSTABLE.FLOWSTEP,
                                  step?.stepStatus as any,
                                ).name
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatTimeline(step?.timelineInMinutes)}
                          </TableCell>
                          <TableCell>{step?.sequence || "—"}</TableCell>
                          <TableCell>{step?.refrenceId || "—"}</TableCell>
                          {isCompanyView && (
                            <TableCell>
                              <MembersCell
                                members={step?.assignedUser}
                                maxVisible={5}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            {step?.scheduleStartDateTime
                              ? new Date(
                                step.scheduleStartDateTime,
                              ).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell
                            className={isOverdue ? "font-medium text-[#d54462]" : ""}
                          >
                            {scheduleEndDate ? (
                              isOverdue ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        {scheduleEndDate.toLocaleString()}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      Overdue
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                scheduleEndDate.toLocaleString()
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {!isCompanyView && (
                  <div className="border-t px-4 pb-4">
                    <Pagination
                      start={start}
                      limit={limit}
                      total={total}
                      pagination={data?.data?.pagination}
                      onPageChange={(newStart) => setStart(newStart)}
                      onLimitChange={(newLimit) => {
                        setLimit(newLimit);
                        setStart(1);
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              !userLoading &&
              displayedSteps.length === 0 && (
                <EmptyState
                  onClick={() => { }}
                  buttonTitle=""
                  title="No Indent Flow Found"
                  description="No steps have been defined for this Workflow yet."
                />
              )
            )}
            {userLoading && (
              <div className="flex justify-center items-center h-full py-4">
                <p>Loading...</p>
              </div>
            )}
          </div>
        )}

        {viewMode === "table" && (activeTab === TaskTypeEnum.DELEGATION ||
          activeTab === TaskTypeEnum.MY_TASKS) && (
            <Delegations
              tasks={allTasks}
              isTaskLoading={isTaskLoading}
              start={taskStart}
              limit={taskLimit}
              total={TaskPagination.total || 0}
              pagination={TaskPagination}
              onPageChange={(newStart) => setTaskStart(newStart)}
              onLimitChange={(newLimit) => {
                setTaskLimit(newLimit);
                setTaskStart(1);
              }}
            />
          )}
        {viewMode === "table" && activeTab === TaskTypeEnum.DRAFT_INDENT && (
          <DraftIndentTab
            draftIndentTasks={draftIndentTasks}
            isDraftIndentTaskLoading={isDraftIndentTaskLoading}
            start={draftIndentStart}
            limit={draftIndentLimit}
            total={draftIndentTasksData?.data?.pagination?.total || 0}
            pagination={draftIndentTasksData?.data?.pagination}
            onPageChange={(newStart) => setDraftIndentStart(newStart)}
            onLimitChange={(newLimit) => {
              setDraftIndentLimit(newLimit);
              setDraftIndentStart(1);
            }}
          />
        )}
      </div>

      {/* 🔹 Filter Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Dashboard Statistics</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Year Filter */}
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Select Year</p>
              <Select
                value={tempFilters.specificYear}
                onValueChange={(val) =>
                  setTempFilters((prev) => {
                    const nextRange =
                      prev.dateFilter === DashboardDateFilter.SPECIFIC_YEAR
                        ? getDateRangeByFilter(
                          DashboardDateFilter.SPECIFIC_YEAR,
                          val,
                          prev.startDate,
                          prev.endDate,
                        )
                        : {
                          startDate: prev.startDate,
                          endDate: prev.endDate,
                        };

                    return {
                      ...prev,
                      specificYear: val,
                      startDate: nextRange.startDate,
                      endDate: nextRange.endDate,
                    };
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Date Filter</p>
              <Select
                value={String(tempFilters.dateFilter)}
                onValueChange={(val) =>
                  setTempFilters((prev) => {
                    const nextDateFilter = Number(val) as DashboardDateFilter;
                    const nextRange = getDateRangeByFilter(
                      nextDateFilter,
                      prev.specificYear,
                      prev.startDate,
                      prev.endDate,
                    );

                    return {
                      ...prev,
                      dateFilter: nextDateFilter,
                      startDate: nextRange.startDate,
                      endDate: nextRange.endDate,
                    };
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Date Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(DashboardDateFilter.THIS_MONTH)}>
                    This Month
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.CURRENT_FINANCIAL_YEAR)}>
                    Current FY
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.LAST_FINANCIAL_YEAR)}>
                    Last FY
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.TODAY)}>
                    Today
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.LAST_WEEK)}>
                    Last Week
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.LAST_MONTH)}>
                    Last Month
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.LAST_YEAR)}>
                    Last Year
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.SPECIFIC_YEAR)}>
                    Specific Year
                  </SelectItem>
                  <SelectItem value={String(DashboardDateFilter.CUSTOM_RANGE)}>
                    Custom Range
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Range Dates */}
            {tempFilters.dateFilter === DashboardDateFilter.CUSTOM_RANGE && (
              <div className="flex gap-3">
                <Input
                  type="date"
                  value={tempFilters.startDate}
                  onChange={(e) =>
                    setTempFilters((p) => ({
                      ...p,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full"
                />
                <Input
                  type="date"
                  value={tempFilters.endDate}
                  onChange={(e) =>
                    setTempFilters((p) => ({
                      ...p,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Form */}
      <Dialog open={iscreateopen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Title */}
            <div>
              <Label className="mb-1.5">Task Title</Label>
              <Input
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1.5">Description</Label>
              <Textarea
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            {/* Priority, Dates */}
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Task Type */}
                <div className="col-span-1">
                  <Label className="mb-1.5">Task Type</Label>
                  <Select
                    onValueChange={(val) => handleChange("type", val)}
                    value={formData.type || ""}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Delegation</SelectItem>
                      <SelectItem value="2">Help</SelectItem>
                      {/* <SelectItem value="3">Recurring</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="col-span-1">
                  <Label className="mb-1.5">Priority</Label>
                  <Select
                    onValueChange={(val) => handleChange("priority", val)}
                    value={formData.priority}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_ENUM).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-1.5">Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1.5">End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                />
              </div>
            </div>

            {/* Users */}
            <div className="flex flex-col space-y-2 relative">
              <UserSearch
                marginTop="mt-3"
                search={userSearch}
                setSearch={setUserSearch}
                selectedUserIds={pillUsers.map((user: any) => user.id)}
                onSelect={(user: any) => handleToggleUser(user)}
                isFocused={showUserDropdown}
                setIsFocused={setShowUserDropdown}
                showDropdown={showUserDropdown}
                setShowDropdown={setShowUserDropdown}
                onChange={(e) => setUserSearch(e.target.value)}
                onFocus={() => setShowUserDropdown(true)}
                onBlur={() => setShowUserDropdown(false)}
                label="Assign to"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {pillUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center bg-primary/80 text-black rounded-full px-3 py-1 text-sm"
                  >
                    {user.firstName}
                    <button
                      type="button"
                      className="ml-2 text-black hover:black cursor-pointer"
                      onClick={() => handleToggleUser(user)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                (formData.id ? !canUpdateTask : !canCreateTask)
              }
            >
              {loading && <Loader className="animate-spin w-5 h-5 mr-2" />}
              {formData.id ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
