"use client";
import { memo, useEffect, useState } from "react";
import { Check, FileText, CheckCheck, Film, Download } from "lucide-react";
import { MESSAGE_TYPES } from "../../constants/chat";

interface MessageItemProps {
  msg: any;
  isOwn: boolean;
  activeUserId: string;
}

const MessageItem = memo(({ msg, isOwn, activeUserId }: MessageItemProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- Theme Observer: Ensures UI updates when theme toggles ---
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // --- Message Status Logic ---
  const recipientStatus = msg.readStatus?.find(
    (status: any) => String(status.user) === String(activeUserId),
  );
  const isRead = msg.status === "seen" || !!recipientStatus?.readAt;
  const isDelivered =
    msg.status === "seen" ||
    msg.status === "delivered" ||
    !!recipientStatus?.deliveredAt;

  const formatTime = (dateString?: string) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  const downloadFile = async (url: string, defaultName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, "_blank"); // Fallback
    }
  };
  // --- Content Renderer with Explicit Color Logic ---
  const renderContent = () => {
    // Shared text color logic to prevent "White on White" in Light Mode
    const contentTextColor = isDarkMode
      ? "text-white"
      : "text-slate-900 dark:text-slate-100";

    const mediaContainerClass = isDarkMode
      ? "bg-white/10 border-white/20"
      : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10";

    /* Imports required: Download, FileText, Film, Image as ImageIcon, Play */

    switch (msg.messageType) {
      case MESSAGE_TYPES.IMAGE:
        return (
          <div className="group relative rounded-2xl overflow-hidden mb-1 border border-[rgb(var(--app-border))]/50 shadow-sm transition-all hover:shadow-md">
            <img
              src={msg.content}
              alt="Shared Image"
              className="w-48 sm:w-72 h-auto max-h-80 object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
              onClick={() => window.open(msg.content, "_blank")}
            />
            {/* Hover Download Button */}
            <button
              onClick={() => downloadFile(msg.content, `IMG-${Date.now()}.jpg`)}
              className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
              title="Download Image"
            >
              <Download size={14} />
            </button>
          </div>
        );

      case MESSAGE_TYPES.VIDEO:
        const vidExt = msg.content.split(".").pop() || "MP4";
        return (
          <div
            className={`relative group w-64 sm:w-80 rounded-2xl overflow-hidden border border-[rgb(var(--app-border))]/50 shadow-sm ${mediaContainerClass}`}
          >
            <video
              src={msg.content}
              className="w-full h-auto aspect-video object-cover"
              playsInline
            />

            {/* Play Overlay UI */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-all pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl transform transition-transform group-hover:scale-110">
                <div className="ml-1 w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent" />
              </div>
            </div>

            {/* Video Meta & Download */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() =>
                  downloadFile(msg.content, `VID-${Date.now()}.${vidExt}`)
                }
                className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
              >
                <Download size={14} />
              </button>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-3 bg-linear-to-t from-black/80 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film size={12} className="text-white/80" />
                <span className="text-[10px] text-white/90 font-bold uppercase tracking-widest">
                  {vidExt}
                </span>
              </div>
            </div>

            {/* Click to Open Trigger */}
            <button
              onClick={() => window.open(msg.content, "_blank")}
              className="absolute inset-0 z-10"
            />
          </div>
        );

      case MESSAGE_TYPES.AUDIO:
        return (
          <div
            className={`flex flex-col gap-2 p-2 rounded-2xl border ${mediaContainerClass} transition-colors min-w-60`}
          >
            <div className="flex items-center gap-3">
              <audio
                controls
                className={`h-9 w-full custom-audio-player ${isDarkMode ? "dark-audio" : ""}`}
              >
                <source src={msg.content} type="audio/mpeg" />
              </audio>
              <button
                onClick={() =>
                  downloadFile(msg.content, `VOICE-${Date.now()}.mp3`)
                }
                className={`p-2 hover:bg-[rgb(var(--app-text))]/10 rounded-full transition-all shrink-0 ${contentTextColor}`}
                title="Download Voice Note"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        );

      case MESSAGE_TYPES.FILE:
        const fileExt = msg.content.split(".").pop() || "FILE";
        return (
          <div
            className={`flex items-center justify-between gap-4 p-3 rounded-2xl border w-64 sm:w-72 shadow-sm transition-all hover:shadow-md ${mediaContainerClass}`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 bg-[rgb(var(--app-accent))] rounded-xl text-white shrink-0 shadow-lg shadow-[rgb(var(--app-accent))]/20">
                <FileText size={20} />
              </div>
              <div className="flex flex-col overflow-hidden leading-tight">
                <span
                  className={`text-[13px] font-bold truncate ${contentTextColor}`}
                >
                  {msg.content.split("/").pop()?.substring(0, 15) || "Document"}
                  ...
                </span>
                <span
                  className={`text-[10px] opacity-50 uppercase font-black tracking-widest mt-0.5 ${contentTextColor}`}
                >
                  {fileExt} • {(msg.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                downloadFile(msg.content, `DOC-${Date.now()}.${fileExt}`)
              }
              className={`p-2.5 hover:bg-[rgb(var(--app-text))]/10 rounded-xl transition-all shrink-0 ${contentTextColor}`}
            >
              <Download size={18} />
            </button>
          </div>
        );

      case MESSAGE_TYPES.TEXT:
      default:
        return (
          <p
            className={`whitespace-pre-wrap break-words text-[14.5px] leading-relaxed font-medium transition-colors ${contentTextColor}`}
          >
            {msg.content}
          </p>
        );
    }
  };

  return (
    <div
      className={`flex w-full mb-2 ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-300 px-4`}
    >
      <div
        className={`relative p-3 rounded-2xl max-w-[85%] lg:max-w-[70%] shadow-sm transition-all duration-300 ${
          isDarkMode
            ? "bg-[rgb(var(--app-accent))] text-white rounded-tr-none shadow-blue-500/20"
            : "bg-white dark:bg-[#1e1e1e] rounded-tl-none border border-slate-200 dark:border-white/5 shadow-sm shadow-slate-200/40"
        }`}
      >
        {/* Dynamic Content */}
        {renderContent()}

        {/* Footer: Time & Status */}
        <div
          className={`flex items-center justify-end gap-1 mt-1.5 select-none 
          ${isDarkMode ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}
        >
          <span className="text-[9px] font-bold uppercase tracking-tight">
            {formatTime(msg.createdAt)}
          </span>

          {isOwn && (
            <div className="flex items-center ml-1">
              {isRead ? (
                <CheckCheck
                  size={14}
                  strokeWidth={3}
                  className="text-blue-500"
                />
              ) : isDelivered ? (
                <CheckCheck size={14} strokeWidth={3} className="opacity-70" />
              ) : (
                <Check size={14} strokeWidth={3} className="opacity-40" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = "MessageItem";
export default MessageItem;
