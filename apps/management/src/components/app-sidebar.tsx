"use client";

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
} from "@nitroberry/ui";
import { cn } from "@nitroberry/shared";
import { MANAGEMENT_NAV } from "@/config/nav";
import { usePermissions } from "@/hooks/usePermissions";
import { useSession } from "next-auth/react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canAccessMenu, isLoading } = usePermissions();
  const { status: sessionStatus } = useSession();

  const visibleNav = MANAGEMENT_NAV.filter((item) => {
    if (sessionStatus === "loading" || isLoading) return true;
    return canAccessMenu(item.href.split("?")[0]);
  });

  const isActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");
    if (hrefQuery) {
      const tabParam = new URLSearchParams(hrefQuery).get("tab");
      return pathname === hrefPath && searchParams.get("tab") === tabParam;
    }
    if (pathname === href) return true;
    if (href !== "/" && pathname.startsWith(`${hrefPath}/`)) return true;
    return false;
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* NitroBerry brand */}
        <div className={cn(
          "flex items-center gap-2.5 px-3 py-3",
          "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0",
        )}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_MAIN_APP_URL ?? ""}/images/nitroberry-logo.png`}
              alt="NitroBerry"
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
          </div>
          <span className="truncate text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            Nitro<span className="text-primary">Berry</span>
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
                    <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="my-1" />

      <SidebarFooter className="mb-2">
        <p className="px-3 text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          Company & User Administration
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
