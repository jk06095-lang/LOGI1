
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// --------------------------------------------------------
// 1. [Global Chat] Topic Subscription Function (Callable)
// Description: Frontend calls this to subscribe to 'global-chat' topic
// --------------------------------------------------------
exports.subscribeToGlobalChat = functions.https.onCall(async (data, context) => {
  // Block unauthenticated users
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const token = data.token;
  if (!token) {
    throw new functions.https.HttpsError("invalid-argument", "FCM Token missing.");
  }

  try {
    // Subscribe this token to 'global-chat' topic
    await admin.messaging().subscribeToTopic(token, "global-chat");
    return { success: true, message: "Subscribed to Global Chat notifications" };
  } catch (error) {
    console.error("Subscription failed:", error);
    throw new functions.https.HttpsError("internal", "Error during subscription");
  }
});

// --------------------------------------------------------
// 2. [Global Chat] Message Trigger
// Description: Fixed title/body, High Priority, Click Action to logi01.com
// --------------------------------------------------------
exports.sendGlobalNotification = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();

    // Only trigger for global chat messages
    if (message.channelId !== 'global') return null;

    const payload = {
      notification: {
        title: "LOGI1",               // [Fixed]
        body: "신규메세지가 있습니다.", // [Fixed]
      },
      topic: "global-chat", 
      data: {
        type: "GLOBAL_CHAT",
        messageId: context.params.messageId,
        click_action: "https://www.logi01.com/", // [Added] Click action
      },
      webpush: {
        headers: {
          Urgency: "high" // [Important] Immediate delivery
        },
        fcm_options: {
          link: "https://www.logi01.com/" // [Added] Webpush link
        }
      }
    };

    return admin.messaging().send(payload)
      .then((response) => {
        console.log("Global notification sent:", response);
      })
      .catch((error) => {
        console.error("Global notification failed:", error);
      });
  });

// --------------------------------------------------------
// 3. [DM] 1:1 Message Trigger
// Description: Fixed title/body, High Priority, Click Action to logi01.com
// --------------------------------------------------------
exports.sendDMNotification = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    
    // Only trigger for DMs (not global)
    if (message.channelId === 'global') return null;

    const senderId = message.senderId;
    
    // channelId is usually "uid1_uid2" sorted.
    const participants = message.channelId.split('_');
    
    // Find receiver (the one who is not the sender)
    const receiverId = participants.find((id) => id !== senderId);

    if (!receiverId) {
      console.log("Receiver not found.");
      return null;
    }

    // Get receiver's FCM tokens
    const userDoc = await admin.firestore().collection("users").doc(receiverId).get();
    const userData = userDoc.data();
    
    if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
      console.log("Receiver has no FCM tokens.");
      return null;
    }

    const tokens = userData.fcmTokens;

    const payload = {
      tokens: tokens, 
      notification: {
        title: "LOGI1",               // [Fixed]
        body: "신규메세지가 있습니다.", // [Fixed]
      },
      data: {
        type: "DM",
        channelId: message.channelId,
        senderId: senderId,
        click_action: "https://www.logi01.com/", // [Added] Click action
      },
      webpush: {
        headers: {
          Urgency: "high" // [Important] Immediate delivery
        },
        fcm_options: {
          link: "https://www.logi01.com/" // [Added] Webpush link
        }
      }
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.log("Failed tokens:", failedTokens);
      }
      
      console.log("DM notification sent.");
    } catch (error) {
      console.error("DM notification error:", error);
    }
  });

// Helper to extract path from download URL
const getFilePathFromUrl = (url) => {
  try {
    // URL format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?...
    const decodedUrl = decodeURIComponent(url);
    const startIndex = decodedUrl.indexOf('/o/') + 3;
    const endIndex = decodedUrl.indexOf('?');
    if (startIndex < 3 || endIndex < 0) return null;
    return decodedUrl.substring(startIndex, endIndex);
  } catch (e) {
    return null;
  }
};

// --------------------------------------------------------
// 4. [Cleanup] Delete Files on B/L Document Deletion
// Description: Prevents orphaned files by deleting them from Storage when DB doc is removed.
// --------------------------------------------------------
exports.onBLDelete = functions.firestore
  .document("bls/{blId}")
  .onDelete(async (snapshot, context) => {
    const data = snapshot.data();
    const bucket = admin.storage().bucket();
    const filesToDelete = [];

    // 1. Collect Root File
    if (data.fileUrl) filesToDelete.push(data.fileUrl);

    // 2. Collect Nested Files
    if (data.commercialInvoice && data.commercialInvoice.fileUrl) filesToDelete.push(data.commercialInvoice.fileUrl);
    if (data.packingList && data.packingList.fileUrl) filesToDelete.push(data.packingList.fileUrl);
    if (data.exportDeclaration && data.exportDeclaration.fileUrl) filesToDelete.push(data.exportDeclaration.fileUrl);
    if (data.manifest && data.manifest.fileUrl) filesToDelete.push(data.manifest.fileUrl);
    if (data.arrivalNotice && data.arrivalNotice.fileUrl) filesToDelete.push(data.arrivalNotice.fileUrl);

    // 3. Collect Attachments
    if (data.attachments && Array.isArray(data.attachments)) {
      data.attachments.forEach((att) => {
        if (att.url) filesToDelete.push(att.url);
      });
    }

    // 4. Delete Process
    const deletePromises = filesToDelete.map(async (url) => {
      const filePath = getFilePathFromUrl(url);
      if (!filePath) {
        console.warn("Could not parse file path from URL:", url);
        return;
      }

      try {
        await bucket.file(filePath).delete();
        console.log("Deleted file:", filePath);
      } catch (error) {
        // Ignore "not found" errors
        if (error.code === 404) {
          console.log("File already deleted or not found:", filePath);
        } else {
          console.error("Error deleting file:", filePath, error);
        }
      }
    });

    await Promise.all(deletePromises);
    console.log(`Cleanup complete for ${context.params.blId}. Processed ${filesToDelete.length} files.`);
  });
