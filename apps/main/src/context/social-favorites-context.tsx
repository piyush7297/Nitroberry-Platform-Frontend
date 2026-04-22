"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useFavoriteCommunitiesQuery,
  useUpdateCommunityFavoriteMutation,
} from "@/hooks/use-social-communities";

type SocialFavoritesContextValue = {
  favoriteIds: ReadonlySet<string>;
  toggleFavorite: (communityId: string) => void;
  isFavorite: (communityId: string) => boolean;
};

const SocialFavoritesContext = createContext<
  SocialFavoritesContextValue | undefined
>(undefined);

export function SocialFavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set<string>());
  const favoritesQuery = useFavoriteCommunitiesQuery({ enabled: true });
  const updateFavorite = useUpdateCommunityFavoriteMutation();

  useEffect(() => {
    if (!favoritesQuery.data) return;
    setFavoriteIds(new Set(favoritesQuery.data.map((community) => community.id)));
  }, [favoritesQuery.data]);

  const toggleFavorite = useCallback((communityId: string) => {
    setFavoriteIds((prev) => {
      const currentlyFavorite = prev.has(communityId);
      const nextFavorite = !currentlyFavorite;
      const next = new Set(prev);
      if (nextFavorite) next.add(communityId);
      else next.delete(communityId);

      updateFavorite.mutate(
        { communityId, isFavourite: nextFavorite },
        {
          onError: () => {
            setFavoriteIds((current) => {
              const rollback = new Set(current);
              if (currentlyFavorite) rollback.add(communityId);
              else rollback.delete(communityId);
              return rollback;
            });
          },
        },
      );

      return next;
    });
  }, [updateFavorite]);

  const isFavorite = useCallback(
    (communityId: string) => favoriteIds.has(communityId),
    [favoriteIds],
  );

  const value = useMemo(
    (): SocialFavoritesContextValue => ({
      favoriteIds,
      toggleFavorite,
      isFavorite,
    }),
    [favoriteIds, toggleFavorite, isFavorite],
  );

  return (
    <SocialFavoritesContext.Provider value={value}>
      {children}
    </SocialFavoritesContext.Provider>
  );
}

export function useSocialFavorites() {
  const ctx = useContext(SocialFavoritesContext);
  if (!ctx) {
    throw new Error(
      "useSocialFavorites must be used within SocialFavoritesProvider",
    );
  }
  return ctx;
}
