import { useState, useEffect, useCallback } from "react";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { MESSAGE_TYPES } from "../constants/chat";
import { notify } from "../utils/toast";

export const useChat = (socket: any, activeUser: any) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const activeUserId = String(activeUser?._id || activeUser?.id || "");

  const sendMessage = useCallback(
    (content: string, type: number = MESSAGE_TYPES.TEXT) => {
      if (!content.trim() || !socket || !activeUserId) return;

      // Optimistic update: render message immediately before server confirms.
      const optimisticMsg = {
        _id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        content: content.trim(),
        sender: "me",
        receiverId: activeUserId,
        createdAt: new Date().toISOString(),
        messageType: type,
        status: "sending",
        readStatus: [],
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        receiverId: activeUserId,
        content: content.trim(),
        type: type,
      });
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { receiverId: activeUserId });
    },
    [activeUserId, socket],
  );

  const loadMore = useCallback(() => {
    if (
      isLoading ||
      !hasMore ||
      !socket ||
      !activeUserId ||
      messages.length === 0
    )
      return;

    setIsLoading(true);
    const nextPage = page + 1;
    socket.emit(SOCKET_EVENTS.REQUEST_MESSAGE_LIST, {
      receiverId: activeUserId,
      pageIndex: nextPage,
    });
    setPage(nextPage);
  }, [activeUserId, hasMore, isLoading, messages.length, page, socket]);

  useEffect(() => {
    if (!socket || !activeUserId) return;

    // Must match SocketContext.tsx — payload?.data fallback is critical for
    // server responses that wrap the message as { data: { sender, content, ... } }.
    // Without it, msg.sender is undefined and the message is silently dropped.
    const normalizeSocketMessage = (payload: any) =>
      payload?.message || payload?.data?.message || payload?.data || payload;

    const getMessageId = (message: any) =>
      String(message?._id || message?.id || "");

    const buildFallbackMessageId = (
      message: any,
      senderId: string,
      receiverId: string,
      scope: string,
    ) => {
      const createdAt = String(
        message?.createdAt || message?.updatedAt || Date.now(),
      );
      const snippet = String(message?.content || "").slice(0, 24);
      return `${scope}_${senderId || "unknown"}_${receiverId || "unknown"}_${createdAt}_${snippet}`;
    };

    const ensureMessageId = (
      message: any,
      senderId: string,
      receiverId: string,
      scope: string,
    ) => {
      const normalizedCreatedAt =
        message?.createdAt || message?.updatedAt || new Date().toISOString();

      const messageId = getMessageId(message);
      if (messageId) {
        return {
          ...message,
          _id: messageId,
          createdAt: normalizedCreatedAt,
        };
      }

      return {
        ...message,
        _id: buildFallbackMessageId(message, senderId, receiverId, scope),
        createdAt: normalizedCreatedAt,
      };
    };

    const requestLatestMessages = () => {
      socket.emit(SOCKET_EVENTS.REQUEST_MESSAGE_LIST, {
        receiverId: activeUserId,
        pageIndex: 0,
      });
    };

    setMessages([]);
    setPage(0);
    setHasMore(true);
    setIsLoading(true);

    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    requestLatestMessages();

    socket.emit(SOCKET_EVENTS.MARK_MESSAGE_READ, {
      senderId: activeUserId,
    });

    const handleHistory = (response: any) => {
      clearTimeout(loadingTimeout);
      if (response.status === 200) {
        const incomingRaw = response.messageList || [];
        const incoming = incomingRaw.map((m: any, index: number) => {
          const senderId =
            m?.senderId ||
            m?.fromUserId ||
            m?.from ||
            (typeof m?.sender === "object" ? m?.sender?._id : m?.sender);
          const receiverId =
            m?.receiverId ||
            m?.receivedId ||
            m?.toUserId ||
            m?.to ||
            m?.targetUserId ||
            (typeof m?.receiver === "object" ? m?.receiver?._id : m?.receiver);

          return ensureMessageId(
            m,
            String(senderId || ""),
            String(receiverId || ""),
            `history_${index}`,
          );
        });

        const pagin = response.pagination;
        if (pagin) {
          const currentPage = Number(pagin.page ?? pagin.pageIndex ?? 0);
          const totalPages = Number(pagin.pages ?? pagin.totalPages ?? 0);
          setHasMore(currentPage < totalPages);
        } else {
          setHasMore(incoming.length > 0);
        }

        setMessages((prev) => {
          // Strip any optimistic temp entries before merging server data.
          const stableMessages = prev.filter(
            (m) => !getMessageId(m).startsWith("temp_"),
          );

          const combined = [...incoming, ...stableMessages].map(
            (m: any, index: number) => {
              const senderId =
                m?.senderId ||
                m?.fromUserId ||
                m?.from ||
                (typeof m?.sender === "object" ? m?.sender?._id : m?.sender);
              const receiverId =
                m?.receiverId ||
                m?.receivedId ||
                m?.toUserId ||
                m?.to ||
                m?.targetUserId ||
                (typeof m?.receiver === "object"
                  ? m?.receiver?._id
                  : m?.receiver);

              return ensureMessageId(
                m,
                String(senderId || ""),
                String(receiverId || ""),
                `combined_${index}`,
              );
            },
          );

          const deduped = Array.from(
            new Map(combined.map((m) => [getMessageId(m), m])).values(),
          );

          return deduped.sort((a: any, b: any) => {
            const aTime = new Date(a?.createdAt || 0).getTime();
            const bTime = new Date(b?.createdAt || 0).getTime();
            return aTime - bTime;
          });
        });
      }
      setIsLoading(false);
    };

    const handleNewMessage = (payload: any) => {
      const rawMsg = normalizeSocketMessage(payload);
      if (!rawMsg) return;

      const senderId =
        rawMsg?.senderId ||
        rawMsg?.fromUserId ||
        rawMsg?.from ||
        (typeof rawMsg?.sender === "object"
          ? rawMsg?.sender?._id
          : rawMsg?.sender);
      const receiverId =
        rawMsg?.receiverId ||
        rawMsg?.receivedId ||
        rawMsg?.toUserId ||
        rawMsg?.to ||
        rawMsg?.targetUserId ||
        (typeof rawMsg?.receiver === "object"
          ? rawMsg?.receiver?._id
          : rawMsg?.receiver);

      const msg = ensureMessageId(
        rawMsg,
        String(senderId || ""),
        String(receiverId || ""),
        "live",
      );

      // isFromActiveUser: message was sent BY the person we're chatting with.
      // isToActiveUser: message was sent TO the person we're chatting with (own echo).
      const isFromActiveUser = String(senderId || "") === activeUserId;
      const isToActiveUser = String(receiverId || "") === activeUserId;

      if (isFromActiveUser || isToActiveUser) {
        setMessages((prev) => {
          const msgId = getMessageId(msg);
          if (prev.some((m) => getMessageId(m) === msgId)) return prev;

          return [...prev, msg].sort(
            (a: any, b: any) =>
              new Date(a?.createdAt || 0).getTime() -
              new Date(b?.createdAt || 0).getTime(),
          );
        });

        if (isFromActiveUser) {
          socket.emit(SOCKET_EVENTS.MARK_MESSAGE_READ, {
            senderId: senderId,
            chatId: msg.chatId,
          });
        }
      }
    };

    const handleSentSuccess = (payload: any) => {
      const rawMsg = normalizeSocketMessage(payload);

      const senderId =
        rawMsg?.senderId ||
        rawMsg?.fromUserId ||
        rawMsg?.from ||
        (typeof rawMsg?.sender === "object"
          ? rawMsg?.sender?._id
          : rawMsg?.sender);
      const receiverId =
        rawMsg?.receiverId ||
        rawMsg?.receivedId ||
        rawMsg?.toUserId ||
        rawMsg?.to ||
        rawMsg?.targetUserId ||
        (typeof rawMsg?.receiver === "object"
          ? rawMsg?.receiver?._id
          : rawMsg?.receiver);

      const msg = ensureMessageId(
        rawMsg,
        String(senderId || ""),
        String(receiverId || activeUserId || ""),
        "ack",
      );

      const msgId = getMessageId(msg);

      if (msgId && msg?.content) {
        // Full message in ACK: replace temp optimistic entry with confirmed data.
        setMessages((prev) => {
          const withoutTemp = prev.filter(
            (m) => !getMessageId(m).startsWith("temp_"),
          );
          if (withoutTemp.some((m) => getMessageId(m) === msgId))
            return withoutTemp;
          return [...withoutTemp, msg].sort(
            (a: any, b: any) =>
              new Date(a?.createdAt || 0).getTime() -
              new Date(b?.createdAt || 0).getTime(),
          );
        });
        return;
      }

      // Minimal ACK (only _id/chatId): fetch latest history to confirm real message
      // and strip the optimistic temp entry at the same time.
      requestLatestMessages();
    };

    const handleStatusUpdate = (data: any) => {
      setMessages((prev) => {
        return prev.map((m) => {
          const isCorrectChat = String(m.chatId) === String(data.chatId);

          if (!isCorrectChat) {
            return m;
          }

          if (data.status === "seen" && m.status !== "seen") {
            return {
              ...m,
              status: "seen",
            };
          }

          if (data.status === "delivered" && m.status === "sent") {
            return {
              ...m,
              status: "delivered",
            };
          }

          return m;
        });
      });
    };

    const handleSendError = (payload: any) => {
      const message = payload?.message || "Failed to send message";
      notify.error(message);
    };

    const handleSocketReconnect = () => {
      // Resync thread after transient disconnects to avoid missed live events.
      requestLatestMessages();
    };

    const handleVisibilityResync = () => {
      requestLatestMessages();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestLatestMessages();
      }
    };

    socket.on(SOCKET_EVENTS.CONNECT, handleSocketReconnect);
    socket.on(SOCKET_EVENTS.RESPONSE_MESSAGE_LIST, handleHistory);
    // Backward compatibility with older socket server naming.
    socket.on("response-message-history", handleHistory);
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_SENT_SUCCESS, handleSentSuccess);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);
    socket.on(SOCKET_EVENTS.SEND_MESSAGE_ERROR, handleSendError);

    window.addEventListener("focus", handleVisibilityResync);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(loadingTimeout);
      socket.off(SOCKET_EVENTS.RESPONSE_MESSAGE_LIST, handleHistory);
      socket.off("response-message-history", handleHistory);
      socket.off(SOCKET_EVENTS.CONNECT, handleSocketReconnect);
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_SENT_SUCCESS, handleSentSuccess);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);
      socket.off(SOCKET_EVENTS.SEND_MESSAGE_ERROR, handleSendError);
      window.removeEventListener("focus", handleVisibilityResync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeUserId, socket]);

  return { messages, sendMessage, loadMore, hasMore, isLoading };
};
