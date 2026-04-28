import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import AuthProvider from "@/context/AuthProvider";
import TanstackProvider from "@/context/TanstackProvider";
import { PermissionsProvider } from "@/context/PermissionsContext";
import { Toaster } from "@nitroberry/ui";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NitroBerry Management",
  description: "Company & User Administration",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.variable} antialiased font-sans`}>
        <AuthProvider session={session}>
          <TanstackProvider>
            <PermissionsProvider>
              <Toaster />
              {children}
            </PermissionsProvider>
          </TanstackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
