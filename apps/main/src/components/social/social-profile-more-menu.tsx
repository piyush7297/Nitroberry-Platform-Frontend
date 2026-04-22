"use client";

import Link from "next/link";
import { Bookmark, MoreHorizontal, Pencil, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SOCIAL_ROUTES } from "@/app/dashboard/social/social-nav";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type SocialProfileMoreMenuProps = {
  /** Matches profile header pill button */
  triggerVariant?: "header" | "rail";
  className?: string;
};

export function SocialProfileMoreMenu({
  triggerVariant = "header",
  className,
}: SocialProfileMoreMenuProps) {
  const draftsSoon = () => {
    toast({
      title: "Drafts and scheduled",
      description: "This will open when drafts are connected to your backend.",
    });
  };

  const delegatesSoon = () => {
    toast({
      title: "Delegate management",
      description: "This will open when delegation is available in your org.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerVariant === "header" ? (
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-md", className)}
            aria-label="More options"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        ) : (
          <button
            type="button"
            className={cn(
              "shrink-0 rounded p-1 text-muted-foreground hover:bg-zinc-200/80",
              className,
            )}
            aria-label="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={SOCIAL_ROUTES.bookmarks}>
            <Bookmark className="size-4" />
            Bookmarks
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={draftsSoon}>
          <Pencil className="size-4" />
          Drafts and scheduled
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={delegatesSoon}>
          <UsersRound className="size-4" />
          Delegate management
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
