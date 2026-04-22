"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialPostCard } from "@/components/social/social-post-card";
import {
  useSocialMyPostsQuery,
  usePinnedSocialPostsQuery,
  useSocialPostsListQuery,
  SOCIAL_ME_POST_STATUS,
} from "@/hooks/use-social-posts";
import type { SocialPost } from "@/api/social-posts";
import { cn } from "@/lib/utils";
import { useSocialCurrentUser } from "@/hooks/use-social-current-user";

function postMatchesCommunityRoute(post: SocialPost, routeId: string) {
  if (routeId === "c1") {
    return post.communityId == null || post.communityId === "c1";
  }
  return post.communityId === routeId;
}

type SocialPostFeedProps = {
  mode: "feed" | "mine";
  /** Used when `mode` is `mine` — passed as GET /social/posts/me?status= */
  mineStatus?: number;
  /** If set, only posts for this community route are shown (client-side). `c1` = org-wide + that id. */
  communityRouteId?: string;
  showActions?: boolean;
  className?: string;
  emptyState?: ReactNode;
};

export function SocialPostFeed({
  mode,
  mineStatus = SOCIAL_ME_POST_STATUS.PUBLISHED,
  communityRouteId,
  showActions = true,
  className,
  emptyState,
}: SocialPostFeedProps) {
  const { data: session } = useSession();
  const currentUser = useSocialCurrentUser();
  const sessionUser = session?.user as { id?: string } | undefined;
  const sessionUserId =
    sessionUser?.id != null ? String(sessionUser.id) : undefined;

  const buildInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "ME";

  const withCurrentUserAuthor = (post: SocialPost): SocialPost => {
    const rawName = post.authorName?.trim() ?? "";
    const shouldFallbackName = !rawName || rawName.toLowerCase() === "member";
    const shouldFallbackInitials =
      !post.authorInitials?.trim() || post.authorInitials.trim().toUpperCase() === "M";

    if (!shouldFallbackName && !shouldFallbackInitials && post.authorId) {
      return post;
    }

    return {
      ...post,
      authorName: shouldFallbackName ? currentUser.name : post.authorName,
      authorAvatar: post.authorAvatar ?? currentUser.avatarUrl,
      authorInitials: shouldFallbackInitials
        ? buildInitials(currentUser.name)
        : post.authorInitials,
      authorId: post.authorId ?? currentUser.id,
    };
  };

  const feedQuery = useSocialPostsListQuery({
    enabled: mode === "feed",
  });
  const mineQuery = useSocialMyPostsQuery(mineStatus, {
    enabled: mode === "mine",
  });
  const shouldLoadPinned =
    mode === "feed" && communityRouteId !== undefined && communityRouteId !== "c1";
  const pinnedQuery = usePinnedSocialPostsQuery({
    communityId: shouldLoadPinned ? communityRouteId ?? null : null,
    type: 2,
    enabled: shouldLoadPinned,
  });

  const q = mode === "feed" ? feedQuery : mineQuery;
  const { data: posts = [], isLoading, isError, error, refetch, isFetching } = q;
  const pinnedPosts = pinnedQuery.data ?? [];

  const showLoadingState = isLoading || (isFetching && posts.length === 0);

  const filtered =
    communityRouteId === undefined
      ? posts
      : posts.filter((p) => postMatchesCommunityRoute(p, communityRouteId));
  const pinnedEnriched = pinnedPosts
    .map((pinned) => {
      const full = filtered.find((item) => item.id === pinned.id);
      return {
        ...(full ?? pinned),
        isPinned: true,
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const filteredWithoutPinned =
    pinnedEnriched.length > 0
      ? filtered.filter((post) => !pinnedEnriched.some((pinned) => pinned.id === post.id))
      : filtered;

  const renderedPinned =
    mode === "mine" ? pinnedEnriched.map(withCurrentUserAuthor) : pinnedEnriched;
  const renderedPosts =
    mode === "mine"
      ? filteredWithoutPinned.map(withCurrentUserAuthor)
      : filteredWithoutPinned;

  if (showLoadingState) {
    return (
      <ul className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-40 w-full rounded-md" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm",
          className,
        )}
      >
        <p className="font-medium text-destructive">Couldn&apos;t load posts</p>
        <p className="mt-1 text-muted-foreground">
          {error?.message ?? "Something went wrong."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Retrying
            </>
          ) : (
            "Try again"
          )}
        </Button>
      </div>
    );
  }

  if (renderedPosts.length === 0 && renderedPinned.length === 0) {
    if (emptyState) {
      return <div className={className}>{emptyState}</div>;
    }
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-card/80 px-6 py-12 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No posts to show yet.
      </div>
    );
  }

  const canManagePost = (p: SocialPost) => {
    if (!showActions) return false;
    if (mode === "mine") return true;
    if (!sessionUserId || !p.authorId) return true;
    return p.authorId === sessionUserId;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {pinnedEnriched.length > 0 ? (
        <section className="space-y-3">
          <ul className="space-y-3">
            {renderedPinned.map((p) => (
              <li key={p.id}>
                <SocialPostCard post={p} showActions={canManagePost(p)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {renderedPosts.length > 0 ? (
        <ul className="space-y-3">
          {renderedPosts.map((p) => (
            <li key={p.id}>
              <SocialPostCard post={p} showActions={canManagePost(p)} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
