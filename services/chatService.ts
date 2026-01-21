
import { db } from "../lib/firebase";
import { collection, addDoc, doc, query, where, orderBy, limit, onSnapshot, writeBatch, runTransaction, getDocs, arrayUnion, arrayRemove, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { ChatMessage, ChatUser } from "../types";

// Helper for consistent Channel ID generation
export const generateChannelId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

export const chatService = {
  subscribeChatMessages: (channelId: string, limitCount: number, callback: (messages: ChatMessage[]) => void) => {
    if (!db) return () => {};
    const safeLimit = limitCount || 100;
    const q = query(collection(db, "messages"), where("channelId", "==", channelId));
    
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        callback(msgs.length > safeLimit ? msgs.slice(-safeLimit) : msgs);
    }, (error) => console.error("Chat Subscribe Error:", error));
  },

  sendChatMessage: async (message: Omit<ChatMessage, 'id'>) => {
    if (!db) return;
    try {
        const msgWithRead = { ...message, readBy: [message.senderId] };
        await addDoc(collection(db, "messages"), msgWithRead);
    } catch (e) { console.error("Send Message Error:", e); }
  },

  toggleMessageReaction: async (messageId: string, userId: string, emoji: string) => {
      if (!db) return;
      const msgRef = doc(db, "messages", messageId);
      try {
          await runTransaction(db, async (transaction) => {
              const msgSnap = await transaction.get(msgRef);
              if (!msgSnap.exists()) return;
              
              const data = msgSnap.data() as ChatMessage;
              const reactions = (data.reactions || []).map(r => ({
                  emoji: r.emoji,
                  userIds: [...r.userIds]
              }));

              const existingIndex = reactions.findIndex(r => r.emoji === emoji);
              
              if (existingIndex !== -1) {
                  const reaction = reactions[existingIndex];
                  if (reaction.userIds.includes(userId)) {
                      reaction.userIds = reaction.userIds.filter(id => id !== userId);
                      if (reaction.userIds.length === 0) {
                          reactions.splice(existingIndex, 1);
                      }
                  } else {
                      reaction.userIds.push(userId);
                  }
              } else {
                  reactions.push({ emoji, userIds: [userId] });
              }
              
              transaction.update(msgRef, { reactions: reactions });
          });
      } catch(e) { console.error("Toggle Reaction Error:", e); }
  },

  markChannelRead: async (channelId: string, userId: string) => {
      if (!db || !channelId || !userId) return;
      try {
          const q = query(collection(db, "messages"), where("channelId", "==", channelId));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          let updateCount = 0;
          snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data() as ChatMessage;
              if (data.senderId !== userId && (!data.readBy || !data.readBy.includes(userId))) {
                  batch.update(docSnap.ref, { readBy: arrayUnion(userId) });
                  updateCount++;
              }
          });
          if (updateCount > 0) await batch.commit();
      } catch (e) { console.error("Error marking channel read:", e); }
  },

  subscribeUnreadStatus: (userId: string, callback: (latestUnreadTs: number) => void) => {
      if (!db) return () => {};
      const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(500));
      return onSnapshot(q, (snapshot) => {
          let maxTs = 0;
          for (const doc of snapshot.docs) {
              const data = doc.data() as ChatMessage;
              const isRelevant = data.channelId === 'global' || data.channelId.includes(userId);
              if (isRelevant && data.senderId !== userId && (!data.readBy || !data.readBy.includes(userId))) {
                  if (data.timestamp > maxTs) maxTs = data.timestamp;
              }
          }
          callback(maxTs);
      });
  },

  subscribeUnreadMap: (userId: string, callback: (unreadChannels: Set<string>) => void) => {
      if (!db) return () => {};
      const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(500));
      return onSnapshot(q, (snapshot) => {
          const unreadSet = new Set<string>();
          snapshot.docs.forEach(doc => {
              const data = doc.data() as ChatMessage;
              const isRelevant = data.channelId === 'global' || data.channelId.includes(userId);
              if (isRelevant && data.senderId !== userId && (!data.readBy || !data.readBy.includes(userId))) {
                  unreadSet.add(data.channelId);
              }
          });
          callback(unreadSet);
      });
  },

  getMessagesInTimeRange: async (startDate: number, endDate: number) => {
     if (!db) return [];
     const q = query(collection(db, "messages"), where("timestamp", ">=", startDate), where("timestamp", "<=", endDate), orderBy("timestamp", "asc"));
     const snapshot = await getDocs(q);
     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
  },

  deleteOldChatMessages: async (beforeDate: number) => {
      if (!db) return 0;
      const q = query(collection(db, "messages"), where("timestamp", "<", beforeDate), limit(400));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return 0;
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      return snapshot.size;
  },

  sendTypingStatus: async (channelId: string, user: { uid: string, displayName: string }) => {
      if (!db) return;
      await setDoc(doc(db, "typing", `${channelId}_${user.uid}`), {
          channelId, userId: user.uid, displayName: user.displayName, timestamp: Date.now()
      });
  },

  clearTypingStatus: async (channelId: string, userId: string) => {
      if (!db) return;
      await deleteDoc(doc(db, "typing", `${channelId}_${userId}`));
  },

  subscribeTyping: (channelId: string, callback: (typingUsers: { displayName: string, userId: string }[]) => void) => {
      if (!db) return () => {};
      const q = query(collection(db, "typing"), where("channelId", "==", channelId));
      return onSnapshot(q, (snapshot) => {
          const now = Date.now();
          const active = snapshot.docs.map(d => d.data() as any).filter(d => now - d.timestamp < 5000);
          callback(active);
      });
  },

  subscribeChatUsers: (callback: (users: ChatUser[]) => void) => {
      if (!db) return () => {};
      const q = query(collection(db, "users"), orderBy("lastSeen", "desc"), limit(50));
      return onSnapshot(q, (snapshot) => {
          callback(snapshot.docs.map(doc => doc.data() as ChatUser));
      });
  },

  addContactByEmail: async (currentUserUid: string, contactEmail: string) => {
      if (!db) throw new Error("Database not connected");
      const q = query(collection(db, "users"), where("email", "==", contactEmail));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error("User not found with this email.");
      
      const contactUser = querySnapshot.docs[0].data() as ChatUser;
      await updateDoc(doc(db, "users", currentUserUid), { contacts: arrayUnion(contactUser.uid) });
      return contactUser;
  },

  removeContact: async (currentUserUid: string, contactUid: string) => {
      if (!db) return;
      await updateDoc(doc(db, "users", currentUserUid), { contacts: arrayRemove(contactUid) });
  },
};