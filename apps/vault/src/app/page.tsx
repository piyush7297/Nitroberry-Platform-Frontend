import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { VaultHeader } from "@/components/vault-header";
import VaultContent from "./vault-content";
// VaultContent is the default export named VaultPage in vault-content.tsx

export default async function VaultPage() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user) {
    const mainUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "";
    redirect(`${mainUrl}/login?callbackUrl=/vault`);
  }

  return (
    <div className="flex min-h-svh flex-col">
      <VaultHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        {/* Suspense required because VaultContent uses useSearchParams */}
        <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading vault...</div>}>
          <VaultContent />
        </Suspense>
      </main>
    </div>
  );
}
