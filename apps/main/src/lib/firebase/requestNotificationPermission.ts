import { getToken, messaging } from "./firebaseConfig";
import { client } from "@/api/client";
import { API_ENDPOINTS } from "@/api/endpoints";

export const requestNotificationPermission = async (): Promise<
  string | null
> => {
  try {
    // Check if messaging is available
    if (!messaging) {
      console.error(
        "Firebase messaging is not initialized. Make sure you're in a browser environment.",
      );
      return null;
    }

    // Check if service worker is supported
    if (!("serviceWorker" in navigator)) {
      console.error("Service workers are not supported in this browser.");
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("Notification permission was not granted:", permission);
      return null;
    }

    // Register service worker
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" },
      );

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
    } catch (swError) {
      console.error("Service worker registration failed:", swError);
      return null;
    }

    if (!registration) {
      console.error("Service worker registration is null");
      return null;
    }

    // Get VAPID key from environment
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      console.error(
        "VAPID key is missing. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file. " +
          "You can find this key in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates",
      );
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.error(
        "Failed to get FCM token. Make sure the service worker is properly registered.",
      );
      return null;
    }

    // console.log("FCM Token obtained successfully:", token);

    // Send token to backend API
    try {
      await client.post(API_ENDPOINTS.UPDATE_DEVICE_TOKEN, {
        fcmToken: token,
      });
      //   await apiCall(
      //     HTTP_METHODS.POST,
      //     API_ENDPOINTS.UPDATE_DEVICE_TOKEN,
      //     {
      //       fcmToken: token,
      //     }
      //   );
      //   console.log("Device token successfully sent to backend");
    } catch (error) {
      console.error("Failed to send device token to backend:", error);
      // Still return the token even if API call fails
      // so the user can use it later
    }

    return token;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};
