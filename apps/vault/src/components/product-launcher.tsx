"use client";

import {
  GitBranch,
  Building2,
  CheckSquare,
  Lock,
  UsersRound,
} from "lucide-react";
import { ProductLauncherPopover, type LauncherProduct } from "@nitroberry/ui";

const MAIN = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "";
const MANAGEMENT = process.env.NEXT_PUBLIC_MANAGEMENT_APP_URL ?? "";
const VAULT_SELF = process.env.NEXTAUTH_URL?.replace("/vault", "") ?? "";

const PRODUCTS: LauncherProduct[] = [
  {
    id: "fms",
    name: "FMS",
    icon: GitBranch,
    color: "bg-indigo-600",
    iconColor: "text-indigo-600",
    tileBg: "bg-indigo-50",
    textColor: "text-indigo-600",
    homeHref: `${MAIN}/dashboard`,
  },
  {
    id: "management",
    name: "Management",
    icon: Building2,
    color: "bg-sky-600",
    iconColor: "text-sky-600",
    tileBg: "bg-sky-50",
    textColor: "text-sky-600",
    homeHref: MANAGEMENT ? `${MANAGEMENT}/company` : `${MAIN}/dashboard/users?tab=company`,
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: CheckSquare,
    color: "bg-emerald-600",
    iconColor: "text-emerald-600",
    tileBg: "bg-emerald-50",
    textColor: "text-emerald-600",
    homeHref: `${MAIN}/dashboard/task`,
  },
  {
    id: "vault",
    name: "Vault",
    icon: Lock,
    color: "bg-amber-600",
    iconColor: "text-amber-600",
    tileBg: "bg-amber-50",
    textColor: "text-amber-600",
    homeHref: "/vault",
  },
  {
    id: "social",
    name: "Social",
    icon: UsersRound,
    color: "bg-pink-600",
    iconColor: "text-pink-600",
    tileBg: "bg-pink-50",
    textColor: "text-pink-600",
    homeHref: `${MAIN}/dashboard/social/home`,
  },
];

export function ProductLauncher() {
  return <ProductLauncherPopover products={PRODUCTS} activeProductId="vault" />;
}
