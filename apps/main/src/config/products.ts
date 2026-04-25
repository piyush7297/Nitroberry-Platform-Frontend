import type React from "react";
import {
  LayoutDashboard,
  FileText,
  Layers,
  Users,
  UsersRound,
  ChartBar,
  Settings,
  CheckSquare,
  Building2,
  ClipboardList,
  RotateCcw,
  ShieldCheck,
  GitBranch,
  Kanban,
  BarChart2,
  Compass,
  Bookmark,
  BookOpen,
  Home,
  Lock,
  Archive,
  MapPin,
  CalendarDays,
  CreditCard,
  TreePalm,
  Briefcase,
  FolderOpen,
  Headphones,
  ScrollText,
  Clock,
} from "lucide-react";

export type ProductNav = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  /** Lucide icon for launcher grid */
  icon: React.ComponentType<{ className?: string }>;
  /** Used for sidebar header bg and active product chip bg */
  color: string;
  /** Icon color on the tile (e.g. text-indigo-600) */
  iconColor: string;
  /** Tile icon background (e.g. bg-indigo-50) */
  tileBg: string;
  /** Tailwind text color class */
  textColor: string;
  /** Tailwind ring/border color for active state */
  ringColor: string;
  /** Where clicking the product in the launcher navigates */
  homeHref: string;
  /** Route prefixes that belong to this product */
  basePaths: string[];
  /** Exact routes that belong to this product (no prefix match) */
  exactPaths?: string[];
  /** Whether to show the left sidebar for this product */
  hasSidebar: boolean;
  nav: ProductNav[];
};

export const PRODUCTS: Product[] = [
  {
    id: "fms",
    name: "FMS",
    description: "Workflow & Process Management",
    icon: GitBranch,
    color: "bg-indigo-600",
    iconColor: "text-indigo-600",
    tileBg: "bg-indigo-50",
    textColor: "text-indigo-600",
    ringColor: "ring-indigo-300",
    homeHref: "/dashboard",
    basePaths: [
      "/dashboard/workflow",
      "/dashboard/workflow-templates",
      "/dashboard/fms-indents",
      "/dashboard/reports",
      "/dashboard/analytics",
    ],
    exactPaths: ["/dashboard"],
    hasSidebar: true,
    nav: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Workflow", href: "/dashboard/workflow", icon: GitBranch },
      { name: "Workflow Templates", href: "/dashboard/workflow-templates", icon: Layers },
      { name: "FMS Indents", href: "/dashboard/fms-indents", icon: Kanban },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart2 },
      { name: "Analytics", href: "/dashboard/analytics", icon: ChartBar },
    ],
  },
  {
    id: "management",
    name: "Management",
    description: "Company & User Administration",
    icon: Building2,
    color: "bg-sky-600",
    iconColor: "text-sky-600",
    tileBg: "bg-sky-50",
    textColor: "text-sky-600",
    ringColor: "ring-sky-300",
    homeHref: "/dashboard/users?tab=company",
    basePaths: [
      "/dashboard/company",
      "/dashboard/setup",
      "/dashboard/users",
      "/dashboard/audit-logs",
    ],
    hasSidebar: true,
    nav: [
      { name: "Company", href: "/dashboard/users?tab=company", icon: Building2 },
      { name: "Company Locations", href: "/dashboard/users?tab=company_locations", icon: MapPin },
      { name: "Location Calendar", href: "/dashboard/users?tab=location_calendar", icon: CalendarDays },
      { name: "Plan & Billing", href: "/dashboard/users?tab=plan", icon: CreditCard },
      { name: "Holidays", href: "/dashboard/users?tab=holidays", icon: TreePalm },
      { name: "Users", href: "/dashboard/users?tab=user", icon: Users },
      { name: "Groups", href: "/dashboard/users?tab=group", icon: UsersRound },
      { name: "Job Titles", href: "/dashboard/users?tab=job_title", icon: Briefcase },
      { name: "Departments", href: "/dashboard/users?tab=department", icon: FolderOpen },
      { name: "Roles & Permissions", href: "/dashboard/users?tab=roles", icon: ShieldCheck },
      { name: "Storage", href: "/dashboard/users?tab=storage", icon: Archive },
      { name: "Support", href: "/dashboard/users?tab=support", icon: Headphones },
      { name: "Company Audit", href: "/dashboard/users?tab=company_audit", icon: ScrollText },
      { name: "Company Shifts", href: "/dashboard/users?tab=company_shifts", icon: Clock },
    ],
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Tasks & Recurring Schedules",
    icon: CheckSquare,
    color: "bg-emerald-600",
    iconColor: "text-emerald-600",
    tileBg: "bg-emerald-50",
    textColor: "text-emerald-600",
    ringColor: "ring-emerald-300",
    homeHref: "/dashboard/task",
    basePaths: ["/dashboard/task", "/dashboard/recurring-task"],
    hasSidebar: true,
    nav: [
      { name: "Tasks", href: "/dashboard/task", icon: CheckSquare },
      { name: "Task Templates", href: "/dashboard/task/template", icon: FileText },
      { name: "Recurring Tasks", href: "/dashboard/recurring-task", icon: RotateCcw },
    ],
  },
  {
    id: "vault",
    name: "Vault",
    description: "Secure File Storage",
    icon: Lock,
    color: "bg-amber-600",
    iconColor: "text-amber-600",
    tileBg: "bg-amber-50",
    textColor: "text-amber-600",
    ringColor: "ring-amber-300",
    // Vault is a standalone app — absolute URL so the launcher navigates cross-origin.
    homeHref: process.env.NEXT_PUBLIC_VAULT_APP_URL
      ? `${process.env.NEXT_PUBLIC_VAULT_APP_URL}/vault`
      : "/vault",
    basePaths: ["/dashboard/vault"],
    hasSidebar: false,
    nav: [],
  },
  {
    id: "social",
    name: "Social",
    description: "Social & Communities",
    icon: UsersRound,
    color: "bg-pink-600",
    iconColor: "text-pink-600",
    tileBg: "bg-pink-50",
    textColor: "text-pink-600",
    ringColor: "ring-pink-300",
    homeHref: "/dashboard/social/home",
    basePaths: ["/dashboard/social"],
    hasSidebar: true,
    nav: [
      { name: "Home", href: "/dashboard/social/home", icon: Home },
      { name: "Communities", href: "/dashboard/social/communities", icon: UsersRound },
      { name: "Discover", href: "/dashboard/social/discover", icon: Compass },
      { name: "Bookmarks", href: "/dashboard/social/bookmarks", icon: Bookmark },
      { name: "Storylines", href: "/dashboard/social/storylines", icon: BookOpen },
    ],
  },
];

/** Returns the product that owns the given pathname, or undefined. */
export function getProductForPath(pathname: string): Product | undefined {
  return PRODUCTS.find((p) => {
    if (p.exactPaths?.includes(pathname)) return true;
    return p.basePaths.some(
      (base) => pathname === base || pathname.startsWith(`${base}/`),
    );
  });
}
