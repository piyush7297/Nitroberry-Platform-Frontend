"use client";

import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { PlatformHeader } from "@nitroberry/ui";
import { removeAuthToken } from "@nitroberry/api-client";

const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "";

export function VaultHeader() {
  const { data: session }: any = useSession();
  const user = session?.user;

  const leftSlot = (
    <>
      {/* Back to main app */}
      <Link
        href={`${MAIN_APP_URL}/dashboard`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Back to Dashboard"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      {/* Vault product chip */}
      <div className="hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1 bg-muted/40 border border-border/50">
        <div className="flex h-4 w-4 items-center justify-center rounded bg-amber-50">
          <Lock className="h-2.5 w-2.5 text-amber-600" strokeWidth={2} />
        </div>
        <span className="text-xs font-semibold text-amber-600">Vault</span>
      </div>
    </>
  );

  return (
    <PlatformHeader
      logoHref={`${MAIN_APP_URL}/dashboard`}
      logoSrc={MAIN_APP_URL ? `${MAIN_APP_URL}/images/nitroberry-logo.png` : undefined}
      leftSlot={leftSlot}
      notificationsHref={`${MAIN_APP_URL}/dashboard/notifications`}
      messagesHref={`${MAIN_APP_URL}/dashboard/messages`}
      user={user}
      settingsHref={`${MAIN_APP_URL}/dashboard/settings`}
      onLogout={() => {
        removeAuthToken();
        localStorage.clear();
        signOut({ redirect: true, callbackUrl: `${MAIN_APP_URL}/login` });
      }}
    />
  );
}
