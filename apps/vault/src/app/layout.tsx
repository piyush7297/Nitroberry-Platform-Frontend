import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import AuthProvider from "@/context/AuthProvider";
import TanstackProvider from "@/context/TanstackProvider";
import { PermissionsProvider } from "@/context/PermissionsContext";
import { Toaster } from "@nitroberry/ui";
import { CompanyThemeApplier } from "@/components/company-theme-applier";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vault — NitroBerry",
  description: "Secure File Storage",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: any = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} antialiased font-sans`}
      >
        <AuthProvider session={session}>
          <TanstackProvider>
            <PermissionsProvider>
              <CompanyThemeApplier />
              <Toaster />
              {children}
            </PermissionsProvider>
          </TanstackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
