const D_PATH = "/dashboard";
const ADMIN_HOME = "/admin";

export enum RoutesEnum {
  DASHBOARD = D_PATH,
  REGISTER = "/register",
  LOGIN = "/login",
  NEW_PASSWORD = "/new-password",
  RESET_PASSWORD = "/reset-password",
  EMAIL_VERIFIED = "/email-verify",
  UPDATE_PROFILE = "/update-profile",
  TRAINER = "/trainer",
  CUSTOMER = "/customer",
  ADMIN = "/admin",
  SUBSCRIPTION_PLAN = `${D_PATH}/subscription-plan`,
  Profile_Aanalytics = `${D_PATH}/profile-analytics`,
  SETTINGS = `${D_PATH}/settings`,
  PrivacyPolicy = `/privacy-policy`,
  TermsAndConditions = `/terms-and-conditions`,
  Workflow = `${D_PATH}/workflow`,
  AUDIT_LOGS = `${D_PATH}/audit-logs`,
  TASKS = `${D_PATH}/task`,
  VAULT = `${D_PATH}/vault`,
  SOCIAL = `${D_PATH}/social`,
  SOCIAL_HOME = `${D_PATH}/social/home`,
  RECURRING_TASKS = `${D_PATH}/recurring-task`,
  WORKFLOW_STEPS = `${D_PATH}/workflow-steps`,
}

export enum AdminRoutesEnum {
  ADMIN = ADMIN_HOME,
}

export const PRIORITY_ENUM: Record<number, string> = {
  1: "Low (Standard)",
  2: "Medium (Normal)",
  3: "High (Urgent)",
};

export enum STEPACTIVATION {
  Immediately_After_Form_Submission = 1,
  After_Specific_Step_Completes = 2,
  AFTER_SPECFICE_TIME_DELAY = 3,
  WHEN_SPECIFIC_CONDITION_MATCHES = 4,
  WHEN_SPECIFIC_INDENT_CONDITION_MATCHES = 5,
}

export enum DashboardDateFilter {
  TODAY = 1,
  LAST_WEEK = 2,
  LAST_MONTH = 3,
  LAST_YEAR = 4,
  SPECIFIC_YEAR = 5,
  CUSTOM_RANGE = 6,
  THIS_MONTH = 7,
  CURRENT_FINANCIAL_YEAR = 8,
  LAST_FINANCIAL_YEAR = 9,
}

export enum Roles {
  OWNER = 1,
  ADMIN = 2,
  MANAGER = 3,
  DOER = 4,
  VIEWER = 5,
}

export enum TaskStatusEnum {
  PENDING = 1,
  COMPLETED = 2,
  MISSED = 3,
}

export enum TaskTypeEnum {
  HELP = 1,
  DELEGATION = 2,
  RECURRING = 3,
  FLOW = 4,
  DRAFT_INDENT = 5,
  MY_TASKS = 6,
  VAULT = 7,
}

export enum RecurringTypeEnum {
  DAILY = 1,
  WEEKLY = 2,
  MONTHLY = 3,
  YEARLY = 4,
  CUSTOM = 5,
}

export enum FMSSTATUSVALUE {
  NOTSTARTED = 1,
  INPROGRESS = 2,
  COMPLETED = 3,
  SCHEDULED = 4,
  IN_PROGRESS = 5,
  PENDING = 6,
  CANCELLED = 7,
  NOTAPPLICABLE = 8,
}

export enum FMSINDENTSTATUS {
  INPROGRESS = 1,
  APPROVED = 2,
  REJECTED = 3,
  CANCELLED = 4,
  COMPLETED = 5,
}

export enum HOLIDAY_SCOPE {
  PUBLIC = 1,
  COMPANY = 2,
  USER = 3,
}

export enum HOLIDAY_STATUS {
  PENDING = 1,
  APPROVED = 2,
  DECLINED = 3,
}

export const RoleLabels: Record<Roles, string> = {
  [Roles.OWNER]: "Owner",
  [Roles.ADMIN]: "Admin",
  [Roles.MANAGER]: "Manager",
  [Roles.DOER]: "Doer",
  [Roles.VIEWER]: "Viewer",
};

export const REPORT_TYPES: { value: number; label: string }[] = [
  { value: 1, label: "Operation Summary Reports" },
  { value: 2, label: "Detailed Reports" },
  { value: 3, label: "Yearly KPI Reports" },
];

export const HOLIDAY_SCOPE_LABELS: Record<HOLIDAY_SCOPE, string> = {
  [HOLIDAY_SCOPE.PUBLIC]: "Public",
  [HOLIDAY_SCOPE.COMPANY]: "Company",
  [HOLIDAY_SCOPE.USER]: "User",
};

export const HOLIDAY_STATUS_LABELS: Record<HOLIDAY_STATUS, string> = {
  [HOLIDAY_STATUS.PENDING]: "Pending",
  [HOLIDAY_STATUS.APPROVED]: "Approved",
  [HOLIDAY_STATUS.DECLINED]: "Declined",
};

export const INDENT_ANALYTIC_STATUS = {
  ALL: 0,
  ONTIME: 1,
  DELAYED: 2,
  OVERDUE: 3,
  INPROGRESS: 4,
  UPCOMING: 5,
  CANCELLED: 6,
  COMPLETED: 7,
  MOST_DELAYED: 8,
} as const;
