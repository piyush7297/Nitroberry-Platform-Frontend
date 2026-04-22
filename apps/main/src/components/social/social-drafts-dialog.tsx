"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialPostCard } from "@/components/social/social-post-card";
import {
  SOCIAL_ME_POST_STATUS,
  useSocialMyPostsQuery,
} from "@/hooks/use-social-posts";

export function SocialDraftsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: drafts = [], isLoading, isError, refetch, isFetching } =
    useSocialMyPostsQuery(SOCIAL_ME_POST_STATUS.DRAFT, {
      enabled: open,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Drafts</DialogTitle>
          <DialogDescription>
            Draft posts are saved until you publish them from the composer.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>Could not load drafts.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Retrying
                </>
              ) : (
                "Retry"
              )}
            </Button>
          </div>
        ) : drafts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No drafts yet. Save a post as draft from the composer.
          </p>
        ) : (
          <ul className="space-y-3 py-1">
            {drafts.map((p) => (
              <li key={p.id}>
                <SocialPostCard post={p} showActions />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
