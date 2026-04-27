import { API_ENDPOINTS } from "@/api/endpoints";

export const SOCIAL_COMMUNITIES_BASE = "social/communities";

export const SOCIAL_COMMUNITIES_EXPLORE =
  API_ENDPOINTS.SOCIAL_COMMUNITIES_EXPLORE ?? "social/communities/explore";
export const SOCIAL_COMMUNITIES_JOINED =
  API_ENDPOINTS.SOCIAL_COMMUNITIES_JOINED ?? "social/communities/joined";
export const SOCIAL_COMMUNITIES_REQUEST =
  API_ENDPOINTS.SOCIAL_COMMUNITIES_REQUEST ?? "social/communities/request";

export const socialCommunityDetailUrl = (id: string) =>
  `${SOCIAL_COMMUNITIES_BASE}/${id}`;
export const socialCommunityMembersUrl = (communityId: string) =>
  `${SOCIAL_COMMUNITIES_BASE}/${communityId}/members`;
export const socialCommunityMemberDetailUrl = (communityId: string, userId: string) =>
  `${SOCIAL_COMMUNITIES_BASE}/${communityId}/members/${userId}`;
export const socialCommunityRequestsUrl = (communityId: string) =>
  `${SOCIAL_COMMUNITIES_BASE}/${communityId}/requests`;
export const socialCommunityRequestStatusUrl = (requestId: string) =>
  `${SOCIAL_COMMUNITIES_BASE}/request/${requestId}/status`;
export const socialCommunitiesFavoritesUrl = (communityId?: string) =>
  `${SOCIAL_COMMUNITIES_BASE}/favorites${communityId ? `?communityId=${encodeURIComponent(communityId)}` : ""
  }`;
export const socialCommunityFavoriteUrl = (communityId: string) =>
  `${SOCIAL_COMMUNITIES_BASE}/${communityId}/favorite`;

export type SocialCommunityCreateMember = {
  userId: string;
  role: number;
};

export type SocialCommunityCreatePayload = {
  name: string;
  description: string;
  isPrivate: boolean;
  members?: SocialCommunityCreateMember[];
};

export type SocialCommunityUpdatePayload = Partial<{
  name: string;
  description: string;
  isPrivate: boolean;
  members: SocialCommunityCreateMember[];
}>;

export type SocialCommunity = {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  /** Whether current user is an admin/owner of this community. */
  isAdmin?: boolean;
  /** Whether current user is a member (from explore/joined list shape). */
  isMember?: boolean;
  /** Join request status (backend enum; e.g. 1 = approved/joined in your sample). */
  requestStatus?: number | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  /** UI decoration computed client-side (keeps existing look). */
  initials: string;
  colorClass: string;
  bannerClass: string;
};

export type SocialCommunityMember = {
  /** Actual user id for mentions/post tagging. */
  id: string;
  /** Membership row id when backend returns a separate membership entity. */
  memberId?: string;
  name: string;
  avatarUrl: string | null;
  permissions?: {
    canPost: boolean;
    canAcceptRequests: boolean;
    canDeletePosts: boolean;
  };
};

export type SocialCommunityJoinRequest = {
  id: string;
  userId: string | null;
  userName: string;
  status: number | null;
  createdAt: string;
};

const COLOR_CLASSES = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-fuchsia-500",
  "bg-indigo-500",
];

const BANNER_CLASSES = [
  "bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600",
  "bg-gradient-to-br from-slate-700 via-blue-600 to-cyan-500",
  "bg-gradient-to-br from-fuchsia-600 via-pink-500 to-rose-400",
  "bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500",
  "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
  "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500",
];

function hashToIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

function computeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "C";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + second).toUpperCase();
}

