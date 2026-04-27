"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useProduct } from "@/context/product-context";
import { usePermissions } from "@/hooks/usePermissions";
import { useSession } from "next-auth/react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeProduct } = useProduct();
  const { canAccessMenu, isLoading: permissionsLoading } = usePermissions();
  const { status: sessionStatus } = useSession();

  const navItems = activeProduct?.nav ?? [];

  const visibleNav = navItems.filter((item) => {
    if (sessionStatus === "loading" || permissionsLoading) return true;
    // Strip query string before permission check
    const hrefPath = item.href.split("?")[0];
    return canAccessMenu(hrefPath);
  });

  const isActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");
    // If the nav item has a query param (e.g. ?tab=company), match both path + tab
    if (hrefQuery) {
      const tabParam = new URLSearchParams(hrefQuery).get("tab");
      return pathname === hrefPath && searchParams.get("tab") === tabParam;
    }
    if (pathname === href) return true;
    if (href !== "/dashboard" && pathname.startsWith(`${hrefPath}/`)) return true;
    return false;
  };

  if (!activeProduct?.hasSidebar) return null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Product identity strip */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-3",
            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7",
              activeProduct.color,
            )}
          >
            <activeProduct.icon className="h-4 w-4 text-white" />
          </div>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {activeProduct.name}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            {visibleNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.name}
                  isActive={isActive(item.href)}
                >
                  <Link href={item.href} className="overflow-visible">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.name}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="my-1" />

      <SidebarFooter className="mb-2">
        {/* Product description (visible when expanded) */}
        <p className="px-3 text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          {activeProduct.description}
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
