importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyBLnVbFSz2jpXIVCG0D_P57S4qlzDCKi0E",
  authDomain: "fisco2.firebaseapp.com",
  projectId: "fisco2",
  storageBucket: "fisco2.firebasestorage.app",
  messagingSenderId: "902148266352",
  appId: "1:902148266352:web:761ae1544fc94ec69c17b5",
  measurementId: "G-T9QV3S5DQX"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Ensure this icon exists in public folder or remove
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
