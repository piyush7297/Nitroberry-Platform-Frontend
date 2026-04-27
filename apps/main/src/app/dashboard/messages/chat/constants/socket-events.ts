export const SOCKET_EVENTS = {
  // --- CONNECTION & PRESENCE ---
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
  USER_STATUS_CHANGED: "user-status-changed", // Handled online/offline/last-seen

  // --- SIDEBAR & CHAT LIST ---
  REQUEST_USER_LIST: "request-user-list", // Client asks for sidebar users
  RESPONSE_USER_LIST: "response-user-list", // Server sends sidebar users

  // --- MESSAGE HISTORY ---
  REQUEST_MESSAGE_LIST: "request-message-history", // Client asks for messages in a chat
  RESPONSE_MESSAGE_LIST: "response-message-list", // Server sends message history

  // --- SENDING & RECEIVING ---
  SEND_MESSAGE: "send-message", // Client sends a new message
  RECEIVE_MESSAGE: "receive-message", // Server delivers a message to the recipient
  MESSAGE_SENT_SUCCESS: "message-sent-success", // Server confirms to sender (1 Gray Check)
  SEND_MESSAGE_ERROR: "send-message-error", // Server tells sender it failed

  // Blue Checks (Read/Seen)
  MARK_MESSAGE_READ: "mark-message-read", // Client opens chat/scrolls to bottom
  MESSAGE_READ_SUCCESS: "message-read-success",
  MESSAGE_STATUS_UPDATE: "message-status-update",
  // --- TYPING INDICATORS ---
  TYPING_START: "typing-start", // Client starts typing
  TYPING_STOP: "typing-stop", // Client stops typing (timer ends)
  USER_TYPING: "user-typing", // Server relays typing state to the other user
} as const;

// Optional: Type-safe Helper for TypeScript
export type SocketEventType =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
