"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/api/apiFunction";
import { HTTP_METHODS } from "@/api/methods";
import {
  normalizeSocialCommentsList,
  SOCIAL_COMMENT_QUERY_KEYS,
  SOCIAL_COMMENTS_BASE,
  SOCIAL_REACTIONS_TOGGLE,
  socialCommentByIdUrl,
  socialCommentsForPostUrl,
  type SocialCommentPayload,
  type SocialReactionTogglePayload,
} from "@/api/social-interactions";
import { SOCIAL_POST_QUERY_KEYS } from "@/api/social-posts";

export function useToggleReactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocialReactionTogglePayload) =>
      apiCall<unknown>(HTTP_METHODS.POST, SOCIAL_REACTIONS_TOGGLE, payload),
    onSuccess: (_, payload) => {
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
      if (payload.targetId) {
        void qc.invalidateQueries({
          queryKey: SOCIAL_POST_QUERY_KEYS.detail(payload.targetId),
        });
      }
    },
  });
}

export function usePostCommentsQuery(
  postId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SOCIAL_COMMENT_QUERY_KEYS.byPost(postId),
    queryFn: async () => {
      const res = await apiCall<unknown>(
        HTTP_METHODS.GET,
        socialCommentsForPostUrl(postId),
      );
      return normalizeSocialCommentsList(res);
    },
    enabled: !!postId && options?.enabled !== false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCreateCommentMutation(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocialCommentPayload) =>
      apiCall<unknown>(HTTP_METHODS.POST, SOCIAL_COMMENTS_BASE, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: SOCIAL_COMMENT_QUERY_KEYS.byPost(postId),
      });
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
      void qc.invalidateQueries({
        queryKey: SOCIAL_POST_QUERY_KEYS.detail(postId),
      });
    },
  });
}

export function useDeleteCommentMutation(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      apiCall<unknown>(HTTP_METHODS.DELETE, socialCommentByIdUrl(commentId)),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: SOCIAL_COMMENT_QUERY_KEYS.byPost(postId),
      });
      void qc.invalidateQueries({ queryKey: SOCIAL_POST_QUERY_KEYS.all });
      void qc.invalidateQueries({
        queryKey: SOCIAL_POST_QUERY_KEYS.detail(postId),
      });
    },
  });
}
