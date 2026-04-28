import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session: any = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");

  return <DashboardShell>{children}</DashboardShell>;
}
