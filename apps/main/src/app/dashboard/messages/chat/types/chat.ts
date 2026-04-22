export interface MessageReadStatus {
  user: string;
  readAt: string | null;
  deliveredAt?: string | null; // Optional, for double gray checks
}
export interface User {
  _id?: string;
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: string;
  unreadCount?: number;
  isTyping?: boolean;
  avatar?: string;
  isPinned?: boolean;

  // lastMessage can now be the message object or null
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
    sender: string | { _id: string; [key: string]: any };
    messageType: number;
    status: string;
    readStatus: MessageReadStatus[];
    chatId: string;
  } | null;
}
export interface ChatMessage {
  _id: string;
  content: string;
  sender: string | { _id: string };
  status?: string;
  createdAt?: string;
  readStatus: MessageReadStatus[];
  receiverId: string;
}

export interface UploadParams {
  files: File | Blob | File[] | Blob[];
  fileName?: string;
}

export interface UploadResponse {
  message: string;
  data: {
    url: string;
    key: string;
    filename: string;
    size: number;
    mimetype: string;
    fullOSPath: string;
  }[];
  files?: {
    url: string;
    key: string;
    filename: string;
    size: number;
    mimetype: string;
    fullOSPath: string;
  }[];
}
