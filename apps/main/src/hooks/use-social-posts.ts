"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiCall } from "@/api/apiFunction";
import { HTTP_METHODS } from "@/api/methods";
import {
  normalizeSocialMedalHistory,
  normalizeSocialMedalsLeaderboard,
  normalizeSocialMedalsList,
  normalizeSocialMedalUserSummary,
  normalizeSocialPostPollVotes,
  normalizeSocialPost,
  normalizeSocialPostsList,
  SOCIAL_POSTS_BASE,
  socialPostPinUrl,
  socialPostPinnedListUrl,
  socialPostPollVoteUrl,
  socialPostPollVotesUrl,
  socialPostMedalsHistoryUrl,
  socialPostMedalsLeaderboardUrl,
  socialPostMedalsSummaryUrl,
  socialPostMedalsUrl,
  socialPostUrl,
  socialPostsMeUrl,
  SOCIAL_POST_QUERY_KEYS,
  type SocialMedal,
  type SocialMedalHistoryItem,
  type SocialMedalLeaderboardRow,
  type SocialMedalUserSummary,
  type SocialPollOption,
  type SocialPost,
  type SocialPostPayload,
} from "@/api/social-posts";

/** Backend convention from your spec: `status=0` returns draft-related “me” posts. */
export const SOCIAL_ME_POST_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
} as const;

export function useSocialPostsListQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<SocialPost[], Error> {
  return useQuery({
    queryKey: SOCIAL_POST_QUERY_KEYS.list(),
    queryFn: async () => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        SOCIAL_POSTS_BASE,
      );
      return normalizeSocialPostsList(res);
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSocialMyPostsQuery(
  status: number,
  options?: { enabled?: boolean },
): UseQueryResult<SocialPost[], Error> {
  return useQuery({
    queryKey: SOCIAL_POST_QUERY_KEYS.mine(status),
    queryFn: async () => {
      const res = await apiCall<unknown>(HTTP_METHODS.GET, socialPostsMeUrl, {
        status,
      });
      return normalizeSocialPostsList(res);
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSocialPostDetailQuery(
  id: string | null,
  options?: { enabled?: boolean },
): UseQueryResult<SocialPost | null, Error> {
  return useQuery({
    queryKey: SOCIAL_POST_QUERY_KEYS.detail(id ?? ""),
    queryFn: async () => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialPostUrl(id!),
      );
      const list = normalizeSocialPostsList(res);
      if (list[0]) return list[0];
      const one = normalizeSocialPost(
        res && typeof res === "object" && "data" in (res as object)
          ? (res as { data: unknown }).data
          : res,
      );
      return one;
    },
    enabled: !!id && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function usePinnedSocialPostsQuery(options: {
  communityId: string | null;
  type: number;
  enabled?: boolean;
}): UseQueryResult<SocialPost[], Error> {
  return useQuery({
    queryKey:
      options.communityId != null
        ? [...SOCIAL_POST_QUERY_KEYS.all, "pinned", options.type, options.communityId]
        : [...SOCIAL_POST_QUERY_KEYS.all, "pinned", options.type, "global"],
    queryFn: async () => {
      if (!options.communityId) return [];
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialPostPinnedListUrl({
          type: options.type,
          communityId: options.communityId,
        }),
      );
      return normalizeSocialPostsList(res);
    },
    enabled: !!options.communityId && options.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function usePinSocialPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      type,
      status,
    }: {
      postId: string;
      type: number;
      status: boolean;
    }) => apiCall<unknown>(HTTP_METHODS.PUT, socialPostPinUrl(postId), { type, status }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.detail(variables.postId) });
    },
  });
}

export function usePostPollVotesQuery(
  postId: string | null,
  options?: { enabled?: boolean },
): UseQueryResult<{
  options: SocialPollOption[];
  totalVotes: number | null;
  userVoteOptionId: string | null;
}, Error> {
  return useQuery({
    queryKey: [...SOCIAL_POST_QUERY_KEYS.all, "poll-votes", postId ?? ""],
    queryFn: async () => {
      const res = await apiCall<unknown>(HTTP_METHODS.GET, socialPostPollVotesUrl(postId!));
      return normalizeSocialPostPollVotes(res);
    },
    enabled: !!postId && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useVoteOnSocialPostPollMutation(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { optionId: string }) =>
      apiCall<unknown>(HTTP_METHODS.POST, socialPostPollVoteUrl(postId), payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...SOCIAL_POST_QUERY_KEYS.all, "poll-votes", postId] });
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.detail(postId) });
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
    },
  });
}

export function useSocialMedalsListQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<SocialMedal[], Error> {
  return useQuery({
    queryKey: SOCIAL_POST_QUERY_KEYS.medals(),
    queryFn: async () => {
      const res = await apiCall<unknown>(HTTP_METHODS.GET, socialPostMedalsUrl);
      return normalizeSocialMedalsList(res);
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSocialMedalsLeaderboardQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<SocialMedalLeaderboardRow[], Error> {
  return useQuery({
    queryKey: SOCIAL_POST_QUERY_KEYS.medalsLeaderboard(),
    queryFn: async () => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialPostMedalsLeaderboardUrl,
      );
      return normalizeSocialMedalsLeaderboard(res);
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSocialMedalsSummaryQuery(
  userId: string | null,
  options?: { enabled?: boolean },
): UseQueryResult<SocialMedalUserSummary, Error> {
  return useQuery({
    queryKey: SOCIAL_POST_QUERY_KEYS.medalsSummary(userId ?? ""),
    queryFn: async () => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialPostMedalsSummaryUrl(userId!),
      );
      return normalizeSocialMedalUserSummary(res);
    },
    enabled: !!userId && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSocialMedalsHistoryQuery(
  userId: string | null,
  options?: { enabled?: boolean },
): UseQueryResult<SocialMedalHistoryItem[], Error> {
  return useQuery({
    queryKey: SOCIAL_POST_QUERY_KEYS.medalsHistory(userId ?? ""),
    queryFn: async () => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialPostMedalsHistoryUrl(userId!),
      );
      return normalizeSocialMedalHistory(res);
    },
    enabled: !!userId && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCreateSocialPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocialPostPayload) =>
      apiCall<unknown>(HTTP_METHODS.POST, SOCIAL_POSTS_BASE, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
    },
  });
}

export function useUpdateSocialPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SocialPostPayload }) =>
      apiCall<unknown>(HTTP_METHODS.PUT, socialPostUrl(id), payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
    },
  });
}

export function useDeleteSocialPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<unknown>(HTTP_METHODS.DELETE, socialPostUrl(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
    },
  });
}
