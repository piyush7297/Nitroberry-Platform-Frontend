import "../globals.css";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Link from "next/link";
import { DashboardModeProvider } from "@/context/dashboard-mode-context";
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
    <div>
      <DashboardModeProvider>
        <PermissionsProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <CompanyThemeApplier />
              <NotificationPermission />
              <PermissionGuard />
              <header className="flex h-12 items-center justify-between px-4 md:hidden">
                <SidebarTrigger className="text-gray-700" />
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <img
                      src="/images/nitro-fms-logo.jpeg"
                      alt="Logo"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                </Link>
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
        </PermissionsProvider>
      </DashboardModeProvider>
    </div>
  );
}
