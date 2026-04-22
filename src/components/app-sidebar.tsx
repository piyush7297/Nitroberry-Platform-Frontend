"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Users,
  FileText,
  Bell,
  MessageSquare,
  PanelLeftOpen,
  ChartBar,
  Calendar,
  UsersRound,
  Archive,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { RoutesEnum } from "@/lib/enums/routes.enum";
import { useDashboardMode } from "@/context/dashboard-mode-context";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { usePermissions } from "@/hooks/usePermissions";

const SIDEBAR_BADGE_CLASSNAME =
  "absolute -top-2.5 -right-2.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-[rgb(var(--nav-bg))]";

// Menu arrays
const myMainMenu = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Workflow", href: RoutesEnum.Workflow, icon: FileText },
  {
    name: "Workflow Templates",
    href: "/dashboard/workflow-templates",
    icon: Layers,
  },
  { name: "Setup", href: "/dashboard/setup", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Task", href: RoutesEnum.TASKS, icon: FileText },
  { name: "Vault", href: RoutesEnum.VAULT, icon: Archive },
  { name: "Task Templates", href: "/dashboard/task/template", icon: FileText },
  { name: "Analytics", href: "/dashboard/analytics", icon: ChartBar },
  {
    name: "Social",
    href: RoutesEnum.SOCIAL_HOME,
    icon: UsersRound,
  },
];

const SETTINGS_HREF = "/dashboard/settings";

const mySecondaryMenu = [
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Message", href: "/dashboard/messages", icon: MessageSquare },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  // const isActive = (href: string) =>
  //   pathname === href || pathname.startsWith(`${href}/`);
  const { data: notificationCountData } = useApiQuery(
    ["NOTIFICATION_COUNT"],
    API_ENDPOINTS.NOTIFICATION_COUNT,
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 1,
    } as const,
  );
  const notificationCount = notificationCountData?.data?.notifcation?.total ?? 0;
  const messageUnreadCount = notificationCountData?.data?.chat?.total ?? 0;

  const isActive = (href: string) => {
    if (
      href === RoutesEnum.SOCIAL_HOME ||
      href === RoutesEnum.SOCIAL
    ) {
      return pathname.startsWith(`${RoutesEnum.SOCIAL}/`) || pathname === RoutesEnum.SOCIAL;
    }
    return pathname === href;
  };
  const { data: session, status: sessionStatus }: any = useSession();
  const { mode, isAdmin, canAccessCompanyDashboard } = useDashboardMode();
  const isCompanyView = canAccessCompanyDashboard && mode === "company";
  const { canAccessMenu, isLoading: permissionsLoading } = usePermissions();

  // Filter menus based on permissions - hide items user doesn't have access to
  // Always show menus during loading to prevent navigation issues
  const activeMainMenu = myMainMenu.filter((item) =>
    sessionStatus === "loading" || permissionsLoading
      ? true
      : canAccessMenu(item.href),
  );
  const activeSecondaryMenu = mySecondaryMenu.filter((item) =>
    sessionStatus === "loading" || permissionsLoading
      ? true
      : canAccessMenu(item.href),
  );

  const canNavigateToSettings =
    sessionStatus === "loading" || permissionsLoading
      ? true
      : canAccessMenu(SETTINGS_HREF);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-start justify-between py-2 relative">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-12 group-data-[collapsible=icon]:size-8 items-center justify-center rounded-full bg-white/5">
              <img
                src="/images/nitro-fms-logo.jpeg"
                alt="App logo"
                className="size-12 object-contain"
              />
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <img
                src="/images/fms-enterprise.svg"
                alt="App logo"
                className="h-12 w-full object-contain"
              />
            </div>
          </Link>

          {/* Show when expanded */}
          <SidebarTrigger className="text-muted-foreground group-data-[collapsible=icon]:hidden" />

          {/* Floating Expand Icon (only visible when collapsed) */}
          <button
            type="button"
            className="
        hidden group-data-[collapsible=icon]:flex
        items-center justify-center
        absolute -right-4 top-0
        cursor-pointer z-40"
            onClick={() => {
              const btn = document.querySelector(
                "[data-sidebar='trigger']",
              ) as HTMLElement;
              btn?.click(); // simulate trigger click
            }}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-5 text-black" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-2 mt-3">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            {activeMainMenu.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.name}
                  isActive={isActive(item.href)}
                >
                  <Link href={item.href} className="overflow-visible">
                    <item.icon className="w-5 h-5" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.name}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* rest of your code stays the same... */}
        <div className="">
          {/* Secondary menu */}
          <SidebarGroup className="p-2 pt-3">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              {activeSecondaryMenu.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    isActive={isActive(item.href)}
                  >
                    <Link
                      href={item.href}
                      className="relative flex items-center overflow-visible"
                    >
                      <div className="relative">
                        <item.icon className="w-4 h-4" />
                        {item.name === "Notifications" && (
                          <span className={SIDEBAR_BADGE_CLASSNAME}>
                            {notificationCount > 99 ? "99+" : notificationCount}
                          </span>
                        )}
                        {item.name === "Message" && (
                          <span className={SIDEBAR_BADGE_CLASSNAME}>
                            {messageUnreadCount > 99
                              ? "99+"
                              : messageUnreadCount}
                          </span>
                        )}
                      </div>
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>
      <SidebarSeparator className="my-2" />

      <SidebarFooter className="mb-3">
        {session?.user && (
          <NavUser
            user={session.user}
            settingsHref={SETTINGS_HREF}
            canNavigateToSettings={canNavigateToSettings}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
