import {
  Archive,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  FolderOpen,
  Headphones,
  MapPin,
  ScrollText,
  ShieldCheck,
  TreePalm,
  Users,
  UsersRound,
  FileText,
} from "lucide-react";
import type React from "react";

export type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const MANAGEMENT_NAV: NavItem[] = [
  { name: "Company", href: "/company", icon: Building2 },
  { name: "Company Locations", href: "/company-locations", icon: MapPin },
  { name: "Location Calendar", href: "/location-calendar", icon: CalendarDays },
  { name: "Plan & Billing", href: "/plan", icon: CreditCard },
  { name: "Holidays", href: "/holidays", icon: TreePalm },
  { name: "Users", href: "/users", icon: Users },
  { name: "Groups", href: "/groups", icon: UsersRound },
  { name: "Job Titles", href: "/job-titles", icon: Briefcase },
  { name: "Departments", href: "/departments", icon: FolderOpen },
  { name: "Roles & Permissions", href: "/roles", icon: ShieldCheck },
  { name: "Storage", href: "/storage", icon: Archive },
  { name: "Support", href: "/support", icon: Headphones },
  { name: "Company Audit", href: "/company-audit", icon: ScrollText },
  { name: "Company Shifts", href: "/company-shifts", icon: Clock },
  { name: "Audit Logs", href: "/audit-logs", icon: FileText },
];
