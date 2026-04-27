"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, Plus, Search } from "lucide-react";
import { socialCommunityPath } from "@/app/dashboard/social/social-nav";
import { cn } from "@/lib/utils";
import { useSocialFavorites } from "@/context/social-favorites-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useExploreCommunitiesQuery, useRequestJoinCommunityMutation } from "@/hooks/use-social-communities";

export default function SocialDiscoverPage() {
  const { isFavorite, toggleFavorite } = useSocialFavorites();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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

  const filtered = useMemo(() => {
    // Server-side filtering via query param; keep a small client-side guard
    // for instant UX while debounce is running.
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [query, communities]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Discover communities
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse and join communities.
        </p>
      </div>

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
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Loading communities…
          </div>
        ) : null}
        {isFetching && debouncedQuery.trim() ? (
          <div className="col-span-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Loader2 className="size-4 animate-spin text-primary" />
            Searching communities…
          </div>
        ) : null}
        {filtered.map((c) => {
          const fav = isFavorite(c.id);
          return (
            <div
              key={c.id}
              className="relative flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <Link
                href={socialCommunityPath(c.id)}
                className="flex flex-1 flex-col outline-none"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full text-sm font-semibold text-white",
                      c.colorClass,
                    )}
                  >
                    {c.initials}
                  </span>
                  <div className="min-w-0 flex-1 pr-8">
                    <h2 className="font-semibold leading-tight">{c.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {c.memberCount} members
                    </p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {c.description}
                </p>
                <span className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1 rounded-md bg-primary text-sm font-medium text-primary-foreground">
                  <Plus className="size-4" />
                  View community
                </span>
              </Link>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => requestJoin.mutate(c.id)}
                  disabled={requestJoin.isPending || c.isMember === true || (c.requestStatus != null && c.requestStatus !== 0)}
                >
                  {requestJoin.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending
                    </>
                  ) : c.isMember === true || c.requestStatus === 1 ? (
                    "Joined"
                  ) : c.requestStatus != null && c.requestStatus !== 0 ? (
                    "Requested"
                  ) : c.isPrivate ? (
                    "Request to join"
                  ) : (
                    "Join"
                  )}
                </Button>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite(c.id);
                }}
                className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={fav}
              >
                <Heart
                  className={cn(
                    "size-5",
                    fav ? "fill-red-500 text-red-500" : "",
                  )}
                />
              </button>
            </div>
        );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No communities match &quot;{query.trim()}&quot;. Try a different search.
        </p>
      )}
    </div>
  );
}