export function normalizeSocialCommunity(raw: unknown): SocialCommunity | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const rawId = o.communityId ?? o.id;
  if (rawId == null) return null;
  const name = String(o.name ?? o.communityName ?? "");
  const id = String(rawId);
  const description = String(o.description ?? o.communityDescription ?? "");
  const isPrivate = Boolean(o.isPrivate ?? o.private);
  const memberCount = Number(
    o.memberCount ??
    o.membersCount ??
    o.member_count ??
    o.members_count ??
    (Array.isArray(o.members) ? o.members.length : undefined) ??
    0,
  );
  const permission =
    (o.permissions && typeof o.permissions === "object"
      ? (o.permissions as Record<string, unknown>)
      : null) ??
    (o.permission && typeof o.permission === "object"
      ? (o.permission as Record<string, unknown>)
      : null);
  const roleName = String(
    o.roleName ??
    o.role_name ??
    o.role ??
    o.memberRole ??
    o.member_role ??
    o.userRole ??
    o.user_role ??
    "",
  ).toLowerCase();
  const isAdminFlag =
    o.isAdmin === true ||
    o.is_admin === true ||
    o.isOwner === true ||
    o.is_owner === true ||
    o.isCreator === true ||
    o.is_creator === true ||
    o.canAcceptRequests === true ||
    o.can_accept_requests === true ||
    o.canManageCommunity === true ||
    o.can_manage_community === true ||
    permission?.canAcceptRequests === true ||
    permission?.can_accept_requests === true ||
    roleName.includes("admin") ||
    roleName.includes("owner");
  const isAdmin =
    isAdminFlag;
  const isMember =
    typeof o.isMember === "boolean" ? o.isMember : undefined;
  const requestStatus =
    o.requestStatus == null ? null : Number(o.requestStatus);
  const profilePhoto =
    o.profilePhoto != null && String(o.profilePhoto).trim()
      ? String(o.profilePhoto)
      : o.profile_photo != null && String(o.profile_photo).trim()
        ? String(o.profile_photo)
        : null;
  const coverPhoto =
    o.coverPhoto != null && String(o.coverPhoto).trim()
      ? String(o.coverPhoto)
      : o.cover_photo != null && String(o.cover_photo).trim()
        ? String(o.cover_photo)
        : null;
  const colorClass = COLOR_CLASSES[hashToIndex(id, COLOR_CLASSES.length)]!;
  const bannerClass = BANNER_CLASSES[hashToIndex(id, BANNER_CLASSES.length)]!;
  return {
    id,
    name,
    description,
    isPrivate,
    memberCount,
    isAdmin,
    isMember,
    requestStatus: isMember === true ? 1 : requestStatus,
    profilePhoto,
    coverPhoto,
    initials: computeInitials(name || "Community"),
    colorClass,
    bannerClass,
  };
}

export function normalizeSocialCommunitiesList(res: unknown): SocialCommunity[] {
  if (!res) return [];
  const pickList = (x: unknown): unknown[] => {
    if (Array.isArray(x)) return x;
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      const d = o.data;
      if (Array.isArray(d)) return d;
      if (d && typeof d === "object") {
        const inner = d as Record<string, unknown>;
        const list =
          inner.favoritesList ??
          inner.communities ??
          inner.items ??
          inner.rows ??
          inner.data;
        if (Array.isArray(list)) return list;
      }
    }
    return [];
  };
  return pickList(res)
    .map(normalizeSocialCommunity)
    .filter((x): x is SocialCommunity => x !== null);
}

export function normalizeSocialCommunityDetail(res: unknown): SocialCommunity | null {
  if (!res) return null;
  if (typeof res === "object" && res !== null && "data" in (res as object)) {
    const d = (res as { data: unknown }).data;
    const one = normalizeSocialCommunity(d);
    if (one) return one;
  }
  return normalizeSocialCommunity(res);
}

