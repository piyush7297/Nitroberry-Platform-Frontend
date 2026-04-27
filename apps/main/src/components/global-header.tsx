"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { PlatformHeader } from "@/components/ui/platform-header";
import { ProductLauncher } from "@/components/product-launcher";
import { useProduct } from "@/context/product-context";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { removeAuthToken } from "@/api/token";
import { usePermissions } from "@/hooks/usePermissions";

const SETTINGS_HREF = "/dashboard/settings";

export function GlobalHeader() {
  const { data: session }: any = useSession();
  const user = session?.user;
  const { activeProduct } = useProduct();
  const { canAccessMenu } = usePermissions();

  const { data: notificationCountData } = useApiQuery(
    ["NOTIFICATION_COUNT"],
    API_ENDPOINTS.NOTIFICATION_COUNT,
    { refetchOnWindowFocus: true, refetchOnMount: true, retry: 1 } as const,
  );

  const notificationCount = notificationCountData?.data?.notifcation?.total ?? 0;
  const messageUnreadCount = notificationCountData?.data?.chat?.total ?? 0;
  const canNavigateToSettings = canAccessMenu(SETTINGS_HREF);

  const leftSlot = (
    <>
      {activeProduct?.hasSidebar && (
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg" />
      )}
      <ProductLauncher />
      {activeProduct && (
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1 bg-muted/40 border border-border/50">
          <div className={cn("flex h-4 w-4 items-center justify-center rounded", activeProduct.tileBg)}>
            <activeProduct.icon className={cn("h-2.5 w-2.5", activeProduct.iconColor)} strokeWidth={2} />
          </div>
          <span className={cn("text-xs font-semibold", activeProduct.textColor)}>
            {activeProduct.name}
          </span>
        </div>
      )}
    </>
  );

  return (
    <PlatformHeader
      logoHref="/dashboard"
      logoSrc="/images/nitroberry-logo.png"
      leftSlot={leftSlot}
      notificationsHref="/dashboard/notifications"
      messagesHref="/dashboard/messages"
      notificationCount={notificationCount}
      messageCount={messageUnreadCount}
      user={user}
      settingsHref={canNavigateToSettings ? SETTINGS_HREF : undefined}
      onLogout={() => {
        removeAuthToken();
        localStorage.clear();
        signOut({ redirect: true, callbackUrl: "/login" });
      }}
    />
  );
}
