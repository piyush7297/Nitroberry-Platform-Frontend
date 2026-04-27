import "../globals.css";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalHeader } from "@/components/global-header";
import { DashboardModeProvider } from "@/context/dashboard-mode-context";
import { ClientProviders } from "@/components/client-providers";
import { NotificationPermission } from "@/components/NotificationPermission";
import { PermissionGuard } from "@/components/PermissionGuard";
import { CompanyThemeApplier } from "@/components/company-theme-applier";
import { PermissionsProvider } from "@/context/PermissionsContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: any = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardModeProvider>
      <PermissionsProvider>
        <ClientProviders>
          <SidebarProvider>
            {/* Product-scoped sidebar — Suspense needed for useSearchParams inside */}
            <Suspense fallback={null}>
              <AppSidebar />
            </Suspense>

            <SidebarInset className="min-h-svh">
              <CompanyThemeApplier />
              <NotificationPermission />
              <PermissionGuard />

              {/* Persistent global header */}
              <GlobalHeader />

              {/* Page content */}
              <main className="flex flex-1 flex-col">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </ClientProviders>
      </PermissionsProvider>
    </DashboardModeProvider>
  );
}
