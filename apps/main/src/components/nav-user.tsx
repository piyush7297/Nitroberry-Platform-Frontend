"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { removeAuthToken } from "@/api/token";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SETTINGS_DEFAULT = "/dashboard/settings";

export function NavUser({
  user,
  settingsHref = SETTINGS_DEFAULT,
  canNavigateToSettings = true,
}: {
  user: {
    name: string;
    email: string;
    image_link: string;
  };
  settingsHref?: string;
  canNavigateToSettings?: boolean;
}) {
  const pathname = usePathname();
  const settingsActive =
    pathname === settingsHref || pathname.startsWith(`${settingsHref}/`);

  const profileInner = (
    <>
      <Avatar className="h-8 w-8 shrink-0 rounded-lg">
        <AvatarImage src={user.image_link} alt={user.name} />
        <AvatarFallback className="rounded-lg">
          {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>

      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{user.name}</span>
          <Settings
            className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/80"
            aria-hidden
          />
        </div>
        <span className="truncate text-xs text-sidebar-foreground/80">
          {user.email}
        </span>
      </div>
    </>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full min-w-0 items-center gap-0.5">
          {canNavigateToSettings ? (
            <SidebarMenuButton
              size="lg"
              className="min-w-0 flex-1 justify-start gap-2 px-2"
              asChild
              isActive={settingsActive}
            >
              <Link
                href={settingsHref}
                className="flex min-w-0 items-center gap-2 overflow-hidden"
                aria-label="Profile and settings"
              >
                {profileInner}
              </Link>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              size="lg"
              className="min-w-0 flex-1 cursor-default justify-start gap-2 px-2"
              asChild
            >
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                {profileInner}
              </div>
            </SidebarMenuButton>
          )}

          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex shrink-0 cursor-pointer rounded-md p-2 hover:bg-sidebar-accent"
                    >
                      <LogOut className="h-5 w-5" />
                    </div>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Log out</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you want to log out?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You will be signed out of your account.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    removeAuthToken();
                    localStorage.clear();
                    signOut({ redirect: true, callbackUrl: "/login" });
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Yes, Log out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
