export const PostSCOPE = {
  INDIVIDUAL: 0,
  COMMUNITY: 1,
} as const;

export const COMMUNUITY_Status = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
} as const;

export const COMMUNITY_Status = COMMUNUITY_Status;

export const ReactionType = {
  LIKE: 1,
  LOVE: 2,
  WOW: 3,
  HAHA: 4,
  SAD: 5,
  ANGRY: 6,
} as const;

export const ReactionTarget = {
  POST: 1,
  COMMENT: 2,
} as const;

export const ReactionAction = {
  ADDED: 1,
  REMOVED: 2,
  UPDATED: 3,
} as const;

export enum PostType {
  DISCUSSION = 0,
  QUESTION = 1,
  PRAISE = 2,
  POLL = 3,
}

export enum PostFilterStatus {
  ALL = 0,
  PUBLISHED = 1,
  DRAFTS = 2,
}

export enum COMMUNITYPOSTACTION {
  CANPOST = 1,
  CANDELETEPOST = 2,
  CANUPDATEPOST = 3,
}

export enum PinTypeEnum {
  PERSONAL = 1,
  COMMUNITY = 2,
}
