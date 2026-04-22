import { API_ENDPOINTS } from "@/api/endpoints";
import { ReactionType } from "@/lib/enums/social.enum";

export const SOCIAL_POSTS_BASE = API_ENDPOINTS.SOCIAL_POSTS;

export const socialPostUrl = (id: string) => `${SOCIAL_POSTS_BASE}/${id}`;

/** GET /social/posts/me — `status` filters drafts vs published (backend-defined; 0 = drafts per API docs). */
export const socialPostsMeUrl = `${SOCIAL_POSTS_BASE}/me`;
export const socialPostMedalsUrl = `${SOCIAL_POSTS_BASE}/medals`;
export const socialPostMedalsLeaderboardUrl = `${socialPostMedalsUrl}/leaderboard`;
export const socialPostMedalsSummaryUrl = (userId: string) =>
  `${socialPostMedalsUrl}/summary/${userId}`;
export const socialPostMedalsHistoryUrl = (userId: string) =>
  `${socialPostMedalsUrl}/history/${userId}`;
export const socialPostPinnedListUrl = (params: {
  type: number;
  communityId: string;
}) =>
  `${SOCIAL_POSTS_BASE}/pinned?type=${params.type}&communityId=${encodeURIComponent(params.communityId)}`;
export const socialPostPinUrl = (id: string) => `${socialPostUrl(id)}/pin`;
export const socialPostPollVotesUrl = (id: string) => `${socialPostUrl(id)}/poll/votes`;
export const socialPostPollVoteUrl = (id: string) => `${socialPostUrl(id)}/poll/vote`;

export type SocialPostPayload = {
  postType: number;
  postScope: number;
  content: string;
  imageUrl: string[];
  communityId: string | null;
  taggedUserIds: string[];
  isDraft: boolean;
  praise?: {
    userIds: string[];
    medalIds: string[];
  };
  pollOptions?: Array<{
    optionText: string;
  }>;
  pollExpireAt?: string | null;
};

/** Normalized post for UI (flexible vs API shape). */
export type SocialPost = {
  id: string;
  postType: number;
  postScope: number;
  content: string;
  imageUrl: string[];
  communityId: string | null;
  communityName?: string | null;
  isDraft: boolean;
  isPinned: boolean;
  isLiked: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  authorInitials: string;
  /** When the API sends author id, used to scope edit/delete to the owner. */
  authorId: string | null;
  metrics?: {
    likeCount: number;
    loveCount: number;
    wowCount: number;
    hahaCount: number;
    sadCount: number;
    angryCount: number;
    commentCount: number;
    totalReactions: number;
  };
  praise?: {
    userIds: string[];
    medalIds: string[];
    details?: Array<{
      userId: string;
      userName: string;
      medalName: string;
      medalIcon: string;
      points: number;
    }>;
  };
  poll?: {
    options: SocialPollOption[];
    expireAt: string | null;
    totalVotes: number | null;
    userVoteOptionId: string | null;
  };
};

export type SocialPollOption = {
  id: string;
  optionText: string;
  voteCount: number | null;
  percentage: number | null;
  isSelected: boolean;
};

export type SocialPostPollVotes = {
  options: SocialPollOption[];
  totalVotes: number | null;
  userVoteOptionId: string | null;
};

export type SocialMedal = {
  id: string;
  name: string;
  points: number;
  emoji: string;
  toneClass: string;
};

export type SocialMedalLeaderboardRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  rank: number;
  badge: string;
  highlight: string;
};

export type SocialMedalUserSummary = {
  totalPoints: number;
  earnedFlairs: Array<{
    flairId: string;
    count: number;
  }>;
};

export type SocialMedalHistoryItem = {
  id: string;
  medalId: string;
  medalName: string;
  points: number;
  createdAt: string;
  sourceText: string;
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

function pickAuthorId(o: Record<string, unknown>): string | null {
  if (o.userId != null) return String(o.userId);
  if (o.authorId != null) return String(o.authorId);
  if (o.createdBy != null) return String(o.createdBy);
  if (o.author && typeof o.author === "object") {
    const a = o.author as Record<string, unknown>;
    if (a.id != null) return String(a.id);
  }
  const user = o.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    if (u.id != null) return String(u.id);
  }
  return null;
}

