import { SocialFavoritesProvider } from "@/context/social-favorites-context";
import { SocialRightSidebar } from "@/components/social/social-right-sidebar";
import { SocialMobileSheet } from "@/components/social/social-mobile-sheet";

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocialFavoritesProvider>
      <div className="relative flex h-[calc(100dvh-3rem)] flex-col overflow-hidden bg-[#f3f5f8]">
        <div className="pointer-events-none absolute right-3 top-3 z-20 lg:hidden">
          <div className="pointer-events-auto">
            <SocialMobileSheet />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">{children}</main>
          <SocialRightSidebar />
        </div>
      </div>
    </SocialFavoritesProvider>
  );
}
