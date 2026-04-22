importScripts(
  "https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js",
);

const firebaseConfig = {
  // apiKey: "YOUR_API_KEY",
  // authDomain: "YOUR_AUTH_DOMAIN",
  // projectId: "YOUR_PROJECT_ID",
  // storageBucket: "YOUR_STORAGE_BUCKET",
  // appId: "YOUR_MESSAGING_SENDER_ID",
  // messagingSenderId: "YOUR_APP_ID",
  apiKey: "AIzaSyBG7Ac5NNJEwWSL6tJDpi1bZSr7HjXEMv4",
  authDomain: "nitroberry-6248a.firebaseapp.com",
  projectId: "nitroberry-6248a",
  storageBucket: "nitroberry-6248a.firebasestorage.app",
  messagingSenderId: "107041971016",
  appId: "1:107041971016:web:9b468a824a93cd80ec717d",
  measurementId: "G-RS8VFDFVKF",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: payload.notification?.icon || "/images/fms-logo.svg",
    badge: "/images/fms-logo.svg",
    tag: payload.messageId || Date.now().toString(),
    data: {
      url: payload.fcmOptions?.link || payload.data?.url || "/",
    },
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
  );
});
