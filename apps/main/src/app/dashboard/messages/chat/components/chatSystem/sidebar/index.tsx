"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, UserPlus } from "lucide-react";
import SidebarHeader from "./SidebarHeader";
import SearchBar from "./SearchBar";
import UserList from "./UserList";
import { User } from "../../../types/chat";
import { useSocket } from "../../../context/SocketContext";

type FilterMode = "all" | "unread";

interface SidebarProps {
  selectedUserId?: string;
  onSelectUser: (user: User) => void;
}

export default function Sidebar({
  selectedUserId,
  onSelectUser,
}: SidebarProps) {
  const {
    users,
    loadMore,
    hasMore,
    fetchAllUsers,
    fetchRecentChats,
    searchUsers,
    seedRecentUser,
  } = useSocket();
  const { data: session } = useSession();
  const currentUserId = String((session?.user as any)?.id ?? "");

  const [searchQuery, setSearchQuery] = useState("");
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const contactSeedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isContactsOpen) {
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed !== "") {
      const delayDebounceFn = setTimeout(() => {
        searchUsers(trimmed, { fetchAll: false });
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }

    fetchRecentChats(filter);
  }, [
    searchQuery,
    filter,
    isContactsOpen,
    fetchAllUsers,
    fetchRecentChats,
    searchUsers,
  ]);

  useEffect(() => {
    if (!isContactsOpen) {
      return;
    }

    const trimmed = contactsSearchQuery.trim();
    if (trimmed !== "") {
      const delayDebounceFn = setTimeout(() => {
        searchUsers(trimmed, { fetchAll: true });
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }

    fetchAllUsers();
  }, [contactsSearchQuery, isContactsOpen, fetchAllUsers, searchUsers]);

  useEffect(() => {
    return () => {
      if (contactSeedTimerRef.current !== null) {
        window.clearTimeout(contactSeedTimerRef.current);
      }
    };
  }, []);

  const { pinnedUsers, regularUsers } = useMemo(() => {
    if (searchQuery.trim() !== "") {
      return { pinnedUsers: [], regularUsers: users };
    }
    return {
      pinnedUsers: users.filter((u) => u.isPinned),
      regularUsers: users.filter((u) => !u.isPinned),
    };
  }, [users, searchQuery]);

  const unreadChatsCount = useMemo(() => {
    return users.filter((u) => (u.unreadCount ?? 0) > 0).length;
  }, [users]);

  const handleCloseContacts = () => {
    setIsContactsOpen(false);
    setContactsSearchQuery("");
  };

  const handleSelectContact = (user: User) => {
    onSelectUser(user);
    handleCloseContacts();

    // Closing contacts triggers a recent-list fetch that can briefly clear
    // the sidebar; seed the selected user right after to keep UI immediate.
    if (contactSeedTimerRef.current !== null) {
      window.clearTimeout(contactSeedTimerRef.current);
    }

    contactSeedTimerRef.current = window.setTimeout(() => {
      seedRecentUser(user);
      contactSeedTimerRef.current = null;
    }, 0);
  };

  return (
    <aside className="relative w-80 h-full border-r border-[rgb(var(--app-border))] bg-[rgb(var(--app-bg))] flex flex-col overflow-hidden transition-colors duration-200">
      <div className="p-4 flex flex-col gap-3">
        <SidebarHeader onOpenContacts={() => setIsContactsOpen(true)} />
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <>
        <div className="flex items-center gap-2 px-4 mb-3">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${filter === "all"
              ? "bg-[rgb(var(--app-accent))] text-white shadow-sm"
              : "bg-[rgb(var(--app-border))] text-[rgb(var(--app-text-muted))] hover:opacity-80"
              }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-2 ${filter === "unread"
              ? "bg-[rgb(var(--app-accent))] text-white shadow-sm"
              : "bg-[rgb(var(--app-border))] text-[rgb(var(--app-text-muted))] hover:opacity-80"
              }`}
          >
            Unread
            {unreadChatsCount > 0 && (
              <span
                className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] ${filter === "unread"
                  ? "bg-white text-[rgb(var(--app-accent))]"
                  : "bg-[rgb(var(--app-accent))] text-white"
                  }`}
              >
                {unreadChatsCount}
              </span>
            )}
          </button>
        </div>
        <hr className="border-[rgb(var(--app-border))] mx-4 opacity-50 mb-1" />
      </>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        {/* --- PINNED SECTION --- */}
        {pinnedUsers.length > 0 && (
          <div className="mb-2">
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--app-text-muted))] opacity-60">
                Pinned Chats
              </span>
            </div>
            <UserList
              users={pinnedUsers}
              hasMore={false} // Don't paginate pinned section
              loadMore={() => { }}
              searchQuery={searchQuery}
              selectedUserId={selectedUserId}
              currentUserId={currentUserId}
              onSelectUser={onSelectUser}
            />
            <div className="px-4 mt-2">
              <div className="h-px bg-[rgb(var(--app-border))] opacity-50" />
            </div>
          </div>
        )}

        {/* --- REGULAR LIST AREA --- */}
        <UserList
          users={regularUsers}
          hasMore={hasMore}
          loadMore={() => loadMore(filter)}
          searchQuery={searchQuery}
          selectedUserId={selectedUserId}
          currentUserId={currentUserId}
          onSelectUser={onSelectUser}
        />

        {filter === "unread" && users.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <p className="text-sm text-[rgb(var(--app-text-muted))] opacity-60">
              No unread messages
            </p>
          </div>
        )}
      </div>

      <div
        className={`absolute inset-0 z-30 flex flex-col bg-[rgb(var(--app-bg))] transition-transform duration-300 ease-out ${isContactsOpen
          ? "translate-x-0 shadow-[24px_0_60px_rgba(15,23,42,0.18)]"
          : "-translate-x-full pointer-events-none"
          }`}
      >
        <div className="border-b border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface))] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleCloseContacts}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--app-border))] bg-[rgb(var(--app-text))]/5 text-[rgb(var(--app-text))]/70 transition-colors hover:bg-[rgb(var(--app-accent))]/10 hover:text-[rgb(var(--app-text))]"
                aria-label="Close contacts panel"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-base font-bold tracking-tight text-[rgb(var(--app-text))]">
                  New chat
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[rgb(var(--app-text))]/35">
                  Browse contacts
                </p>
              </div>
            </div>

            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--app-accent))]/10 text-[rgb(var(--app-accent))] shadow-sm">
              <UserPlus size={16} />
            </div>
          </div>

          <div className="mt-4">
            <SearchBar
              value={contactsSearchQuery}
              onChange={setContactsSearchQuery}
              placeholder="Search users..."
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[rgb(var(--app-bg))] pr-1">
          <UserList
            users={users}
            hasMore={hasMore}
            loadMore={() => loadMore()}
            searchQuery={contactsSearchQuery}
            selectedUserId={selectedUserId}
            currentUserId={currentUserId}
            onSelectUser={handleSelectContact}
          />
        </div>
      </div>
    </aside>
  );
}
