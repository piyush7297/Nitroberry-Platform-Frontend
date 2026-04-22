"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { useParams } from "next/navigation";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery, useApiMutation, useStatusMutation } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HTTP_METHODS } from "@/api/methods";
import { PRIORITY_ENUM, TaskTypeEnum } from "@/lib/enums/routes.enum";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import {
  CommentItem,
  EmojiPickerButton,
  MentionAutocomplete,
  convertMentionsToIds,
  type User,
} from "./comments";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, getStatusInfo, STATUSTABLE } from "@/lib/utils";
import { TaskStatusEnum } from "@/shared/enums/routes.enum";
import { toast } from "@/hooks/use-toast";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

// Constants
const BREADCRUMBS = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Tasks", href: "/dashboard/task" },
  { name: "Task details", href: null },
];

const TASK_TYPE_LABELS: Record<number, string> = {
  [TaskTypeEnum.HELP]: "Help Tickets",
  [TaskTypeEnum.DELEGATION]: "Delegations",
  [TaskTypeEnum.RECURRING]: "Recurring",
  [TaskTypeEnum.FLOW]: "Flow",
  [TaskTypeEnum.DRAFT_INDENT]: "Draft Indent",
} as const;

const DEFAULT_COMMENT_LIMIT = 10;

const TaskDetailPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState<string>("");
  const [commentStart, setCommentStart] = useState(1);
  const [commentLimit, setCommentLimit] = useState(DEFAULT_COMMENT_LIMIT);
  const [commentUserTags, setCommentUserTags] = useState<string[]>([]);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [searchUsers, setSearchUsers] = useState<string>("");
  const [tempUsersList, setTempUsersList] = useState<User[]>([]);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  const [taskStatus, setTaskStatus] = useState<string>("");
  const [reasonforDelay, setReasonforDelay] = useState<string>("");

  const { hasAccess: canRead } = useModulePermissions(12);

  const { data: userlist } = useApiQuery(
    ["Users", searchUsers],
    `${API_ENDPOINTS.USERS_COMMON}/search?start=1&limit=1000${searchUsers ? `&search=${encodeURIComponent(searchUsers)}` : ""}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  let usersList = userlist?.data?.users || [];
  const { data, isLoading, refetch } = useApiQuery(
    [`TaskDetail-${id}`],
    `${API_ENDPOINTS.TASKS}/${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id,
    } as const,
  );

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useApiQuery(
    [`TaskComments-${id}`, commentStart, commentLimit],
    `${API_ENDPOINTS.TASKS}/comment/${id}?start=${commentStart}&limit=${commentLimit}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id,
    } as const,
  );

  // Accumulate comments when new data is loaded
  useEffect(() => {
    if (commentsData?.data?.task) {
      const newComments = commentsData.data.task;
      if (commentStart === 1) {
        // First load or reset - replace all comments
        setAllComments(newComments);
      } else {
        // Load more - append new comments
        setAllComments((prev) => [...prev, ...newComments]);
      }
      setIsLoadingMore(false);

      // Check if there are more comments to load
      const pagination = commentsData.data.pagination || {};
      const currentPage = pagination.start || commentStart;
      const totalPages = pagination.totalPages || 0;
      setHasMoreComments(currentPage < totalPages);
    }
  }, [commentsData, commentStart]);

  // Reset comments when task ID changes
  useEffect(() => {
    setAllComments([]);
    setCommentStart(1);
    setHasMoreComments(true);
  }, [id]);

  const addCommentMutation = useApiMutation(
    HTTP_METHODS.POST,
    `${API_ENDPOINTS.TASKS}/comment`,
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Comment added successfully",
          variant: "default",
        });
        setComment("");
        setCommentUserTags([]);
        setSearchUsers("");
        setCommentStart(1);
        setAllComments([]);
        setHasMoreComments(true);
        refetchComments();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.message || "Failed to add comment",
          variant: "destructive",
        });
      },
    },
  );

  // Load more comments
  const loadMoreComments = useCallback(() => {
    if (isLoadingMore || !hasMoreComments) return;

    const pagination = commentsData?.data?.pagination || {};
    const currentPage = pagination.start || commentStart;
    const totalPages = pagination.totalPages || 0;

    if (currentPage < totalPages) {
      setIsLoadingMore(true);
      setCommentStart(currentPage + 1);
    }
  }, [isLoadingMore, hasMoreComments, commentsData, commentStart]);

  // Handle scroll for infinite loading
  useEffect(() => {
    const scrollContainer = commentsScrollRef.current;
    if (!scrollContainer || allComments.length === 0 || !hasMoreComments)
      return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Load more when user scrolls to within 100px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingMore) {
        loadMoreComments();
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [loadMoreComments, allComments.length, hasMoreComments, isLoadingMore]);

  const handleSubmitComment = () => {
    if (!comment.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    const commentWithIds = convertMentionsToIds(comment.trim(), tempUsersList);
    addCommentMutation.mutate({
      taskId: id,
      comment: commentWithIds,
      // userTag: commentUserTags,
    });
  };

  const handleCommentUserTagChange = (userIds: string[], user: any) => {
    setCommentUserTags(userIds);
    if (user) {
      setTempUsersList((prev) => {
        if (!prev.find((u) => u.id === user.id)) {
          return [...prev, user];
        }
        return prev;
      });
    }
  };

  const taskInfo = data?.data || {};
  const assignedUsers = taskInfo?.assignedUsers || [];
  const recurringSettings = taskInfo?.recurringSettings || {};
  const commentsPaginationRaw = commentsData?.data?.pagination || {};

  useEffect(() => {
    setTaskStatus(taskInfo?.status?.toString() || "");
  }, [taskInfo]);

  const updateTaskStatus = useStatusMutation(
    HTTP_METHODS.PATCH,
    ({ id }) => `task/${id}`,
  );

  const handleSubmit = () => {
    if (taskInfo?.status === TaskStatusEnum.COMPLETED) {
      toast({
        title: "Error",
        description: "Task is already completed",
        variant: "destructive",
      });
      return;
    } else if (!taskStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }
    updateTaskStatus.mutate(
      { status: taskStatus, reasonForDelay: reasonforDelay, id: id },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Task status updated successfully",
            variant: "default",
          });
          refetch();
          // Invalidate dashboard queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["Dashboard_Stats"] });
          queryClient.invalidateQueries({ queryKey: ["TASKS"] });
          queryClient.invalidateQueries({ queryKey: ["USER_STEP_LIST"] });
        },
        onError: (err) => {
          console.error("Failed to update FMS template:", err);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No data found for this task.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={BREADCRUMBS} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2 capitalize">
            {taskInfo?.title || "Task"}
            {/* {taskInfo?.type && (
              <Badge variant="secondary">
                {TASK_TYPE_LABELS[taskInfo.type] || "Unknown"}
              </Badge>
            )} */}
          </h1>
          {taskInfo?.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {taskInfo.description}
            </p>
          )}
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-sm text-muted-foreground">
        <div>
          <div>Status</div>
          <div className="text-foreground font-medium">
            <Badge
              variant={
                getStatusInfo(STATUSTABLE.TASK_STATUS, taskInfo?.status)
                  ?.variant as any
              }
            >
              {getStatusInfo(STATUSTABLE.TASK_STATUS, taskInfo?.status).name}
            </Badge>
          </div>
        </div>

        <div>
          <div>Created By</div>
          <div className="text-foreground font-medium">
            {taskInfo?.createdByName || "—"}
          </div>
        </div>
        <div>
          <div>Task Type</div>
          <div className="text-foreground font-medium">
            {taskInfo?.type
              ? TASK_TYPE_LABELS[taskInfo.type] || "Unknown"
              : "—"}
          </div>
        </div>
        <div>
          <div>Created On</div>
          <div className="text-foreground font-medium">
            {formatDateTime(taskInfo?.createdAt) || "—"}
          </div>
        </div>
        <div>
          <div>Start Date</div>
          <div className="text-foreground font-medium">
            {formatDateTime(taskInfo?.startDate) || "—"}
          </div>
        </div>
        <div>
          <div>End Date</div>
          <div className="text-foreground font-medium">
            {formatDateTime(taskInfo?.endDate) || "—"}
          </div>
        </div>
        <div>
          <div>Priority</div>
          <div className="text-foreground font-medium">
            {taskInfo?.priority ? PRIORITY_ENUM[taskInfo.priority] || "—" : "—"}
          </div>
        </div>
      </div>

      <Separator />

      {/* Task Additional Details */}
      <div className="bg-gray-50 p-6 rounded-md space-y-10">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          <div className="md:w-1/2">
            <h2 className="text-lg font-semibold mb-1">Assigned Users</h2>
            <p className="text-sm text-muted-foreground">
              Users assigned to this task.
            </p>
          </div>

          <div className="md:w-1/2">
            {assignedUsers.length > 0 ? (
              <div className="flex items-center flex-wrap gap-3 bg-white border p-4 rounded-md">
                {assignedUsers.map((user: any) => {
                  const initials = user.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <div key={user.id} className="flex flex-col items-center">
                      {/* Tooltip Wrapper */}
                      <div className="relative group cursor-pointer">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        {/* Tooltip */}
                        <div
                          className="absolute top-10 left-1/2 -translate-x-1/2 
                  opacity-0 group-hover:opacity-100 transition-opacity
                  bg-gray-900 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-20"
                        >
                          {user.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No users assigned."
                description="No users have been assigned to this task yet."
              />
            )}
          </div>
        </div>

        {/* Recurring Settings */}
        {taskInfo?.type === 2 &&
          recurringSettings &&
          Object.keys(recurringSettings).length > 0 && (
            <div className="flex flex-col md:flex-row md:justify-between gap-6">
              <div className="md:w-1/2">
                <h2 className="text-lg font-semibold mb-1">
                  Recurring Settings
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configuration for recurring task execution.
                </p>
              </div>

              <div className="md:w-1/2">
                <div className="border bg-white p-4 rounded-md">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(recurringSettings, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
      </div>

      <div className="bg-gray-50 p-6 rounded-md">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          {/* Header */}
          <div className="md:w-1/2">
            <h2 className="text-lg font-semibold">Comments</h2>
            <p className="text-sm text-muted-foreground">
              View and add comments for this task.
            </p>
          </div>

          <div className="md:w-1/2">
            {/* Comments Container with Sticky Input */}
            <div className="border bg-white rounded-md flex flex-col h-[500px]">
              {/* Header with Task Name and Total Comments */}
              <div className="border-b px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {taskInfo?.title || "Task"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {commentsPaginationRaw.total || allComments.length || 0}{" "}
                      {commentsPaginationRaw.total === 1
                        ? "comment"
                        : "comments"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comments List - Scrollable */}
              <div
                ref={commentsScrollRef}
                className="flex-1 overflow-y-auto p-4"
              >
                {isLoadingComments && allComments.length === 0 ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : allComments.length > 0 ? (
                  <div className="space-y-4">
                    {allComments.map((commentItem: any, index: number) => (
                      <CommentItem
                        key={commentItem.id || index}
                        comment={commentItem}
                        taskId={id}
                        onRefetch={() => {
                          setAllComments([]);
                          setCommentStart(1);
                          setHasMoreComments(true);
                          refetchComments();
                        }}
                        usersList={usersList}
                        onSearchChange={setSearchUsers}
                      />
                    ))}
                    {/* Loading more skeleton */}
                    {isLoadingMore && (
                      <div className="space-y-3 pt-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    )}
                    {/* End of comments message */}
                    {!hasMoreComments && allComments.length > 10 && (
                      <div className="text-center py-4 text-sm text-gray-500">
                        No more comments to load
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">
                      No comments yet. Be the first to comment!
                    </p>
                  </div>
                )}
              </div>

              {/* Sticky Comment Input at Bottom - Merged with box */}
              <PermissionGuard moduleId={12} action="update">
                <div className="border-t bg-white p-4 sticky bottom-0">
                  <div className="relative">
                    <Textarea
                      ref={commentTextareaRef}
                      placeholder="Write a comment... (Type @ to mention users)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[44px] pr-20 pl-4 py-2 rounded-2xl resize-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />

                    {/* Icons inside input - Right side */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-0.5">
                      {/* Send Button */}
                      <button
                        onClick={handleSubmitComment}
                        disabled={addCommentMutation.isPending || !comment.trim()}
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${comment.trim() && !addCommentMutation.isPending
                            ? "text-gray-900 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                          }`}
                        title="Send comment"
                      >
                        {addCommentMutation.isPending ? (
                          <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                      {/* Emoji Picker */}
                      <EmojiPickerButton
                        onEmojiSelect={(newValue) => setComment(newValue)}
                        textareaRef={commentTextareaRef}
                      />
                    </div>

                    <MentionAutocomplete
                      value={comment}
                      onChange={setComment}
                      usersList={usersList}
                      textareaRef={commentTextareaRef}
                      onUserSelect={(userId) => {
                        if (!commentUserTags.includes(userId)) {
                          handleCommentUserTagChange(
                            [...commentUserTags, userId],
                            usersList.find((u: any) => u.id === userId),
                          );
                        }
                      }}
                      onSearchChange={setSearchUsers}
                    />
                  </div>
                </div>
              </PermissionGuard>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-md">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          {/* Header */}
          <div className="md:w-1/2">
            <h2 className="text-lg font-semibold">Update Status</h2>
            <p className="text-sm text-muted-foreground">
              Update the status of this task.
            </p>
          </div>
          <div className="md:w-1/2 space-y-4">
            <PermissionGuard moduleId={12} action="update">
              {/* Status Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-sm text-gray-700">
                  Update Status
                </label>
                <Select
                  value={taskStatus || ""}
                  onValueChange={setTaskStatus}
                  disabled={taskInfo?.status === TaskStatusEnum.COMPLETED}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Pending</SelectItem>
                    <SelectItem value="2">Completed</SelectItem>
                    <SelectItem value="3">Missed</SelectItem>
                    <SelectItem value="4">Scheduled</SelectItem>
                    <SelectItem value="5">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reason for Delay */}
              {taskInfo?.endDate && new Date(taskInfo.endDate) < new Date() && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-sm text-gray-700">
                    Reason for delay
                  </label>
                  <Textarea
                    placeholder="Reason for delay..."
                    value={reasonforDelay}
                    onChange={(e) => setReasonforDelay(e.target.value)}
                  />
                </div>
              )}
              {taskInfo?.status !== TaskStatusEnum.COMPLETED && (
                <div className="mt-4">
                  <Button onClick={handleSubmit} variant={"default"}>
                    Submit Updates
                  </Button>
                </div>
              )}
            </PermissionGuard>
          </div>
          {/* Submit Button */}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
// Components
const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex flex-col justify-center items-center text-center h-full min-h-[100px]">
    <h3 className="text-gray-900 font-medium text-lg mb-2">{title}</h3>
    <p className="text-sm text-gray-600">{description}</p>
  </div>
);
