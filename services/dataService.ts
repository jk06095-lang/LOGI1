

import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, setDoc, deleteDoc, writeBatch, getDoc, arrayUnion, arrayRemove, runTransaction } from "firebase/firestore";
import { VesselJob, BLData, BLChecklist, ResourceLock } from "../types";
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
  }
};
