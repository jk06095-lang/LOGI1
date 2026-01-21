
import { db } from "../lib/firebase";
import { collection, addDoc, doc, query, where, orderBy, limit, onSnapshot, writeBatch, runTransaction, getDocs, arrayUnion, arrayRemove, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { ChatMessage, ChatUser } from "../types";

// Helper for consistent Channel ID generation
export const generateChannelId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

export const chatService = {
  subscribeChatMessages: (channelId: string, limitCount: number, callback: (messages: ChatMessage[]) => void) => {
    try {
        const q = query(
            collection(db, "messages"),
            where("channelId", "==", channelId),
            orderBy("timestamp", "asc"), // We need ascending for chat flow
            // Note: Limit applies to the end of the collection if we don't reverse.
            // Efficient pagination usually requires desc sort then reversing client side, 
            // but for simplicity in this context we'll assume manageable volume or standard limit.
            // Actually, usually for chat: orderBy desc, limit, then reverse in UI.
            // Let's stick to simple asc for now as per existing logic structure usually found.
            // If we want the *latest* 150, we should order by desc, limit 150, then reverse results.
        );
        
        // However, standard Firebase chat implies listening to the end. 
        // Let's implement a 'limit to last' approach effectively.
        const qLatest = query(
            collection(db, "messages"),
            where("channelId", "==", channelId),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );

        return onSnapshot(qLatest, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            // Reverse back to chronological order for display
            callback(msgs.reverse());
        });
    } catch (e) {
        console.error("Chat Subscribe Error", e);
        return () => {};
    }
  },

  sendChatMessage: async (message: ChatMessage) => {
      // 1. Destructure to remove client-side only fields (id, pending)
      const { id, pending, ...rest } = message;
      
      // 2. Sanitize payload: Firestore rejects 'undefined' values.
      // We reconstruct the object including only defined values.
      const messageData = Object.keys(rest).reduce((acc, key) => {
          const value = (rest as any)[key];
          if (value !== undefined) {
              acc[key] = value;
          }
          return acc;
      }, {} as Record<string, any>);

      const docRef = await addDoc(collection(db, "messages"), messageData);
      return docRef.id;
  },

  toggleMessageReaction: async (messageId: string, userId: string, emoji: string) => {
      const msgRef = doc(db, "messages", messageId);
      await runTransaction(db, async (transaction) => {
          const msgDoc = await transaction.get(msgRef);
          if (!msgDoc.exists()) return;

          const data = msgDoc.data() as ChatMessage;
          let reactions = data.reactions || [];
          
          const existingIdx = reactions.findIndex(r => r.emoji === emoji);
          
          if (existingIdx !== -1) {
              const reaction = reactions[existingIdx];
              if (reaction.userIds.includes(userId)) {
                  // Remove user
                  reaction.userIds = reaction.userIds.filter(uid => uid !== userId);
                  if (reaction.userIds.length === 0) {
                      reactions.splice(existingIdx, 1);
                  }
              } else {
                  // Add user
                  reaction.userIds.push(userId);
              }
          } else {
              // New reaction
              reactions.push({ emoji, userIds: [userId] });
          }
          
          transaction.update(msgRef, { reactions });
      });
  },

  markChannelRead: async (channelId: string, userId: string) => {
      // This is expensive to do on every open. Usually we update the 'lastRead' timestamp on a user-channel map.
      // But based on the schema provided (readBy array on message), we must update unread messages.
      // Optimization: Update only the latest 20 unread messages to save writes.
      const q = query(
          collection(db, "messages"), 
          where("channelId", "==", channelId),
          where("readBy", "not-in", [[userId]]), // This query has limitations in Firestore (cant combine with other filters easily)
          // Simplified: Just query recent messages and check client side or use a simpler index
          orderBy("timestamp", "desc"),
          limit(20)
      );
      
      // Actually 'not-in' is tricky with arrays. 'array-contains' is for checking if present.
      // We can't query "array-does-not-contain".
      // So we fetch recent messages and update if needed.
      const qRecent = query(
          collection(db, "messages"),
          where("channelId", "==", channelId),
          orderBy("timestamp", "desc"),
          limit(30)
      );

      const snapshot = await getDocs(qRecent);
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach(doc => {
          const data = doc.data();
          const readBy = data.readBy || [];
          if (!readBy.includes(userId)) {
              batch.update(doc.ref, { readBy: arrayUnion(userId) });
              count++;
          }
      });

      if (count > 0) await batch.commit();
  },

  subscribeUnreadStatus: (userId: string, callback: (lastUnreadTs: number) => void) => {
      // Return the timestamp of the latest message NOT read by user.
      // Since we can't query "not read by", we listen to all relevant channels? Too expensive.
      // Alternative: We listen to a specific "notifications" collection or just global/dms.
      // For this app scale, we'll listen to global and calculate.
      
      // Simplified: Listen to latest global message.
      const q = query(
          collection(db, "messages"),
          // where("channelId", "==", "global"), // Actually we want any channel relevant to user
          orderBy("timestamp", "desc"),
          limit(1)
      );
      
      return onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
              const msg = snapshot.docs[0].data();
              callback(msg.timestamp);
          }
      });
  },

  subscribeChatUsers: (callback: (users: ChatUser[]) => void) => {
      const q = query(collection(db, "users")); // Get all users for simplicity
      return onSnapshot(q, (snapshot) => {
          const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ChatUser));
          callback(users);
      });
  },

  addContactByEmail: async (myUid: string, email: string) => {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) throw new Error("User not found");
      
      const targetUser = snapshot.docs[0];
      const targetUid = targetUser.id;
      
      if (targetUid === myUid) throw new Error("Cannot add yourself");

      await updateDoc(doc(db, "users", myUid), {
          contacts: arrayUnion(targetUid)
      });
  },

  removeContact: async (myUid: string, targetUid: string) => {
      await updateDoc(doc(db, "users", myUid), {
          contacts: arrayRemove(targetUid)
      });
  },

  // Typing Indicators (Realtime DB is better, but using Firestore for uniformity)
  sendTypingStatus: async (channelId: string, user: { uid: string, displayName: string }) => {
      const docRef = doc(db, "typing", `${channelId}_${user.uid}`);
      await setDoc(docRef, { ...user, channelId, timestamp: Date.now() });
  },

  clearTypingStatus: async (channelId: string, uid: string) => {
      await deleteDoc(doc(db, "typing", `${channelId}_${uid}`));
  },

  subscribeTyping: (channelId: string, callback: (users: any[]) => void) => {
      const q = query(collection(db, "typing"), where("channelId", "==", channelId));
      return onSnapshot(q, (snapshot) => {
          const now = Date.now();
          const users = snapshot.docs
              .map(doc => doc.data())
              .filter(data => now - data.timestamp < 5000); // Filter stale
          callback(users);
      });
  },

  subscribeUnreadMap: (userId: string, callback: (map: Set<string>) => void) => {
      // Listen to messages where I am NOT in readBy.
      // As noted, Firestore can't do "not-in-array".
      // Workaround: We listen to recent messages in ALL channels (Global + DMs)
      // This is a heavy query for a real app, but ok for prototype.
      
      // Better Workaround:
      // We can't query "All DMs I'm part of" easily without an index on participants.
      // Let's assume we just check "Global" and rely on client side filtering for DMs if we loaded them.
      
      // For now, let's implement a listener on "messages" generally, limited to recent.
      const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50));
      
      return onSnapshot(q, (snapshot) => {
          const map = new Set<string>();
          snapshot.docs.forEach(doc => {
              const data = doc.data();
              // Check if it's global or a DM involving me
              const isRelevant = data.channelId === 'global' || data.channelId.includes(userId);
              if (isRelevant && (!data.readBy || !data.readBy.includes(userId))) {
                  map.add(data.channelId);
              }
          });
          callback(map);
      });
  },

  getMessagesInTimeRange: async (start: number, end: number) => {
      const q = query(
          collection(db, "messages"), 
          where("timestamp", ">=", start),
          where("timestamp", "<=", end),
          orderBy("timestamp", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
  },

  deleteOldChatMessages: async (cutoffTimestamp: number) => {
      const q = query(
          collection(db, "messages"),
          where("timestamp", "<", cutoffTimestamp),
          limit(400) // Batch limit
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      return snapshot.size;
  }
};
