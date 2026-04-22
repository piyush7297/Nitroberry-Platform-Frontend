"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import UserItem from "./UserItem";
import { User } from "../../../types/chat";

interface UserListProps {
  users: User[];
  hasMore: boolean;
  // UPDATE: Accept an optional filter string (e.g., "all" | "unread")
  loadMore: (filter?: string) => void;
  searchQuery: string;
  selectedUserId?: string;
  currentUserId: string;
  onSelectUser: (user: User) => void;
}

export default function UserList({
  users,
  hasMore,
  loadMore,
  searchQuery,
  selectedUserId,
  currentUserId,
  onSelectUser,
}: UserListProps) {
  const [isFetching, setIsFetching] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  // Reset fetching state when users list updates
  useEffect(() => {
    setIsFetching(false);
  }, [users]);

  const lastUserElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetching) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          // If the loader/bottom element is visible and there is more data to fetch
          if (entries[0].isIntersecting && hasMore) {
            setIsFetching(true);
            loadMore(); // This calls the function passed from Sidebar
          }
        },
        { threshold: 0.1 },
      );

      if (node) observer.current.observe(node);
    },
    [isFetching, hasMore, loadMore],
  );

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 opacity-40 text-center text-[rgb(var(--app-text))]">
        <Search size={32} />
        <p className="text-xs uppercase mt-2">
          {searchQuery ? `No results for "${searchQuery}"` : "No users found"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-col">
        {users.map((user) => {
          const userId = String(user._id || user.id || "");

          return (
            <UserItem
              key={userId}
              user={user}
              isActive={selectedUserId === userId}
              onClick={() => onSelectUser(user)}
              currentUserId={currentUserId}
            />
          );
        })}

        {/* Infinite Scroll Trigger & Loader */}
        {hasMore && (
          <div ref={lastUserElementRef} className="p-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--app-accent))] opacity-50" />
          </div>
        )}
      </div>
    </div>
  );
}
