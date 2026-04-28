"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nitroberry/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import { Badge, BadgeVariant } from "@nitroberry/ui";
import { Card, CardContent } from "@nitroberry/ui";
import {
  Edit,
  Table2,
  Network,
  Filter,
  Key,
  Loader,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  User,
  MoreVertical,
  CircleCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nitroberry/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@nitroberry/ui";

import { EmptyState } from "@/components/not-found";
import { PermissionGuard, PermissionDeniedState, useModulePermissions } from "@/components/PermissionGuard";
import BaseModal from "./baseModal";
import CreateUserForm from "./modals/createUserModal";
import EditUserForm from "./modals/editUserForm";
import ChangePasswordForm from "./modals/changePasswordModal";
import DeleteUserForm from "./modals/deleteUserModal";
import CreateGroupForm from "./modals/createGroupForm";
import FilterForm from "./modals/filterForm";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { apiCall } from "@nitroberry/api-client";
import { useFormik } from "formik";
import { validationSchemas } from "@/lib/validationsSchema";
import { StatisticsType } from "@/lib/enums/statistics-type.enum";
import { JobTitleComponent } from "./tabs/jobTitleComponent";
import { DepartmentComponent } from "./tabs/departmentComponent";
import { StorageComponent } from "./tabs/storageComponent";
import { SupportComponent } from "./tabs/supportComponent";
import { CompanyAuditComponent } from "./tabs/companyAuditComponent";
import { Pagination } from "./pagination";
import { cn, formatDateTime } from "@nitroberry/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@nitroberry/ui";
import { RolesComponent } from "./tabs/rolesComp";
import { HierarchyComponent } from "./tabs/hierarchy-chart";
import { UserDetailsHierarchyDrawer } from "./components/user-details-hierarchy-drawer";
import { CompanySettingsTab } from "./tabs/companySettingsTab";
import { PlanTab } from "./tabs/planTab";
// import { HolidaysTab } from "./tabs/holidaysTab";
// import { CompanyShiftsTab } from "./tabs/companyShiftsTab";
import { CompanyLocationsTab } from "./tabs/companyLocationsTab";
import { LocationCalendarTab } from "./tabs/locationCalendarTab";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@nitroberry/ui";

type UserViewMode = "table" | "hierarchy";
type UserDetailsDrawerMode = "details" | "edit-user" | "edit-hierarchy";
type SetupStatTone = "neutral" | "success" | "warning" | "danger" | "info";
type SetupStatItem = {
  label: string;
  value: string | number;
  note?: string;
  tone?: SetupStatTone;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const DRAWER_TYPES = new Set(["createUser", "editUser", "createGroup", "editGroup"]);

const drawerMeta: Record<string, { title: string; description: string }> = {
  createUser: { title: "Add New User", description: "Fill in the details below to create a new user account." },
  editUser: { title: "Edit User Details", description: "Edit user information or update their role." },
  createGroup: { title: "Create User Group", description: "Fill in the details to create a new group." },
  editGroup: { title: "Edit User Group", description: "Modify the group name, description, or members as needed." },
};

const tabs = [
  { label: "Company", value: "company" },
  { label: "Company Locations", value: "company_locations" },
  { label: "Location Calendar", value: "location_calendar" },
  { label: "Plan & Billing", value: "plan" },
  // { label: "Holidays", value: "holidays" },
  { label: "Users", value: "user" },
  { label: "Groups", value: "group" },
  { label: "Job Titles", value: "job_title" },
  { label: "Departments", value: "department" },
  { label: "Roles & Permissions", value: "roles" },
  { label: "Storage", value: "storage" },
  { label: "Support", value: "support" },
  { label: "Company Audit", value: "company_audit" },
  // { label: "Company Shifts", value: "company_shifts" },
] as const;

type SetupTabValue = (typeof tabs)[number]["value"];
const setupTabValues = tabs.map((tab) => tab.value) as SetupTabValue[];

const isSetupTabValue = (value: string | null): value is SetupTabValue =>
  Boolean(value && setupTabValues.includes(value as SetupTabValue));

const MOCK_SETUP_STATS: Record<SetupTabValue, SetupStatItem[]> = {
  company: [
    { label: "Profile Completion", value: "92%", note: "Company profile", tone: "info" },
    { label: "Active Branches", value: 8, note: "Registered", tone: "neutral" },
    { label: "Locations", value: 23, note: "Operating", tone: "success" },
    { label: "Pending Approvals", value: 3, note: "Needs action", tone: "warning" },
  ],
  company_locations: [
    { label: "Total Locations", value: 0, note: "Configured", tone: "neutral" },
    { label: "Active Locations", value: 0, note: "Operational", tone: "success" },
    { label: "With Timezone", value: "0%", note: "Calendar ready", tone: "info" },
  ],
  location_calendar: [
    { label: "Location Calendars", value: 0, note: "Auto-created", tone: "neutral" },
    { label: "Holiday Rules", value: 0, note: "Location scoped", tone: "info" },
    { label: "Shift Templates", value: 0, note: "Location scoped", tone: "success" },
  ],
  plan: [
    { label: "Current Plan", value: "Pro", note: "Renews 04 Apr", tone: "info" },
    { label: "Seats Used", value: "84 / 100", note: "Allocated", tone: "neutral" },
    { label: "Storage Used", value: "71%", note: "Of included quota", tone: "warning" },
    { label: "Invoices Due", value: 1, note: "Due in 6 days", tone: "danger" },
  ],
  holidays: [
    { label: "Holiday Calendars", value: 4, note: "Active scopes", tone: "neutral" },
    { label: "Upcoming Holidays", value: 7, note: "Next 60 days", tone: "info" },
    { label: "Optional Holidays", value: 2, note: "Configurable", tone: "warning" },
    { label: "Coverage", value: "100%", note: "Departments mapped", tone: "success" },
  ],
  user: [
    { label: "Total Users", value: 1284, note: "Directory", tone: "neutral" },
    { label: "Today Login", value: 376, note: "Since 00:00", tone: "info" },
    { label: "Active Users", value: 1122, note: "Enabled", tone: "success" },
    { label: "Inactive Users", value: 162, note: "Disabled", tone: "warning" },
    { label: "Super Admin", value: 6, note: "Critical access", tone: "info" },
    { label: "Admin", value: 21, note: "Privileged", tone: "neutral" },
    { label: "Manager", value: 148, note: "Line managers", tone: "success" },
    { label: "Employees", value: 947, note: "Contributors", tone: "neutral" },
  ],
  group: [
    { label: "Total Groups", value: 38, note: "Configured", tone: "neutral" },
    { label: "Active Groups", value: 34, note: "In use", tone: "success" },
    { label: "Avg Members", value: 12, note: "Per group", tone: "info" },
    { label: "Unassigned Users", value: 9, note: "No group", tone: "warning" },
  ],
  job_title: [
    { label: "Job Titles", value: 56, note: "Total", tone: "neutral" },
    { label: "Mapped Users", value: "97%", note: "Coverage", tone: "success" },
    { label: "Unused Titles", value: 4, note: "Can archive", tone: "warning" },
  ],
  department: [
    { label: "Departments", value: 14, note: "Operational", tone: "neutral" },
    { label: "Avg Headcount", value: 92, note: "Per department", tone: "info" },
    { label: "Vacant Teams", value: 2, note: "Need staffing", tone: "warning" },
  ],
  roles: [
    { label: "Roles", value: 19, note: "Defined", tone: "neutral" },
    { label: "Custom Roles", value: 11, note: "Org specific", tone: "info" },
    { label: "Over-privileged", value: 5, note: "Audit pending", tone: "danger" },
    { label: "Least-Privilege", value: "86%", note: "Compliant", tone: "success" },
  ],
  storage: [
    { label: "Total Usage", value: "412 GB", note: "Across org", tone: "neutral" },
    { label: "Documents", value: "267 GB", note: "Primary share", tone: "info" },
    { label: "Media", value: "121 GB", note: "Uploads", tone: "warning" },
    { label: "Archive", value: "24 GB", note: "Cold storage", tone: "success" },
  ],
  support: [
    { label: "Open Tickets", value: 6, note: "Needs response", tone: "warning" },
    { label: "Resolved (30d)", value: 42, note: "Closed", tone: "success" },
    { label: "Avg Response", value: "2h 14m", note: "SLA metric", tone: "info" },
  ],
  company_audit: [
    { label: "Events Today", value: 312, note: "Logged", tone: "neutral" },
    { label: "Critical Alerts", value: 2, note: "Investigate", tone: "danger" },
    { label: "Policy Violations", value: 7, note: "This week", tone: "warning" },
    { label: "Resolved Alerts", value: 19, note: "This week", tone: "success" },
  ],
  company_shifts: [
    { label: "Active Shifts", value: 11, note: "Published", tone: "success" },
    { label: "Overlapping Shifts", value: 1, note: "Needs fix", tone: "danger" },
    { label: "Coverage", value: "96%", note: "Weekly", tone: "info" },
  ],
};

const getStatToneClasses = (tone: SetupStatTone = "neutral") => {
  if (tone === "success") return "text-emerald-700";
  if (tone === "warning") return "text-amber-700";
  if (tone === "danger") return "text-rose-700";
  if (tone === "info") return "text-sky-700";
  return "text-slate-600";
};

const SETUP_TAB_STATISTICS_TYPE_MAP: Partial<Record<SetupTabValue, StatisticsType>> = {
  company: StatisticsType.COMPANY,
  plan: StatisticsType.PLANS,
  holidays: StatisticsType.HOLIDAYS,
  user: StatisticsType.USERS,
  group: StatisticsType.GROUPS,
  job_title: StatisticsType.JOBTITLES,
  department: StatisticsType.DEPARTMENT,
  roles: StatisticsType.ROLEPERMMSION,
  storage: StatisticsType.STORAGE,
  support: StatisticsType.SUPPORTTICKET,
  company_audit: StatisticsType.COMPANYAUDIT,
  company_shifts: StatisticsType.COMPANYSHIFT,
};

const normalizeStatisticsResponse = (
  raw: unknown,
  tab: SetupTabValue,
): SetupStatItem[] => {
  if (!raw || typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;
  const source =
    (root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root) ||
    root;

  if (tab === "holidays") {
    return [
      { label: "Total Holidays", value: toStringValue(source.totalHolidays), tone: "neutral" },
      { label: "Active Holidays", value: toStringValue(source.activeHolidays), tone: "success" },
      { label: "Upcoming Holidays", value: toStringValue(source.upcomingHolidays), tone: "info" },
      { label: "Current Month", value: toStringValue(source.currentMonthCount), tone: "neutral" },
      { label: "Last Month", value: toStringValue(source.lastMonthCount), tone: "neutral" },
      {
        label: "Growth",
        value: `${toStringValue(source.growthPercentage)}%`,
        tone: source.isGrowthPositive ? "success" : "danger",
      },
    ].filter((item) => item.value !== "");
  }

  if (tab === "user") {
    const topRoles = Array.isArray(source.topRoles) ? source.topRoles : [];
    const topRole =
      topRoles.length > 0 && topRoles[0] && typeof topRoles[0] === "object"
        ? (topRoles[0] as Record<string, unknown>)
        : null;

    return [
      { label: "Total Users", value: toStringValue(source.totalUsers), tone: "neutral" },
      { label: "Active Users", value: toStringValue(source.activeUsers), tone: "success" },
      { label: "Inactive Users", value: toStringValue(source.inactiveUsers), tone: "warning" },
      { label: "Today Logins", value: toStringValue(source.todayLogins), tone: "info" },
      {
        label: "Top Role",
        value: toStringValue(topRole?.name),
        note:
          topRole && toFiniteNumber(topRole.count) !== null
            ? `${toStringValue(topRole.count)} users`
            : undefined,
        tone: "neutral",
      },
    ].filter((item) => item.value !== "");
  }

  if (tab === "group") {
    return [
      { label: "Total Groups", value: toStringValue(source.totalGroups), tone: "neutral" },
      { label: "Active Groups", value: toStringValue(source.activeGroups), tone: "success" },
      { label: "Inactive Groups", value: toStringValue(source.inactiveGroups), tone: "warning" },
    ].filter((item) => item.value !== "");
  }

  if (tab === "job_title") {
    return [
      { label: "Total Job Titles", value: toStringValue(source.totalJobTitles), tone: "neutral" },
      { label: "Active Job Titles", value: toStringValue(source.activeJobTitles), tone: "success" },
      { label: "Inactive Job Titles", value: toStringValue(source.inactiveJobTitles), tone: "warning" },
    ].filter((item) => item.value !== "");
  }

  if (tab === "department") {
    return [
      { label: "Total Departments", value: toStringValue(source.totalDepartments), tone: "neutral" },
      { label: "Active Departments", value: toStringValue(source.activeDepartments), tone: "success" },
      { label: "Inactive Departments", value: toStringValue(source.inactiveDepartments), tone: "warning" },
    ].filter((item) => item.value !== "");
  }

  if (tab === "roles") {
    return [
      { label: "Total Roles", value: toStringValue(source.totalRoles), tone: "neutral" },
      { label: "Active Roles", value: toStringValue(source.activeRoles), tone: "success" },
      { label: "Inactive Roles", value: toStringValue(source.inactiveRoles), tone: "warning" },
    ].filter((item) => item.value !== "");
  }

  if (tab === "storage") {
    const categories = Array.isArray(source.categories) ? source.categories : [];
    const topCategory = [...categories]
      .filter((item) => item && typeof item === "object")
      .map((item) => item as Record<string, unknown>)
      .sort((a, b) => (toFiniteNumber(b.totalSize) ?? 0) - (toFiniteNumber(a.totalSize) ?? 0))[0];

    return [
      { label: "Used Space", value: `${toStringValue(source.totalUsed)} MB`, tone: "warning" },
      { label: "Total Space", value: `${toStringValue(source.totalSpace)} MB`, tone: "neutral" },
      { label: "Usage", value: `${toStringValue(source.usagePercentage)}%`, tone: "info" },
      {
        label: "Top Category",
        value: toStringValue(topCategory?.category),
        note:
          topCategory && toFiniteNumber(topCategory.totalCount) !== null
            ? `${toStringValue(topCategory.totalCount)} files`
            : undefined,
        tone: "neutral",
      },
    ].filter((item) => item.value !== " MB" && item.value !== "%" && item.value !== "");
  }

  if (tab === "support") {
    return [
      { label: "Total Tickets", value: toStringValue(source.totalTickets), tone: "neutral" },
      { label: "Open Tickets", value: toStringValue(source.openTickets), tone: "warning" },
      { label: "Closed Tickets", value: toStringValue(source.closedTickets), tone: "success" },
      { label: "Rejected Tickets", value: toStringValue(source.rejectedTickets), tone: "danger" },
    ].filter((item) => item.value !== "");
  }

  if (tab === "company_audit") {
    const status = toStringValue(source.status);
    return [
      { label: "Total Audit Logs", value: toStringValue(source.totalAuditLogs), tone: "neutral" },
      { label: "Today Actions", value: toStringValue(source.todayActions), tone: "info" },
      { label: "Successful Actions", value: toStringValue(source.successfulActions), tone: "success" },
      { label: "Failed Actions", value: toStringValue(source.failedActions), tone: "danger" },
      { label: "Today Failures", value: toStringValue(source.todayFailures), tone: "warning" },
      {
        label: "System Health",
        value: toStringValue(source.systemHealthScore),
        note: status || undefined,
        tone: status.toLowerCase() === "healthy" ? "success" : "warning",
      },
    ].filter((item) => item.value !== "");
  }

  if (tab === "company_shifts") {
    return [
      { label: "Total Shifts", value: toStringValue(source.totalShifts), tone: "neutral" },
      { label: "Recently Updated", value: toStringValue(source.recentlyUpdated), tone: "info" },
      { label: "New Shifts", value: toStringValue(source.newShifts), tone: "success" },
    ].filter((item) => item.value !== "");
  }

  if (Array.isArray(source.statistics)) {
    return source.statistics
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const stat = item as Record<string, unknown>;
        const label =
          toStringValue(stat.label) ||
          toStringValue(stat.title) ||
          toStringValue(stat.name) ||
          "Metric";
        const value = toStringValue(stat.value) || toStringValue(stat.count) || "0";
        const note = toStringValue(stat.note) || toStringValue(stat.description) || undefined;
        return {
          label,
          value,
          note,
          tone: "neutral" as SetupStatTone,
        };
      })
      .filter(Boolean) as SetupStatItem[];
  }

  return Object.entries(source)
    .filter(([, value]) => ["string", "number"].includes(typeof value))
    .map(([key, value]) => ({
      label: key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^./, (s) => s.toUpperCase()),
      value: typeof value === "number" ? value : String(value),
      tone: "neutral",
    }));
};

