import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { RoleLabels, Roles } from "@/lib/enums/routes.enum";
import { CompanyModeSetter } from "@/components/company-mode-setter";

export default async function CompanyLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session: any = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const isRoleAdmin = (roleValue: unknown) => {
    if (typeof roleValue === "number") {
      return roleValue === Roles.ADMIN;
    }
    if (typeof roleValue === "string") {
      const normalized = roleValue.toLowerCase();
      return (
        normalized === (RoleLabels[Roles.ADMIN]?.toLowerCase() ?? "admin") ||
        normalized === "admin"
      );
    }
    return false;
  };

  const user = session.user ?? {};
  const isAdmin =
    isRoleAdmin(user.role_id) ||
    isRoleAdmin(user.roleId) ||
    isRoleAdmin(user.role) ||
    isRoleAdmin(user.roleName);

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <>
      <CompanyModeSetter />
      {children}
    </>
  );
}