function pickAuthorName(o: Record<string, unknown>): string {
  const author = o.author;
  if (author && typeof author === "object") {
    const a = author as Record<string, unknown>;
    const first = a.firstName != null ? String(a.firstName) : "";
    const last = a.lastName != null ? String(a.lastName) : "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    const name =
      a.name ?? a.fullName ?? a.displayName ?? a.email ?? a.username;
    if (name != null && String(name).trim()) return String(name);
  }
  const user = o.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    const name =
      u.name ?? u.fullName ?? u.displayName ?? u.email ?? u.username;
    if (name != null && String(name).trim()) return String(name);
    const first = u.firstName != null ? String(u.firstName) : "";
    const last = u.lastName != null ? String(u.lastName) : "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
  }
  const direct =
    o.authorName ?? o.author ?? o.createdByName ?? o.userName ?? "Member";

  if (direct && typeof direct === "object") {
    const a = direct as Record<string, unknown>;
    const name =
      a.name ?? a.fullName ?? a.displayName ?? a.email ?? a.username;
    if (name != null && String(name).trim()) return String(name);
  }

  if (direct == null) return "Member";
  return typeof direct === "string" ? direct : String(direct);
}

function pickCommunityName(o: Record<string, unknown>): string | null {
  if (o.communityName != null && String(o.communityName).trim()) {
    return String(o.communityName).trim();
  }

  const community = o.community;
  if (community && typeof community === "object") {
    const c = community as Record<string, unknown>;
    if (c.name != null && String(c.name).trim()) {
      return String(c.name).trim();
    }
  }

  return null;
}

function pickAuthorAvatar(o: Record<string, unknown>): string | null {
  const author = o.author;
  if (author && typeof author === "object") {
    const a = author as Record<string, unknown>;
    const avatar = a.avatar ?? a.avatarUrl ?? a.image ?? a.photo;
    if (avatar != null && String(avatar).trim()) return String(avatar);
  }

  const user = o.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    const avatar = u.avatar ?? u.avatarUrl ?? u.image ?? u.photo;
    if (avatar != null && String(avatar).trim()) return String(avatar);
  }

  const fallback = o.avatar ?? o.avatarUrl;
  if (fallback != null && String(fallback).trim()) return String(fallback);
  const imageUrl = o.imageUrl;
  if (imageUrl != null && String(imageUrl).trim()) return String(imageUrl);
  return null;
}

function isUsefulIcon(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > 1) return true;
  return /\p{Extended_Pictographic}/u.test(trimmed);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizePollOption(raw: unknown): SocialPollOption | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o.optionId ?? o.pollOptionId ?? o.value;
  const text = o.optionText ?? o.text ?? o.label ?? o.name;
  if (id == null && text == null) return null;
  const voteCount = o.voteCount ?? o.votes ?? o.count;
  const percentage = o.percentage ?? o.percent;
  return {
    id: String(id ?? text ?? ""),
    optionText: String(text ?? ""),
    voteCount:
      voteCount === undefined || voteCount === null ? null : Number(voteCount),
    percentage:
      percentage === undefined || percentage === null ? null : Number(percentage),
    isSelected: Boolean(o.isSelected ?? o.selected ?? o.hasVoted ?? o.isUserVote),
  };
}

function normalizePraiseFromDetails(raw: unknown): SocialPost["praise"] {
  if (!Array.isArray(raw)) return undefined;

  const userIds = new Set<string>();
  const medalIds = new Set<string>();
  const details: Array<{
    userId: string;
    userName: string;
    medalName: string;
    medalIcon: string;
    points: number;
  }> = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const user = o.user;
    const userId = user && typeof user === "object" ? String((user as Record<string, unknown>).id ?? "") : "";
    const firstName = user && typeof user === "object" ? String((user as Record<string, unknown>).firstName ?? "") : "";
    const lastName = user && typeof user === "object" ? String((user as Record<string, unknown>).lastName ?? "") : "";
    const userName = `${firstName} ${lastName}`.trim();

    if (userId) userIds.add(userId);

    const medal = o.medal;
    if (medal && typeof medal === "object") {
      const m = medal as Record<string, unknown>;
      const medalId = m.id != null ? String(m.id) : "";
      const medalName = String(m.name ?? "");
      const medalIcon = String(m.icon ?? "🏅");
      const points = Number(o.points ?? 0);

      if (medalId) medalIds.add(medalId);
      if (userId && medalName) {
        details.push({
          userId,
          userName,
          medalName,
          medalIcon,
          points,
        });
      }
    }
  }

  if (userIds.size === 0 && medalIds.size === 0) return undefined;
  return {
    userIds: Array.from(userIds),
    medalIds: Array.from(medalIds),
    details: details.length > 0 ? details : undefined,
  };
}

