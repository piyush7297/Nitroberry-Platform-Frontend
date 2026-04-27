export const MESSAGE_TYPES = {
  TEXT: 1,
  IMAGE: 2,
  FILE: 3,
  VIDEO: 4,
  AUDIO: 5,
} as const;

export type MessageTypeVal = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
