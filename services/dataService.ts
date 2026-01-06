
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { VesselJob, BLData, BLChecklist } from "../types";

// State Containers (In-Memory Cache)
let dbJobs: VesselJob[] = [];
let dbBLs: BLData[] = [];
let dbChecklists: Record<string, BLChecklist> = {};

// Listeners
const jobListeners: Array<(jobs: VesselJob[]) => void> = [];
const blListeners: Array<(bls: BLData[]) => void> = [];
const checklistListeners: Array<(checklists: Record<string, BLChecklist>) => void> = [];

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

export const dataService = {
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
  }
};
