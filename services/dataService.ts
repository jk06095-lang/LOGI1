
import { db, messaging, functions } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, setDoc, deleteDoc, writeBatch, getDoc, arrayUnion, arrayRemove, runTransaction, where, limit, getDocs, Timestamp } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { VesselJob, BLData, BLChecklist, ResourceLock, ChatMessage, ChatUser, Attachment } from "../types";
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

  // TRANSACTIONAL UPDATE FOR FILES
  // Ensures data consistency when multiple users are deleting files from the array
  updateAttachmentsTransaction: async (blId: string, operation: 'remove' | 'rename' | 'add', payload: any) => {
      if (!db) return;
      const blRef = doc(db, "bls", blId);

      try {
          await runTransaction(db, async (transaction) => {
              const sfDoc = await transaction.get(blRef);
              if (!sfDoc.exists()) throw "Document does not exist!";

              const currentAttachments = (sfDoc.data().attachments || []) as Attachment[];
              let newAttachments = [...currentAttachments];

              if (operation === 'remove') {
                  const attachmentIdToRemove = payload;
                  newAttachments = newAttachments.filter(a => a.id !== attachmentIdToRemove);
              } else if (operation === 'rename') {
                  const { id, newName } = payload;
                  newAttachments = newAttachments.map(a => 
                      a.id === id ? { ...a, name: newName } : a
                  );
              } else if (operation === 'add') {
                  const newFiles = payload;
                  newAttachments = [...newAttachments, ...newFiles];
              }

              transaction.update(blRef, { attachments: newAttachments });
          });
      } catch (e) {
          console.error("Attachment Transaction Failed:", e);
          throw e;
      }
  },

  deleteBL: async (blId: string) => {
    if (!db) return;
    try {
        // Client only deletes the document. Server handles file cleanup via Cloud Functions.
        await deleteDoc(doc(db, "bls", blId));
        console.log(`BL Document ${blId} deleted. Files will be cleaned up by server.`);
    } catch (e) { 
        console.error("Delete BL Error:", e); 
        alert("Failed to delete document.");
    }
  },

  bulkDeleteBLs: async (ids: string[]) => {
      if (!db || ids.length === 0) return;
      // Promise.all is safe for parallel Firestore deletes here
      await Promise.all(ids.map(id => deleteDoc(doc(db, "bls", id))));
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

  // --- Global Settings (Logo, etc) ---
  
  subscribeReportLogo: (callback: (url: string | null) => void) => {
      if (!db) return () => {};
      return onSnapshot(doc(db, "settings", "general"), (docSnap) => {
          if (docSnap.exists()) {
              callback(docSnap.data()?.reportLogoUrl || null);
          } else {
              callback(null);
          }
      });
  },

  updateReportLogo: async (url: string | null) => {
      if (!db) return;
      try {
          // If null, we can either set to null or delete the field. Setting to null is safer.
          await setDoc(doc(db, "settings", "general"), { reportLogoUrl: url }, { merge: true });
      } catch (e) {
          console.error("Update Report Logo Error:", e);
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
  
  subscribeChatMessages: (channelId: string, limitCount: number, callback: (messages: ChatMessage[]) => void) => {
    if (!db) return () => {};
    
    // Default limit if not provided
    const safeLimit = limitCount || 100;

    const q = query(
        collection(db, "messages"), 
        where("channelId", "==", channelId)
    );
    
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        
        // Sort in client memory: Oldest first (Ascending timestamp) for display
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        
        // Apply limit logic client-side
        if (msgs.length > safeLimit) {
            // Keep the last 'safeLimit' messages (newest ones)
            callback(msgs.slice(-safeLimit));
        } else {
            callback(msgs);
        }
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

  // Batch mark read logic
  markChannelRead: async (channelId: string, userId: string) => {
      if (!db || !channelId || !userId) return;
      
      try {
          const q = query(
              collection(db, "messages"), 
              where("channelId", "==", channelId)
          );
          
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

          if (updateCount > 0) {
              await batch.commit();
          }
      } catch (e) {
          console.error("Error marking channel read:", e);
      }
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
                  if (data.timestamp > maxTs) {
                      maxTs = data.timestamp;
                  }
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
      const q = query(collection(db, "messages"), where("timestamp", "<", beforeDate), limit(400));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return 0;

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size;
  },

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

  subscribeTyping: (channelId: string, callback: (typingUsers: { displayName: string, userId: string }[]) => void) => {
      if (!db) return () => {};
      const q = query(collection(db, "typing"), where("channelId", "==", channelId));
      
      return onSnapshot(q, (snapshot) => {
          const now = Date.now();
          const active = snapshot.docs
              .map(d => d.data() as { timestamp: number; displayName: string, userId: string })
              .filter(d => now - d.timestamp < 5000); // Filter stale > 5s
          
          callback(active);
      });
  },

  updateUserPresence: async (user: User) => {
    if (!db) return;
    try {
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
            contacts: existingData.contacts || [], 
            authorized: existingData.authorized || false
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
      } catch (e) { }
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
      
      const q = query(collection(db, "users"), where("email", "==", contactEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
          throw new Error("User not found with this email.");
      }
      
      const contactUser = querySnapshot.docs[0].data() as ChatUser;
      const currentUserRef = doc(db, "users", currentUserUid);
      await updateDoc(currentUserRef, {
          contacts: arrayUnion(contactUser.uid)
      });
      
      return contactUser;
  },

  removeContact: async (currentUserUid: string, contactUid: string) => {
      if (!db) return;
      try {
          const userRef = doc(db, "users", currentUserUid);
          await updateDoc(userRef, {
              contacts: arrayRemove(contactUid)
          });
      } catch (e) {
          console.error("Remove Contact Error", e);
      }
  },

  updateContacts: async (currentUserUid: string, newContacts: string[]) => {
      if (!db) return;
      try {
          const userRef = doc(db, "users", currentUserUid);
          await updateDoc(userRef, {
              contacts: newContacts
          });
      } catch (e) {
          console.error("Update Contacts Order Error", e);
      }
  },

  setupNotifications: async (user: User) => {
    if (!messaging || !db) {
        console.warn("Notifications not supported in this environment");
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
        }

        const vapidKey = "BGHuWZuil2RC5hdb7ZECk416MgjIhGT-MxRbmjJAcXNGJppfYORP2mAYJ2JU-HCyVPA3FglkVHPDPS1eeeEiQA8"; 
        const currentToken = await getToken(messaging, { vapidKey });
        
        if (currentToken) {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(currentToken)
            });

            if (functions) {
                const subscribeFn = httpsCallable(functions, 'subscribeToGlobalChat');
                await subscribeFn({ token: currentToken });
            }
        }
    } catch (e) {
        console.error("Notification setup failed:", e);
    }
  },

  checkUserAuthorization: async (uid: string): Promise<boolean> => {
      if (!db) return false;
      try {
          const userRef = doc(db, "users", uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
              const data = snap.data();
              return data.authorized === true;
          }
          return false;
      } catch(e) {
          return false;
      }
  },

  verifyAccessCode: async (code: string): Promise<boolean> => {
      if (!db) return false;
      try {
          const codeRef = doc(db, "secret_codes", code);
          const snap = await getDoc(codeRef);
          return snap.exists();
      } catch(e) {
          return false;
      }
  },

  grantAuthorization: async (uid: string) => {
      if (!db) return;
      try {
          const userRef = doc(db, "users", uid);
          await setDoc(userRef, { authorized: true }, { merge: true });
      } catch(e) {
          throw e;
      }
  }
};
