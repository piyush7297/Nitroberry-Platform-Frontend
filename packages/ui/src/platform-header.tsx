"use client";

import React from "react";
import Link from "next/link";
import { Bell, MessageSquare, ChevronDown, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "@nitroberry/shared";

export type PlatformHeaderUser = {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  image_link?: string;
};

export type PlatformHeaderProps = {
  /** ReactNode for the left area — e.g. ProductLauncher + chip in main, BackButton in vault */
  leftSlot?: React.ReactNode;
  /** Href the logo/brand name links to */
  logoHref?: string;
  /** Absolute src for the logo image — optional. Falls back to styled "N" badge. */
  logoSrc?: string;
  /** Href for the notifications bell icon */
  notificationsHref?: string;
  /** Href for the messages icon */
  messagesHref?: string;
  /** Badge count for notifications */
  notificationCount?: number;
  /** Badge count for messages */
  messageCount?: number;
  /** Logged-in user. If undefined, user dropdown is hidden. */
  user?: PlatformHeaderUser;
  /** Href for Settings menu item. If undefined, Settings item is hidden. */
  settingsHref?: string;
  /** Called when the user clicks Log out */
  onLogout?: () => void;
};

export function PlatformHeader({
  leftSlot,
  logoHref = "/",
  logoSrc,
  notificationsHref,
  messagesHref,
  notificationCount = 0,
  messageCount = 0,
  user,
  settingsHref,
  onLogout,
}: PlatformHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-12 w-full shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-3">

      {/* Left — logo + leftSlot (product launcher or back button) */}
      <div className="flex items-center gap-1.5">
        <Link
          href={logoHref}
          className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-accent transition-colors"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt="NitroBerry"
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
              N
            </div>
          )}
          <span className="hidden text-sm font-bold text-foreground sm:block tracking-tight">
            Nitro<span className="text-primary">Berry</span>
          </span>
        </Link>

        {leftSlot && (
          <>
            <span className="mx-0.5 hidden h-4 w-px bg-border sm:block" />
            {leftSlot}
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Right — icons + user dropdown */}
      <div className="flex items-center gap-0.5">

        {notificationsHref && (
          <Link
            href={notificationsHref}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </Link>
        )}

        {messagesHref && (
          <Link
            href={messagesHref}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10"
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4" />
            {messageCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground">
                {messageCount > 99 ? "99+" : messageCount}
              </span>
            )}
          </Link>
        )}

        {(notificationsHref || messagesHref) && <span className="mx-1.5 h-4 w-px bg-border" />}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-accent"
              >
                <Avatar className="h-6 w-6 rounded-md">
                  <AvatarImage src={user.image_link} alt={user.name} />
                  <AvatarFallback className="rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                    {user?.firstName?.charAt(0)?.toUpperCase() ?? user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start sm:flex">
                  <span className="max-w-[100px] truncate text-xs font-medium leading-tight">
                    {user.firstName || user.name}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 p-0 overflow-hidden">
              <div className="flex items-center gap-3 bg-muted/40 border-b px-3 py-3">
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage src={user.image_link} alt={user.name} />
                  <AvatarFallback className="rounded-lg text-sm font-bold bg-primary/10 text-primary">
                    {user?.firstName?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="p-1">
                {settingsHref && (
                  <DropdownMenuItem asChild>
                    <Link href={settingsHref} className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                {settingsHref && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/5"
                  onClick={onLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
