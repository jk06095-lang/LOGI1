
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
// 1. [Global Chat] Topic Subscription
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
// 4. [Integrity] Cascade Delete for Jobs
//    Deletes all child B/Ls and their files when a Job is deleted
// --------------------------------------------------------
exports.onJobDelete = functions.firestore
  .document("jobs/{jobId}")
  .onDelete(async (snapshot, context) => {
    const jobId = context.params.jobId;
    console.log(`Cascade Delete Initiated for Job: ${jobId}`);

    // 1. Find all B/Ls associated with this job
    const blsSnapshot = await admin.firestore()
      .collection('bls')
      .where('vesselJobId', '==', jobId)
      .get();

    if (blsSnapshot.empty) {
      console.log("No associated B/Ls found.");
      return null;
    }

    console.log(`Found ${blsSnapshot.size} B/Ls to delete.`);

    const batch = admin.firestore().batch();
    const allFileUrls = [];

    blsSnapshot.forEach(doc => {
      const data = doc.data();
      // Collect URLs for file deletion
      allFileUrls.push(...extractFileUrls(data));
      // Queue document deletion
      batch.delete(doc.ref);
    });

    // 2. Delete files from Storage
    if (allFileUrls.length > 0) {
      console.log(`Deleting ${allFileUrls.length} associated files...`);
      await deleteFiles(allFileUrls);
    }

    // 3. Commit Firestore Batch Delete
    await batch.commit();
    console.log("Cascade delete completed successfully.");
    return null;
  });

// --------------------------------------------------------
// 5. [Maintenance] onBLUpdate: Delete replaced/removed files
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
// 6. [Maintenance] onBLDelete: Recursively delete all files
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

// --------------------------------------------------------
// 7. [Critical OOM Fix] cleanupOrphanedFiles with Pagination
//    Runs every Sunday at 03:00 AM (Asia/Seoul)
// --------------------------------------------------------
exports.cleanupOrphanedFiles = functions.pubsub
  .schedule('0 3 * * 0')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log("Starting Orphaned File Cleanup...");
    
    // 1. Collect all valid URLs from Firestore using Pagination
    const validPaths = new Set();
    const CHUNK_SIZE = 500;
    let lastDoc = null;
    let hasMore = true;
    let totalDocsProcessed = 0;

    console.log("Fetching valid paths from Firestore...");

    while (hasMore) {
      let query = admin.firestore().collection('bls')
        .limit(CHUNK_SIZE)
        .select('fileUrl', 'attachments', 'commercialInvoice', 'packingList', 'arrivalNotice', 'manifest', 'exportDeclaration'); // Select only fields that might have URLs

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      snapshot.forEach(doc => {
        const urls = extractFileUrls(doc.data());
        urls.forEach(url => {
          const path = getFilePathFromUrl(url);
          if (path) validPaths.add(decodeURIComponent(path));
        });
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      totalDocsProcessed += snapshot.size;
      console.log(`Processed ${totalDocsProcessed} docs...`);
    }

    console.log(`Found ${validPaths.size} valid file paths.`);

    // 2. List files in Storage and Compare
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'bl-documents/' });
    
    let deletedCount = 0;
    const now = new Date();
    const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath = decodeURIComponent(file.name);
      
      if (filePath.endsWith('/')) continue; // Skip folders

      // Grace Period Check
      const metadata = await file.getMetadata();
      const createdTime = new Date(metadata[0].timeCreated);
      if (now - createdTime < GRACE_PERIOD_MS) continue;

      // If file path is NOT in validPaths, delete it
      if (!validPaths.has(filePath)) {
        try {
          await file.delete();
          deletedCount++;
          console.log(`Cleaned up orphan: ${filePath}`);
        } catch(e) {
          console.error(`Failed to delete orphan ${filePath}:`, e);
        }
      }
    }

    console.log(`Cleanup finished. Deleted ${deletedCount} orphaned files.`);
    return null;
  });

// [임시 코드] 주소창에 URL을 입력하면 실행되는 마이그레이션 도구
exports.grantAuthToAllUsers = functions.https.onRequest(async (req, res) => {
  // admin은 이미 상단에서 초기화되었지만, 요청하신 스니펫을 그대로 사용합니다.
  const admin = require('firebase-admin');
  
  // 앱 초기화 체크
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of listUsersResult.users) {
      // 1. DB(Firestore) 확인
      const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
      
      // 2. DB에 'authorized: true'라고 적혀 있는 유저만 골라냄
      if (userDoc.exists && userDoc.data().authorized === true) {
        // 3. 실제 신분증(Token)에 'authorized: true' 도장 찍기 (Custom Claim)
        await admin.auth().setCustomUserClaims(user.uid, { authorized: true });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    res.status(200).send(`
      <h1>작업 완료!</h1>
      <ul>
        <li><b>${updatedCount}명</b>: 인증 도장(Custom Claim) 발급 성공</li>
        <li><b>${skippedCount}명</b>: 권한 없음 또는 DB 누락으로 건너뜀</li>
      </ul>
      <p>이제 이 코드를 삭제하고 다시 배포하셔도 됩니다.</p>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("에러 발생: " + error.message);
  }
});
