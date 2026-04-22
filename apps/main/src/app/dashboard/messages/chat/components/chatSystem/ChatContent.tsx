"use client";

import { useEffect, useMemo, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { User } from "../../types/chat";
import Sidebar from "./sidebar/";
import ChatArea from "./ChatArea";
import EmptyState from "./EmptyState";

const getUserId = (user?: Partial<User> | null) =>
  String(user?._id || user?.id || "");

export function ChatContent() {
  const { users, setActiveUserId } = useSocket();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserSnapshot, setSelectedUserSnapshot] =
    useState<User | null>(null);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return (
      users.find((user) => getUserId(user) === selectedUserId) ||
      selectedUserSnapshot ||
      ({ _id: selectedUserId } as User)
    );
  }, [users, selectedUserId, selectedUserSnapshot]);

  useEffect(() => {
    setActiveUserId(selectedUserId || null);

    if (!selectedUserId) {
      setSelectedUserSnapshot(null);
    }
  }, [selectedUserId, setActiveUserId]);

  return (
    <div className="h-full w-full flex bg-[rgb(var(--app-bg))] overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 flex p-3 md:p-5 gap-4 overflow-hidden">
        {/* SIDEBAR (Contacts List) */}
        {/* On mobile: Hidden if a user is selected so the chat can take full screen */}
        <aside
          className={`
          ${selectedUserId ? "hidden" : "flex"} 
          lg:flex w-full lg:w-80 flex-col bg-[rgb(var(--app-surface))] rounded-4xl border border-[rgb(var(--app-border))] shadow-sm overflow-hidden
        `}
        >
          <Sidebar
            selectedUserId={selectedUserId || ""}
            onSelectUser={(user) => {
              const userId = getUserId(user);
              if (userId) {
                setSelectedUserId(userId);
                setSelectedUserSnapshot(user);
              }
            }}
          />
        </aside>

        {/* CHAT AREA (Conversation) */}
        {/* On mobile: Only shows if a user is selected */}
        <main
          className={`
          ${!selectedUserId ? "hidden" : "flex"} 
          flex-1 flex-col bg-[rgb(var(--app-surface))] bg-opacity-60 backdrop-blur-xl rounded-[2.5rem] border border-[rgb(var(--app-border))] overflow-hidden relative shadow-sm
          lg:flex
        `}
        >
          {selectedUserId ? (
            <ChatArea
              activeUser={selectedUser}
              onBack={() => setSelectedUserId(null)}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}
