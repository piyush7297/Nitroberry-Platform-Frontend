export interface ILoginRequest {
  email: string;
  password: string;
}

export type User = {
  id: number;
  name: string;
  email: string;
};
export type Category = {
  id: number;
  title: string;
  description: string;
  url: string | null;
  logo: string;
  status: number;
};
// TypeScript interfaces for clarity and IDE help
export interface ReportStep {
  fmsName: string;
  stepName: string;
  referenceCode: string;
  scheduleEnd: string;
  reasonForDelay: string;
  actualStartDateTime: string;
  actualEnd: string;
  delay: string;
  users: { id: string; fullname: string }[];
}

export interface ReportKPI {
  doerName: string;
  kpiScore: string;
  weeklyScore: string;
  totalPlanned: string;
  completed: string;
  taskPending: string;
  doneOnTime: string;
  taskOnDelay: string;
}

export interface ReportYear {
  empName: string;
  totalPlanned: string;
  totalDone: string;
  kpiScoreYearPreviousYear: string;
  kpiScoreYearCurrentYear: string;
}

export type PagType = {
  start: number;
  limit: number;
  total: number;
  next?: number | null;
  pagination?: any;
};
