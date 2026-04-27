"use client";

import { useMemo, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Heart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SOCIAL_ROUTES, socialCommunityPath } from "@/app/dashboard/social/social-nav";
import { cn } from "@/lib/utils";
import { useSocialFavorites } from "@/context/social-favorites-context";
import { SocialCreateNewMenu } from "@/components/social/social-create-new-menu";
import { SocialProfileMoreMenu } from "@/components/social/social-profile-more-menu";
import { useExploreCommunitiesQuery, useJoinedCommunitiesQuery } from "@/hooks/use-social-communities";
import { useSocialCurrentUser } from "@/hooks/use-social-current-user";

function NavLink({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const active =
    href === SOCIAL_ROUTES.home
      ? pathname === SOCIAL_ROUTES.home
      : pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100",
        active &&
        "bg-muted/90 font-medium text-primary dark:bg-muted/50",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </Link>
  );
}

export function SocialRightSidebar() {
  const pathname = usePathname();
  const socialCurrentUser = useSocialCurrentUser();
  const { favoriteIds } = useSocialFavorites();
  const { data: joined = [], isLoading: joinedLoading } = useJoinedCommunitiesQuery();
  const { data: explore = [], isLoading: exploreLoading } = useExploreCommunitiesQuery();

  const byId = useMemo(() => {
    const map = new Map<string, (typeof explore)[number]>();

    const upsert = (community: (typeof explore)[number]) => {
      const existing = map.get(community.id);
      if (!existing) {
        map.set(community.id, community);
        return;
      }

      map.set(community.id, {
        ...existing,
        ...community,
        profilePhoto: community.profilePhoto ?? existing.profilePhoto,
        coverPhoto: community.coverPhoto ?? existing.coverPhoto,
        description: community.description || existing.description,
      });
    };

    for (const c of explore) upsert(c);
    for (const c of joined) upsert(c);

    return map;
  }, [explore, joined]);

  const favorites = Array.from(favoriteIds ?? new Set<string>())
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => !!x);

  const communityList = useMemo(() => {
    const source = joined.length > 0 ? joined : explore;
    const seen = new Set<string>();
    return source
      .filter((community) => {
        const id = String(community.id);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((community) => byId.get(community.id) ?? community)
      .slice(0, 8);
  }, [joined, explore, byId]);
  const showCommunitiesLoading =
    communityList.length === 0 && (joinedLoading || exploreLoading);

  const isCommunityActive = (communityId: string) => {
    const href = socialCommunityPath(communityId);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const canOpenCommunity = (community: (typeof communityList)[number]) =>
    !community.isPrivate || community.isAdmin === true || community.isMember === true;

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-l border-border bg-card lg:flex">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-1 overflow-hidden p-3">
          <NavLink href={SOCIAL_ROUTES.home} icon={Home}>
            Home
          </NavLink>

          <div className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-zinc-100">
            <Link
              href={SOCIAL_ROUTES.profile}
              className="flex min-w-0 flex-1 items-center gap-2 text-sm text-zinc-800"
            >
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={socialCurrentUser.avatarUrl} alt="" />
                <AvatarFallback>{socialCurrentUser.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{socialCurrentUser.name}</span>
            </Link>
            <SocialProfileMoreMenu triggerVariant="rail" />
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-sm font-semibold text-foreground">Explore</span>
              <SocialCreateNewMenu />
            </div>
            <div className="mt-2 space-y-1">
              <NavLink href={SOCIAL_ROUTES.communities} icon={Users}>
                Communities
              </NavLink>
              {/* <NavLink href={SOCIAL_ROUTES.storylines} icon={BookText}>
              Storylines
            </NavLink> */}
            </div>
          </div>

          <div className="pt-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Favorites
            </p>
            {(favorites?.length ?? 0) > 0 ? (
              <ul className="mt-2 space-y-1">
                {favorites.map((c) => (
                  <li key={c.id}>
                    {canOpenCommunity(c) ? (
                      <Link
                        href={socialCommunityPath(c.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-zinc-100",
                          isCommunityActive(c.id) &&
                          "bg-muted/90 font-medium text-primary dark:bg-muted/50",
                        )}
                      >
                        <Avatar className="size-8 shrink-0 rounded-md border border-border">
                          {c.profilePhoto ? <AvatarImage src={c.profilePhoto} alt={`${c.name} profile`} /> : null}
                          <AvatarFallback
                            className={cn(
                              "rounded-md text-xs font-semibold text-white",
                              c.colorClass,
                            )}
                          >
                            {c.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{c.name}</span>
                      </Link>
                    ) : (
                      <div
                        className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm opacity-70"
                        title="Private community. Request to join first."
                        aria-disabled="true"
                      >
                        <Avatar className="size-8 shrink-0 rounded-md border border-border">
                          {c.profilePhoto ? <AvatarImage src={c.profilePhoto} alt={`${c.name} profile`} /> : null}
                          <AvatarFallback
                            className={cn(
                              "rounded-md text-xs font-semibold text-white",
                              c.colorClass,
                            )}
                          >
                            {c.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{c.name}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                <Heart className="mx-auto mb-2 size-8 text-primary/60" />
                Keep your favorites at your fingertips. Favorites will appear here.{" "}
                <button type="button" className="text-primary underline">
                  Learn more
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Communities
            </p>
            <div className="mt-2 space-y-1">
              {showCommunitiesLoading ? (
                <div className="space-y-1 px-1 py-1">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-md px-1 py-1.5">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : communityList.length > 0 ? (
                <div className="max-h-48 space-y-1 overflow-hidden pr-1">
                  {communityList.map((c) => (
                    canOpenCommunity(c) ? (
                      <Link
                        key={c.id}
                        href={socialCommunityPath(c.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-zinc-100",
                          isCommunityActive(c.id) &&
                          "bg-muted/90 font-medium text-primary dark:bg-muted/50",
                        )}
                      >
                        <Avatar className="size-8 border border-border">
                          {c.profilePhoto ? <AvatarImage src={c.profilePhoto} alt={`${c.name} profile`} /> : null}
                          <AvatarFallback
                            className={cn(
                              "text-xs font-semibold text-white",
                              c.colorClass,
                            )}
                          >
                            {c.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{c.name}</span>
                      </Link>
                    ) : (
                      <div
                        key={c.id}
                        className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm opacity-70"
                        title="Private community. Request to join first."
                        aria-disabled="true"
                      >
                        <Avatar className="size-8 border border-border">
                          {c.profilePhoto ? <AvatarImage src={c.profilePhoto} alt={`${c.name} profile`} /> : null}
                          <AvatarFallback
                            className={cn(
                              "text-xs font-semibold text-white",
                              c.colorClass,
                            )}
                          >
                            {c.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{c.name}</span>
                      </div>
                    )
                  ))}
                </div>
              ) : null}
              {/* <Link
              href={SOCIAL_ROUTES.discover}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-4" />
              Discover communities
            </Link> */}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
