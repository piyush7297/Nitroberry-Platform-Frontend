"use client";

import { User } from "../../types/chat";
import { useSocket } from "../../context/SocketContext";
import { useMemo } from "react";
import { Phone, Video, ChevronLeft } from "lucide-react";
import { notify } from "../../utils/toast";

interface ChatHeaderProps {
  user: User;
  onBack?: () => void;
}

export default function ChatHeader({
  user: initialUser,
  onBack,
}: ChatHeaderProps) {
  const { users } = useSocket();

  const user = useMemo(() => {
    const initialUserId = String(initialUser._id || initialUser.id || "");
    return (
      users.find(
        (item) => String(item._id || item.id || "") === initialUserId,
      ) || initialUser
    );
  }, [users, initialUser]);
  const displayName =
    user.fullName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "Unknown User";

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const formatLastSeen = (date: string | Date) => {
    const lastSeenDate = new Date(date);
    return lastSeenDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleFeatureComingSoon = () => {
    notify.error("This feature will be available in the future!");
  };

  return (
    <div className="h-20 px-4 md:px-8 border-b border-[rgb(var(--app-border))]/50 flex items-center justify-between bg-[rgb(var(--app-bg))]/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {" "}
        {/* min-w-0 is critical for truncation */}
        {/* Mobile Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1 -ml-1 text-[rgb(var(--app-text))]/60 hover:text-[rgb(var(--app-accent))]"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {/* Avatar Section */}
        <div className="relative group shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-[rgb(var(--app-border))] bg-[rgb(var(--app-accent))]/10 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-sm">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[rgb(var(--app-accent))] font-bold text-xs md:text-sm">
                {getInitials(displayName)}
              </span>
            )}
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border-2 border-[rgb(var(--app-bg))] transition-colors ${user.isOnline ? "bg-green-500" : "bg-zinc-500"}`}
          />
        </div>
        {/* User Info Section - Managed for long words */}
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm font-bold text-[rgb(var(--app-text))] tracking-tight flex items-center gap-2">
            <span className="truncate whitespace-nowrap">{displayName}</span>
            {user.isOnline && (
              <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
          </h2>

          <div className="flex items-center gap-2 h-4 overflow-hidden">
            {user.isOnline ? (
              <span className="text-[9px] md:text-[10px] text-green-500 uppercase tracking-widest font-bold whitespace-nowrap">
                Online
              </span>
            ) : (
              <span className="text-[9px] md:text-[10px] text-[rgb(var(--app-text))]/50 uppercase tracking-widest font-medium truncate whitespace-nowrap">
                {user.lastSeen
                  ? `Last seen: ${formatLastSeen(user.lastSeen)}`
                  : "Recently"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Actions - Shrink-0 to prevent them from getting squashed */}
      <div className="flex items-center gap-0.5 md:gap-1 shrink-0 ml-2">
        <button
          onClick={handleFeatureComingSoon}
          className="p-2 md:p-2.5 rounded-full hover:bg-[rgb(var(--app-text))]/5 text-[rgb(var(--app-text))]/40 hover:text-[rgb(var(--app-accent))] transition-all"
        >
          <Phone size={18} />
        </button>

        <button
          onClick={handleFeatureComingSoon}
          className="p-2 md:p-2.5 rounded-full hover:bg-[rgb(var(--app-text))]/5 text-[rgb(var(--app-text))]/40 hover:text-[rgb(var(--app-accent))] transition-all"
        >
          <Video size={18} />
        </button>
      </div>
    </div>
  );
}
