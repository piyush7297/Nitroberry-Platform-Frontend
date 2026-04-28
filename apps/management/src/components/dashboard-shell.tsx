"use client";

import dynamic from "next/dynamic";
import { SidebarInset, SidebarProvider } from "@nitroberry/ui";
import { GlobalHeader } from "@/components/global-header";

const AppSidebar = dynamic(
  () => import("@/components/app-sidebar").then((m) => ({ default: m.AppSidebar })),
  { ssr: false }
);

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <GlobalHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
