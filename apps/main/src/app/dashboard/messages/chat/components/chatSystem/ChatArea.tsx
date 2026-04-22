"use client";

import { useSocket } from "../../context/SocketContext";
import { User } from "../../types/chat";
import { useChat } from "../../hooks/useChat";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EmptyState from "./EmptyState";
import { MESSAGE_TYPES } from "../../constants/chat";
import { uploadMedia } from "../../api/upload.api";
import { notify } from "../../utils/toast";

interface ChatAreaProps {
  activeUser: User | null;
  onBack?: () => void;
}

export default function ChatArea({ activeUser, onBack }: ChatAreaProps) {
  const { socket } = useSocket();
  const { messages, sendMessage, loadMore, hasMore, isLoading } = useChat(
    socket,
    activeUser,
  );
  const displayName =
    activeUser?.fullName ||
    `${activeUser?.firstName || ""} ${activeUser?.lastName || ""}`.trim() ||
    activeUser?.email ||
    "this user";
  const firstName = displayName.split(/\s+/)[0];

  const handleSendVoice = async (blob: Blob) => {
    try {
      const fileName = `voice-${Date.now()}.mp3`;
      const result = await uploadMedia({ files: blob, fileName });
      if (result && result.data && result.data.length > 0) {
        notify.success(result.message);
        const savedAudioUrl = result.data[0].fullOSPath;
        sendMessage(savedAudioUrl, MESSAGE_TYPES.AUDIO);
      } else {
        notify.error(result.message);
      }
    } catch (error) {
      notify.error("Failed to upload voice message");
    }
  };

  const handleSendFile = async (
    file: File,
    type: "image" | "video" | "file",
  ) => {
    try {
      const extension = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${extension}`;
      const result = await uploadMedia({ files: file, fileName });
      if (result && result.data && result.data.length > 0) {
        notify.success(result.message);
        const finalUrl = result.data[0].fullOSPath;
        let messageType;
        switch (type) {
          case "image":
            messageType = MESSAGE_TYPES.IMAGE;
            break;
          case "video":
            messageType = MESSAGE_TYPES.VIDEO;
            break;
          default:
            messageType = MESSAGE_TYPES.FILE;
        }
        sendMessage(finalUrl, messageType);
      } else {
        notify.error(result.message);
      }
    } catch (error) {
      notify.error(`Failed to upload ${type}`);
    }
  };

  if (!activeUser) return <EmptyState />;

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden relative bg-[rgb(var(--app-bg))] transition-colors duration-200">
      {/* REDUCED GLOW: Lowered opacity and blurred it more 
          so it doesn't "break" the dark mode background feel.
      */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:block hidden overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[rgb(var(--app-accent))] rounded-full blur-[150px]" />
      </div>

      {/* Header with border matching your Sidebar */}
      <div className="border-b border-[rgb(var(--app-border))] z-10">
        <ChatHeader user={activeUser} onBack={onBack} />
      </div>

      {/* Message List Container */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        <MessageList
          messages={messages}
          activeUser={activeUser}
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoading={isLoading}
        />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-[rgb(var(--app-bg))] border-t border-[rgb(var(--app-border))] z-10">
        <MessageInput
          onSend={(val) => sendMessage(val, MESSAGE_TYPES.TEXT)}
          onSendVoice={handleSendVoice}
          onSendFile={handleSendFile}
          placeholder={`Message ${firstName}...`}
        />
      </footer>
    </div>
  );
}
