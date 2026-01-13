
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, setDoc, deleteDoc, writeBatch, getDoc, arrayUnion, arrayRemove, runTransaction, where, limit, getDocs, Timestamp } from "firebase/firestore";
import { VesselJob, BLData, BLChecklist, ResourceLock, ChatMessage, ChatUser } from "../types";
import { User } from "firebase/auth";

// State Containers (In-Memory Cache)
// NOTE: This acts as a singleton cache. It must be cleared on logout.
let dbJobs: VesselJob[] = [];
let dbBLs: BLData[] = [];
let dbChecklists: Record<string, BLChecklist> = {};
let dbCategories: string[] = ['BAIT', 'FISHING_GEAR', 'NETS', 'PORT_EQUIPMENT', 'GENERAL']; // Client-side fallback defaults

// Listeners
const jobListeners: Array<(jobs: VesselJob[]) => void> = [];
const blListeners: Array<(bls: BLData[]) => void> = [];
const checklistListeners: Array<(checklists: Record<string, BLChecklist>) => void> = [];
const categoryListeners: Array<(categories: string[]) => void> = [];

const notifyJobs = () => {
    // Sort by createdAt desc
    const sorted = [...dbJobs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    jobListeners.forEach(l => l(sorted));
};

const notifyBLs = () => {
    // Sort by uploadDate desc
    const sorted = [...dbBLs].sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime());
    blListeners.forEach(l => l(sorted));
};

const notifyChecklists = () => {
    checklistListeners.forEach(l => l(dbChecklists));
};

const notifyCategories = () => {
    categoryListeners.forEach(l => l(dbCategories));
};

