"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Copy,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ReactionType, PostType } from "@/lib/enums/social.enum";
import { toast } from "@/hooks/use-toast";
import {
  SOCIAL_REACTION_TARGET_TYPE,
  SOCIAL_REACTION_TYPE,
} from "@/api/social-interactions";
import type { SocialPost } from "@/api/social-posts";
import { useToggleReactionMutation } from "@/hooks/use-social-interactions";
import {
  useDeleteSocialPostMutation,
  usePinSocialPostMutation,
  usePostPollVotesQuery,
  useVoteOnSocialPostPollMutation,
  useUpdateSocialPostMutation,
} from "@/hooks/use-social-posts";
import { SocialPostComments } from "@/components/social/social-post-comments";
import { socialCommunityPath } from "@/app/dashboard/social/social-nav";

function PostBody({ content }: { content: string }) {
  const trimmed = content.trim();
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(trimmed);
  if (looksLikeHtml) {
    return (
      <div
        className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground [&_a]:text-primary [&_p]:my-0 [&_ol]:my-2 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:my-2 [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-0.5 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:px-3 [&_pre]:py-2 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_.social-mention]:rounded [&_.social-mention]:bg-primary/15 [&_.social-mention]:px-1.5 [&_.social-mention]:py-0.5 [&_.social-mention]:font-semibold [&_.social-mention]:text-primary"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {content}
    </p>
  );
}

function formatPostDate(iso: string) {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, "MMM d, yyyy · h:mm a");
}

function pickMedalEmoji(icon: string | undefined, idx: number) {
  const fallback = ["🏅", "🏆", "🎖️", "✨"];
  const raw = (icon ?? "").trim();
  const safe = raw && !/^[a-zA-Z0-9]+$/.test(raw) ? raw : fallback[idx % fallback.length];
  return safe;
}

function getPollOptionScore(
  option: { voteCount: number | null; percentage: number | null },
  totalVotes: number | null,
) {
  if (option.percentage != null && Number.isFinite(option.percentage)) {
    return Math.max(0, Math.min(100, option.percentage));
  }
  if (option.voteCount != null && totalVotes && totalVotes > 0) {
    return Math.max(0, Math.min(100, (option.voteCount / totalVotes) * 100));
  }
  return null;
}

const REACTIONS = [
  { type: ReactionType.LIKE, emoji: "👍", label: "Like", key: "likeCount" },
  { type: ReactionType.LOVE, emoji: "❤️", label: "Love", key: "loveCount" },
  { type: ReactionType.HAHA, emoji: "😂", label: "Haha", key: "hahaCount" },
  { type: ReactionType.WOW, emoji: "😮", label: "Wow", key: "wowCount" },
  { type: ReactionType.SAD, emoji: "😢", label: "Sad", key: "sadCount" },
  { type: ReactionType.ANGRY, emoji: "😠", label: "Angry", key: "angryCount" },
] as const;