function normalizePoll(raw: unknown): SocialPost["poll"] {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const options = raw
      .map(normalizePollOption)
      .filter((x): x is SocialPollOption => x !== null);
    return {
      options,
      expireAt: null,
      totalVotes: null,
      userVoteOptionId: null,
    };
  }
  if (typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const optionsSource =
    o.options ?? o.pollOptions ?? o.postPollOptions ?? o.items ?? o.rows ?? o.data ?? [];
  const options = Array.isArray(optionsSource)
    ? optionsSource
      .map(normalizePollOption)
      .filter((x): x is SocialPollOption => x !== null)
    : [];
  const expireAt = o.expireAt ?? o.pollExpireAt ?? o.endsAt ?? o.endAt ?? null;
  const totalVotesRaw = o.totalVotes ?? o.voteCount ?? o.votes ?? null;
  const userVoteOptionIdRaw =
    o.userVoteOptionId ?? o.selectedOptionId ?? o.myVoteOptionId ?? null;
  const derivedTotalVotes =
    totalVotesRaw == null
      ? options.reduce((sum, option) => sum + Number(option.voteCount ?? 0), 0)
      : Number(totalVotesRaw);
  const derivedUserVoteOptionId =
    userVoteOptionIdRaw == null
      ? (options.find((option) => option.isSelected)?.id ?? null)
      : String(userVoteOptionIdRaw);
  return {
    options,
    expireAt: expireAt === null || expireAt === undefined ? null : String(expireAt),
    totalVotes: Number.isFinite(derivedTotalVotes) ? derivedTotalVotes : null,
    userVoteOptionId: derivedUserVoteOptionId,
  };
}

function parseLikedState(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw > 0 : null;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (["true", "1", "liked", "like", String(ReactionType.LIKE)].includes(v)) return true;
    if (["false", "0", "none", "unliked"].includes(v)) return false;
    const n = Number(v);
    if (Number.isFinite(n)) return n > 0;
    return null;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return parseLikedState(
      o.isLiked ??
      o.liked ??
      o.hasLiked ??
      o.type ??
      o.reactionType ??
      o.value ??
      o.reactionId ??
      o.id,
    );
  }
  return null;
}

export function normalizeSocialPostPollVotes(res: unknown): SocialPostPollVotes {
  const source =
    res && typeof res === "object" && "data" in res
      ? ((res as { data?: unknown }).data ?? res)
      : res;

  if (!source || typeof source !== "object") {
    return { options: [], totalVotes: null, userVoteOptionId: null };
  }

  const o = source as Record<string, unknown>;
  const voteList = o.voteList;

  if (voteList && typeof voteList === "object" && !Array.isArray(voteList)) {
    const entries = Object.entries(voteList as Record<string, unknown>);
    const options = entries.map(([optionText, value]) => {
      const node = value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
      const total = node.total;
      const voters = Array.isArray(node.voters) ? node.voters : [];
      return {
        id: optionText,
        optionText,
        voteCount: total == null ? 0 : Number(total),
        percentage: null,
        isSelected: voters.length > 0,
      } as SocialPollOption;
    });

    const totalVotes = options.reduce((sum, option) => sum + Number(option.voteCount ?? 0), 0);
    const userVoteOptionId = options.find((option) => option.isSelected)?.id ?? null;

    return {
      options,
      totalVotes,
      userVoteOptionId,
    };
  }

  const optionsSource =
    o.options ?? o.pollOptions ?? o.postPollOptions ?? o.items ?? o.rows ?? o.data ?? [];
  const options = Array.isArray(optionsSource)
    ? optionsSource
      .map(normalizePollOption)
      .filter((x): x is SocialPollOption => x !== null)
    : [];

  const totalVotesRaw = o.totalVotes ?? o.voteCount ?? o.votes ?? null;
  const userVoteOptionIdRaw =
    o.userVoteOptionId ?? o.selectedOptionId ?? o.myVoteOptionId ?? null;
  const derivedTotalVotes =
    totalVotesRaw == null
      ? options.reduce((sum, option) => sum + Number(option.voteCount ?? 0), 0)
      : Number(totalVotesRaw);
  const derivedUserVoteOptionId =
    userVoteOptionIdRaw == null
      ? (options.find((option) => option.isSelected)?.id ?? null)
      : String(userVoteOptionIdRaw);

  return {
    options,
    totalVotes: Number.isFinite(derivedTotalVotes) ? derivedTotalVotes : null,
    userVoteOptionId: derivedUserVoteOptionId,
  };
}

