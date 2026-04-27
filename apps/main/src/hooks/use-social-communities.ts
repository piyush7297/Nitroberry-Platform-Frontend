"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/api/apiFunction";
import { HTTP_METHODS } from "@/api/methods";
import {
  SOCIAL_COMMUNITIES_BASE,
  SOCIAL_COMMUNITIES_EXPLORE,
  SOCIAL_COMMUNITIES_JOINED,
  SOCIAL_COMMUNITIES_REQUEST,
  SOCIAL_COMMUNITY_QUERY_KEYS,
  normalizeCommunityMembers,
  normalizeCommunityRequests,
  normalizeSocialCommunitiesList,
  normalizeSocialCommunityDetail,
  socialCommunitiesFavoritesUrl,
  socialCommunityFavoriteUrl,
  socialCommunityMemberDetailUrl,
  socialCommunityDetailUrl,
  socialCommunityMembersUrl,
  socialCommunityRequestStatusUrl,
  socialCommunityRequestsUrl,
  type SocialCommunity,
  type SocialCommunityCreatePayload,
  type SocialCommunityJoinRequest,
  type SocialCommunityMember,
  type SocialCommunityUpdatePayload,
} from "@/api/social-communities";

function devLog(label: string, data: unknown) {
  if (process.env.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.log(`[social][communities] ${label}`, data);
}

export function useExploreCommunitiesQuery(options?: {
  enabled?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.explore(options?.search),
    queryFn: async () => {
      const params =
        options?.search && options.search.trim()
          ? { search: options.search.trim() }
          : undefined;
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        SOCIAL_COMMUNITIES_EXPLORE,
        params,
      );
      devLog(
        `GET /social/communities/explore${params ? " (search)" : ""}`,
        res,
      );
      return normalizeSocialCommunitiesList(res);
    },
    placeholderData: (prev) => prev,
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useJoinedCommunitiesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.joined(),
    queryFn: async () => {
      const res = await apiCall<unknown>(HTTP_METHODS.GET, SOCIAL_COMMUNITIES_JOINED);
      devLog("GET /social/communities/joined", res);
      return normalizeSocialCommunitiesList(res);
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useFavoriteCommunitiesQuery(options?: {
  enabled?: boolean;
  communityId?: string;
}) {
  return useQuery({
    queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.favorites(options?.communityId),
    queryFn: async () => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialCommunitiesFavoritesUrl(options?.communityId),
      );
      devLog("GET /social/communities/favorites", res);
      return normalizeSocialCommunitiesList(res);
    },
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCommunityDetailQuery(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiCall<unknown>(HTTP_METHODS.GET, socialCommunityDetailUrl(id));
      devLog(`GET /social/communities/${id}`, res);
      return normalizeSocialCommunityDetail(res);
    },
    enabled: !!id && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCommunityMembersQuery(
  communityId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.members(communityId),
    queryFn: async (): Promise<{ members: SocialCommunityMember[]; total: number | null }> => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialCommunityMembersUrl(communityId),
      );
      devLog(`GET /social/communities/${communityId}/members`, res);
      const members = normalizeCommunityMembers(res);
      const total =
        res && typeof res === "object"
          ? (res as any)?.data?.pagination?.total ??
          (res as any)?.pagination?.total ??
          null
          : null;
      return { members, total: total != null ? Number(total) : null };
    },
    enabled: !!communityId && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCommunityRequestsQuery(
  communityId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.requests(communityId),
    queryFn: async (): Promise<SocialCommunityJoinRequest[]> => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialCommunityRequestsUrl(communityId),
      );
      devLog(`GET /social/communities/${communityId}/requests`, res);
      return normalizeCommunityRequests(res);
    },
    enabled: !!communityId && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCreateCommunityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocialCommunityCreatePayload) =>
      apiCall<unknown>(HTTP_METHODS.POST, SOCIAL_COMMUNITIES_BASE, payload),
    onSuccess: () => {
      devLog("POST /social/communities (success)", null);
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function useDeleteCommunityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<unknown>(HTTP_METHODS.DELETE, socialCommunityDetailUrl(id)),
    onSuccess: () => {
      devLog("DELETE /social/communities/:id (success)", null);
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function useUpdateCommunityMutation(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocialCommunityUpdatePayload) =>
      apiCall<unknown>(HTTP_METHODS.PUT, socialCommunityDetailUrl(communityId), payload),
    onSuccess: () => {
      devLog("PUT /social/communities/:id (success)", null);
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.detail(communityId) });
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function useAddCommunityMemberMutation(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: string;
      role: number;
    }) => apiCall<unknown>(
      HTTP_METHODS.POST,
      socialCommunityMembersUrl(communityId),
      payload,
    ),
    onSuccess: () => {
      devLog("POST /social/communities/:id/members (success)", null);
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.members(communityId) });
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.detail(communityId) });
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function useRemoveCommunityMemberMutation(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiCall<unknown>(
        HTTP_METHODS.DELETE,
        socialCommunityMemberDetailUrl(communityId, userId),
      ),
    onSuccess: () => {
      devLog("DELETE /social/communities/:communityId/members/:userId (success)", null);
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.members(communityId) });
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.detail(communityId) });
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function useRequestJoinCommunityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) =>
      apiCall<unknown>(HTTP_METHODS.POST, SOCIAL_COMMUNITIES_REQUEST, {
        communityId,
      }),
    onSuccess: () => {
      devLog("POST /social/communities/request (success)", null);
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function useUpdateCommunityRequestStatusMutation(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: number }) =>
      apiCall<unknown>(HTTP_METHODS.POST, socialCommunityRequestStatusUrl(requestId), {
        status,
      }),
    onSuccess: () => {
      devLog("POST /social/communities/request/:id/status (success)", null);
      void qc.invalidateQueries({
        queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.requests(communityId),
      });
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function usePatchCommunityPhotosMutation(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { profilePhoto?: string; coverPhoto?: string }) =>
      apiCall<unknown>(HTTP_METHODS.PUT, socialCommunityDetailUrl(communityId), payload),
    onSuccess: () => {
      devLog("PUT /social/communities/:id (photos) (success)", null);
      void qc.invalidateQueries({
        queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.detail(communityId),
      });
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export function useUpdateCommunityFavoriteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      communityId,
      isFavourite,
    }: {
      communityId: string;
      isFavourite: boolean;
    }) =>
      apiCall<unknown>(
        HTTP_METHODS.PUT,
        socialCommunityFavoriteUrl(communityId),
        { isFavourite },
      ),
    onSuccess: () => {
      devLog("PUT /social/communities/:id/favorite (success)", null);
      void qc.invalidateQueries({ queryKey: SOCIAL_COMMUNITY_QUERY_KEYS.all });
    },
  });
}

export type { SocialCommunity };

