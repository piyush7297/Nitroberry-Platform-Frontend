"use client";

import { Building2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { SidebarTrigger, PlatformHeader } from "@nitroberry/ui";
import { removeAuthToken } from "@nitroberry/api-client";
import { ProductLauncher } from "@/components/product-launcher";

const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "";

export function GlobalHeader() {
  const { data: session }: any = useSession();
  const user = session?.user;

  const leftSlot = (
    <>
      <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg" />

      {/* Management product chip */}
      <div className="hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1 bg-muted/40 border border-border/50">
        <div className="flex h-4 w-4 items-center justify-center rounded bg-sky-50">
          <Building2 className="h-2.5 w-2.5 text-sky-600" strokeWidth={2} />
        </div>
        <span className="text-xs font-semibold text-sky-600">Management</span>
      </div>
    </>
  );

  return (
    <PlatformHeader
      hideLogo
      leftSlot={leftSlot}
      productSwitcher={<ProductLauncher />}
      notificationsHref={`${MAIN_APP_URL}/dashboard/notifications`}
      messagesHref={`${MAIN_APP_URL}/dashboard/messages`}
      user={user}
      onLogout={() => {
        removeAuthToken();
        localStorage.clear();
        signOut({ redirect: true, callbackUrl: `${MAIN_APP_URL}/login` });
      }}
    />
  );
}
