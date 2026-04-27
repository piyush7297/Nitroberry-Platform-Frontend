"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Smile,
  Send,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { useApiMutation } from "@/hooks/useApi";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

// Constants
const MENTION_CONFIG = {
  DEBOUNCE_DELAY: 300,
  MIN_SEARCH_LENGTH: 3,
  MAX_SUGGESTIONS: 5,
} as const;

const SUB_COMMENT_LIMIT = 3;

// Type Definitions
export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

export interface Comment {
  id: string;
  comment: string;
  commentedBy?: string;
  createdAt?: string;
  tagUsers?: Array<{ firstName?: string }>;
  subComments?: any[];
  subPagination?: any;
}

const filterUsersBySearchTerm = (
  users: User[],
  searchTerm: string,
  maxResults: number = MENTION_CONFIG.MAX_SUGGESTIONS,
): User[] => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return users
    .filter((user) => {
      const firstName = (user.firstName || "").toLowerCase();
      const lastName = (user.lastName || "").toLowerCase();
      const fullName =
        firstName && lastName
          ? `${firstName} ${lastName}`
          : firstName || lastName;
      const userName = (user.name || fullName || "").toLowerCase();
      return (
        userName.includes(lowerSearchTerm) ||
        firstName.includes(lowerSearchTerm) ||
        lastName.includes(lowerSearchTerm)
      );
    })
    .slice(0, maxResults);
};

