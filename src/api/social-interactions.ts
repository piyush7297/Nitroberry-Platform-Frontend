import { API_ENDPOINTS } from "@/api/endpoints";
import { ReactionTarget, ReactionType } from "@/lib/enums/social.enum";

/** Reactions: POST /social/reactions/toggle */
export const SOCIAL_REACTIONS_TOGGLE = API_ENDPOINTS.SOCIAL_REACTIONS_TOGGLE;

/** Comments: CRUD under /social/comments */
export const SOCIAL_COMMENTS_BASE = API_ENDPOINTS.SOCIAL_COMMENTS;

export const socialCommentsForPostUrl = (postId: string) =>
  `${SOCIAL_COMMENTS_BASE}/post/${postId}`;

export const socialCommentByIdUrl = (id: string) =>
  `${SOCIAL_COMMENTS_BASE}/${id}`;

/** Payload for toggle (align enums with backend). */
export type SocialReactionTogglePayload = {
  type: number;
  targetType: number;
  targetId: string;
};

/** Default “like” style reaction on a post (from your example). */
export const SOCIAL_REACTION_TYPE = {
  LIKE: ReactionType.LIKE,
} as const;

/** targetType for posts. */
export const SOCIAL_REACTION_TARGET_TYPE = {
  POST: ReactionTarget.POST,
} as const;

export type SocialCommentPayload = {
  postId: string;
  content: string;
  /** Omit or null for top-level comments. */
  parentId?: string | null;
};

export type SocialComment = {
  id: string;
  postId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  authorName: string;
  authorId: string | null;
  authorAvatar: string | null;
  authorInitials: string;
};

function buildInitialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function pickCommentAuthorId(o: Record<string, unknown>): string | null {
  if (o.userId != null) return String(o.userId);
  if (o.authorId != null) return String(o.authorId);
  const user = o.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    if (u.id != null) return String(u.id);
  }
  return null;
}

function pickCommentAuthorName(o: Record<string, unknown>): string {
  const user = o.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    const firstName =
      u.firstName != null ? String(u.firstName).trim() : "";
    const lastName = u.lastName != null ? String(u.lastName).trim() : "";
    const fullFromParts = `${firstName} ${lastName}`.trim();
    if (fullFromParts) return fullFromParts;

    const name =
      u.name ?? u.fullName ?? u.displayName ?? u.email ?? u.username;
    if (name != null && String(name).trim()) return String(name);
  }
  return String(o.authorName ?? o.userName ?? "Member");
}

function pickCommentAuthorAvatar(o: Record<string, unknown>): string | null {
  const user = o.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    const avatar = u.avatar ?? u.avatarUrl ?? u.image ?? u.photo;
    if (avatar != null && String(avatar).trim()) return String(avatar);
  }

  const fallback = o.avatar ?? o.avatarUrl;
  if (fallback != null && String(fallback).trim()) return String(fallback);
  return null;
}

export function normalizeSocialComment(
  raw: unknown,
  options?: { parentId?: string | null; postId?: string },
): SocialComment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.id == null) return null;
  const parent = o.parentId ?? options?.parentId;
  const postId = o.postId ?? options?.postId;
  const authorName = pickCommentAuthorName(o);
  return {
    id: String(o.id),
    postId: String(postId ?? ""),
    content: String(o.content ?? ""),
    parentId:
      parent === undefined || parent === null || parent === ""
        ? null
        : String(parent),
    createdAt:
      o.createdAt != null
        ? String(o.createdAt)
        : o.updatedAt != null
          ? String(o.updatedAt)
          : "",
    authorName,
    authorId: pickCommentAuthorId(o),
    authorAvatar: pickCommentAuthorAvatar(o),
    authorInitials: buildInitialsFromName(authorName),
  };
}

function collectThreadedComments(
  source: unknown,
  acc: SocialComment[],
  seenIds: Set<string>,
  options?: { parentId?: string | null; postId?: string },
) {
  const normalized = normalizeSocialComment(source, options);
  if (!normalized) return;

  if (!seenIds.has(normalized.id)) {
    acc.push(normalized);
    seenIds.add(normalized.id);
  }

  const node = source as Record<string, unknown>;
  const replies = node.replies;
  if (!Array.isArray(replies) || replies.length === 0) return;

  for (const reply of replies) {
    collectThreadedComments(reply, acc, seenIds, {
      parentId: normalized.id,
      postId: normalized.postId || options?.postId,
    });
  }
}

function normalizeThreadedComments(list: unknown[]): SocialComment[] {
  const acc: SocialComment[] = [];
  const seenIds = new Set<string>();
  for (const item of list) {
    collectThreadedComments(item, acc, seenIds);
  }
  return acc;
}

export function normalizeSocialCommentsList(res: unknown): SocialComment[] {
  if (!res) return [];
  if (Array.isArray(res)) {
    return normalizeThreadedComments(res);
  }
  if (typeof res === "object") {
    const r = res as Record<string, unknown>;
    const d = r.data;
    if (Array.isArray(d)) {
      return normalizeThreadedComments(d);
    }
    if (d && typeof d === "object") {
      const inner = d as Record<string, unknown>;
      const list =
        inner.comments ?? inner.items ?? inner.rows ?? inner.data;
      if (Array.isArray(list)) {
        return normalizeThreadedComments(list);
      }
    }
  }
  return [];
}

export const SOCIAL_COMMENT_QUERY_KEYS = {
  all: ["social-comments"] as const,
  byPost: (postId: string) =>
    [...SOCIAL_COMMENT_QUERY_KEYS.all, "post", postId] as const,
};
