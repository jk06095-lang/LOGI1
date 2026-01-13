import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, orderBy, limit, addDoc, serverTimestamp, 
  writeBatch 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  ChatMessage, ChatUser, ResourceLock, BLChecklist 
} from "../types";

export const dataService = {
  subscribeUnreadMap: (userId: string, callback: (unreadChannels: Map<string, number>) => void) => {
    if (!db) return () => {};
    // Simplified logic: listening to recent messages to map unread timestamps
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(200));
    return onSnapshot(q, (snapshot) => {
        const unreadMap = new Map<string, number>();
        snapshot.docs.forEach(doc => {
            const data = doc.data() as ChatMessage;
            const isRelevant = data.channelId === 'global' || data.channelId.includes(userId);
            if (isRelevant && data.senderId !== userId && (!data.readBy || !data.readBy.includes(userId))) {
                const currentMax = unreadMap.get(data.channelId) || 0;
                if (data.timestamp > currentMax) {
                    unreadMap.set(data.channelId, data.timestamp);
                }
            }
        });
        callback(unreadMap);
    });
  },

  markChannelRead: async (channelId: string, userId: string) => {
     if (!db) return;
     const q = query(collection(db, "messages"), where("channelId", "==", channelId), limit(50));
     const snapshot = await getDocs(q);
     const batch = writeBatch(db);
     let count = 0;
     snapshot.docs.forEach(doc => {
        const data = doc.data() as ChatMessage;
        if (!data.readBy?.includes(userId)) {
           batch.update(doc.ref, { readBy: [...(data.readBy || []), userId] });
           count++;
        }
     });
     if (count > 0) await batch.commit();
  },

  subscribeChatMessages: (channelId: string, limitCount: number, callback: (msgs: ChatMessage[]) => void) => {
      const q = query(collection(db, "messages"), where("channelId", "==", channelId), orderBy("timestamp", "desc"), limit(limitCount));
      return onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse();
          callback(msgs);
      });
  },

  sendChatMessage: async (msg: ChatMessage) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, pending, ...data } = msg;
      await addDoc(collection(db, "messages"), data);
  },

  subscribeChatUsers: (callback: (users: ChatUser[]) => void) => {
      return onSnapshot(collection(db, "users"), (snapshot) => {
          const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ChatUser));
          callback(users);
      });
  },

  subscribeTyping: (channelId: string, callback: (users: any[]) => void) => {
      const q = query(collection(db, "typing"), where("channelId", "==", channelId));
      return onSnapshot(q, (snapshot) => {
          callback(snapshot.docs.map(doc => doc.data()));
      });
  },

  sendTypingStatus: async (channelId: string, user: { uid: string, displayName: string }) => {
      await setDoc(doc(db, "typing", `${channelId}_${user.uid}`), {
          channelId, userId: user.uid, displayName: user.displayName, timestamp: serverTimestamp()
      });
  },

  clearTypingStatus: async (channelId: string, userId: string) => {
      await deleteDoc(doc(db, "typing", `${channelId}_${userId}`));
  },

  subscribeLock: (resourceId: string, callback: (lock: ResourceLock | null) => void) => {
      return onSnapshot(doc(db, "locks", resourceId), (snap) => {
          callback(snap.exists() ? snap.data() as ResourceLock : null);
      });
  },

  acquireLock: async (resourceId: string, user: any) => {
      await setDoc(doc(db, "locks", resourceId), {
          id: resourceId, userId: user.uid, userEmail: user.email, timestamp: Date.now()
      });
  },

  maintainLock: async (resourceId: string) => {
      await updateDoc(doc(db, "locks", resourceId), { timestamp: Date.now() });
  },

  verifyAccessCode: async (code: string) => {
      const q = query(collection(db, "secret_codes"), where("code", "==", code));
      const snap = await getDocs(q);
      return !snap.empty;
  },

  addContactByEmail: async (userId: string, email: string) => {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("User not found");
      const targetUser = snap.docs[0];
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
          const current = userSnap.data().contacts || [];
          if (!current.includes(targetUser.id)) {
              await updateDoc(userRef, { contacts: [...current, targetUser.id] });
          }
      }
  },

  getMessagesInTimeRange: async (start: number, end: number) => {
      const q = query(collection(db, "messages"), where("timestamp", ">=", start), where("timestamp", "<=", end));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ChatMessage);
  },

  deleteOldChatMessages: async (timestamp: number) => {
      const q = query(collection(db, "messages"), where("timestamp", "<", timestamp), limit(400));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return snap.size;
  },

  subscribeCategories: (callback: (cats: string[]) => void) => {
      return onSnapshot(collection(db, "categories"), (snapshot) => {
          callback(snapshot.docs.map(d => d.data().name));
      });
  },

  addCategory: async (name: string) => {
      await addDoc(collection(db, "categories"), { name });
  },

  deleteCategory: async (name: string) => {
      const q = query(collection(db, "categories"), where("name", "==", name));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
  },

  updateCategory: async (oldName: string, newName: string) => {
       const q = query(collection(db, "categories"), where("name", "==", oldName));
       const snap = await getDocs(q);
       snap.forEach(d => updateDoc(d.ref, { name: newName }));
  },

  clearCache: () => { }
};