export function SocialPostCard({
  post,
  showActions = true,
}: {
  post: SocialPost;
  showActions?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [localPinned, setLocalPinned] = useState(post.isPinned);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

  const updateMut = useUpdateSocialPostMutation();
  const deleteMut = useDeleteSocialPostMutation();
  const pinMut = usePinSocialPostMutation();
  const toggleReaction = useToggleReactionMutation();
  const pollVotesQuery = usePostPollVotesQuery(post.id, {
    enabled: post.postType === PostType.POLL,
  });
  const votePollMut = useVoteOnSocialPostPollMutation(post.id);

  const basePollOptions = post.poll?.options ?? [];
  const voteOptions = pollVotesQuery.data?.options ?? [];
  const pollOptions =
    basePollOptions.length > 0
      ? basePollOptions.map((base) => {
        const fromVotes = voteOptions.find(
          (opt) => opt.id === base.id || opt.optionText === base.optionText,
        );
        return fromVotes
          ? {
            ...base,
            voteCount: fromVotes.voteCount,
            percentage: fromVotes.percentage,
            isSelected: fromVotes.isSelected,
          }
          : base;
      })
      : voteOptions;
  const totalVotes =
    pollVotesQuery.data?.totalVotes ?? post.poll?.totalVotes ?? null;
  const userVoteOptionId =
    pollVotesQuery.data?.userVoteOptionId ?? post.poll?.userVoteOptionId ?? null;

  const pollHasResults = pollOptions.some(
    (option) => option.voteCount != null || option.percentage != null,
  );
  const showPollResults = pollHasResults || Boolean(userVoteOptionId);

  useEffect(() => {
    setLiked(Boolean(post.isLiked));
  }, [post.id, post.isLiked]);

  const displayedLikeCount = useMemo(
    () => Number(post.metrics?.totalReactions ?? 0),
    [post.metrics?.totalReactions],
  );

  const displayedCommentCount = Number(post.metrics?.commentCount ?? 0);
  const isPinnedNow = localPinned || post.isPinned;
  const communityName = post.communityName?.trim() ?? "";
  const hasCommunityName = communityName.length > 0;
  const canOpenCommunity = hasCommunityName && Boolean(post.communityId);

  const reactionCounts = useMemo(() => {
    const m = post.metrics;
    return {
      likeCount: m?.likeCount ?? 0,
      loveCount: m?.loveCount ?? 0,
      wowCount: m?.wowCount ?? 0,
      hahaCount: m?.hahaCount ?? 0,
      sadCount: m?.sadCount ?? 0,
      angryCount: m?.angryCount ?? 0,
    };
  }, [post.metrics]);

  const totalPraisePoints = useMemo(
    () => (post.praise?.details ?? []).reduce((sum, detail) => sum + detail.points, 0),
    [post.praise?.details],
  );

  const onToggleLike = () => {
    toggleReaction.mutate(
      {
        type: SOCIAL_REACTION_TYPE.LIKE,
        targetType: SOCIAL_REACTION_TARGET_TYPE.POST,
        targetId: post.id,
      },
      {
        onSuccess: () => setLiked((v) => !v),
      },
    );
  };

  const onSelectReaction = (reactionType: number) => {
    if (reactionType === SOCIAL_REACTION_TYPE.LIKE && liked) {
      setReactionPickerOpen(false);
      return;
    }
    toggleReaction.mutate(
      {
        type: reactionType,
        targetType: SOCIAL_REACTION_TARGET_TYPE.POST,
        targetId: post.id,
      },
      {
        onSuccess: () => {
          if (reactionType === SOCIAL_REACTION_TYPE.LIKE) {
            setLiked((v) => !v);
          }
          setReactionPickerOpen(false);
        },
      },
    );
  };

  const onTogglePin = () => {
    const nextStatus = !(localPinned || post.isPinned);
    pinMut.mutate({ postId: post.id, type: 1, status: nextStatus }, {
      onSuccess: () => setLocalPinned(nextStatus),
    });
  };

  const onVotePoll = (optionId: string) => {
    votePollMut.mutate({ optionId });
  };

  const onOpenEdit = () => {
    setEditContent(post.content);
    setEditOpen(true);
  };

  const onSaveEdit = () => {
    updateMut.mutate(
      {
        id: post.id,
        payload: {
          postType: post.postType,
          postScope: post.postScope,
          content: editContent,
          imageUrl: post.imageUrl,
          communityId: post.communityId,
          taggedUserIds: [],
          isDraft: post.isDraft,
          praise: post.praise,
          pollOptions: post.poll?.options.map((option) => ({ optionText: option.optionText })),
          pollExpireAt: post.poll?.expireAt,
        },
      },
      {
        onSuccess: () => setEditOpen(false),
      },
    );
  };

  const onConfirmDelete = () => {
    deleteMut.mutate(post.id, {
      onSuccess: () => setDeleteOpen(false),
    });
  };

  const onCopyLink = () => {
    const postUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      toast({
        title: "Link copied",
        description: "Post link copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  return (
    <>
      <article
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card p-4 text-sm shadow-sm transition-all hover:border-primary/20 hover:shadow-md md:p-5",
          post.isDraft && "border-dashed border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/20",
        )}
      >
        {post.postType === PostType.PRAISE && post.praise?.details ? (
          <>
            <style>{`
              @keyframes medalRainA {
                0% {
                  transform: translateY(-56px) translateX(0) rotate(-8deg) scale(0.95);
                  opacity: 0;
                }
                12% {
                  opacity: 0.9;
                }
                100% {
                  transform: translateY(560px) translateX(18px) rotate(360deg) scale(1);
                  opacity: 0;
                }
              }

              @keyframes medalRainB {
                0% {
                  transform: translateY(-56px) translateX(0) rotate(10deg) scale(1);
                  opacity: 0;
                }
                15% {
                  opacity: 0.85;
                }
                100% {
                  transform: translateY(560px) translateX(-20px) rotate(-330deg) scale(0.96);
                  opacity: 0;
                }
              }

              .medal-animation-a {
                animation-name: medalRainA;
                animation-timing-function: cubic-bezier(0.34, 0.07, 0.28, 0.98);
                animation-iteration-count: infinite;
                will-change: transform, opacity;
              }

              .medal-animation-b {
                animation-name: medalRainB;
                animation-timing-function: cubic-bezier(0.38, 0.06, 0.26, 0.98);
                animation-iteration-count: infinite;
                will-change: transform, opacity;
              }
            `}</style>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: Math.max(16, post.praise.details.length * 6) }).map((_, idx) => {
                const detail = post.praise.details[idx % post.praise.details.length];
                const icon = pickMedalEmoji(detail?.medalIcon, idx);
                return (
                  <div
                    key={`rain-${idx}`}
                    className={cn(
                      "absolute",
                      idx % 2 === 0 ? "medal-animation-a" : "medal-animation-b",
                    )}
                    style={{
                      left: `${(idx * 11.5) % 100}%`,
                      top: "-40px",
                      opacity: 0.92,
                      animationDuration: `${6 + (idx % 5) * 0.9}s`,
                      animationDelay: `${(idx * 0.28) % 5}s`,
                    }}
                  >
                    <span
                      className="select-none"
                      style={{
                        fontSize: `${18 + (idx % 3) * 2}px`,
                        textShadow: "0 0 1px rgba(255,255,255,0.65), 0 1px 2px rgba(0,0,0,0.22)",
                        filter: "saturate(1.12) contrast(1.08)",
                      }}
                    >
                      {icon}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar className="size-10 shrink-0">
              {post.authorAvatar ? (
                <AvatarImage src={post.authorAvatar} alt={post.authorName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                {post.authorInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {formatPostDate(post.createdAt)}
                {hasCommunityName ? (
                  <>
                    <span className="mx-1">•</span>
                    {canOpenCommunity ? (
                      <Link
                        href={socialCommunityPath(String(post.communityId))}
                        className="font-medium text-primary/90 underline-offset-2 hover:text-primary hover:underline"
                        title={`Open ${communityName} community`}
                      >
                        {communityName}
                      </Link>
                    ) : (
                      <span className="font-medium text-primary/90">{communityName}</span>
                    )}
                  </>
                ) : null}
                {post.isDraft ? (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    Draft
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          {isPinnedNow || showActions ? (
            <div className="flex items-center gap-1">
              {isPinnedNow ? (
                <span
                  className="inline-flex size-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"
                  aria-label="Pinned post"
                  title="Pinned post"
                >
                  <Pin className="size-4" />
                </span>
              ) : null}
              {showActions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted"
                      aria-label="Post actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={onCopyLink}>
                      <Copy className="mr-2 size-4" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onTogglePin} disabled={pinMut.isPending}>
                      <Pin className="mr-2 size-4" />
                      {isPinnedNow ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenEdit}>
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative z-10 mt-4 space-y-4">
          <div
            className={cn(
              "rounded-lg p-3 relative overflow-hidden",
              post.postType === PostType.QUESTION
                ? "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : post.postType === PostType.PRAISE
                  ? ""
                  : "",
            )}
          >
            <PostBody content={post.content} />
          </div>
          {post.postType === PostType.PRAISE && post.praise?.details ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-none">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Achievements</span>
              {post.praise.details.map((detail, idx) => (
                <span
                  key={`${detail.userId}-${idx}`}
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-700 dark:text-amber-300"
                >
                  🏆 {detail.medalName} <span className="font-bold">+{detail.points}</span>
                </span>
              ))}
              <span className="ml-auto font-semibold text-amber-800 dark:text-amber-200">
                Total +{totalPraisePoints}
              </span>
            </div>
          ) : null}
          {post.poll ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Poll</p>
                {post.poll.expireAt ? (
                  <p className="text-[11px] text-muted-foreground">
                    Ends {formatPostDate(post.poll.expireAt)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                {pollOptions.map((option) => {
                  const selected = userVoteOptionId === option.id || option.isSelected;
                  const score = getPollOptionScore(option, totalVotes);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onVotePoll(option.id)}
                      disabled={votePollMut.isPending}
                      className={cn(
                        "relative w-full overflow-hidden rounded-md border px-3 py-2 text-left transition-all",
                        selected
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-background hover:border-primary/20 hover:bg-primary/5",
                      )}
                    >
                      {score != null ? (
                        <span
                          className="absolute inset-y-0 left-0 bg-primary/10"
                          style={{ width: `${score}%` }}
                        />
                      ) : null}
                      <span className="relative z-10 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">
                          {option.optionText}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {score != null
                            ? `${Math.round(score)}%`
                            : selected
                              ? "Selected"
                              : "Vote"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {totalVotes != null
                    ? `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`
                    : "Poll"}
                </span>
              </div>
            </div>
          ) : null}
          {post.imageUrl.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {post.imageUrl.map((url) => (
                <li key={url} className="overflow-hidden rounded-lg border border-border bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="max-h-64 max-w-full object-contain"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {!post.isDraft ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
              <div
                className="group relative"
                onMouseEnter={() => setReactionPickerOpen(true)}
                onMouseLeave={() => setReactionPickerOpen(false)}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground",
                    liked && "border-red-200 bg-red-50 text-red-500 hover:bg-red-50 hover:text-red-600",
                  )}
                  onClick={onToggleLike}
                  disabled={toggleReaction.isPending}
                  aria-pressed={liked}
                  aria-label={liked ? "Unlike" : "Like"}
                >
                  <Heart
                    className={cn(
                      "size-4",
                      liked && "fill-current text-red-500",
                    )}
                  />
                  <span className="text-xs">Like</span>
                  <span className="text-xs text-muted-foreground">({displayedLikeCount})</span>
                </Button>
                {reactionPickerOpen && (
                  <div
                    className="absolute bottom-full left-0 mb-0 z-20 flex gap-1 rounded-lg border border-border bg-card p-2 shadow-lg"
                  >
                    {REACTIONS.map((reaction) => {
                      const count = reactionCounts[reaction.key as keyof typeof reactionCounts];
                      return (
                        <button
                          key={reaction.type}
                          type="button"
                          onClick={() => onSelectReaction(reaction.type)}
                          disabled={toggleReaction.isPending}
                          className="group/reaction flex flex-col items-center gap-0.5 rounded-md p-2 hover:bg-muted transition-colors"
                          title={`${reaction.label}${count ? ` (${count})` : ''}`}
                        >
                          <span className="text-lg">{reaction.emoji}</span>
                          {count > 0 && (
                            <span className="text-[10px] font-semibold text-muted-foreground group-hover/reaction:text-foreground">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setCommentsOpen((o) => !o)}
                aria-expanded={commentsOpen}
                aria-label="Toggle comments"
              >
                <MessageCircle className="size-4" />
                <span className="text-xs">Comment</span>
                <span className="text-xs text-muted-foreground">({displayedCommentCount})</span>
              </Button>
            </div>
            {commentsOpen ? (
              <SocialPostComments postId={post.id} />
            ) : null}
          </>
        ) : null}
      </article>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit post</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-post-${post.id}`}>Content</Label>
              <Textarea
                id={`edit-post-${post.id}`}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="resize-y"
              />
            </div>
          </div>
          <SheetFooter className="border-t border-border px-4 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSaveEdit}
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The post will be removed from the feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
