"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Globe2, Heart, Loader2, Lock, Search, Shield } from "lucide-react";
import { socialCommunityPath } from "@/app/dashboard/social/social-nav";
import { cn } from "@/lib/utils";
import { useSocialFavorites } from "@/context/social-favorites-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useExploreCommunitiesQuery,
  useRequestJoinCommunityMutation,
} from "@/hooks/use-social-communities";

export default function SocialCommunitiesPage() {
  const { isFavorite, toggleFavorite } = useSocialFavorites();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [coverImageErrors, setCoverImageErrors] = useState<Record<string, boolean>>({});
  const [profileImageErrors, setProfileImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const {
    data: communities = [],
    isLoading,
    isFetching,
  } = useExploreCommunitiesQuery({
    enabled: true,
    search: debouncedQuery,
  });
  const requestJoin = useRequestJoinCommunityMutation();
  const showInitialLoading = isLoading && communities.length === 0;
  const showSearchLoading =
    !showInitialLoading && isFetching && debouncedQuery.trim().length > 0;

  const filtered = useMemo(() => {
    const seen = new Set<string>();
    const uniqueCommunities = communities.filter((community) => {
      const id = String(community.id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const q = query.trim().toLowerCase();
    if (!q) return uniqueCommunities;
    return uniqueCommunities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [query, communities]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">
          Communities
        </h1>
        <p className="text-sm text-muted-foreground">
          See what&apos;s new in your communities and discover more across your
          organization.
        </p>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search communities by name or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 pl-9"
          aria-label="Search communities"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {showInitialLoading
          ? Array.from({ length: 6 }).map((_, index) => (
            <article
              key={`community-skeleton-${index}`}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            >
              <Skeleton className="h-28 w-full" />
              <div className="px-3 pb-3 pt-7">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-3 w-24" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-5/6" />
              </div>
              <div className="px-3 pb-4">
                <Skeleton className="h-8 w-full" />
              </div>
            </article>
          ))
          : null}
        {showSearchLoading
          ? Array.from({ length: 6 }).map((_, index) => (
            <article
              key={`community-search-skeleton-${index}`}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            >
              <Skeleton className="h-28 w-full" />
              <div className="px-3 pb-3 pt-7">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-3 w-24" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-5/6" />
              </div>
              <div className="px-3 pb-4">
                <Skeleton className="h-8 w-full" />
              </div>
            </article>
          ))
          : null}
        {!showInitialLoading && !showSearchLoading && filtered.map((c) => {
          const fav = isFavorite(c.id);
          const isAdmin = c.isAdmin === true;
          const isJoined = c.isMember === true || c.requestStatus === 1;
          const isRequested = c.requestStatus != null && c.requestStatus !== 0 && c.requestStatus !== 1;
          const isRequestPendingForCard =
            requestJoin.isPending && (requestJoin as any).variables === c.id;
          const canOpenCommunity = !c.isPrivate || isAdmin || isJoined;
          const actionDisabled = isRequestPendingForCard || isAdmin || isJoined || isRequested;
          const canToggleFavorite = isAdmin || isJoined;

          const actionText = isAdmin
            ? "Admin"
            : isJoined
              ? "Joined"
              : isRequested
                ? "Requested"
                : c.isPrivate
                  ? "Request Join"
                  : "Join";

          const hasCoverPhoto = Boolean(c.coverPhoto) && !coverImageErrors[c.id];
          const hasProfilePhoto = Boolean(c.profilePhoto) && !profileImageErrors[c.id];

          const cardBody = (
            <>
              <div className="relative">
                {hasCoverPhoto ? (
                  <img
                    src={c.coverPhoto ?? undefined}
                    alt={`${c.name} cover`}
                    className="h-28 w-full object-cover"
                    onError={() =>
                      setCoverImageErrors((prev) => ({ ...prev, [c.id]: true }))
                    }
                  />
                ) : (
                  <div className={cn("h-28 bg-muted", c.bannerClass)} aria-hidden />
                )}
                <div className="absolute -bottom-5 left-3">
                  {hasProfilePhoto ? (
                    <img
                      src={c.profilePhoto ?? undefined}
                      alt={`${c.name} profile`}
                      className="size-11 rounded-lg bg-white object-cover shadow-md ring-2 ring-card"
                      onError={() =>
                        setProfileImageErrors((prev) => ({ ...prev, [c.id]: true }))
                      }
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-lg text-xs font-bold text-white shadow-md ring-2 ring-card",
                        c.colorClass,
                      )}
                    >
                      {c.initials}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-3 pb-3 pt-7">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate font-semibold leading-tight text-foreground">{c.name}</h2>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full border p-1",
                      c.isPrivate
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700",
                    )}
                    title={c.isPrivate ? "Private community" : "Public community"}
                    aria-label={c.isPrivate ? "Private community" : "Public community"}
                  >
                    {c.isPrivate ? (
                      <Lock className="size-3" aria-hidden="true" />
                    ) : (
                      <Globe2 className="size-3" aria-hidden="true" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.memberCount} members</p>
                <p className="mt-2 line-clamp-2 min-h-8 text-xs text-muted-foreground">{c.description}</p>
              </div>
            </>
          );

          return (
            <article
              key={c.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {canOpenCommunity ? (
                <Link href={socialCommunityPath(c.id)} className="block outline-none">
                  {cardBody}
                </Link>
              ) : (
                <div className="block cursor-not-allowed outline-none" title="Private community. Request to join first." aria-disabled="true">
                  {cardBody}
                </div>
              )}

              <div className="px-3 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full"
                  onClick={() => requestJoin.mutate(c.id)}
                  disabled={actionDisabled}
                >
                  {isRequestPendingForCard ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending
                    </>
                  ) : isAdmin ? (
                    <span className="inline-flex items-center gap-1">
                      <Shield className="size-3.5" />
                      {actionText}
                    </span>
                  ) : (
                    actionText
                  )}
                </Button>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  if (!canToggleFavorite) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(c.id);
                }}
                disabled={!canToggleFavorite}
                className={cn(
                  "absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-md border bg-card/95 shadow-sm backdrop-blur transition-colors hover:bg-card",
                  fav && "border-red-200",
                  !canToggleFavorite && "cursor-not-allowed opacity-60",
                )}
                aria-label={
                  canToggleFavorite
                    ? fav
                      ? "Remove from favorites"
                      : "Add to favorites"
                    : "Join community to add favorite"
                }
                aria-pressed={fav}
                title={canToggleFavorite ? undefined : "Join community to add to favorites"}
              >
                <Heart
                  className={cn(
                    "size-5",
                    fav ? "fill-red-500 text-red-500" : "text-muted-foreground",
                  )}
                />
              </button>
            </article>
          );
        })}
      </div>

      {!showInitialLoading && !showSearchLoading && !isFetching && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No communities match &quot;{query.trim()}&quot;. Try a different search.
        </p>
      )}
    </div>
  );
}