export function normalizeSocialPost(raw: unknown): SocialPost | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.id === undefined || o.id === null) return null;
  const images = o.imageUrl;
  const contentRaw = o.content;
  const content =
    typeof contentRaw === "string"
      ? contentRaw
      : contentRaw && typeof contentRaw === "object"
        ? JSON.stringify(contentRaw)
        : String(contentRaw ?? "");

  const m = o.metrics;
  const metrics =
    m && typeof m === "object"
      ? {
        likeCount: Number((m as any).likeCount ?? 0),
        loveCount: Number((m as any).loveCount ?? 0),
        wowCount: Number((m as any).wowCount ?? 0),
        hahaCount: Number((m as any).hahaCount ?? 0),
        sadCount: Number((m as any).sadCount ?? 0),
        angryCount: Number((m as any).angryCount ?? 0),
        commentCount: Number((m as any).commentCount ?? 0),
        totalReactions: Number((m as any).totalReactions ?? 0),
      }
      : undefined;
  const isLiked =
    parseLikedState(
      o.isLiked ??
      o.liked ??
      o.hasLiked ??
      o.userHasLiked ??
      o.isReacted ??
      o.reacted ??
      o.userReactionId ??
      o.myReactionType ??
      o.myReaction ??
      o.reaction ??
      (m && typeof m === "object"
        ? (m as Record<string, unknown>).isLiked ??
        (m as Record<string, unknown>).hasLiked ??
        (m as Record<string, unknown>).isReacted ??
        (m as Record<string, unknown>).myReactionType ??
        (m as Record<string, unknown>).userReactionId
        : null),
    ) ?? false;
  const authorName = pickAuthorName(o);
  const praise =
    o.praise && typeof o.praise === "object"
      ? {
        userIds: parseStringArray((o.praise as Record<string, unknown>).userIds),
        medalIds: parseStringArray((o.praise as Record<string, unknown>).medalIds),
      }
      : normalizePraiseFromDetails(o.praiseDetails);
  const poll = normalizePoll(
    o.poll ?? o.pollData ?? o.pollResult ?? o.pollOptions ?? o.postPollOptions,
  );
  return {
    id: String(o.id),
    postType: Number(o.postType ?? 0),
    postScope: Number(o.postScope ?? 1),
    content,
    imageUrl: Array.isArray(images)
      ? images.filter((x): x is string => typeof x === "string")
      : [],
    communityId:
      o.communityId === undefined || o.communityId === null
        ? null
        : String(o.communityId),
    communityName: pickCommunityName(o),
    isDraft: Boolean(o.isDraft),
    isPinned: Boolean(o.isPinned ?? o.pinned ?? o.pinnedAt),
    isLiked,
    createdAt:
      o.createdAt != null
        ? String(o.createdAt)
        : o.updatedAt != null
          ? String(o.updatedAt)
          : o.pinnedAt != null
            ? String(o.pinnedAt)
            : "",
    authorName,
    authorAvatar: pickAuthorAvatar(o),
    authorInitials: buildInitialsFromName(authorName),
    authorId: pickAuthorId(o),
    metrics,
    praise,
    poll,
  };
}

export function normalizeSocialPostsList(res: unknown): SocialPost[] {
  if (!res) return [];
  if (Array.isArray(res)) {
    return res
      .map(normalizeSocialPost)
      .filter((x): x is SocialPost => x !== null);
  }
  if (typeof res === "object") {
    const r = res as Record<string, unknown>;
    const d = r.data;
    if (Array.isArray(d)) {
      return d
        .map(normalizeSocialPost)
        .filter((x): x is SocialPost => x !== null);
    }
    if (d && typeof d === "object") {
      const inner = d as Record<string, unknown>;
      const list =
        inner.posts ?? inner.items ?? inner.rows ?? inner.records ?? inner.data;
      if (Array.isArray(list)) {
        return list
          .map(normalizeSocialPost)
          .filter((x): x is SocialPost => x !== null);
      }
    }
  }
  return [];
}

function pickValue<T>(obj: Record<string, unknown>, keys: string[]): T | null {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return null;
}

