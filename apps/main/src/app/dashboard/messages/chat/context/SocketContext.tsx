"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io as ClientIO, Socket } from "socket.io-client";
import { User, ChatMessage } from "../types/chat";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { notify } from "../utils/toast";

const PAGE_SIZE = 10;
const SOCKET_TOKEN_COOKIE = "socketToken";
const AUTH_TOKEN_COOKIE = "NitroBerry-Auth";
const AUTH_TOKEN_COOKIE_ALT = "auth_token";
const PIN_TOGGLE_EVENT = "TOGGLE_PIN_CHAT";
const PIN_TOGGLE_RESPONSE_EVENT = "RESPONSE_TOGGLE_PIN";

const getCookieValue = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? null;
  }

  return null;
};

const getUserId = (user?: Partial<User> | null) =>
  String(user?._id || user?.id || "");

const normalizeSocketMessage = (payload: any) =>
  payload?.message || payload?.data?.message || payload?.data || payload;

const getMessagePartyIds = (message: any) => {
  const senderSource =
    message?.senderId ??
    message?.fromUserId ??
    message?.from ??
    (typeof message?.sender === "string"
      ? message.sender
      : message?.sender?._id);

  const receiverSource =
    message?.receiverId ??
    message?.receivedId ??
    message?.toUserId ??
    message?.to ??
    message?.targetUserId ??
    (typeof message?.receiver === "string"
      ? message.receiver
      : message?.receiver?._id);

  return {
    senderId: String(senderSource || ""),
    receiverId: String(receiverSource || ""),
  };
};