export function normalizeCommunityMembers(res: unknown): SocialCommunityMember[] {
  const pickArray = (x: unknown): unknown[] => {
    if (Array.isArray(x)) return x;
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      const d = o.data;
      if (Array.isArray(d)) return d;
      if (d && typeof d === "object") {
        const inner = d as Record<string, unknown>;
        const l =
          inner.memberList ??
          inner.members ??
          inner.items ??
          inner.rows ??
          inner.data;
        if (Array.isArray(l)) return l;
        // common pattern: members: { data: [...] } or { rows: [...] }
        if (l && typeof l === "object") {
          const lo = l as Record<string, unknown>;
          const nested =
            lo.data ?? lo.items ?? lo.rows ?? lo.members ?? lo.records;
          if (Array.isArray(nested)) return nested;
        }
      }
    }
    return [];
  };

  const list: unknown[] = pickArray(res);
  return list
    .map((raw): SocialCommunityMember | null => {
      if (!raw || typeof raw !== "object") return null;
      const o = raw as Record<string, unknown>;
      const userId = o.userId ?? o.id;
      if (userId == null) return null;
      const memberId = o.id != null ? String(o.id) : undefined;
      const user = o.user;
      let name = String(
        o.userName ?? o.name ?? o.fullName ?? o.displayName ?? "",
      );
      let avatarUrl: string | null =
        o.userPhoto != null && String(o.userPhoto).trim()
          ? String(o.userPhoto)
          : null;

      if (user && typeof user === "object") {
        const u = user as Record<string, unknown>;
        name =
          String(
            u.name ?? u.fullName ?? u.displayName ?? u.email ?? name ?? "",
          ) || name;
        if (!avatarUrl) {
          avatarUrl =
            u.avatarUrl != null && String(u.avatarUrl).trim()
              ? String(u.avatarUrl)
              : null;
        }
      }

      if (!name.trim()) name = "Member";
      if (!avatarUrl && o.avatarUrl != null && String(o.avatarUrl).trim()) {
        avatarUrl = String(o.avatarUrl);
      }

      const rawPermissions =
        o.permissions && typeof o.permissions === "object"
          ? (o.permissions as Record<string, unknown>)
          : null;
      const canPost =
        rawPermissions?.canPost === true || rawPermissions?.can_post === true;
      const canAcceptRequests =
        rawPermissions?.canAcceptRequests === true ||
        rawPermissions?.can_accept_requests === true;
      const canDeletePosts =
        rawPermissions?.canDeletePosts === true ||
        rawPermissions?.can_delete_posts === true;

      const normalized: SocialCommunityMember = {
        id: String(userId),
        name,
        avatarUrl,
        permissions: {
          canPost,
          canAcceptRequests,
          canDeletePosts,
        },
        ...(memberId ? { memberId } : {}),
      };
      return normalized;
    })
    .filter((x): x is SocialCommunityMember => x !== null);
}

export function normalizeCommunityRequests(res: unknown): SocialCommunityJoinRequest[] {
  const list: unknown[] = (() => {
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object") {
      const o = res as Record<string, unknown>;
      const d = o.data;
      if (Array.isArray(d)) return d;
      if (d && typeof d === "object") {
        const inner = d as Record<string, unknown>;
        const l = inner.requests ?? inner.items ?? inner.rows ?? inner.data;
        if (Array.isArray(l)) return l;
      }
    }
    return [];
  })();
  return list
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const o = raw as Record<string, unknown>;
      if (o.id == null) return null;
      const user = o.user;
      const userId =
        o.userId != null ? String(o.userId) : user && typeof user === "object"
          ? String((user as Record<string, unknown>).id ?? "")
          : null;
      const userName =
        user && typeof user === "object"
          ? String(
            (user as Record<string, unknown>).name ??
            (user as Record<string, unknown>).fullName ??
            (user as Record<string, unknown>).email ??
            "Member",
          )
          : String(o.userName ?? "Member");
      const status =
        o.status != null ? Number(o.status) : o.requestStatus != null ? Number(o.requestStatus) : null;
      const createdAt = String(o.createdAt ?? o.updatedAt ?? "");
      return {
        id: String(o.id),
        userId: userId && userId.trim() ? userId : null,
        userName,
        status,
        createdAt,
      };
    })
    .filter((x): x is SocialCommunityJoinRequest => x !== null);
}

export const SOCIAL_COMMUNITY_QUERY_KEYS = {
  all: ["social-communities"] as const,
  explore: (search?: string) =>
    [...SOCIAL_COMMUNITY_QUERY_KEYS.all, "explore", search ?? ""] as const,
  joined: () => [...SOCIAL_COMMUNITY_QUERY_KEYS.all, "joined"] as const,
  favorites: (communityId?: string) =>
    [...SOCIAL_COMMUNITY_QUERY_KEYS.all, "favorites", communityId ?? "all"] as const,
  detail: (id: string) => [...SOCIAL_COMMUNITY_QUERY_KEYS.all, "detail", id] as const,
  members: (id: string) => [...SOCIAL_COMMUNITY_QUERY_KEYS.all, "members", id] as const,
  requests: (id: string) => [...SOCIAL_COMMUNITY_QUERY_KEYS.all, "requests", id] as const,
};

