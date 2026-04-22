import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PagType } from "./interfaces";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const ConfigValue = {
  NEXT_PUBLIC_REST_API_ENDPOINT: process.env.NEXT_PUBLIC_REST_API_ENDPOINT,
  AUTH_TOKEN_KEY: "NitroBerry-Auth-Local",
  AUTH_CRED: "AUTH_CRED",
};

export const formatDateTime = (date?: string | Date | null) => {
  if (!date) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
};
// helper to map stepStatus → badge variant
export function getBadgeVariant(status?: any): any {
  const s = typeof status === "number" ? status : status;
  switch (s) {
    // FMSSTATUSVALUE numeric
    case 1: case "1": return "secondary";   // NOTSTARTED
    case 2: case "2": return "warning";     // INPROGRESS
    case 3: case "3": return "active";      // COMPLETED
    case 4: case "4": return "info";        // SCHEDULED
    case 5: case "5": return "warning";     // IN_PROGRESS
    case 6: case "6": return "destructive"; // PENDING
    case 7: case "7": return "destructive"; // CANCELLED
    case 8: case "8": return "secondary";   // NOTAPPLICABLE
    // legacy string keys
    case "completed": case "approved": return "active";
    case "inProgress": return "warning";
    case "scheduled": return "info";
    case "notStarted": return "secondary";
    case "pending": return "destructive";
    case "cancelled": return "destructive";
    case "declined": case "failed": return "disabled";
    default:
      return "secondary";
  }
}

// statusUtils.ts

type StatusKey = string | number;

type StatusConfig = {
  name: string;
  variant: string;
};

type TableStatusMap = {
  [table: string]: {
    [statusKey: string]: StatusConfig; // we convert numeric keys to string
  };
};
export enum STATUSTABLE {
  PRIORITY = "priority",
  FLOWSTEP = "flowStep",
  TASK_STATUS = "taskStatus",
  FMS_STATUS = "fmsStatus",
}

const STATUS_CONFIG: TableStatusMap = {
  [STATUSTABLE.PRIORITY]: {
    "1": { name: "Low", variant: "secondary" },
    "2": { name: "Medium", variant: "warning" },
    "3": { name: "High", variant: "destructive" },
  },
  [STATUSTABLE.FLOWSTEP]: {
    // numeric keys (new backend)
    "1": { name: "Not Started", variant: "secondary" },
    "2": { name: "In-Progress", variant: "warning" },
    "3": { name: "Completed", variant: "active" },
    "4": { name: "Scheduled", variant: "info" },
    "5": { name: "In-Progress", variant: "warning" },
    "6": { name: "Pending", variant: "destructive" },
    "7": { name: "Cancelled", variant: "destructive" },
    "8": { name: "Not Applicable", variant: "secondary" },
    // legacy string keys (backwards compat for display)
    notStarted: { name: "Not Started", variant: "secondary" },
    inProgress: { name: "In-Progress", variant: "warning" },
    completed: { name: "Completed", variant: "active" },
    scheduled: { name: "Scheduled", variant: "info" },
    cancelled: { name: "Cancelled", variant: "destructive" },
    pending: { name: "Pending", variant: "destructive" },
    notApplicable: { name: "Not Applicable", variant: "secondary" },
  },
  [STATUSTABLE.FMS_STATUS]: {
    // numeric keys (new backend) - FMSINDENTSTATUS
    "1": { name: "In-Progress", variant: "warning" },
    "2": { name: "Approved", variant: "active" },
    "3": { name: "Rejected", variant: "destructive" },
    "4": { name: "Cancelled", variant: "destructive" },
    "5": { name: "Completed", variant: "active" },
    // legacy string keys (backwards compat for display)
    approved: { name: "Approved", variant: "active" },
    rejected: { name: "Rejected", variant: "destructive" },
    inProgress: { name: "In-Progress", variant: "warning" },
    cancelled: { name: "Cancelled", variant: "destructive" },
    completed: { name: "Completed", variant: "active" },
  },
  [STATUSTABLE.TASK_STATUS]: {
    "1": { name: "Pending", variant: "destructive" },
    "2": { name: "Completed", variant: "active" },
    "3": { name: "Missed", variant: "warning" },
    "4": { name: "Scheduled", variant: "info" },
    "5": { name: "Block", variant: "destructive" },
  },
};

/**
 * Returns status name + variant even if status is a number.
 */
export function getStatusInfo(table: STATUSTABLE, status: StatusKey) {
  const normalizeKey = String(status); // convert number → string

  const tableConfig = STATUS_CONFIG[table];
  if (!tableConfig) {
    return { name: normalizeKey, variant: "default" };
  }

  const info = tableConfig[normalizeKey];
  if (!info) {
    return { name: normalizeKey, variant: "default" };
  }
  return info;
}

export function getReportPagination(
  selectedType: number,
  rawData: any,
): PagType {
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

export function getAnalyticsPagination(rawData: any) {
  if (!rawData?.data) return { start: 1, limit: 10, total: 0 };
  return {
    start: Number(rawData.data.pagination?.start ?? 1),
    limit: Number(rawData.data.pagination?.limit ?? 10),
    total: Number(rawData.data.pagination?.total ?? 0),
    next: rawData.data.pagination?.next,
    pagination: rawData.data.pagination,
  };
}

export function getReportsData<T>(selectedType: number, rawData: any): T[] {
  if (!rawData?.data) return [] as T[];
  if (selectedType === 1) return (rawData.data.reports || []) as T[];
  return (rawData.data.report || []) as T[];
}

export enum FieldActivationCondition {
  LESS_THAN = 1, // <
  GREATER_THAN = 2, // >
  LESS_THAN_EQUAL_TO = 3, // <=
  GREATER_THAN_EQUAL_TO = 4, // >=
  EQUAL_TO = 5, // ==
  NOT_EQUAL_TO = 6, // !=
  ADD = 7, // +
  SUB = 8, // -
  CONTAINS = 9, // contains
}

export const FieldActivationText: Record<FieldActivationCondition, string> = {
  1: "Less Than",
  2: "Greater Than",
  3: "Less Than or Equal",
  4: "Greater Than or Equal",
  5: "Equal To",
  6: "Not Equal To",
  7: "Add",
  8: "Subtract",
  9: "Contains",
};
