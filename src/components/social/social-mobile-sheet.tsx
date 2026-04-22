"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SOCIAL_ROUTES } from "@/app/dashboard/social/social-nav";
import { SocialCreateNewMenu } from "@/components/social/social-create-new-menu";

const links: { href: string; label: string }[] = [
  { href: SOCIAL_ROUTES.home, label: "Home" },
  { href: SOCIAL_ROUTES.profile, label: "Profile" },
  { href: SOCIAL_ROUTES.communities, label: "Communities" },
  // { href: SOCIAL_ROUTES.storylines, label: "Storylines" },
  // { href: SOCIAL_ROUTES.discover, label: "Discover" },
];

export function SocialMobileSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="border-border bg-card shadow-sm hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Social</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <SocialCreateNewMenu fullWidthTrigger />
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2 py-2 text-sm hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