const resolveSocketToken = () => {
  const socketToken = getCookieValue(SOCKET_TOKEN_COOKIE);
  if (socketToken) {
    return { token: socketToken, source: SOCKET_TOKEN_COOKIE };
  }

  const authToken = getCookieValue(AUTH_TOKEN_COOKIE);
  if (authToken) {
    return { token: authToken, source: AUTH_TOKEN_COOKIE };
  }

  const altAuthToken = getCookieValue(AUTH_TOKEN_COOKIE_ALT);
  if (altAuthToken) {
    return { token: altAuthToken, source: AUTH_TOKEN_COOKIE_ALT };
  }

  return { token: null, source: "none" };
};

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  users: User[];
  activeUserId: string | null;
  setActiveUserId: (id: string | null) => void;
  loadMore: (filter?: string) => void;
  searchUsers: (query: string, options?: { fetchAll?: boolean }) => void;
  fetchRecentChats: (filter?: string) => void;
  fetchAllUsers: () => void;
  seedRecentUser: (user: User) => void;
  togglePin: (chatId: string, isPinned: boolean, userId: string) => void;
  hasMore: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  users: [],
  activeUserId: null,
  setActiveUserId: () => { },
  loadMore: () => { },
  searchUsers: () => { },
  fetchRecentChats: () => { },
  fetchAllUsers: () => { },
  seedRecentUser: () => { },
  togglePin: () => { },
  hasMore: true,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<"recent" | "all">("recent");
  const searchTermRef = useRef("");
  const hasShownConnectionErrorRef = useRef(false);
  const activeUserIdRef = useRef<string | null>(null);
  const viewModeRef = useRef<"recent" | "all">("recent");
  const usersRef = useRef<User[]>([]);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const updateUserData = useCallback(
    (userId: string, updates: Partial<User>, shouldMoveToTop = false) => {
      setUsers((prevUsers) => {
        const userIndex = prevUsers.findIndex(
          (user) => getUserId(user) === userId,
        );
        if (userIndex === -1) return prevUsers;

        const updatedList = [...prevUsers];
        const currentUser = updatedList[userIndex];

        const updatedUser: User = {
          ...currentUser,
          ...updates,
          lastMessage: updates.lastMessage
            ? {
              ...updates.lastMessage,
              createdAt:
                updates.lastMessage?.createdAt || new Date().toISOString(),
            }
            : currentUser.lastMessage,
        };

        if (shouldMoveToTop) {
          updatedList.splice(userIndex, 1);
          return [updatedUser, ...updatedList];
        } else {
          updatedList[userIndex] = updatedUser;
          return updatedList;
        }
      });
    },
    [],
  );

  const seedRecentUser = useCallback((user: User) => {
    const userId = getUserId(user);
    if (!userId) return;

    const normalizedUser: User = {
      ...user,
      _id: user._id || user.id || userId,
      id: user.id || user._id || userId,
      unreadCount: user.unreadCount ?? 0,
      lastMessage: user.lastMessage ?? null,
    };

    setViewMode("recent");
    searchTermRef.current = "";

    setUsers((prevUsers) => {
      const existingIndex = prevUsers.findIndex(
        (entry) => getUserId(entry) === userId,
      );

      if (existingIndex === -1) {
        return [normalizedUser, ...prevUsers];
      }

      const nextUsers = [...prevUsers];
      const mergedUser: User = {
        ...nextUsers[existingIndex],
        ...normalizedUser,
      };

      nextUsers.splice(existingIndex, 1);
      return [mergedUser, ...nextUsers];
    });
  }, []);

  const togglePin = useCallback(
    (chatId: string, isPinned: boolean, userId: string) => {
      if (socket && isConnected) {
        updateUserData(userId, { isPinned });

        socket.emit(PIN_TOGGLE_EVENT, { chatId: chatId, isPinned });
      }
    },
    [socket, isConnected, updateUserData],
  );

  const fetchRecentChats = useCallback(
    (filter: string = "all") => {
      if (socket && isConnected) {
        setViewMode("recent");
        setPage(0);
        setHasMore(true);
        setUsers([]);
        searchTermRef.current = "";
        socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
          pageIndex: 0,
          pageSize: PAGE_SIZE,
          filter,
        });
      }
    },
    [socket, isConnected],
  );

  const fetchAllUsers = useCallback(() => {
    if (socket && isConnected) {
      setViewMode("all");
      setPage(0);
      setHasMore(true);
      setUsers([]);
      searchTermRef.current = "";
      socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
        pageIndex: 0,
        pageSize: PAGE_SIZE,
        fetchAll: true,
      });
    }
  }, [socket, isConnected]);

  const searchUsers = useCallback(
    (query: string, options?: { fetchAll?: boolean }) => {
      if (socket && isConnected) {
        const shouldFetchAll = options?.fetchAll ?? viewMode === "all";

        setViewMode(shouldFetchAll ? "all" : "recent");
        searchTermRef.current = query;
        setPage(0);
        setHasMore(true);
        setUsers([]);
        socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
          pageIndex: 0,
          pageSize: PAGE_SIZE,
          search: query,
          fetchAll: shouldFetchAll,
        });
      }
    },
    [socket, isConnected, viewMode],
  );

  const loadMore = useCallback(
    (filter?: string) => {
      if (socket && isConnected && hasMore) {
        const nextPage = page + 1;
        socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
          pageIndex: nextPage,
          pageSize: PAGE_SIZE,
          search: searchTermRef.current,
          fetchAll: viewMode === "all",
          ...(viewMode === "recent" && filter ? { filter } : {}),
        });
        setPage(nextPage);
      }
    },
    [socket, isConnected, hasMore, page, viewMode],
  );

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";
    const { token } = resolveSocketToken();

    if (!token) {
      notify.error("Chat connection is off. Missing token.");
      return;
    }

    const socketInstance = ClientIO(socketUrl, {
      // Keep websocket first for low-latency chat, but allow polling fallback
      // so intermittent websocket handshake failures don't break message sync.
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 100,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      hasShownConnectionErrorRef.current = false;

      socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
        pageIndex: 0,
        pageSize: 10,
      });
    };

    const handleConnectError = (error: any) => {
      setIsConnected(false);

      if (!hasShownConnectionErrorRef.current) {
        notify.error(error?.message || "Chat socket connection failed");
        hasShownConnectionErrorRef.current = true;
      }
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
    };

    socket.on(SOCKET_EVENTS.CONNECT, handleConnect);
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);

    const handleResponseUserList = (res: any) => {
      if (res.status === 200) {
        setUsers((prev) => {
          const userMap = new Map(prev.map((user) => [getUserId(user), user]));
          res.data.forEach((user: User) => {
            const userId = getUserId(user);
            if (!userId) return;
            userMap.set(userId, { ...userMap.get(userId), ...user });
          });
          return Array.from(userMap.values());
        });
        setHasMore(res.data.length >= PAGE_SIZE);
      }
    };

    socket.on(SOCKET_EVENTS.RESPONSE_USER_LIST, handleResponseUserList);

    const handlePinToggleResponse = (res: any) => {
      if (res.status === 200) {
        updateUserData(res.userId, { isPinned: res.isPinned });
      }
    };

    socket.on(PIN_TOGGLE_RESPONSE_EVENT, handlePinToggleResponse);

    const handleReceiveMessage = (payload: ChatMessage | any) => {
      const msg = normalizeSocketMessage(payload);
      const { senderId, receiverId } = getMessagePartyIds(msg);

      const shouldRefreshUsers =
        senderId && receiverId
          ? !usersRef.current.some((user) => {
            const id = getUserId(user);
            return id === senderId || id === receiverId;
          })
          : true;

      if (shouldRefreshUsers) {
        socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
          pageIndex: 0,
          pageSize: PAGE_SIZE,
          search: searchTermRef.current,
          fetchAll: viewModeRef.current === "all",
        });
      }

      setUsers((prevUsers) => {
        const senderIndex = senderId
          ? prevUsers.findIndex((user) => getUserId(user) === senderId)
          : -1;
        const receiverIndex = receiverId
          ? prevUsers.findIndex((user) => getUserId(user) === receiverId)
          : -1;

        const userIndex = senderIndex !== -1 ? senderIndex : receiverIndex;
        if (userIndex === -1) return prevUsers;

        const updatedList = [...prevUsers];
        const currentUser = updatedList[userIndex];
        const targetUserId = getUserId(currentUser);
        const isIncomingMessage = senderIndex !== -1;
        const isChatOpen = activeUserIdRef.current === targetUserId;

        const updatedUser: User = {
          ...currentUser,
          lastMessage: msg as any,
          unreadCount: isIncomingMessage
            ? isChatOpen
              ? 0
              : (currentUser.unreadCount || 0) + 1
            : currentUser.unreadCount || 0,
        };

        updatedList.splice(userIndex, 1);
        return [updatedUser, ...updatedList];
      });
    };

    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage);

    const handleMessageSentSuccess = (response: any) => {
      const msg = normalizeSocketMessage(response);
      const { senderId, receiverId } = getMessagePartyIds(msg);
      const targetUserId =
        receiverId || senderId || activeUserIdRef.current || "";

      if (targetUserId && msg?.content) {
        const targetUserExists = usersRef.current.some(
          (user) => getUserId(user) === targetUserId,
        );

        if (targetUserExists) {
          updateUserData(targetUserId, { lastMessage: msg }, true);
          return;
        }
      }

      // If server sends a minimal ACK payload, or target user is not yet
      // in the sidebar list, force a lightweight refresh.
      socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
        pageIndex: 0,
        pageSize: PAGE_SIZE,
        search: searchTermRef.current,
        fetchAll: viewModeRef.current === "all",
      });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_SENT_SUCCESS, handleMessageSentSuccess);

    const handleMessageReadSuccess = (data: any) => {
      updateUserData(data.senderId || data.userId, { unreadCount: 0 }, false);
    };

    socket.on(SOCKET_EVENTS.MESSAGE_READ_SUCCESS, handleMessageReadSuccess);

    const handleUserStatusChanged = (data: any) => {
      updateUserData(data.userId, { isOnline: data.isOnline }, false);
    };

    socket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);

    socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage);
      socket.off(PIN_TOGGLE_RESPONSE_EVENT, handlePinToggleResponse);
      socket.off(SOCKET_EVENTS.MESSAGE_SENT_SUCCESS, handleMessageSentSuccess);
      socket.off(SOCKET_EVENTS.MESSAGE_READ_SUCCESS, handleMessageReadSuccess);
      socket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
      socket.off(SOCKET_EVENTS.CONNECT, handleConnect);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);
      socket.off(SOCKET_EVENTS.RESPONSE_USER_LIST, handleResponseUserList);
      socket.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
    };
  }, [socket, updateUserData]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const refreshUsers = () => {
      socket.emit(SOCKET_EVENTS.REQUEST_USER_LIST, {
        pageIndex: 0,
        pageSize: PAGE_SIZE,
        search: searchTermRef.current,
        fetchAll: viewModeRef.current === "all",
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshUsers();
      }
    };

    window.addEventListener("focus", refreshUsers);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshUsers);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [socket, isConnected]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        users,
        activeUserId,
        setActiveUserId,
        loadMore,
        hasMore,
        searchUsers,
        fetchRecentChats,
        fetchAllUsers,
        seedRecentUser,
        togglePin,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
