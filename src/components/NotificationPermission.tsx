"use client";

import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/firebase/requestNotificationPermission";
import { onMessage, messaging } from "@/lib/firebase/firebaseConfig";

export const NotificationPermission = () => {
  useEffect(() => {
    const setupNotifications = async () => {
      // Only run in browser environment
      if (typeof window === "undefined") {
        return;
      }

      // Check if browser supports notifications
      if (!("Notification" in window)) {
        console.warn("This browser does not support notifications.");
        return;
      }

      // Request permission and get token
      const token = await requestNotificationPermission();

      if (token) {
        // console.log("Notification setup completed successfully");
      }

      // Set up foreground message handler
      if (messaging) {
        try {
          onMessage(messaging, (payload) => {
            // console.log("Foreground message received:", payload);

            // Show notification when app is in foreground
            if (payload.notification) {
              const notificationTitle =
                payload.notification.title || "New Notification";
              const notificationOptions: NotificationOptions = {
                body: payload.notification.body,
                icon: payload.notification.icon || "/images/fms-logo.svg",
                badge: "/images/fms-logo.svg",
                tag: payload.messageId,
                requireInteraction: false,
                data: {
                  url: payload.fcmOptions?.link || "/",
                },
              };

              // Show browser notification
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification(notificationTitle, notificationOptions);
              }
            }
          });
        } catch (error) {
          console.error("Error setting up foreground message handler:", error);
        }
      }
    };

    setupNotifications();
  }, []);

  return null;
};
