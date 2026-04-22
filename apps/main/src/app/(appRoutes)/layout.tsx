import Link from "next/link";
import React from "react";

export default async function AppRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0F0720] px-16 py-4 text-white shadow-md">
        <div className="mx-auto  flex items-center gap-3 ">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-200 via-purple-100 to-white text-lg font-semibold text-[#0F0720] shadow-inner">
            NB
          </div>
          <Link href="/" className="items-center gap-2">
            <p className="text-xl font-semibold leading-tight">NitroBerry</p>
            <p className="text-sm text-white/70">
              Industrial Automation Platform
            </p>
          </Link>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