export default function UsersTable({ defaultTab }: { defaultTab?: SetupTabValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedTab = defaultTab ?? searchParams.get("tab");
  const initialTab = isSetupTabValue(requestedTab) ? requestedTab : "company";
  const [activeTab, setActiveTab] = useState<SetupTabValue>(initialTab);
  const [userViewMode, setUserViewMode] = useState<UserViewMode>("table");
  const [activeModal, setActiveModal] = useState<{
    type?: string;
    open: boolean;
    user?: any;
  }>({ type: undefined, open: false });

  const initialFormData: any = {
    // Users
    createUser: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      roleId: null,
      policyType: 2,
      customExpireDays: null,
      jobTitle: "",
      department: "",
      profileLinks: [{ linkedIn: "", calenderLink: "" }],
      isActive: true,
      locationId: "",
      shiftId: "",
      managerId: "",
      hierarchyId: "",
    },
    editUser: {
      firstName: activeModal?.user?.firstName || "",
      lastName: activeModal?.user?.lastName || "",
      email: activeModal?.user?.email || "",
      roleId: activeModal?.user?.role?.id || activeModal?.user?.roleId || null,
      isActive: activeModal?.user?.isActive ?? false,
      jobTitleId:
        activeModal?.user?.jobTitleId ||
        activeModal?.user?.jobTitle?.id ||
        activeModal?.user?.job_title?.id ||
        null,
      departmentId:
        activeModal?.user?.departmentId ||
        activeModal?.user?.department?.id ||
        activeModal?.user?._department?.id ||
        null,
      customExpireDays: activeModal?.user?.customExpireDays || null,
      policyType: activeModal?.user?.policyType || 2,
      locationId: activeModal?.user?.locationId || activeModal?.user?.location?.id || null,
      managerId: activeModal?.user?.managerId || "",
      hierarchyId: activeModal?.user?.hierarchyId || "",
      profileLinks:
        (activeModal?.user?.profileLinks &&
          Array.isArray(activeModal.user.profileLinks) &&
          activeModal.user.profileLinks.length > 0
          ? activeModal.user.profileLinks
          : activeModal?.user?.profile_links &&
            Array.isArray(activeModal.user.profile_links) &&
            activeModal.user.profile_links.length > 0
            ? activeModal.user.profile_links
            : [{ linkedIn: "", calenderLink: "" }]),
      // holidayScopeId: activeModal?.user?.holidayScopeId || null,
    },
    changePassword: {
      password: "",
      confirmPassword: "",
    },
    deleteUser: {
      userId: null,
    },

    // Groups
    createGroup: {
      name: "",
      description: "",
      userIds: [],
    },
    editGroup: {
      name: activeModal?.user?.name || "",
      description: activeModal?.user?.description || "",
      userIds:
        activeModal?.user?.groupUsers?.map((user: any) => ({
          id: user.id,
          isDeleted: false,
        })) || [],
      // status: activeModal?.user?.status || "active",
    },
    deleteGroup: {
      groupId: null,
    },

    // Filters
    filters: {
      status: "", // "active" | "disabled"
      role: "", // "super_admin" | "admin" | "viewer"
      createdAt: "", // YYYY-MM-DD
    },
  };
  const [searchValue, setSearchValue] = useState("");
  const [jobTitleCreateSignal, setJobTitleCreateSignal] = useState(0);
  const [jobTitleRefreshSignal, setJobTitleRefreshSignal] = useState(0);
  const [departmentCreateSignal, setDepartmentCreateSignal] = useState(0);
  const [departmentRefreshSignal, setDepartmentRefreshSignal] = useState(0);
  const [roleCreateSignal, setRoleCreateSignal] = useState(0);
  const [roleRefreshSignal, setRoleRefreshSignal] = useState(0);
  const [companyAuditFilterSignal, setCompanyAuditFilterSignal] = useState(0);
  const [companyAuditRefreshSignal, setCompanyAuditRefreshSignal] = useState(0);
  const [shiftCreateSignal, setShiftCreateSignal] = useState(0);
  const [shiftRefreshSignal, setShiftRefreshSignal] = useState(0);
  const [holidayCreateSignal, setHolidayCreateSignal] = useState(0);
  const [holidayRefreshSignal, setHolidayRefreshSignal] = useState(0);
  const [supportCreateSignal, setSupportCreateSignal] = useState(0);
  const [supportRefreshSignal, setSupportRefreshSignal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [filterValues, setFilters] = useState<any>();
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isUserDetailsDrawerOpen, setIsUserDetailsDrawerOpen] = useState(false);
  const [selectedUserDetailsId, setSelectedUserDetailsId] = useState<string | null>(null);
  const [userDetailsDrawerMode, setUserDetailsDrawerMode] =
    useState<UserDetailsDrawerMode>("details");
  const [hierarchyReloadSignal, setHierarchyReloadSignal] = useState(0);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const [isTabsOverflowing, setIsTabsOverflowing] = useState(false);
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);

  const updateTabsScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setIsTabsOverflowing(hasOverflow);
    setCanScrollTabsLeft(el.scrollLeft > 0);
    setCanScrollTabsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  const scrollTabs = useCallback((direction: "left" | "right") => {
    const el = tabsScrollRef.current;
    if (!el) return;

    const distance = Math.max(180, Math.round(el.clientWidth * 0.5));
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (isSetupTabValue(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (defaultTab) return; // individual route pages — no URL manipulation needed
    const params = new URLSearchParams(searchParams.toString());
    if (!isSetupTabValue(params.get("tab"))) {
      params.set("tab", activeTab);
    }
    const query = params.toString();
    if (query !== searchParams.toString()) {
      router.replace(`${pathname}?${query}`, { scroll: false });
    }
  }, [defaultTab, pathname, router, searchParams, activeTab]);

  useEffect(() => {
    const tabsEl = tabsScrollRef.current;
    if (!tabsEl) return;

    const onScroll = () => updateTabsScrollState();
    tabsEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateTabsScrollState);
    updateTabsScrollState();

    return () => {
      tabsEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateTabsScrollState);
    };
  }, [updateTabsScrollState]);

  useEffect(() => {
    updateTabsScrollState();
  }, [activeTab, updateTabsScrollState]);

  const handleTabChange = (nextTab: SetupTabValue) => {
    setActiveTab(nextTab);
    setSearchValue("");
    setLimit(10);
    setStart(1);
    formik.resetForm();

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const createUser = useApiMutation(HTTP_METHODS.POST, API_ENDPOINTS.USERS);
  const changePassword = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.USERS}/${activeModal.user?.id}/password`,
  );
  const deleteUser = useApiMutation(
    HTTP_METHODS.DELETE,
    `${API_ENDPOINTS.USERS}/${activeModal.user?.id}`,
  );
  const editUser = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.USERS}/${activeModal.user?.id}`,
  );
  const createGroup = useApiMutation(HTTP_METHODS.POST, API_ENDPOINTS.GROUPS);

  const deleteGroup = useApiMutation(
    HTTP_METHODS.DELETE,
    `${API_ENDPOINTS.GROUPS}/${activeModal.user?.id}`,
  );
  const groupById = useApiMutation(
    HTTP_METHODS.GET,
    `${API_ENDPOINTS.GROUPS}/${activeModal.user?.id}`,
  );
  const editGroup = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.GROUPS}/${activeModal.user?.id}`,
  );
  const updateGroupStatus = useStatusMutation(
    HTTP_METHODS.PUT,
    ({ groupId }) => `${API_ENDPOINTS.GROUPS}/${groupId}/status`,
  );

  const formik = useFormik({
    initialValues: initialFormData[activeModal.type || "createUser"],
    validationSchema: validationSchemas[activeModal.type || "createUser"],
    enableReinitialize: true,
    onSubmit: async (values) => {
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(
          ([_, v]) =>
            v !== null &&
            v !== undefined &&
            !(typeof v === "string" && v.trim().length === 0),
        ),
      );
      setLoading(true);
      const handleMutation = (mutation: any, payload: any) => {
        mutation.mutate(payload, {
          onSuccess: () => {
            setLoading(false);
            refetch();
            refetchGroups();
            closeModal();
            formik.resetForm();
          },
          onError: (error: any) => {
            setLoading(false);
          },
        });
      };

      switch (activeModal.type) {
        case "createUser":
          {
            const createPayload = { ...filteredValues } as Record<string, unknown>;
            delete createPayload.managerId;
            delete createPayload.hierarchyId;

            createUser.mutate(createPayload, {
              onSuccess: async (response: any) => {
                try {
                  const selectedManagerId = toStringValue(filteredValues?.managerId);
                  const selectedManagerHierarchyId = selectedManagerId
                    ? hierarchyIdByUserId.get(selectedManagerId) || selectedManagerId
                    : "";
                  const createdUserId =
                    toStringValue(response?.data?.id) ||
                    toStringValue(response?.data?._id) ||
                    toStringValue(response?.data?.userId) ||
                    toStringValue(response?.data?.user?.id);

                  if (selectedManagerHierarchyId && createdUserId) {
                    await apiCall(HTTP_METHODS.POST, API_ENDPOINTS.USER_HIERARCHY, {
                      userId: createdUserId,
                      managerId: selectedManagerHierarchyId,
                    });
                  }
                } catch (error) {
                  console.error("Failed to create user hierarchy mapping:", error);
                } finally {
                  setLoading(false);
                  refetch();
                  refetchGroups();
                  closeModal();
                  formik.resetForm();
                }
              },
              onError: () => {
                setLoading(false);
              },
            });
          }
          break;
        case "editUser":
          {
            const selectedManagerId = toStringValue(filteredValues?.managerId);
            const selectedManagerHierarchyId = selectedManagerId
              ? hierarchyIdByUserId.get(selectedManagerId) || selectedManagerId
              : "";
            const selectedHierarchyId =
              toStringValue(filteredValues?.hierarchyId) ||
              toStringValue(activeModal?.user?.hierarchyId);
            const selectedUserId = toStringValue(activeModal?.user?.id);

            const payload = {
              firstName: filteredValues.firstName,
              lastName: filteredValues.lastName,
              roleId: filteredValues.roleId,
              isActive: filteredValues.isActive,
              jobTitleId: filteredValues.jobTitleId,
              departmentId: filteredValues.departmentId,
              customExpireDays:
                filteredValues.policyType === 1
                  ? filteredValues.customExpireDays
                  : undefined,
              locationId: filteredValues.locationId,
              profile_links: {
                linkedin:
                  (filteredValues?.profileLinks &&
                    Array.isArray(filteredValues.profileLinks) &&
                    filteredValues.profileLinks[0]?.linkedIn) ||
                  "",
                calenderLink:
                  (filteredValues?.profileLinks &&
                    Array.isArray(filteredValues.profileLinks) &&
                    filteredValues.profileLinks[0]?.calenderLink) ||
                  "",
              },
              userId: selectedUserId || undefined,
              hierarchyId: selectedHierarchyId || undefined,
              managerId:
                selectedManagerId || selectedHierarchyId
                  ? selectedManagerHierarchyId || null
                  : undefined,
            };
            const cleanedPayload = Object.fromEntries(
              Object.entries(payload).filter(([, v]) => v !== undefined),
            );

            editUser.mutate(cleanedPayload, {
              onSuccess: () => {
                setLoading(false);
                refetch();
                refetchGroups();
                closeModal();
                formik.resetForm();
              },
              onError: () => {
                setLoading(false);
              },
            });
          }
          break;
        case "changePassword":
          handleMutation(changePassword, { password: filteredValues.password });
          break;
        case "deleteUser":
          setLoading(true);
          deleteUser.mutate(undefined, {
            onSuccess: () => {
              setLoading(false);
              refetch();
              closeModal();
            },
            onError: (error: any) => {
              setLoading(false);
            },
          });
          break;
        case "filters":
          setLoading(true);
          console.log("filteredValues", filteredValues);
          if (activeTab === "user") {
            setFilters(filteredValues);
          }
          setLoading(false);
          closeModal();
          // formik.resetForm()
          break;

        case "createGroup":
          handleMutation(createGroup, filteredValues);
          break;
        case "editGroup":
          handleMutation(editGroup, filteredValues);
          break;
        case "deleteGroup":
          // handleMutation(deleteGroup, values.groupId);
          deleteGroup.mutate(undefined, {
            onSuccess: () => {
              setLoading(false);
              refetchGroups();
              closeModal();
            },
            onError: (error: any) => {
              setLoading(false);
            },
          });
          break;
      }
    },
  });

  // React Query keys
  const userQueryKey = ["Users", start, limit, filterValues];
  const groupQueryKey = ["Groups", start, limit];

  // Query param generators
  const getUserQueryParams = () =>
    new URLSearchParams({
      start: String(start),
      limit: String(limit),
      sortBy: "createdAt",
      sortOrder: "desc",
      // roleIds: filterValues?.filters?.role || "1,2,3,4",
      ...(activeTab === "user" ? { search: searchValue } : {}),
      ...(activeTab === "user" && filterValues?.filters?.createdAt
        ? { createdAfter: filterValues?.filters?.createdAt }
        : {}),
      ...(activeTab === "user" &&
        filterValues?.filters?.status &&
        filterValues?.filters?.status !== "undefined"
        ? { status: filterValues?.filters?.status }
        : {}),
      ...(activeTab === "user"
        ? filterValues?.filters?.role
          ? { roleIds: filterValues.filters.role }
          : {}
        : {}),
    }).toString();
  const getGroupQueryParams = () =>
    new URLSearchParams({
      start: String(start),
      limit: String(limit),
      sortBy: "name",
      sortOrder: "desc",
      ...(activeTab === "group" ? { search: searchValue } : {}),
      // ...(filters?.status ? { status: filters?.status } : {}),
    }).toString();

  // Fetch users
  const { hasAccess: canReadUsers } = useModulePermissions(1);
  const {
    data: data,
    isLoading: isLoading,
    isFetching: isFetching,
    refetch: refetch,
  } = useApiQuery(
    ["Users", start, limit, filterValues],
    `${API_ENDPOINTS.USERS}?${getUserQueryParams()}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: activeTab === "user" && userViewMode === "table" && canReadUsers,
    } as const,
  );

  // Fetch groups
  const { hasAccess: canReadGroups } = useModulePermissions(6);
  const {
    data: groupData,
    isLoading: groupLoading,
    isFetching: groupFetching,
    refetch: refetchGroups,
  } = useApiQuery(
    groupQueryKey,
    `${API_ENDPOINTS.GROUPS}?${getGroupQueryParams()}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: activeTab === "group" && canReadGroups,
    } as const,
  );

  const activeStatisticsType = SETUP_TAB_STATISTICS_TYPE_MAP[activeTab];
  const {
    data: statistics,
    isLoading: statisticsload,
  } = useApiQuery(
    ["SetupTabStatistics", activeTab, activeStatisticsType],
    `${API_ENDPOINTS.STATISTICS_SETUP}?type=${activeStatisticsType}`,
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 0,
      enabled: Boolean(activeStatisticsType),
    } as const,
  );

  const tabStats = useMemo(() => {
    const normalized = normalizeStatisticsResponse(statistics, activeTab);
    return normalized.length > 0 ? normalized : MOCK_SETUP_STATS[activeTab] || [];
  }, [statistics, activeTab]);
  const statsGridClassName =
    activeTab === "user"
      ? "grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8"
      : "grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5";
  const usersData = data?.data?.users || [];
  const groupsData = groupData?.data?.groupUsers || [];

  const usersTotalCount =
    toFiniteNumber(data?.data?.pagination?.totalItems) ??
    toFiniteNumber(data?.data?.pagination?.totalCount) ??
    toFiniteNumber(data?.data?.pagination?.total) ??
    toFiniteNumber(data?.data?.pagination?.count) ??
    toFiniteNumber(data?.data?.totalUsers) ??
    toFiniteNumber(data?.data?.total) ??
    toFiniteNumber(data?.data?.count) ??
    usersData.length;

  const groupsTotalCount =
    toFiniteNumber(groupData?.data?.pagination?.totalItems) ??
    toFiniteNumber(groupData?.data?.pagination?.totalCount) ??
    toFiniteNumber(groupData?.data?.pagination?.total) ??
    toFiniteNumber(groupData?.data?.pagination?.count) ??
    toFiniteNumber(groupData?.data?.totalGroups) ??
    toFiniteNumber(groupData?.data?.total) ??
    toFiniteNumber(groupData?.data?.count) ??
    groupsData.length;

  const openModal = (type: string, group?: any) => {
    setActiveModal({ type, open: true, user: group });
    setSearchValue("");
    if (DRAWER_TYPES.has(type)) {
      setIsFormDrawerOpen(true);
    }
    if (type === "editGroup" && group?.id) {
      groupById.mutate(undefined, {
        onSuccess: (res: any) => {
          if (res?.data) {
            const groupData = res.data;
            setActiveModal((prev) => ({
              ...prev,
              user: {
                ...prev.user,
                ...groupData,
              },
            }));
          }
        },
        onError: (err: any) => {
          console.error("Failed to fetch group:", err);
        },
      });
    }
    if (type === "editUser" && group?.id) {
      const existingRelation = hierarchyRelationsByUserId.get(String(group.id));

      apiCall(HTTP_METHODS.GET, `${API_ENDPOINTS.USERS}/${group.id}`)
        .then((res: any) => {
          if (res?.data) {
            const userData = res.data;
            const rawManagerId =
              toStringValue(
                userData.managerId ??
                userData?.hierarchy?.managerId ??
                existingRelation?.managerId,
              ) || "";
            const mappedManagerId =
              userIdByHierarchyId.get(rawManagerId) || rawManagerId;

            setActiveModal((prev) => ({
              ...prev,
              user: {
                ...prev.user,
                ...userData,
                managerId: mappedManagerId,
                hierarchyId:
                  toStringValue(
                    userData.hierarchyId ??
                    userData?.hierarchy?.id ??
                    existingRelation?.hierarchyId,
                  ) || "",
              },
            }));
            // Update formik values with the fetched user data
            formik.setValues({
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              email: userData.email || "",
              roleId: userData.role?.id || userData.roleId || null,
              isActive: userData.isActive ?? false,
              jobTitleId:
                userData.jobTitleId || userData.jobTitle?.id || userData.job_title?.id || null,
              departmentId:
                userData.departmentId || userData.department?.id || userData._department?.id || null,
              customExpireDays: userData.customExpireDays || null,
              policyType: userData.policyType || 2,
              locationId: userData.locationId || userData?.location?.id || null,
              managerId: mappedManagerId,
              hierarchyId:
                toStringValue(
                  userData.hierarchyId ??
                  userData?.hierarchy?.id ??
                  existingRelation?.hierarchyId,
                ) || "",
              profileLinks:
                (userData.profileLinks && userData.profileLinks.length > 0
                  ? userData.profileLinks
                  : userData.profile_links && userData.profile_links.length > 0
                    ? userData.profile_links
                    : null) ||
                [{ linkedIn: "", calenderLink: "" }],
            });
          }
        })
        .catch((err: any) => {
          console.error("Failed to fetch user:", err);
        });
    }
  };

  const openUserDetailsDrawer = (
    userId: string,
    mode: UserDetailsDrawerMode = "details",
  ) => {
    setSelectedUserDetailsId(userId);
    setUserDetailsDrawerMode(mode);
    setIsUserDetailsDrawerOpen(true);
  };

  const shouldFetchUserFormOptions =
    isFormDrawerOpen &&
    (activeModal.type === "createUser" || activeModal.type === "editUser");

  const { data: jobtitles } = useApiQuery(
    ["getJobTitle"],
    `${API_ENDPOINTS.JOB_TITLE}?start=${1}&limit=${100}`,
    {
      enabled: shouldFetchUserFormOptions,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const { data: departments } = useApiQuery(
    ["getDepartment"],
    `${API_ENDPOINTS.DEPARTMENT}?start=${start}&limit=${100}`,
    {
      enabled: shouldFetchUserFormOptions,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  // holidayScopeId field is not in use — holiday list no longer fetched here
  const holidayListData = undefined;

  const { data: hierarchyUsersData } = useApiQuery(
    ["HIERARCHY_MANAGER_OPTIONS"],
    `${API_ENDPOINTS.USER_HIERARCHY_USERS}?start=1&limit=1000`,
    {
      enabled: shouldFetchUserFormOptions,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const { data: hierarchyChartData } = useApiQuery(
    ["HIERARCHY_RELATIONS_FOR_USER_FORM"],
    API_ENDPOINTS.USER_HIERARCHY_CHART,
    {
      enabled: shouldFetchUserFormOptions,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const managerOptions = useMemo(() => {
    const source = hierarchyUsersData as any;
    const usersArray =
      source?.data?.users ||
      source?.data?.hierarchyUsers ||
      source?.data?.data ||
      (Array.isArray(source?.data) ? source?.data : []) ||
      [];

    const seen = new Set<string>();

    return usersArray
      .map((candidate: any) => {
        const nestedUser =
          typeof candidate?.user === "object" && candidate.user !== null
            ? candidate.user
            : null;

        const userId = toStringValue(
          candidate?.userId ??
          candidate?.id ??
          candidate?._id ??
          nestedUser?.id ??
          nestedUser?._id,
        );

        const hierarchyId = toStringValue(
          candidate?.hierarchyId ?? candidate?.hierarchyMemberId ?? candidate?.memberId,
        );

        if (!userId || !hierarchyId || seen.has(hierarchyId)) {
          return null;
        }

        seen.add(hierarchyId);

        const firstName = toStringValue(
          candidate?.firstName ?? candidate?.first_name ?? nestedUser?.firstName,
        );
        const lastName = toStringValue(
          candidate?.lastName ?? candidate?.last_name ?? nestedUser?.lastName,
        );

        const name =
          `${firstName} ${lastName}`.trim() ||
          toStringValue(candidate?.name ?? nestedUser?.name) ||
          "Unknown User";

        const title =
          toStringValue(
            candidate?.jobTitleName ??
            candidate?.jobTitle ??
            candidate?.title ??
            nestedUser?.jobTitle ??
            nestedUser?.title,
          ) || "Team Member";

        return {
          userId,
          hierarchyId,
          name,
          title,
        };
      })
      .filter((option: any) => Boolean(option))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [hierarchyUsersData]);

  const hierarchyIdByUserId = useMemo(() => {
    const map = new Map<string, string>();

    managerOptions.forEach((option: any) => {
      const userId = toStringValue(option?.userId);
      const hierarchyId = toStringValue(option?.hierarchyId);
      if (userId && hierarchyId) {
        map.set(userId, hierarchyId);
      }
    });

    return map;
  }, [managerOptions]);

  const userIdByHierarchyId = useMemo(() => {
    const map = new Map<string, string>();

    managerOptions.forEach((option: any) => {
      const userId = toStringValue(option?.userId);
      const hierarchyId = toStringValue(option?.hierarchyId);
      if (userId && hierarchyId) {
        map.set(hierarchyId, userId);
      }
    });

    return map;
  }, [managerOptions]);

  const hierarchyRelationsByUserId = useMemo(() => {
    const map = new Map<string, { hierarchyId: string; managerId: string | null }>();

    const source = hierarchyChartData as any;
    const payload =
      source && typeof source === "object" && "data" in source
        ? source.data
        : source;

    const payloadObject = payload && typeof payload === "object" ? payload : null;
    const roots = Array.isArray(payload)
      ? payload
      : Array.isArray(payloadObject?.hierarchy)
        ? payloadObject.hierarchy
        : Array.isArray(payloadObject?.chart)
          ? payloadObject.chart
          : Array.isArray(payloadObject?.roots)
            ? payloadObject.roots
            : payload && typeof payload === "object"
              ? [payload]
              : [];

    const walk = (nodes: any[]) => {
      nodes.forEach((node) => {
        if (!node || typeof node !== "object") return;

        const nodeObj = node as Record<string, unknown>;
        const nestedUser =
          typeof nodeObj.user === "object" && nodeObj.user !== null
            ? (nodeObj.user as Record<string, unknown>)
            : null;

        const nestedManager =
          typeof nodeObj.manager === "object" && nodeObj.manager !== null
            ? (nodeObj.manager as Record<string, unknown>)
            : null;

        const hierarchyId = toStringValue(nodeObj.id ?? nodeObj._id);
        const userId = toStringValue(
          nodeObj.userId ?? nodeObj.user_id ?? nestedUser?.id ?? nestedUser?._id,
        );
        const managerId =
          toStringValue(
            nodeObj.managerId ??
            nodeObj.manager_id ??
            nodeObj.parentId ??
            nestedManager?.id ??
            nestedManager?._id,
          ) || null;

        if (userId && hierarchyId) {
          map.set(userId, { hierarchyId, managerId });
        }

        const children = Array.isArray(nodeObj.children)
          ? nodeObj.children
          : Array.isArray(nodeObj.reports)
            ? nodeObj.reports
            : Array.isArray(nodeObj.subordinates)
              ? nodeObj.subordinates
              : Array.isArray(nodeObj.nodes)
                ? nodeObj.nodes
                : [];

        if (children.length > 0) {
          walk(children as any[]);
        }
      });
    };

    walk(roots as any[]);
    return map;
  }, [hierarchyChartData]);

  useEffect(() => {
    if (activeModal.type !== "editUser" || !activeModal.open) return;

    const modalUserId = toStringValue(activeModal.user?.id);
    if (!modalUserId) return;

    const currentManagerId = toStringValue(formik.values.managerId);
    const normalizedCurrentManagerId = currentManagerId
      ? userIdByHierarchyId.get(currentManagerId) || currentManagerId
      : "";

    if (currentManagerId && normalizedCurrentManagerId !== currentManagerId) {
      formik.setFieldValue("managerId", normalizedCurrentManagerId);
      return;
    }

    const relation = hierarchyRelationsByUserId.get(modalUserId);
    if (!relation) return;

    if (currentManagerId || toStringValue(formik.values.hierarchyId)) {
      return;
    }

    const mappedManagerId = relation.managerId
      ? userIdByHierarchyId.get(relation.managerId) || relation.managerId
      : "";

    formik.setFieldValue("managerId", mappedManagerId);
    formik.setFieldValue("hierarchyId", relation.hierarchyId || "");
  }, [
    activeModal.open,
    activeModal.type,
    activeModal.user?.id,
    hierarchyRelationsByUserId,
    userIdByHierarchyId,
    formik.values.managerId,
    formik.values.hierarchyId,
  ]);

  const isDeleteUser =
    activeModal?.type === "deleteUser" && activeModal?.user?.email;
  const isDeleteGroup =
    activeModal?.type === "deleteGroup" && activeModal?.user?.name;

  const isConfirmed =
    (isDeleteUser && formik.values?.confirmValue === activeModal.user.email) ||
    (isDeleteGroup && formik.values?.confirmValue === activeModal.user.name);

  const isDeleteAction = isDeleteUser || isDeleteGroup;

  useEffect(() => {
    if (searchValue.trim() === "") {
      if (activeTab === "user" && userViewMode === "table") {
        refetch();
      } else if (activeTab === "group") {
        refetchGroups();
      }
      return;
    }

    const handler = setTimeout(() => {
      if (activeTab === "user" && userViewMode === "table") {
        refetch(); // call users API
      } else if (activeTab === "group") {
        refetchGroups(); // call groups API
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchValue, activeTab, userViewMode, refetch, refetchGroups]);

  const closeModal = () => {
    setActiveModal((prev) => ({ ...prev, open: false }));
    setIsFormDrawerOpen(false);
    formik.resetForm();
  };

  const getDrawerInitials = (name: string) => {
    const parts = name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2);
    if (parts.length === 0) return "NU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  };

  const renderDrawerIdentityCard = (title: string, subtitle: string) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white">
          {getDrawerInitials(title)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  const renderBorderedDrawerForm = (content: React.ReactNode) => (
    <div className="rounded-xl border bg-white p-4">{content}</div>
  );

  const renderModalContent = () => {
    switch (activeModal.type) {
      case "createUser":
        return (
          <div className="space-y-6">
            {renderDrawerIdentityCard(
              "New User",
              "Fill profile and access details before saving.",
            )}
            {renderBorderedDrawerForm(
              <CreateUserForm
                formik={formik}
                jobtitles={jobtitles}
                departments={departments}
                holidayListData={holidayListData}
                managerOptions={managerOptions}
                layout="drawer"
              />,
            )}
          </div>
        );
      case "editUser":
        {
          const editUserName =
            `${activeModal.user?.firstName || ""} ${activeModal.user?.lastName || ""}`.trim() ||
            activeModal.user?.name ||
            "User";
          const editUserSubtitle =
            activeModal.user?.jobTitle?.name ||
            activeModal.user?.jobTitleName ||
            activeModal.user?.roleName ||
            "Team Member";

          return (
            <div className="space-y-6">
              {renderDrawerIdentityCard(editUserName, editUserSubtitle)}
              {renderBorderedDrawerForm(
                <EditUserForm
                  formik={formik}
                  user={activeModal.user}
                  jobtitles={jobtitles}
                  departments={departments}
                  managerOptions={managerOptions}
                  excludeUserId={toStringValue(activeModal.user?.id)}
                  layout="drawer"
                />,
              )}
            </div>
          );
        }
      case "changePassword":
        return (
          <ChangePasswordForm formik={formik} user={activeModal.user} />
        );
      case "deleteUser":
        return <DeleteUserForm formik={formik} user={activeModal.user} />;
      case "deleteGroup":
        return <DeleteUserForm formik={formik} user={activeModal.user} />;
      case "createGroup":
        return renderBorderedDrawerForm(
          <CreateGroupForm formik={formik} isEdit={false} />,
        );
      case "editGroup":
        return renderBorderedDrawerForm(
          <CreateGroupForm
            formik={formik}
            activeModal={activeModal}
            isEdit={true}
          />,
        );
      case "filters":
        return <FilterForm formik={formik} activetab={activeTab} />;
      default:
        return null;
    }
  };

  const renderSearchInput = (placeholder: string, id: string) => (
    <div className="relative w-full max-w-sm sm:max-w-xs">
      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <Input
        placeholder={placeholder}
        className="pl-9 text-sm border-0 rounded-md bg-gray-50 focus-visible:bg-white focus-visible:ring-1"
        id={id}
        name={id}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
    </div>
  );

  const handleUserRefresh = () => {
    if (userViewMode === "hierarchy") {
      setHierarchyReloadSignal((prev) => prev + 1);
      return;
    }
    refetch();
  };
  const nonSearchableTabs: SetupTabValue[] = ["company", "company_locations", "location_calendar", "plan"];
  const shouldShowTabSearch = !(activeTab === "user" && userViewMode === "hierarchy") && !nonSearchableTabs.includes(activeTab);
  const renderTabSearch = () => {
    switch (activeTab) {
      case "user":
        return userViewMode === "table"
          ? renderSearchInput("Search for users...", "search-user")
          : <div />;

      case "group":
        return renderSearchInput("Search for groups...", "search-group");

      case "job_title":
        return renderSearchInput("Search for job titles...", "search-job-title");

      case "department":
        return renderSearchInput("Search for departments...", "search-department");

      case "roles":
        return renderSearchInput("Search for roles...", "search-roles");

      case "support":
        return renderSearchInput("Search support tickets...", "search-support");

      case "company_audit":
        return renderSearchInput("Search audit logs...", "search-company-audit");

      case "company_shifts":
        return renderSearchInput("Search for shifts...", "search-company-shifts");

      case "holidays":
        return renderSearchInput("Search for holidays...", "search-holidays");

      case "company_locations":
      case "location_calendar":
        return <div />;

      default:
        return <div />;
    }
  };

  const renderTabActions = () => {
    switch (activeTab) {
      case "user":
        return (
          <>
            <Select
              value={userViewMode}
              onValueChange={(value) => {
                setUserViewMode(value as UserViewMode);
                setSearchValue("");
                setStart(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[170px]">
                <div className="flex items-center gap-2">
                  {userViewMode === "table" ? (
                    <Table2 className="w-4 h-4" />
                  ) : (
                    <Network className="w-4 h-4" />
                  )}
                  <span>
                    View: {userViewMode === "table" ? "Table" : "Hierarchy"}
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
                <SelectItem value="hierarchy">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span>Hierarchy</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {userViewMode === "table" && (
              <Button
                variant="outline"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => openModal("filters")}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
              </Button>
            )}

            <PermissionGuard moduleId={1} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => openModal("createUser")}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Create User
              </Button>
            </PermissionGuard>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleUserRefresh}
              aria-label="Refresh users"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "group":
        return (
          <>
            <Button
              variant="outline"
              size="sm"
              className="text-sm px-3 py-1"
              onClick={() => openModal("filters")}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>

            <PermissionGuard moduleId={6} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => openModal("createGroup")}
              >
                <Users className="w-4 h-4 mr-1" />
                Create Group
              </Button>
            </PermissionGuard>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => refetchGroups()}
              aria-label="Refresh groups"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "job_title":
        return (
          <>
            <PermissionGuard moduleId={8} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => setJobTitleCreateSignal((prev) => prev + 1)}
              >
                Create Job Title
              </Button>
            </PermissionGuard>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setJobTitleRefreshSignal((prev) => prev + 1)}
              aria-label="Refresh job titles"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "department":
        return (
          <>
            <PermissionGuard moduleId={7} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => setDepartmentCreateSignal((prev) => prev + 1)}
              >
                Create Department
              </Button>
            </PermissionGuard>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setDepartmentRefreshSignal((prev) => prev + 1)}
              aria-label="Refresh departments"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "roles":
        return (
          <>
            <PermissionGuard moduleId={11} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => setRoleCreateSignal((prev) => prev + 1)}
              >
                Create Role
              </Button>
            </PermissionGuard>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setRoleRefreshSignal((prev) => prev + 1)}
              aria-label="Refresh roles"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "company_audit":
        return (
          <>
            <Button
              variant="outline"
              size="sm"
              className="text-sm px-3 py-1"
              onClick={() => setCompanyAuditFilterSignal((prev) => prev + 1)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCompanyAuditRefreshSignal((prev) => prev + 1)}
              aria-label="Refresh company audit"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "company_shifts":
        return (
          <>
            <PermissionGuard moduleId={21} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => setShiftCreateSignal((prev) => prev + 1)}
              >
                Create Shift
              </Button>
            </PermissionGuard>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setShiftRefreshSignal((prev) => prev + 1)}
              aria-label="Refresh shifts"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "holidays":
        return (
          <>
            <PermissionGuard moduleId={20} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => setHolidayCreateSignal((prev) => prev + 1)}
              >
                Add Holiday
              </Button>
            </PermissionGuard>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setHolidayRefreshSignal((prev) => prev + 1)}
              aria-label="Refresh holidays"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      case "support":
        return (
          <>
            <PermissionGuard moduleId={23} action="create">
              <Button
                variant="default"
                size="sm"
                className="text-sm px-3 py-1"
                onClick={() => setSupportCreateSignal((prev) => prev + 1)}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Raise New Ticket
              </Button>
            </PermissionGuard>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSupportRefreshSignal((prev) => prev + 1)}
              aria-label="Refresh support tickets"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  const tabActions = renderTabActions();

  return (
    <>
      {/* {usersData.length === 0 && !isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <EmptyState
            onClick={() => openModal("createUser")}
            buttonTitle="Create New User"
            title="No Users Added Yet"
            description="You haven’t added any users to your account. Add your first user to get started."
          />
        </div>
      ) : ( <></>)} */}
      <div className="min-w-0 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold">Management</h1>
            <p className="text-gray-600">
              Manage your company, users, roles, groups, departments, and access permissions.
            </p>
          </div>
        </div>


        {/* Stats */}
        <div className={`${statsGridClassName} items-stretch`}>
          {statisticsload
            ? Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="h-[88px] gap-0 border border-slate-200 py-0 shadow-none">
                <CardContent className="flex h-full flex-col gap-1.5 p-2">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-7 w-14 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-14 animate-pulse rounded bg-slate-200" />
                </CardContent>
              </Card>
            ))
            : tabStats.map((stat, index) => (
              <Card
                key={`${stat.label}-${index}`}
                className="h-[88px] gap-0 border border-slate-200 bg-white py-0 shadow-none transition-colors hover:border-slate-300"
              >
                <CardContent className="flex h-full flex-col gap-1.5 p-2">
                  <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </p>
                  <p className="truncate text-[22px] font-semibold leading-[1] text-slate-900">
                    {stat.value}
                  </p>
                  {stat.note && (
                    <p className={`truncate text-[10px] font-medium ${getStatToneClasses(stat.tone)}`}>
                      {stat.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>

        {!statisticsload && tabStats.length === 0 && (
          <div className="rounded-lg border bg-white px-4 py-3 text-sm text-gray-500">
            No statistics available for this tab.
          </div>
        )}

        {(shouldShowTabSearch || tabActions) && (
          <div className="mt-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full max-w-sm sm:max-w-xs">
              {shouldShowTabSearch ? renderTabSearch() : <div />}
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {tabActions}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div>
          {activeTab === "user" &&
            (!canReadUsers ? (
              <PermissionDeniedState />
            ) : userViewMode === "hierarchy" ? (
              <div className="min-w-0 overflow-x-hidden">
                <HierarchyComponent
                  onOpenUserDetails={openUserDetailsDrawer}
                  reloadSignal={hierarchyReloadSignal}
                />
              </div>
            ) : usersData.length === 0 && !isLoading && searchValue ? (
              <EmptyState
                onClick={() => { }}
                buttonTitle=""
                title="No results found"
                description="Please refine your search or filters and try again."
              />
            ) : usersData.length === 0 && !isLoading ? (
              <EmptyState
                onClick={() => openModal("createUser")}
                buttonTitle="Create New User"
                title="No Users Added Yet"
                description="You haven’t added any users to your account. Add your first user to get started."
              />
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading || isFetching
                      ? Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow
                          key={idx}
                          className="animate-pulse hover:bg-gray-50"
                        >
                          <TableCell>
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-32 bg-gray-200 rounded"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 bg-gray-200 rounded"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 bg-gray-200 rounded"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))
                      : usersData.map((user: any) => (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.firstName}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => openUserDetailsDrawer(String(user.id), "details")}
                                className="text-left transition-colors hover:text-primary hover:underline"
                              >
                                {user.firstName} {user.lastName}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={"role"}>{user.roleName}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user?.status
                                  ? "active"
                                  : ("disabled" as BadgeVariant)
                              }
                            >
                              {user?.status ? "Active" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.isVerified ? "active" : "disabled"
                              }
                            >
                              {user.isVerified ? "Verified" : "Not Verified"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(user.lastLoginAt)}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(user.createdAt)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="p-1">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <PermissionGuard moduleId={1} action="update">
                                  <DropdownMenuItem
                                    className="flex items-center gap-2"
                                    onClick={() => openModal("editUser", user)}
                                  >
                                    <Edit className="w-4 h-4" /> Edit & Configure
                                  </DropdownMenuItem>
                                </PermissionGuard>
                                <PermissionGuard moduleId={1} action="update">
                                  <DropdownMenuItem
                                    className="flex items-center gap-2"
                                    onClick={() =>
                                      openModal("changePassword", user)
                                    }
                                  >
                                    <Key className="w-4 h-4 text-primary" /> Change Password
                                  </DropdownMenuItem>
                                </PermissionGuard>
                                <PermissionGuard moduleId={1} action="delete">
                                  <DropdownMenuItem
                                    className="flex items-center gap-2"
                                    onClick={() =>
                                      openModal("deleteUser", user)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" /> Delete
                                  </DropdownMenuItem>
                                </PermissionGuard>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                <div className="items-center border-t px-4 pb-4">
                  <Pagination
                    start={start}
                    limit={limit}
                    total={usersTotalCount}
                    pagination={data?.data?.pagination}
                    onPageChange={(newStart) => setStart(newStart)}
                    onLimitChange={(newLimit) => {
                      setLimit(newLimit);
                      setStart(1);
                    }}
                  />
                </div>
              </div>
            ))}

          {activeTab === "group" && (
            !canReadGroups ? (
              <PermissionDeniedState />
            ) : (
              <>
                {groupsData.length === 0 && !groupLoading && searchValue ? (
                  <EmptyState
                    onClick={() => { }}
                    buttonTitle=""
                    title="No results found"
                    description="Please refine your search or filters and try again."
                  />
                ) : groupsData.length === 0 && !groupLoading ? (
                  <EmptyState
                    onClick={() => openModal("createGroup")}
                    buttonTitle="Create New Group"
                    title="No Groups Created Yet"
                    description="You haven’t added any groups to your account. Add your first group to get started."
                  />
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead>Group Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created at</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupLoading || groupFetching
                          ? Array.from({ length: 5 }).map((_, idx) => (
                            <TableRow
                              key={idx}
                              className="animate-pulse hover:bg-gray-50"
                            >
                              <TableCell>
                                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                              </TableCell>
                              <TableCell>
                                <div className="h-4 w-40 bg-gray-200 rounded"></div>
                              </TableCell>
                              <TableCell>
                                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                              </TableCell>
                              <TableCell>
                                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                              </TableCell>
                              <TableCell>
                                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          ))
                          : groupsData.map((group: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span>{group?.groups}</span>
                                </div>
                              </TableCell>
                              <TableCell>{group.description ?? "-"}</TableCell>
                              <TableCell>
                                <MembersCell
                                  members={group.groupMembers}
                                  maxVisible={5}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={group.status ? "active" : "disabled"}
                                >
                                  {group.status ? "Active" : "Disabled"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatDateTime(group?.createdAt)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="p-1">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <PermissionGuard moduleId={6} action="update">
                                      <DropdownMenuItem
                                        className="flex items-center gap-2"
                                        onClick={() =>
                                          openModal("editGroup", group)
                                        }
                                      >
                                        <Edit className="w-4 h-4 text-primary" /> Manage group
                                      </DropdownMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard moduleId={6} action="update">
                                      <DropdownMenuItem
                                        className="flex items-center gap-2"
                                        onClick={() =>
                                          updateGroupStatus.mutate(
                                            {
                                              groupId: group.id,
                                              status: !group.status,
                                            },
                                            {
                                              onSuccess: () => refetchGroups(),
                                              onError: (err) =>
                                                console.error(err),
                                            },
                                          )
                                        }
                                      >
                                        <CircleCheck className="w-4 h-4 text-primary" /> {group.status ? "Disable" : "Enable"}
                                      </DropdownMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard moduleId={6} action="delete">
                                      <DropdownMenuItem
                                        className="flex items-center gap-2"
                                        onClick={() =>
                                          openModal("deleteGroup", group)
                                        }
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" /> Delete
                                      </DropdownMenuItem>
                                    </PermissionGuard>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    <div className="items-center border-t px-4 pb-4">
                      <Pagination
                        start={start}
                        limit={limit}
                        total={groupsTotalCount}
                        pagination={groupData?.data?.pagination}
                        onPageChange={(newStart) => setStart(newStart)}
                        onLimitChange={(newLimit) => {
                          setLimit(newLimit);
                          setStart(1);
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>

        {activeTab === "company" && <PermissionGuard moduleId={9} action="access" mode="hide" fallback={<PermissionDeniedState />}><CompanySettingsTab /></PermissionGuard>}
        {activeTab === "company_locations" && <PermissionGuard moduleId={9} action="access" mode="hide" fallback={<PermissionDeniedState />}><CompanyLocationsTab /></PermissionGuard>}
        {activeTab === "location_calendar" && <PermissionGuard moduleId={9} action="access" mode="hide" fallback={<PermissionDeniedState />}><LocationCalendarTab /></PermissionGuard>}
        {activeTab === "plan" && <PlanTab />}
        {/* {activeTab === "holidays" && <PermissionGuard moduleId={20} action="access" mode="hide" fallback={<PermissionDeniedState />}><HolidaysTab searchTerm={searchValue} createSignal={holidayCreateSignal} refreshSignal={holidayRefreshSignal} /></PermissionGuard>} */}
        {/* {activeTab === "company_shifts" && <PermissionGuard moduleId={21} action="access" mode="hide" fallback={<PermissionDeniedState />}><CompanyShiftsTab searchTerm={searchValue} createSignal={shiftCreateSignal} refreshSignal={shiftRefreshSignal} /></PermissionGuard>} */}

        {activeTab === "job_title" && (
          <PermissionGuard moduleId={8} action="access" mode="hide" fallback={<PermissionDeniedState />}>
            <JobTitleComponent
              searchTerm={searchValue}
              createSignal={jobTitleCreateSignal}
              refreshSignal={jobTitleRefreshSignal}
            />
          </PermissionGuard>
        )}

        {activeTab === "department" && (
          <PermissionGuard moduleId={7} action="access" mode="hide" fallback={<PermissionDeniedState />}>
            <DepartmentComponent
              searchTerm={searchValue}
              createSignal={departmentCreateSignal}
              refreshSignal={departmentRefreshSignal}
            />
          </PermissionGuard>
        )}
        {activeTab === "roles" && (
          <PermissionGuard moduleId={11} action="access" mode="hide" fallback={<PermissionDeniedState />}>
            <RolesComponent
              searchTerm={searchValue}
              createSignal={roleCreateSignal}
              refreshSignal={roleRefreshSignal}
            />
          </PermissionGuard>
        )}
        {activeTab === "storage" && (
          <StorageComponent
            searchTerm={searchValue}
          />
        )}
        {activeTab === "support" && (
          <PermissionGuard moduleId={23} action="access" mode="hide" fallback={<PermissionDeniedState />}>
            <SupportComponent
              searchTerm={searchValue}
              createSignal={supportCreateSignal}
              refreshSignal={supportRefreshSignal}
            />
          </PermissionGuard>
        )}
        {activeTab === "company_audit" && (
          <PermissionGuard moduleId={19} action="access" mode="hide" fallback={<PermissionDeniedState />}>
            <CompanyAuditComponent
              searchTerm={searchValue}
              filterSignal={companyAuditFilterSignal}
              refreshSignal={companyAuditRefreshSignal}
            />
          </PermissionGuard>
        )}
      </div>

      <UserDetailsHierarchyDrawer
        open={isUserDetailsDrawerOpen}
        userId={selectedUserDetailsId}
        initialMode={userDetailsDrawerMode}
        onOpenChange={(open) => {
          setIsUserDetailsDrawerOpen(open);
          if (!open) {
            setSelectedUserDetailsId(null);
            setUserDetailsDrawerMode("details");
          }
        }}
        onSaved={() => {
          refetch();
          setHierarchyReloadSignal((prev) => prev + 1);
        }}
        onNavigateUser={(userId) => {
          setSelectedUserDetailsId(userId);
          setUserDetailsDrawerMode("details");
          setIsUserDetailsDrawerOpen(true);
        }}
      />

      {/* Drawer for create/edit user and group */}
      <Sheet
        open={isFormDrawerOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-2xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>
                {activeModal.type ? drawerMeta[activeModal.type]?.title : ""}
              </SheetTitle>
              <SheetDescription>
                {activeModal.type ? drawerMeta[activeModal.type]?.description : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {renderModalContent()}
            </div>

            <div className="border-t px-6 py-4">
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeModal} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => formik.handleSubmit()}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading && <Loader className="animate-spin w-4 h-4" />}
                  {activeModal.type?.startsWith("create") ? "Create" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* BaseModal — for delete / change password / filters only */}
      <BaseModal
        open={activeModal.open && !DRAWER_TYPES.has(activeModal.type || "")}
        onClose={closeModal}
        footerButtons={{ cancel: "Cancel", submit: "Submit" }}
        onSubmit={formik.handleSubmit}
        activeModal={activeModal}
        loading={loading}
        isConfirmed={isConfirmed}
        isDeleteAction={isDeleteAction}
      >
        {renderModalContent()}
      </BaseModal>
    </>
  );
}
export const MembersCell: React.FC<{ members: any; maxVisible?: number }> = ({
  members,
  maxVisible = 5,
}) => {
  const safeMembers = Array.isArray(members) ? members : [];
  const visibleMembers = safeMembers.slice(0, maxVisible);
  const remainingCount = Math.max(0, safeMembers.length - visibleMembers.length);

  const getInitials = (name: any) => {
    const safeName = String(name || "").trim();
    if (!safeName) return "?";
    const parts = safeName.split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  };

  return (
    <div className="flex items-center -space-x-3">
      {visibleMembers.map((member: any, index: any) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <div
              className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-gray-700 text-xs font-semibold flex items-center justify-center cursor-pointer"
              style={{ zIndex: visibleMembers.length - index }}
            >
              {getInitials(
                member?.name ||
                member?.groups ||
                member?.fullname ||
                member?.userName ||
                member?.fullName ||
                "Unknown",
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs font-medium">
            {member?.name ||
              member?.groups ||
              member?.fullname ||
              member?.userName ||
              member?.fullName ||
              "Unknown"}
          </TooltipContent>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
