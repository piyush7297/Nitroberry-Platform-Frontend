"use client";

import { MESSAGE_TYPES } from "../../../constants/chat";
import { User } from "../../../types/chat";
import { CheckCheck, Pin, PinOff } from "lucide-react";
import { useSocket } from "../../../context/SocketContext";

interface UserItemProps {
  user: User;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
}

export default function UserItem({
  user,
  isActive,
  onClick,
  currentUserId,
}: UserItemProps) {
  const { togglePin } = useSocket(); // Assuming togglePin is exposed in your context
  const userId = String(user._id || user.id || "");
  const displayName =
    user.fullName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "Unknown User";

  const lastMessage = user.lastMessage;
  const unreadCount = user.unreadCount ?? 0;
  const isPinned = user.isPinned ?? false;

  const lastSenderId =
    typeof lastMessage?.sender === "object"
      ? lastMessage?.sender?._id
      : lastMessage?.sender;
  const isSentByMe = String(lastSenderId ?? "") === String(currentUserId);
  const isSeen = lastMessage?.status === "seen";

  const handlePinAction = (e: React.MouseEvent) => {
    e.stopPropagation(); // Critical: Prevents the chat from opening when pinning
    if (!userId) return;
    const chatId = user.lastMessage?.chatId;
    if (chatId) {
      togglePin(chatId, !isPinned, userId);
    }
  };

  const getDisplayContent = () => {
    if (!lastMessage) return "No messages yet";
    switch (lastMessage.messageType) {
      case MESSAGE_TYPES.IMAGE:
        return "📷 Photo";
      case MESSAGE_TYPES.VIDEO:
        return "🎥 Video";
      case MESSAGE_TYPES.AUDIO:
        return "🎙️ Voice message";
      case MESSAGE_TYPES.FILE:
        return "📄 Document";
      default:
        return lastMessage.content || "";
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const time = lastMessage?.createdAt
    ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center p-3.5 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-200 relative
      ${
        isActive
          ? "bg-[rgb(var(--app-accent))]/10 shadow-sm"
          : "hover:bg-[rgb(var(--app-text))]/5"
      }`}
    >
      {/* --- AVATAR SECTION --- */}
      <div className="relative shrink-0">
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden border-2 relative 
            ${
              isActive
                ? "border-[rgb(var(--app-accent))] scale-105 shadow-lg shadow-[rgb(var(--app-accent))]/20"
                : "bg-[rgb(var(--app-text))]/5 border-transparent group-hover:border-[rgb(var(--app-accent))]/30"
            }`}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={`text-xs font-black ${isActive ? "text-[rgb(var(--app-accent))]" : "text-[rgb(var(--app-text))]/40"}`}
            >
              {getInitials(displayName)}
            </span>
          )}
        </div>

        {/* Online Status Dot */}
        <div
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 transition-all duration-300 
          ${isActive ? "border-[rgb(var(--app-surface))]" : "border-[rgb(var(--app-bg))]"} 
          ${user.isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-gray-400"}`}
        />
      </div>

      {/* --- CONTENT SECTION --- */}
      <div className="ml-4 flex-1 min-w-0 flex justify-between items-center mr-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3
              className={`text-sm truncate transition-colors ${
                isActive
                  ? "text-[rgb(var(--app-text))] font-bold"
                  : "text-[rgb(var(--app-text))] font-semibold"
              }`}
            >
              {displayName}
            </h3>
            {/* Minimal Pinned Indicator (Always visible if pinned) */}
            {isPinned && (
              <Pin
                size={10}
                className="text-[rgb(var(--app-accent))] shrink-0 rotate-45"
                fill="currentColor"
              />
            )}
          </div>
          <p
            className={`text-xs truncate mt-0.5 transition-colors ${
              unreadCount > 0 && !isActive
                ? "text-[rgb(var(--app-text))] font-bold"
                : "text-[rgb(var(--app-text))]/50"
            }`}
          >
            {getDisplayContent()}
          </p>
        </div>

        {/* --- META SECTION (Time & Badges) --- */}
        <div className="flex flex-col items-end shrink-0 ml-3 gap-1.5">
          {time && (
            <span
              className={`text-[10px] font-bold tracking-tighter transition-colors ${
                unreadCount > 0 && !isActive
                  ? "text-green-500"
                  : "text-[rgb(var(--app-text))]/30"
              }`}
            >
              {time}
            </span>
          )}

          <div className="flex items-center justify-end h-5 min-w-5">
            {unreadCount > 0 && !isActive ? (
              <div className="flex items-center justify-center bg-green-500 min-w-[18px] h-[18px] rounded-full shadow-lg shadow-green-500/20">
                <span className="text-[9px] font-black text-white leading-none px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </div>
            ) : isSentByMe ? (
              <span className="shrink-0">
                <CheckCheck
                  size={16}
                  className={
                    isSeen ? "text-blue-500" : "text-[rgb(var(--app-text))]/20"
                  }
                />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* --- PIN ACTION BUTTON (Hover State) --- */}
      <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-linear-to-l from-[rgb(var(--app-bg))] via-[rgb(var(--app-bg))] to-transparent pl-4 pr-1 h-full rounded-r-2xl">
        <button
          onClick={handlePinAction}
          className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
            isPinned
              ? "text-[rgb(var(--app-accent))] bg-[rgb(var(--app-accent))]/10"
              : "text-[rgb(var(--app-text))]/40 hover:text-[rgb(var(--app-text))]"
          }`}
          title={isPinned ? "Unpin Chat" : "Pin Chat"}
        >
          {isPinned ? (
            <PinOff size={14} />
          ) : (
            <Pin size={14} className="rotate-45" />
          )}
        </button>
      </div>
    </div>
  );
}