function medalToneFromName(name: string): string {
  const key = name.toLowerCase();
  if (key.includes("top") || key.includes("winner") || key.includes("champ")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (key.includes("team") || key.includes("collab")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (key.includes("learn") || key.includes("grow")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (key.includes("solve") || key.includes("problem")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
}

function medalEmojiFromName(name: string): string {
  const key = name.toLowerCase();
  if (key.includes("top") || key.includes("winner") || key.includes("champ")) {
    return "🏆";
  }
  if (key.includes("team") || key.includes("collab")) return "🤝";
  if (key.includes("learn") || key.includes("grow")) return "🌱";
  if (key.includes("solve") || key.includes("problem")) return "🧩";
  return "🚀";
}

export function normalizeSocialMedalsList(res: unknown): SocialMedal[] {
  const list =
    Array.isArray(res)
      ? res
      : res && typeof res === "object" && "data" in res
        ? (res as { data?: unknown }).data
        : null;

  const rows =
    Array.isArray(list)
      ? list
      : list && typeof list === "object"
        ? (pickValue<unknown[]>(list as Record<string, unknown>, [
          "items",
          "rows",
          "records",
          "medals",
          "data",
        ]) ?? [])
        : [];

  return rows
    .map((item): SocialMedal | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = pickValue<string | number>(o, ["id", "medalId", "key", "code"]);
      if (id == null) return null;
      const name = String(
        pickValue<string | number>(o, ["name", "title", "label", "medalName"]) ??
        "Achievement",
      );
      const points = Number(
        pickValue<string | number>(o, ["points", "score", "value"]) ?? 0,
      );
      const emojiRaw = pickValue<string>(o, ["emoji", "icon"]);
      const emoji = emojiRaw && String(emojiRaw).trim()
        && isUsefulIcon(emojiRaw)
        ? String(emojiRaw)
        : medalEmojiFromName(name);
      const toneClass = String(
        pickValue<string>(o, ["toneClass", "tone", "themeClass"]) ??
        medalToneFromName(name),
      );
      return {
        id: String(id),
        name,
        points: Number.isFinite(points) ? points : 0,
        emoji,
        toneClass,
      };
    })
    .filter((x): x is SocialMedal => x !== null);
}

export function normalizeSocialMedalsLeaderboard(
  res: unknown,
): SocialMedalLeaderboardRow[] {
  const list =
    Array.isArray(res)
      ? res
      : res && typeof res === "object" && "data" in res
        ? (res as { data?: unknown }).data
        : null;
  const rows =
    Array.isArray(list)
      ? list
      : list && typeof list === "object"
        ? (pickValue<unknown[]>(list as Record<string, unknown>, [
          "items",
          "rows",
          "records",
          "leaderboard",
          "users",
          "data",
        ]) ?? [])
        : [];

  return rows
    .map((item, index): SocialMedalLeaderboardRow | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = pickValue<string | number>(o, ["id", "userId"]);
      if (id == null) return null;
      const first = String(pickValue<string | number>(o, ["firstName"]) ?? "").trim();
      const last = String(pickValue<string | number>(o, ["lastName"]) ?? "").trim();
      const fullFromParts = `${first} ${last}`.trim();
      const name =
        fullFromParts ||
        String(
          pickValue<string | number>(o, [
            "name",
            "fullName",
            "displayName",
            "username",
            "email",
          ]) ?? "Member",
        );
      const points = Number(
        pickValue<string | number>(o, ["points", "totalPoints", "score"]) ?? 0,
      );
      const medalCount = Number(
        pickValue<string | number>(o, ["medalCount", "count", "totalMedals"]) ?? 0,
      );
      const rankRaw = Number(pickValue<string | number>(o, ["rank", "position"]) ?? 0);
      const rank = Number.isFinite(rankRaw) && rankRaw > 0 ? rankRaw : index + 1;
      const avatarRaw = pickValue<string>(o, ["avatar", "avatarUrl", "image", "photo"]);
      return {
        id: String(id),
        name,
        avatarUrl: avatarRaw && String(avatarRaw).trim() ? String(avatarRaw) : null,
        points: Number.isFinite(points) ? points : 0,
        rank,
        badge: medalCount > 0 ? `${medalCount} medal${medalCount === 1 ? "" : "s"}` : "Contributor",
        highlight: String(
          pickValue<string | number>(o, ["highlight", "subtitle", "description"]) ??
          `${points} points collected`,
        ),
      };
    })
    .filter((x): x is SocialMedalLeaderboardRow => x !== null);
}

export function normalizeSocialMedalUserSummary(
  res: unknown,
): SocialMedalUserSummary {
  const source =
    res && typeof res === "object" && "data" in res
      ? ((res as { data?: unknown }).data ?? res)
      : res;

  if (!source || typeof source !== "object") {
    return { totalPoints: 0, earnedFlairs: [] };
  }

  const o = source as Record<string, unknown>;
  const totalPoints = Number(
    pickValue<string | number>(o, ["totalPoints", "points", "score"]) ?? 0,
  );

  const earnedRaw =
    pickValue<unknown[]>(o, ["breakdown", "earnedFlairs", "medals", "summary", "items", "data"]) ?? [];

  const earnedFlairs = Array.isArray(earnedRaw)
    ? earnedRaw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const flairId = pickValue<string | number>(r, ["flairId", "medalId", "id", "name"]);
        if (flairId == null) return null;
        const count = Number(
          pickValue<string | number>(r, ["count", "medalCount", "total", "value"]) ?? 0,
        );
        return {
          flairId: String(flairId),
          count: Number.isFinite(count) ? count : 0,
        };
      })
      .filter((x): x is { flairId: string; count: number } => x !== null)
    : [];

  return {
    totalPoints: Number.isFinite(totalPoints) ? totalPoints : 0,
    earnedFlairs,
  };
}