export const convertMentionsToIds = (
  commentText: string,
  usersList: User[],
): string => {
  // Replace @firstName lastName/@firstName/@name with @userId
  let convertedText = commentText;
  usersList.forEach((user) => {
    // Try full name first (firstName + lastName)
    if (user.firstName && user.lastName) {
      const fullName = `${user.firstName} ${user.lastName}`;
      const mentionPattern = new RegExp(
        `@${fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
        "g",
      );
      convertedText = convertedText.replace(mentionPattern, `@${user.id}`);
    }
    // Then try firstName only
    if (user.firstName) {
      const mentionPattern = new RegExp(
        `@${user.firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
        "g",
      );
      convertedText = convertedText.replace(mentionPattern, `@${user.id}`);
    }
    // Finally try name as fallback
    if (user.name) {
      const mentionPattern = new RegExp(
        `@${user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
        "g",
      );
      convertedText = convertedText.replace(mentionPattern, `@${user.id}`);
    }
  });
  return convertedText;
};

const calculatePaginationNext = (paginationRaw: any, currentStart: number) => {
  const currentPage = paginationRaw.start || currentStart;
  const totalPages = paginationRaw.totalPages || 0;
  const hasNextPage = currentPage < totalPages;
  return {
    ...paginationRaw,
    next: hasNextPage ? currentPage + 1 : undefined,
  };
};

// Helper function to get initials from name
const getInitials = (name: string | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Helper function to format relative time (Facebook style)
const formatRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Components
interface CommentItemProps {
  comment: Comment;
  taskId: string | string[] | undefined;
  onRefetch: () => void;
  usersList: User[];
  onSearchChange: (searchTerm: string) => void;
}

export const CommentItem = ({
  comment,
  taskId,
  onRefetch,
  usersList,
  onSearchChange,
}: CommentItemProps) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const commenterName = comment.commentedBy || "Unknown User";
  const initials = getInitials(commenterName);

  return (
    <div className="flex gap-2">
      <div className="flex-1 min-w-0">
        {/* Name/Initials Below Comment Message */}
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col w-full">
            {/* Name + Time */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900">
                {commenterName}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>

            {/* Comment */}
            <div className="bg-gray-100 rounded-xl px-3 py-2 inline-block mt-1">
              <div
                className="text-xs text-gray-900 whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: comment.comment || "—" }}
              ></div>
            </div>

            {/* Reply button */}
            <PermissionGuard moduleId={12} action="update">
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="self-start text-xs font-semibold text-gray-600 hover:text-gray-900 px-0 py-1 transition-colors"
              >
                Reply
              </button>
            </PermissionGuard>
            <SubCommentSection
              commentId={comment.id}
              taskId={taskId}
              initialSubComments={comment.subComments || []}
              initialSubPagination={comment.subPagination || {}}
              onRefetch={onRefetch}
              usersList={usersList}
              onSearchChange={onSearchChange}
              showReplyForm={showReplyForm}
              onReplyFormToggle={setShowReplyForm}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface SubCommentItemProps {
  subComment: Comment;
}

const SubCommentItem = ({ subComment }: SubCommentItemProps) => {
  const commenterName = subComment.commentedBy || "Unknown User";
  const initials = getInitials(commenterName);

  return (
    <div className="flex gap-2 py-2">
      {/* Avatar */}

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        {/* Comment Bubble */}

        {/* Name/Initials Below Comment Message */}
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-blue-500 text-white text-[10px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            {/* Name + time */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-gray-900">
                {commenterName}
              </span>
              <span className="text-[10px] text-gray-500">
                {formatRelativeTime(subComment.createdAt)}
              </span>
            </div>

            {/* Comment bubble */}
            <div className="bg-gray-100 rounded-xl px-3 py-2 inline-block mt-1">
              <div
                className="text-xs text-gray-900 whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{
                  __html: subComment.comment || "—",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export const EmojiPickerButton = ({
  onEmojiSelect,
  textareaRef,
}: EmojiPickerButtonProps) => {
  const handleEmojiClick = (emojiData: any) => {
    const emoji = emojiData.emoji;
    if (textareaRef?.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      textarea.value = newText;
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      textarea.focus();
      onEmojiSelect(newText);
    } else {
      onEmojiSelect(emoji);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0" align="start">
        <EmojiPicker onEmojiClick={handleEmojiClick} />
      </PopoverContent>
    </Popover>
  );
};

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  usersList: User[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onUserSelect: (userId: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSearchChange?: (searchTerm: string) => void;
}

export const MentionAutocomplete = ({
  value,
  onChange,
  usersList,
  textareaRef,
  onUserSelect,
  onKeyDown,
  onSearchChange,
}: MentionAutocompleteProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  const previousSearchTermRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchTermRef = useRef<string>("");

  // Update ref when callback changes
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Update suggestions when usersList changes (only if we're showing suggestions)
  useEffect(() => {
    if (mentionStart === null || !showSuggestions || !textareaRef.current)
      return;

    // Read current search term from textarea to ensure it's up-to-date
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpaceOrNewline = /[\s\n]/.test(textAfterAt);

      if (!hasSpaceOrNewline) {
        const searchTerm = textAfterAt;
        currentSearchTermRef.current = searchTerm;
        const filtered = filterUsersBySearchTerm(usersList, searchTerm);

        setSuggestions(filtered);
        setSelectedIndex(0);
      }
    }
  }, [usersList, value, mentionStart, showSuggestions]);

  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpaceOrNewline = /[\s\n]/.test(textAfterAt);

      if (!hasSpaceOrNewline) {
        const searchTerm = textAfterAt;
        currentSearchTermRef.current = searchTerm;

        // Show suggestions immediately (filter from existing usersList)
        const filtered = filterUsersBySearchTerm(usersList, searchTerm);

        setSuggestions(filtered);
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);

        // Only trigger API search after 3 characters with debouncing
        // Clear previous debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Only trigger API call if search term meets minimum length or empty (to show all)
        if (
          searchTerm.length >= MENTION_CONFIG.MIN_SEARCH_LENGTH ||
          searchTerm === ""
        ) {
          // Capture searchTerm in closure to use the value at timer creation time
          const capturedSearchTerm = searchTerm;

          // Debounce the API call
          debounceTimerRef.current = setTimeout(() => {
            if (onSearchChangeRef.current) {
              // Only call if the captured term is still different from previous
              if (previousSearchTermRef.current !== capturedSearchTerm) {
                onSearchChangeRef.current(capturedSearchTerm);
                previousSearchTermRef.current = capturedSearchTerm;
              }
            }
          }, MENTION_CONFIG.DEBOUNCE_DELAY);
        } else {
          // Clear search if less than 3 characters
          if (
            previousSearchTermRef.current !== "" &&
            onSearchChangeRef.current
          ) {
            onSearchChangeRef.current("");
            previousSearchTermRef.current = "";
          }
        }
        return;
      }
    }

    // Clear search when mention is closed (no @ found or mention ended)
    if (
      onSearchChangeRef.current &&
      mentionStart !== null &&
      previousSearchTermRef.current !== ""
    ) {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      onSearchChangeRef.current("");
      previousSearchTermRef.current = "";
    }
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(null);

    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  const handleUserSelect = (user: any) => {
    if (!textareaRef.current || mentionStart === null) return;

    const textarea = textareaRef.current;
    const textBeforeMention = value.substring(0, mentionStart);
    const textAfterCursor = value.substring(textarea.selectionStart);
    // Use full name (firstName + lastName) if available, otherwise fallback to firstName or name
    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.name || "";
    const newValue = textBeforeMention + `@${userName} ` + textAfterCursor;

    onChange(newValue);
    onUserSelect(user.id);

    // Clear search when user is selected
    if (onSearchChangeRef.current && previousSearchTermRef.current !== "") {
      onSearchChangeRef.current("");
      previousSearchTermRef.current = "";
    }

    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(null);

    setTimeout(() => {
      if (textareaRef.current && userName) {
        const newCursorPos = textBeforeMention.length + userName.length + 2;
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        textarea.focus();
      }
    }, 0);
  };

  const mentionStartRef = useRef<number | null>(null);
  useEffect(() => {
    mentionStartRef.current = mentionStart;
  }, [mentionStart]);

  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) {
        onKeyDown?.(e as any);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selectedUser = suggestions[selectedIndex];
        if (
          selectedUser &&
          textareaRef.current &&
          mentionStartRef.current !== null
        ) {
          const textBeforeMention = value.substring(0, mentionStartRef.current);
          const textAfterCursor = value.substring(textarea.selectionStart);
          const userName = selectedUser.firstName || selectedUser.name || "";
          const newValue =
            textBeforeMention + `@${userName} ` + textAfterCursor;

          onChange(newValue);
          onUserSelect(selectedUser.id);

          // Clear search when user is selected
          if (
            onSearchChangeRef.current &&
            previousSearchTermRef.current !== ""
          ) {
            onSearchChangeRef.current("");
            previousSearchTermRef.current = "";
          }

          setShowSuggestions(false);
          setSuggestions([]);
          setMentionStart(null);

          setTimeout(() => {
            if (textareaRef.current && userName) {
              const newCursorPos =
                textBeforeMention.length + userName.length + 2;
              textareaRef.current.selectionStart =
                textareaRef.current.selectionEnd = newCursorPos;
              textareaRef.current.focus();
            }
          }, 0);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (onSearchChangeRef.current && previousSearchTermRef.current !== "") {
          onSearchChangeRef.current("");
          previousSearchTermRef.current = "";
        }
        setShowSuggestions(false);
      } else {
        onKeyDown?.(e as any);
      }
    };

    textarea.addEventListener("keydown", handleKeyDown);
    return () => {
      textarea.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showSuggestions,
    suggestions,
    selectedIndex,
    onKeyDown,
    value,
    onChange,
    onUserSelect,
  ]);

  if (!showSuggestions || suggestions.length === 0) return null;

  return (
    <div
      ref={suggestionsRef}
      className="absolute z-50 w-64 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
      style={{
        top: textareaRef.current
          ? `${
              textareaRef.current.offsetTop +
              textareaRef.current.offsetHeight +
              4
            }px`
          : "auto",
        left: textareaRef.current
          ? `${textareaRef.current.offsetLeft}px`
          : "auto",
      }}
    >
      {suggestions.map((user, index) => (
        <div
          key={user.id || index}
          onClick={() => handleUserSelect(user)}
          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
            index === selectedIndex ? "bg-gray-100" : ""
          }`}
        >
          <div className="text-sm font-medium text-gray-900">
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName || user.name || "Unknown User"}
          </div>
          {user.email && (
            <div className="text-xs text-gray-500">{user.email}</div>
          )}
        </div>
      ))}
    </div>
  );
};

