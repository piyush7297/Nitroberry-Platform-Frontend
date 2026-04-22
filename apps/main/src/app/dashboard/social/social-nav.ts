import { RoutesEnum } from "@/lib/enums/routes.enum";

const base = RoutesEnum.SOCIAL;

export const SOCIAL_ROUTES = {
  home: `${base}/home`,
  profile: `${base}/profile`,
  communities: `${base}/communities`,
  storylines: `${base}/storylines`,
  discover: `${base}/discover`,
  /** Legacy / parity; may redirect until a bookmarks UI exists */
  bookmarks: `${base}/bookmarks`,
  /** Create AMA event (placeholder until API exists) */
  amaNew: `${base}/ama/new`,
} as const;

export function socialCommunityPath(id: string) {
  return `${base}/communities/${id}`;
}
