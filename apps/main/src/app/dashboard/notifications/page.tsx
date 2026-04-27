"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Video,
  Calendar,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { formatDateTime } from "@/lib/utils";
import { Pagination } from "../users/pagination";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/not-found";
import { Separator } from "@/components/ui/separator";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

// Helper function to determine icon and color based on notification title
const getNotificationIcon = (title: string) => {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("meeting") || lowerTitle.includes("meet")) {
    return { icon: Video, color: "bg-green-500", bgColor: "bg-green-50" };
  }
  if (lowerTitle.includes("session") || lowerTitle.includes("book")) {
    return { icon: Calendar, color: "bg-green-500", bgColor: "bg-green-50" };
  }
  if (lowerTitle.includes("message")) {
    return { icon: MessageCircle, color: "bg-green-500", bgColor: "bg-white" };
  }
  if (lowerTitle.includes("error") || lowerTitle.includes("payment")) {
    return { icon: AlertCircle, color: "bg-red-500", bgColor: "bg-red-50" };
  }
  // Default
  return { icon: Bell, color: "bg-green-500", bgColor: "bg-green-50" };
};

export default function Notifications() {
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const queryClient = useQueryClient();

  const { hasAccess: canRead } = useModulePermissions(18);

  const { data: notificationList, isLoading } = useApiQuery(
    ["Notification", start, limit],
    `${API_ENDPOINTS.NOTIFICATION}?start=${start}&limit=${limit}`,
    { refetchOnWindowFocus: false, retry: 1, enabled: canRead } as const,
  );
  const { data: notificationCountData, refetch: refetchNotificationCount } =
    useApiQuery(["NOTIFICATION_COUNT"], API_ENDPOINTS.NOTIFICATION_COUNT, {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const);

  // Invalidate and refetch notification count when notification list data changes
  useEffect(() => {
    if (notificationList?.data) {
      queryClient.invalidateQueries({ queryKey: ["NOTIFICATION_COUNT"] });
    }
  }, [notificationList?.data, queryClient]);

  // Handle the typo in API response: "notifcation" instead of "notifications"
  const notifications = notificationList?.data?.notifcation || [];
  const pagination = notificationList?.data?.pagination || {};
  const total = Number(pagination?.total || 0);

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 space-y-3 sm:p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Notification list of the user.
          </p>
        </div>
      </div>
      <Separator />

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="rounded-lg border py-0 bg-white">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="w-12 h-6 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          onClick={() => {}}
          buttonTitle=""
          title="No notifications"
          description="You're all caught up! New notifications will appear here when available."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((note: any, index: number) => {
            const {
              icon: Icon,
              color,
              bgColor,
            } = getNotificationIcon(note.title);
            const isNew = index < 3; // First 3 notifications are considered "new"
            const isError = note.title.toLowerCase().includes("error");

            return (
              <Card
                key={note.id}
                className={`transition-all duration-150 hover:shadow-md rounded-lg border py-0 ${bgColor}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Icon on left */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-10 h-10 ${color} rounded flex items-center justify-center`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* Content in middle */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3
                          className={`text-sm font-semibold ${
                            isError ? "text-red-700" : "text-gray-900"
                          }`}
                        >
                          {note.title}
                        </h3>
                        {!isNew && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDateTime(note.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-snug mt-0.5">
                        {note.message}
                      </p>
                    </div>

                    {/* Actions on right */}
                    {isNew && (
                      <div className="flex-shrink-0">
                        <Button
                          size="sm"
                          className={`h-6 px-2.5 text-xs font-medium ${
                            isError
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-green-500 hover:bg-green-600"
                          } text-white`}
                        >
                          New
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && notifications.length > 0 && (
        <div className="border-t pt-4">
          <Pagination
            start={start}
            limit={limit}
            total={total}
            pagination={pagination}
            onPageChange={(newStart) => setStart(newStart)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setStart(1);
            }}
          />
        </div>
      )}
    </div>
  );
}

