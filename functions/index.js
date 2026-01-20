
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------

// Extract storage path from download URL
const getFilePathFromUrl = (url) => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const startIndex = decodedUrl.indexOf('/o/') + 3;
    const endIndex = decodedUrl.indexOf('?');
    if (startIndex < 3 || endIndex < 0) return null;
    return decodedUrl.substring(startIndex, endIndex);
  } catch (e) { return null; }
};

// Recursively extract all file URLs (containing "firebasestorage") from object/array
const extractFileUrls = (data) => {
  let urls = [];
  if (!data) return urls;

  if (typeof data === 'string') {
    if (data.includes("firebasestorage.googleapis.com")) {
      urls.push(data);
    }
  } else if (Array.isArray(data)) {
    data.forEach(item => urls = urls.concat(extractFileUrls(item)));
  } else if (typeof data === 'object') {
    Object.values(data).forEach(val => urls = urls.concat(extractFileUrls(val)));
  }
  return urls;
};

// Delete files by URL (handling 404 gracefully)
const deleteFiles = async (urls) => {
  const bucket = admin.storage().bucket();
  const uniqueUrls = [...new Set(urls)]; // Remove duplicates
  
  const promises = uniqueUrls.map(async (url) => {
    const path = getFilePathFromUrl(url);
    if (!path) return;
    try {
      await bucket.file(path).delete();
      console.log(`Deleted file: ${path}`);
    } catch (e) {
      if (e.code !== 404) console.error(`Failed to delete ${path}:`, e);
    }
  });
  await Promise.all(promises);
};

// --------------------------------------------------------
// 1. [Global Chat] Topic Subscription Function (Callable)
// --------------------------------------------------------
exports.subscribeToGlobalChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }
  const token = data.token;
  if (!token) {
    throw new functions.https.HttpsError("invalid-argument", "FCM Token missing.");
  }
  try {
    await admin.messaging().subscribeToTopic(token, "global-chat");
    return { success: true, message: "Subscribed to Global Chat notifications" };
  } catch (error) {
    console.error("Subscription failed:", error);
    throw new functions.https.HttpsError("internal", "Error during subscription");
  }
});

// --------------------------------------------------------
// 2. [Global Chat] Message Trigger
// --------------------------------------------------------
exports.sendGlobalNotification = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    if (message.channelId !== 'global') return null;

    const payload = {
      notification: {
        title: "LOGI1",
        body: "신규메세지가 있습니다.",
      },
      topic: "global-chat", 
      data: {
        type: "GLOBAL_CHAT",
        messageId: context.params.messageId,
        click_action: "https://www.logi01.com/",
      },
      webpush: {
        headers: { Urgency: "high" },
        fcm_options: { link: "https://www.logi01.com/" }
      }
    };

    return admin.messaging().send(payload)
      .catch((error) => console.error("Global notification failed:", error));
  });

// --------------------------------------------------------
// 3. [DM] 1:1 Message Trigger
// --------------------------------------------------------
exports.sendDMNotification = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    if (message.channelId === 'global') return null;

    const senderId = message.senderId;
    const participants = message.channelId.split('_');
    const receiverId = participants.find((id) => id !== senderId);

    if (!receiverId) return null;

    const userDoc = await admin.firestore().collection("users").doc(receiverId).get();
    const userData = userDoc.data();
    
    if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) return null;

    const tokens = userData.fcmTokens;
    const payload = {
      tokens: tokens, 
      notification: {
        title: "LOGI1",
        body: "신규메세지가 있습니다.",
      },
      data: {
        type: "DM",
        channelId: message.channelId,
        senderId: senderId,
        click_action: "https://www.logi01.com/",
      },
      webpush: {
        headers: { Urgency: "high" },
        fcm_options: { link: "https://www.logi01.com/" }
      }
    };

    try {
      await admin.messaging().sendEachForMulticast(payload);
    } catch (error) {
      console.error("DM notification error:", error);
    }
  });

// --------------------------------------------------------
// 4. [NEW] onBLUpdate: Delete replaced/removed files
// --------------------------------------------------------
exports.onBLUpdate = functions.firestore
  .document("bls/{blId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const beforeUrls = extractFileUrls(beforeData);
    const afterUrls = extractFileUrls(afterData);

    // Find URLs that existed before but are gone now
    const filesToDelete = beforeUrls.filter(url => !afterUrls.includes(url));

    if (filesToDelete.length > 0) {
      console.log(`Detecting ${filesToDelete.length} removed files for BL ${context.params.blId}...`);
      await deleteFiles(filesToDelete);
    }
  });

// --------------------------------------------------------
// 5. [Updated] onBLDelete: Recursively delete all files
// --------------------------------------------------------
exports.onBLDelete = functions.firestore
  .document("bls/{blId}")
  .onDelete(async (snapshot, context) => {
    const data = snapshot.data();
    const allUrls = extractFileUrls(data);

    if (allUrls.length > 0) {
      console.log(`Cleanup for BL ${context.params.blId}: Deleting ${allUrls.length} files.`);
      await deleteFiles(allUrls);
    }
  });
