import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import AuthProvider from "@/context/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import TanstackProvider from "@/context/TanstackProvider";
import { StickyNotesRoot } from "@/components/sticky-notes/sticky-notes-root";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Enterprise FMS",
  description: "Platform Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session: any = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} antialiased font-sans`}
      >
        <AuthProvider session={session}>
          <TanstackProvider>
            {/* <NotificationPermission /> */}
            <Toaster />
            {children}
            <StickyNotesRoot />
          </TanstackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
