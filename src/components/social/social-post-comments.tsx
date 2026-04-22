"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format, isValid, parseISO } from "date-fns";
import { Loader2, Reply, Smile, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SocialComment } from "@/api/social-interactions";
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  usePostCommentsQuery,
} from "@/hooks/use-social-interactions";
import { cn } from "@/lib/utils";

const COMMENT_EMOJIS = ["😀", "😂", "😍", "🔥", "👏", "🙌", "👍", "🎉"];

function formatCommentDate(iso: string) {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, "MMM d, h:mm a");
}

function buildCommentTree(comments: SocialComment[]) {
  const byParent = new Map<string | null, SocialComment[]>();
  for (const c of comments) {
    const key = c.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  return byParent;
}

function CommentBlock({
  comment,
  depth,
  byParent,
  sessionUserId,
  onReply,
  onDelete,
  deletingId,
}: {
  comment: SocialComment;
  depth: number;
  byParent: Map<string | null, SocialComment[]>;
  sessionUserId: string | undefined;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const children = byParent.get(comment.id) ?? [];
  const canDelete =
    sessionUserId &&
    comment.authorId != null &&
    comment.authorId === sessionUserId;

  return (
    <div
      className={cn("space-y-2", depth > 0 && "mt-3")}
      style={{ marginLeft: depth > 0 ? Math.min(depth * 12, 48) : 0 }}
    >
      <div className="group overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/30 hover:shadow-sm">
        <div className="space-y-3 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <Avatar className="mt-0.5 size-8 shrink-0">
                {comment.authorAvatar ? (
                  <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-[11px] font-bold text-primary">
                  {comment.authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCommentDate(comment.createdAt)}
                  </span>
                </div>
                {depth > 0 && (
                  <div className="mt-1 text-xs text-primary/70 font-medium">
                    Reply to thread
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Reply"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="size-4" />
              </Button>
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-md text-destructive/70 hover:bg-red-50 hover:text-destructive"
                  aria-label="Delete comment"
                  onClick={() => onDelete(comment.id)}
                  disabled={deletingId === comment.id}
                >
                  {deletingId === comment.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {comment.content}
          </p>
        </div>
      </div>
      {children.length > 0 && (
        <div className="border-l-2 border-border/40 pl-0">
          {children.map((ch) => (
            <CommentBlock
              key={ch.id}
              comment={ch}
              depth={depth + 1}
              byParent={byParent}
              sessionUserId={sessionUserId}
              onReply={onReply}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SocialPostComments({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  const sessionUserId =
    sessionUser?.id != null ? String(sessionUser.id) : undefined;

  const { data: comments = [], isLoading } = usePostCommentsQuery(postId);
  const createMut = useCreateCommentMutation(postId);
  const deleteMut = useDeleteCommentMutation(postId);

  const [body, setBody] = useState("");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const byParent = useMemo(() => buildCommentTree(comments), [comments]);
  const roots = byParent.get(null) ?? [];

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    const payload: {
      postId: string;
      content: string;
      parentId?: string;
    } = { postId, content: text };
    if (replyParentId) payload.parentId = replyParentId;
    createMut.mutate(payload, {
      onSuccess: () => {
        setBody("");
        setReplyParentId(null);
      },
    });
  };

  const onDelete = (id: string) => {
    setDeletingId(id);
    deleteMut.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  };

  const onAddEmoji = (emoji: string) => {
    setBody((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
  };

  return (
    <div className="mt-5 space-y-4 border-t border-border/60 pt-4">
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading comments…</span>
        </div>
      ) : roots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roots.map((c) => (
            <CommentBlock
              key={c.id}
              comment={c}
              depth={0}
              byParent={byParent}
              sessionUserId={sessionUserId}
              onReply={(id) => {
                setReplyParentId(id);
                setBody("");
              }}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-border/50 pt-3">
        {replyParentId ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/8 px-3 py-2">
            <span className="text-xs font-medium text-primary">Replying to thread</span>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              onClick={() => setReplyParentId(null)}
            >
              Cancel
            </button>
          </div>
        ) : null}
        <Textarea
          placeholder={replyParentId ? "Write your reply…" : "Share your thoughts or ask a question…"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="min-h-[80px] resize-y border-border/60 bg-background/70 text-sm placeholder:text-muted-foreground/60"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setEmojiOpen((v) => !v)}
              aria-label="Add emoji"
            >
              <Smile className="size-4" />
            </Button>
            {emojiOpen ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 flex items-center gap-1 rounded-lg border border-border bg-card p-2 shadow-md">
                {COMMENT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded-md p-1 text-base leading-none hover:bg-muted"
                    onClick={() => onAddEmoji(emoji)}
                    aria-label={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            {replyParentId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReplyParentId(null)}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={createMut.isPending || !body.trim()}
              className="min-w-[100px]"
            >
              {createMut.isPending ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Posting
                </>
              ) : replyParentId ? (
                "Reply"
              ) : (
                "Comment"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
