"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { SocialPostComposer } from "@/components/social/social-post-composer";
import { SocialPostFeed } from "@/components/social/social-post-feed";
import {
  SOCIAL_ME_POST_STATUS,
  useSocialMedalsHistoryQuery,
  useSocialMedalsLeaderboardQuery,
  useSocialMedalsListQuery,
  useSocialMedalsSummaryQuery,
} from "@/hooks/use-social-posts";
import { SocialProfileMoreMenu } from "@/components/social/social-profile-more-menu";
import {
  SocialAvatarImageEdit,
  SocialCoverImageEdit,
  useSocialImagePreview,
} from "@/components/social/social-image-edit-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSocialCurrentUser } from "@/hooks/use-social-current-user";
import {
  pageTabButtonClassName,
  pageTabsTrackClassName,
} from "@/components/ui/page-tabs";
import {
  socialPraiseFlairs,
  socialProfileLeaderboardMock,
  socialProfileGamificationMock,
} from "@/lib/social-dummy-data";

const profileTabs = [
  { id: "storyline", label: "My Posts" },
  { id: "activity", label: "All activity" },
  { id: "leaderboard", label: "Leaderboard" },
] as const;

function SocialProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="h-32 w-full bg-gradient-to-br from-blue-500/70 via-blue-500/55 to-indigo-500/70 md:h-36" />
        <div className="px-4 pb-4 pt-0 md:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
              <div className="rounded-full bg-card p-1.5 shadow-sm">
                <Skeleton className="size-24 rounded-full md:size-28" />
              </div>
              <div className="space-y-2 pb-1">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>

          <div className={cn(pageTabsTrackClassName, "mt-6 flex flex-wrap")}>
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <Skeleton className="h-5 w-2/3" />
        <div className="mt-3 flex gap-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-2 h-9 w-20" />
        <Skeleton className="mt-2 h-3 w-72" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SocialProfilePage() {
  const [tab, setTab] = useState<(typeof profileTabs)[number]["id"]>("storyline");
  const { status: sessionStatus } = useSession();
  const u = useSocialCurrentUser();
  const {
    data: medals = [],
    isLoading: medalsLoading,
  } = useSocialMedalsListQuery();
  const {
    data: medalsSummary,
    isLoading: medalsSummaryLoading,
  } = useSocialMedalsSummaryQuery(u.id ?? null);
  const {
    data: medalsLeaderboard = [],
    isLoading: medalsLeaderboardLoading,
  } = useSocialMedalsLeaderboardQuery();
  const {
    data: medalsHistory = [],
    isLoading: medalsHistoryLoading,
  } = useSocialMedalsHistoryQuery(u.id ?? null);
  const coverPreview = useSocialImagePreview();
  const avatarPreview = useSocialImagePreview();
  const medalsById = useMemo(
    () => new Map(medals.map((medal) => [medal.id, medal] as const)),
    [medals],
  );
  const earnedFlairSource =
    medalsSummary?.earnedFlairs?.length
      ? medalsSummary.earnedFlairs
      : socialProfileGamificationMock.earnedFlairs;
  const earnedFlairs = earnedFlairSource
    .map((earned) => {
      const flair =
        medalsById.get(earned.flairId) ??
        socialPraiseFlairs.find((f) => f.id === earned.flairId);
      if (!flair) return null;
      return { ...flair, count: earned.count };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const leaderboardRows =
    medalsLeaderboard.length > 0 ? medalsLeaderboard : socialProfileLeaderboardMock;
  const currentUserRank = leaderboardRows.find((person) => person.id === u.id)?.rank;
  const totalPoints = medalsSummary?.totalPoints ?? socialProfileGamificationMock.totalPoints;
  const hasLoadedAnyData =
    medals.length > 0 ||
    medalsLeaderboard.length > 0 ||
    medalsHistory.length > 0 ||
    medalsSummary != null;
  const showProfileLoading =
    !hasLoadedAnyData &&
    (sessionStatus === "loading" ||
      medalsLoading ||
      medalsSummaryLoading ||
      medalsLeaderboardLoading ||
      medalsHistoryLoading);

  if (showProfileLoading) {
    return <SocialProfilePageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <SocialCoverImageEdit
          previewUrl={coverPreview.previewUrl}
          fallbackClassName="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600"
          fallbackOverlay={
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_40%),radial-gradient(circle_at_80%_30%,white_0,transparent_35%)]" />
          }
          onFileSelect={coverPreview.setFromFile}
        />
        <div className="relative px-4 pb-4 pt-0 md:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
              <SocialAvatarImageEdit
                previewUrl={avatarPreview.previewUrl}
                onFileSelect={avatarPreview.setFromFile}
                editLabel="Change profile photo"
              >
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-fuchsia-500 opacity-90 blur-[1px]" />
                  <div className="relative rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-fuchsia-500 p-1.5 shadow-lg">
                    <Avatar className="size-24 border-4 border-card shadow-md md:size-28">
                      <AvatarImage src={u.avatarUrl} alt="" />
                      <AvatarFallback className="text-lg">
                        {u.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-amber-400 text-[13px] shadow-md">
                    🥇
                  </div>
                </div>
              </SocialAvatarImageEdit>
              <div className="pb-1">
                <h1 className="text-2xl font-semibold text-foreground">{u.name}</h1>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-md">
                Posts {u.posts}
              </Button>
              <SocialProfileMoreMenu triggerVariant="header" />
            </div>
          </div>

          <div className={cn(pageTabsTrackClassName, "mt-6 flex flex-wrap")}>
            {profileTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={pageTabButtonClassName(tab === t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "storyline" ? <SocialPostComposer /> : null}

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Achievement Points
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {totalPoints}
            </p>
            <p className="text-xs text-muted-foreground">
              Earn points from praise flairs and grow your profile impact.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Keep it up - teammates can see your achievements.
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Earned Flairs
          </p>
          <div className="flex flex-wrap gap-2">
            {earnedFlairs.map((flair) => (
              <span
                key={flair.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                  flair.toneClass,
                )}
              >
                <span>{flair.emoji}</span>
                <span>{flair.name}</span>
                <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold">
                  x{flair.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {tab === "storyline" && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Your community posts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Posts appear here only when you publish to a community. Personal
            storyline posts are not supported right now.
          </p>
          <div className="mt-6">
            <SocialPostFeed
              mode="mine"
              mineStatus={SOCIAL_ME_POST_STATUS.PUBLISHED}
              emptyState={(
                <div className="rounded-lg border border-dashed border-border bg-card/80 px-6 py-12 text-center text-sm text-muted-foreground">
                  You have no community posts yet. Create a post by selecting a community.
                </div>
              )}
            />
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Medal History
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Your recent achievements
            </h2>
          </div>
          {medalsHistory.length > 0 ? (
            <div className="space-y-3">
              {medalsHistory.map((item) => {
                const medal = medalsById.get(item.medalId);
                const medalName = medal?.name ?? item.medalName;
                const medalEmoji = medal?.emoji ?? "🏅";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {medalEmoji} {medalName}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.sourceText}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">+{item.points}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy") : "-"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No recent medal activity to show yet.
            </div>
          )}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Praise Leaderboard
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Motivation board
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recognize top contributors, celebrate momentum, and keep the praise loop visible.
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Your rank
              </p>
              <p className="text-2xl font-bold text-amber-700">
                {currentUserRank ? `#${currentUserRank}` : "-"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {leaderboardRows.map((person) => (
              <div
                key={person.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-shadow hover:shadow-sm",
                  person.id === u.id
                    ? "border-primary/25 bg-primary/5"
                    : "border-border bg-background",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                  #{person.rank}
                </div>
                <Avatar className="size-11 border border-border">
                  <AvatarImage src={person.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>
                    {person.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">
                      {person.name}
                    </p>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {person.badge}
                    </span>
                    {person.id === u.id ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        You
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {person.highlight}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {person.points}
                  </p>
                  <p className="text-[11px] text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