export function normalizeSocialMedalHistory(
  res: unknown,
): SocialMedalHistoryItem[] {
  const pickHistoryRows = (input: unknown, depth = 0): unknown[] => {
    if (Array.isArray(input)) {
      return input;
    }
    if (!input || typeof input !== "object" || depth > 3) {
      return [];
    }

    const obj = input as Record<string, unknown>;
    const directKeys = ["history", "items", "rows", "records", "medals"];

    for (const key of directKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    if (obj.data !== undefined && obj.data !== null) {
      return pickHistoryRows(obj.data, depth + 1);
    }

    return [];
  };

  const rows = pickHistoryRows(res);

  return rows
    .map((item): SocialMedalHistoryItem | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const medalObj =
        (o.medal && typeof o.medal === "object"
          ? (o.medal as Record<string, unknown>)
          : o.medals && typeof o.medals === "object"
            ? (o.medals as Record<string, unknown>)
            : null);
      const senderObj =
        o.sender && typeof o.sender === "object"
          ? (o.sender as Record<string, unknown>)
          : null;
      const id = pickValue<string | number>(o, ["id", "historyId", "eventId"]);
      const medalId =
        pickValue<string | number>(o, ["medalId", "flairId"]) ??
        (medalObj ? pickValue<string | number>(medalObj, ["id", "medalId", "flairId"]) : null) ??
        (medalObj ? pickValue<string | number>(medalObj, ["name", "title", "label"]) : null) ??
        pickValue<string | number>(o, ["name"]);
      if (medalId == null) return null;

      const senderName = senderObj
        ? pickValue<string | number>(senderObj, ["name", "fullName", "displayName"])
        : null;
      return {
        id: String(id ?? medalId),
        medalId: String(medalId),
        medalName: String(
          pickValue<string | number>(o, ["medalName", "name", "title", "label"]) ??
          (medalObj
            ? pickValue<string | number>(medalObj, ["name", "title", "label"])
            : null) ??
          "Achievement",
        ),
        points: Number(
          pickValue<string | number>(o, ["points", "score", "value"]) ?? 0,
        ),
        createdAt: String(
          pickValue<string | number>(o, ["createdAt", "date", "awardedAt", "timestamp"]) ??
          "",
        ),
        sourceText: String(
          pickValue<string | number>(o, ["sourceText", "reason", "description"]) ??
          (senderName ? `Awarded by ${String(senderName)}` : null) ??
          "Medal awarded",
        ),
      };
    })
    .filter((x): x is SocialMedalHistoryItem => x !== null);
}

export const SOCIAL_POST_QUERY_KEYS = {
  all: ["social-posts"] as const,
  list: () => [...SOCIAL_POST_QUERY_KEYS.all, "list"] as const,
  mine: (status: number) =>
    [...SOCIAL_POST_QUERY_KEYS.all, "me", status] as const,
  detail: (id: string) => [...SOCIAL_POST_QUERY_KEYS.all, "detail", id] as const,
  medals: () => [...SOCIAL_POST_QUERY_KEYS.all, "medals"] as const,
  medalsLeaderboard: () =>
    [...SOCIAL_POST_QUERY_KEYS.all, "medals", "leaderboard"] as const,
  medalsSummary: (userId: string) =>
    [...SOCIAL_POST_QUERY_KEYS.all, "medals", "summary", userId] as const,
  medalsHistory: (userId: string) =>
    [...SOCIAL_POST_QUERY_KEYS.all, "medals", "history", userId] as const,
};