export const dataService = {
  // Critical for security: Clear in-memory data when user logs out
  clearCache: () => {
      dbJobs = [];
      dbBLs = [];
      dbChecklists = {};
      dbCategories = ['BAIT', 'FISHING_GEAR', 'NETS', 'PORT_EQUIPMENT', 'GENERAL'];
      // Notify listeners to clear UI
      notifyJobs();
      notifyBLs();
      notifyChecklists();
      notifyCategories();
      console.log("Data cache cleared.");
  },

  subscribeJobs: (callback: (jobs: VesselJob[]) => void) => {
    jobListeners.push(callback);
    // Initial notify with current cache
    callback(dbJobs); 
    
    let unsubscribe = () => {};

    if (db) {
      try {
        const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
        unsubscribe = onSnapshot(q, (snapshot) => {
          dbJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VesselJob));
          notifyJobs();
        }, (error) => {
            console.error("Firestore Jobs Subscribe Error:", error);
        });
      } catch (e) { console.error("Firestore Jobs Query Error:", e); }
    } else {
        console.warn("Firebase DB not initialized.");
    }
    
    return () => {
        unsubscribe();
        const idx = jobListeners.indexOf(callback);
        if (idx > -1) jobListeners.splice(idx, 1);
    };
  },

  addJob: async (job: Omit<VesselJob, 'id'>) => {
    if (!db) { alert("Database not available."); return; }
    try {
        await addDoc(collection(db, "jobs"), job);
    } catch (e) { console.error("Add Job Error:", e); alert("Failed to add job."); }
  },

  updateJob: async (jobId: string, updates: Partial<VesselJob>) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, "jobs", jobId), updates);
    } catch (e) { console.error("Update Job Error:", e); }
  },

  deleteJob: async (jobId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "jobs", jobId));
    } catch (e) { console.error("Delete Job Error:", e); }
  },

  subscribeBLs: (callback: (bls: BLData[]) => void) => {
    blListeners.push(callback);
    callback(dbBLs);

    let unsubscribe = () => {};

    if (db) {
      try {
        const q = query(collection(db, "bls"), orderBy("uploadDate", "desc"));
        unsubscribe = onSnapshot(q, (snapshot) => {
          dbBLs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BLData));
          notifyBLs();
        }, (error) => {
            console.error("Firestore BLs Subscribe Error:", error);
        });
      } catch (e) { console.error("Firestore BLs Query Error:", e); }
    }

    return () => {
        unsubscribe();
        const idx = blListeners.indexOf(callback);
        if (idx > -1) blListeners.splice(idx, 1);
    };
  },

  addBL: async (bl: BLData) => {
    if (!db) { alert("Database not available."); return; }
    try {
        // Use setDoc with a specific ID if provided, or allow Firestore to generate if we changed logic (but app uses generated IDs)
        await setDoc(doc(db, "bls", bl.id), bl);
    } catch (e) { console.error("Add BL Error:", e); alert("Failed to save BL."); }
  },

  updateBL: async (blId: string, updates: Partial<BLData>) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, "bls", blId), updates);
    } catch (e) { console.error("Update BL Error:", e); }
  },

  deleteBL: async (blId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "bls", blId));
    } catch (e) { console.error("Delete BL Error:", e); }
  },

  bulkDeleteBLs: async (ids: string[]) => {
      if (!db || ids.length === 0) return;
      const batch = writeBatch(db);
      ids.forEach(id => {
          const ref = doc(db, "bls", id);
          batch.delete(ref);
      });
      await batch.commit();
  },

  subscribeChecklists: (callback: (checklists: Record<string, BLChecklist>) => void) => {
      checklistListeners.push(callback);
      callback(dbChecklists);

      let unsubscribe = () => {};
      
      if (db) {
          try {
             // We can subscribe to the entire collection if small, or query. For now, subscribe all.
             unsubscribe = onSnapshot(collection(db, "checklists"), (snapshot) => {
                 const newChecklists: Record<string, BLChecklist> = {};
                 snapshot.docs.forEach(doc => {
                     // Checklists are keyed by BL ID usually
                     const data = doc.data() as BLChecklist;
                     newChecklists[data.blId] = data;
                 });
                 dbChecklists = newChecklists;
                 notifyChecklists();
             }, (error) => { console.error("Checklist Subscribe Error", error); });
          } catch(e) { console.error(e); }
      }

      return () => {
          unsubscribe();
          const idx = checklistListeners.indexOf(callback);
          if (idx > -1) checklistListeners.splice(idx, 1);
      };
  },

  updateChecklist: async (blId: string, checklist: BLChecklist) => {
      if (!db) return;
      // We use the BL ID as the Doc ID for the checklist to make it 1:1 easy to find
      try {
          await setDoc(doc(db, "checklists", blId), checklist);
      } catch (e) { console.error("Update Checklist Error", e); }
  },

  subscribeCategories: (callback: (categories: string[]) => void) => {
    categoryListeners.push(callback);
    callback(dbCategories);

    let unsubscribe = () => {};

    if (db) {
        const docRef = doc(db, "settings", "categories");
        unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.list && Array.isArray(data.list)) {
                    dbCategories = data.list;
                    notifyCategories();
                }
            } else {
                // Initialize if missing
                setDoc(docRef, { list: dbCategories }, { merge: true });
            }
        });
    }
    
    return () => {
        unsubscribe();
        const idx = categoryListeners.indexOf(callback);
        if (idx > -1) categoryListeners.splice(idx, 1);
    };
  },

  addCategory: async (category: string) => {
    if (!db || !category) return;
    try {
        const docRef = doc(db, "settings", "categories");
        await setDoc(docRef, {
            list: arrayUnion(category)
        }, { merge: true });
    } catch (e) {
        console.error("Add Category Error:", e);
    }
  },

  deleteCategory: async (category: string) => {
    if (!db || !category) return;
    try {
        const docRef = doc(db, "settings", "categories");
        await updateDoc(docRef, {
            list: arrayRemove(category)
        });
    } catch (e) {
        console.error("Delete Category Error:", e);
    }
  },

  updateCategory: async (oldVal: string, newVal: string) => {
      if (!db || !oldVal || !newVal) return;
      try {
        const docRef = doc(db, "settings", "categories");
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists()) return;
            
            const list = sfDoc.data().list as string[];
            const index = list.indexOf(oldVal);
            if (index > -1) {
                list[index] = newVal;
                transaction.update(docRef, { list: list });
            }
        });
      } catch (e) {
          console.error("Update Category Error:", e);
      }
  },

  // --- Concurrency / Locking Methods ---

  subscribeLock: (lockId: string, callback: (lock: ResourceLock | null) => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, "locks", lockId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as ResourceLock);
        } else {
            callback(null);
        }
    });
  },

  acquireLock: async (lockId: string, user: User) => {
      if (!db) return;
      const lockData: ResourceLock = {
          id: lockId,
          userId: user.uid,
          userEmail: user.email || 'Anonymous',
          timestamp: Date.now()
      };
      await setDoc(doc(db, "locks", lockId), lockData);
  },

  releaseLock: async (lockId: string) => {
      if (!db) return;
      await deleteDoc(doc(db, "locks", lockId));
  },

  maintainLock: async (lockId: string) => {
      if (!db) return;
      // Just update timestamp to show liveliness
      await updateDoc(doc(db, "locks", lockId), {
          timestamp: Date.now()
      });
  },

  // --- Chat Methods ---
  
  subscribeChatMessages: (channelId: string, callback: (messages: ChatMessage[]) => void) => {
    if (!db) return () => {};
    
    // MODIFIED: Removed orderBy and limit to avoid needing a Firestore composite index for 'channelId' + 'timestamp'.
    // This allows the query to work immediately for real-time updates.
    const q = query(
        collection(db, "messages"), 
        where("channelId", "==", channelId)
    );
    
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        // Sort in client memory: Oldest first (Ascending timestamp)
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        callback(msgs);
    }, (error) => {
        console.error("Chat Subscribe Error:", error);
    });
  },

  sendChatMessage: async (message: Omit<ChatMessage, 'id'>) => {
    if (!db) return;
    try {
        // Initialize readBy with sender so they don't see it as unread
        const msgWithRead = { ...message, readBy: [message.senderId] };
        await addDoc(collection(db, "messages"), msgWithRead);
    } catch (e) {
        console.error("Send Message Error:", e);
    }
  },

  markMessageRead: async (messageId: string, userId: string) => {
      if (!db) return;
      try {
          const msgRef = doc(db, "messages", messageId);
          await updateDoc(msgRef, {
              readBy: arrayUnion(userId)
          });
      } catch(e) {
          // Ignore, message might have been deleted or user offline
      }
  },

  markMessagesAsRead: async (messageIds: string[], userId: string) => {
      if (!db || messageIds.length === 0) return;
      const batch = writeBatch(db);
      // Firestore batch limit is 500, safe limit to 490
      const idsToMark = messageIds.slice(0, 490);
      
      idsToMark.forEach(id => {
          const ref = doc(db, "messages", id);
          batch.update(ref, { readBy: arrayUnion(userId) });
      });
      
      try {
          await batch.commit();
      } catch(e) {
          console.error("Batch mark read failed", e);
      }
  },

  // Track global unread status for the current user (boolean only)
  subscribeUnreadStatus: (userId: string, callback: (hasUnread: boolean) => void) => {
      if (!db) return () => {};
      // Increased limit to 100 to capture more messages and ensure red dot clears correctly
      const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(100));
      return onSnapshot(q, (snapshot) => {
          let hasUnread = false;
          for (const doc of snapshot.docs) {
              const data = doc.data() as ChatMessage;
              if (data.senderId !== userId && (!data.readBy || !data.readBy.includes(userId))) {
                  hasUnread = true;
                  break;
              }
          }
          callback(hasUnread);
      });
  },

  // Track specific unread channels for the current user
  subscribeUnreadChannels: (userId: string, callback: (channelIds: string[]) => void) => {
      if (!db) return () => {};
      // Optimization: Limit to latest 100 messages to check for badges
      const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(100));
      return onSnapshot(q, (snapshot) => {
          const unreadChannelSet = new Set<string>();
          for (const doc of snapshot.docs) {
              const data = doc.data() as ChatMessage;
              // If I am NOT the sender, AND my ID is NOT in readBy list
              if (data.senderId !== userId && (!data.readBy || !data.readBy.includes(userId))) {
                  unreadChannelSet.add(data.channelId);
              }
          }
          callback(Array.from(unreadChannelSet));
      });
  },

  // --- Chat Data Management (Export & Delete) ---

  // Fetch messages within a timeframe for export. 
  getMessagesInTimeRange: async (startDate: number, endDate: number) => {
     if (!db) return [];
     
     // Note: Firestore requires a composite index for 'timestamp' if we filter by other fields.
     // To keep it simple without managing indexes, we query by timestamp and filter client-side.
     const q = query(
         collection(db, "messages"),
         where("timestamp", ">=", startDate),
         where("timestamp", "<=", endDate),
         orderBy("timestamp", "asc")
     );

     try {
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
     } catch (e) {
         console.error("Export Messages Error:", e);
         throw e;
     }
  },

  deleteOldChatMessages: async (beforeDate: number) => {
      if (!db) return 0;
      // Fetch messages older than date
      const q = query(collection(db, "messages"), where("timestamp", "<", beforeDate), limit(400)); // Batch limit
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return 0;

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size; // Return count so caller can loop if needed
  },

  // --- Typing Indicator ---
  
  sendTypingStatus: async (channelId: string, user: { uid: string, displayName: string }) => {
      if (!db) return;
      const id = `${channelId}_${user.uid}`;
      try {
          await setDoc(doc(db, "typing", id), {
              channelId,
              userId: user.uid,
              displayName: user.displayName,
              timestamp: Date.now()
          });
      } catch(e) {}
  },

  clearTypingStatus: async (channelId: string, userId: string) => {
      if (!db) return;
      const id = `${channelId}_${userId}`;
      try {
          await deleteDoc(doc(db, "typing", id));
      } catch(e) {}
  },

  subscribeTyping: (channelId: string, callback: (typingUsers: string[]) => void) => {
      if (!db) return () => {};
      const q = query(collection(db, "typing"), where("channelId", "==", channelId));
      return onSnapshot(q, (snapshot) => {
          const now = Date.now();
          const users = snapshot.docs
              .map(d => d.data() as { timestamp: number; displayName: string })
              // Filter out stale typing status (older than 3 seconds)
              .filter(d => now - d.timestamp < 3000)
              .map(d => d.displayName);
          callback([...new Set(users)] as string[]);
      });
  },

  updateUserPresence: async (user: User) => {
    if (!db) return;
    try {
        // First get existing data to preserve contacts
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        const existingData = snapshot.exists() ? snapshot.data() : {};

        const chatUser: ChatUser = {
            uid: user.uid,
            displayName: user.displayName || 'User',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastSeen: Date.now(),
            status: 'online',
            contacts: existingData.contacts || [] // Preserve contacts
        };
        
        await setDoc(userRef, chatUser, { merge: true });
    } catch (e) {
        console.error("Presence Update Error:", e);
    }
  },

  updateUserStatus: async (uid: string, status: 'online' | 'offline' | 'away') => {
      if (!db) return;
      try {
          await updateDoc(doc(db, "users", uid), {
              status: status,
              lastSeen: Date.now()
          });
      } catch (e) {
          // Ignore if user doc not found
      }
  },

  subscribeChatUsers: (callback: (users: ChatUser[]) => void) => {
      if (!db) return () => {};
      const q = query(collection(db, "users"), orderBy("lastSeen", "desc"), limit(50));
      return onSnapshot(q, (snapshot) => {
          const users = snapshot.docs.map(doc => doc.data() as ChatUser);
          callback(users);
      });
  },

  addContactByEmail: async (currentUserUid: string, contactEmail: string) => {
      if (!db) throw new Error("Database not connected");
      
      // 1. Find the user with this email
      const q = query(collection(db, "users"), where("email", "==", contactEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
          throw new Error("User not found with this email.");
      }
      
      const contactUser = querySnapshot.docs[0].data() as ChatUser;
      
      // 2. Add to current user's contact list
      const currentUserRef = doc(db, "users", currentUserUid);
      await updateDoc(currentUserRef, {
          contacts: arrayUnion(contactUser.uid)
      });
      
      return contactUser;
  }
};
