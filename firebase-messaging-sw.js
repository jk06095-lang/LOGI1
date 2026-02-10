importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
  measurementId: "VITE_FIREBASE_MEASUREMENT_ID"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Enforce fixed text and icon regardless of payload content
  const notificationTitle = "LOGI1";
  const notificationOptions = {
    body: "신규메세지가 있습니다.",
    icon: '/logo192.png',
    data: payload.data,
    tag: 'logi1-notification', // Group notifications
    renotify: true             // Re-vibrate/sound on new messages
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Click
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close(); // Close the notification

  const targetUrl = 'https://www.logi01.com/';

  // Focus existing tab or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function (windowClients) {
      // 1. Check if LOGI1 tab is already open
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        // If URL matches, focus that tab
        if (client.url.includes('logi01.com') && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});