interface ReplyFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  usersList: User[];
  onUserTagChange: (userIds: string[], user?: any) => void;
  onSearchChange?: (searchTerm: string) => void;
}

const ReplyForm = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  usersList,
  onUserTagChange,
  onSearchChange,
}: ReplyFormProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);

  const handleEmojiSelect = (newValue: string) => {
    onChange(newValue);
  };

  const handleUserSelect = (userId: string) => {
    const newTaggedIds = [...taggedUserIds, userId];
    setTaggedUserIds(newTaggedIds);
    const user = usersList.find((u: any) => u.id === userId);
    onUserTagChange(newTaggedIds, user);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        placeholder="Write a reply... (Type @ to mention users)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] text-sm pr-20 pl-4 py-2 rounded-2xl resize-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      {/* Icons inside input - Right side */}
      <div className="absolute bottom-2 right-2 flex items-center gap-0.5">
        {/* Send Button */}
        <button
          onClick={onSubmit}
          disabled={isSubmitting || !value.trim()}
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
            value.trim() && !isSubmitting
              ? "text-gray-900 cursor-pointer"
              : "text-gray-400 cursor-not-allowed"
          }`}
          title="Send reply"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>

        {/* Emoji Picker */}
        <EmojiPickerButton
          onEmojiSelect={handleEmojiSelect}
          textareaRef={textareaRef}
        />
      </div>

      <MentionAutocomplete
        value={value}
        onChange={onChange}
        usersList={usersList}
        textareaRef={textareaRef}
        onUserSelect={handleUserSelect}
        onSearchChange={onSearchChange}
      />
    </div>
  );
};

interface SubCommentSectionProps {
  commentId: string;
  taskId: string | string[] | undefined;
  initialSubComments: Comment[];
  initialSubPagination: any;
  onRefetch: () => void;
  usersList: User[];
  onSearchChange?: (searchTerm: string) => void;
  showReplyForm?: boolean;
  onReplyFormToggle?: (show: boolean) => void;
}

const SubCommentSection = ({
  commentId,
  taskId,
  initialSubComments,
  initialSubPagination,
  onRefetch,
  usersList,
  onSearchChange,
  showReplyForm: externalShowReplyForm,
  onReplyFormToggle,
}: SubCommentSectionProps) => {
  const [subCommentText, setSubCommentText] = useState<string>("");
  const [showSubComments, setShowSubComments] = useState(false);
  const [internalShowReplyForm, setInternalShowReplyForm] = useState(false);
  const [subCommentStart, setSubCommentStart] = useState(1);
  const [subCommentUserTags, setSubCommentUserTags] = useState<string[]>([]);
  const [subCommentTempUsersList, setSubCommentTempUsersList] = useState<
    User[]
  >([]);
  const [allSubComments, setAllSubComments] = useState<any[]>([]);
  const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false);

  // Initialize sub-comments when initialSubComments changes
  useEffect(() => {
    if (
      subCommentStart === 1 &&
      initialSubComments &&
      initialSubComments.length > 0
    ) {
      // First load - use initial sub-comments
      setAllSubComments(initialSubComments);
    }
  }, [initialSubComments, subCommentStart]);

  // Use external state if provided, otherwise use internal state
  const showReplyForm =
    externalShowReplyForm !== undefined
      ? externalShowReplyForm
      : internalShowReplyForm;

  const setShowReplyForm = onReplyFormToggle || setInternalShowReplyForm;

  const addSubCommentMutation = useApiMutation(
    HTTP_METHODS.POST,
    `${API_ENDPOINTS.TASKS}/comment`,
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Reply added successfully",
          variant: "default",
        });
        setSubCommentText("");
        setSubCommentUserTags([]);
        setSubCommentTempUsersList([]);
        setShowReplyForm(false);
        setSubCommentStart(1);
        setAllSubComments([]);
        onSearchChange?.("");
        onRefetch?.();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.message || "Failed to add reply",
          variant: "destructive",
        });
      },
    },
  );

  const handleSubmitSubComment = () => {
    if (!subCommentText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a reply",
        variant: "destructive",
      });
      return;
    }

    const commentWithIds = convertMentionsToIds(
      subCommentText.trim(),
      subCommentTempUsersList,
    );
    addSubCommentMutation.mutate({
      taskId,
      comment: commentWithIds,
      parentCommentId: commentId,
      // userTag: subCommentUserTags,
    });
  };

  const handleSubCommentUserTagChange = (userIds: string[], user?: any) => {
    setSubCommentUserTags(userIds);
    if (user) {
      setSubCommentTempUsersList((prev) => {
        if (!prev.find((u) => u.id === user.id)) {
          return [...prev, user];
        }
        return prev;
      });
    }
  };

  const handleCancelReply = () => {
    setShowReplyForm(false);
    setSubCommentText("");
    setSubCommentTempUsersList([]);
    onSearchChange?.("");
  };

  const subComments =
    allSubComments.length > 0 ? allSubComments : initialSubComments || [];
  const subPaginationRaw = initialSubPagination || {};
  const subPagination = calculatePaginationNext(
    subPaginationRaw,
    subCommentStart,
  );
  const hasSubComments =
    (subPaginationRaw.total || 0) > 0 || subComments.length > 0;
  const replyCount = subPaginationRaw.total || subComments.length;

  const handleLoadMoreReplies = () => {
    if (subPagination.next && !isLoadingMoreReplies) {
      setIsLoadingMoreReplies(true);
      setSubCommentStart(subPagination.next);
      // Refetch parent comments to get updated sub-comments with new pagination
      onRefetch?.();
    }
  };

  return (
    <div className="">
      {/* View Replies Button */}
      {replyCount > 0 && (
        <button
          onClick={() => setShowSubComments(!showSubComments)}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-0 py-1 mb-2 flex items-center gap-1 transition-colors"
        >
          {showSubComments ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Hide {replyCount === 1 ? "reply" : "replies"}
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              View {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </>
          )}
        </button>
      )}

      {/* Replies List */}
      {showSubComments && subComments.length > 0 && (
        <div className="space-y-1 mb-2">
          {subComments.map((subComment: any, subIndex: number) => (
            <SubCommentItem
              key={subComment.id || subIndex}
              subComment={subComment}
            />
          ))}

          {/* Load More Replies Button */}
          {hasSubComments &&
            subPagination.totalPages > 1 &&
            subPagination.next && (
              <button
                onClick={handleLoadMoreReplies}
                disabled={true}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-0 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMoreReplies ? "Loading..." : "Load more replies"}
              </button>
            )}
        </div>
      )}

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-2">
          <PermissionGuard moduleId={12} action="update">
            <ReplyForm
              value={subCommentText}
              onChange={setSubCommentText}
              onSubmit={handleSubmitSubComment}
              onCancel={handleCancelReply}
              isSubmitting={addSubCommentMutation.isPending}
              usersList={usersList}
              onUserTagChange={handleSubCommentUserTagChange}
              onSearchChange={onSearchChange}
            />
          </PermissionGuard>
        </div>
      )}
    </div>
  );
};
