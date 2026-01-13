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
// Description: When a message is added to 'global_messages' (or 'messages' with channelId 'global'), send to topic
// NOTE: Adjust collection path to match your actual DB structure. Assuming 'messages' collection with channelId check based on types.ts
// --------------------------------------------------------
exports.sendGlobalNotification = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();

    // Only trigger for global chat messages
    if (message.channelId !== 'global') return null;

    const payload = {
      notification: {
        title: `[Global] ${message.senderName || "New Message"}`,
        body: message.text,
      },
      topic: "global-chat", 
      data: {
        type: "GLOBAL_CHAT",
        messageId: context.params.messageId,
        click_action: "/", // URL to open
      },
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
// Description: Send notification to specific user for DMs
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
        title: message.senderName || "New Message",
        body: message.text,
      },
      data: {
        type: "DM",
        channelId: message.channelId,
        senderId: senderId,
        click_action: "/", 
      },
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
        // Optional: Remove failed tokens from DB here
      }
      
      console.log("DM notification sent.");
    } catch (error) {
      console.error("DM notification error:", error);
    }
  });
