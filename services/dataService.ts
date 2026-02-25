import { db, messaging, functions } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, setDoc, deleteDoc, writeBatch, getDoc, arrayUnion, arrayRemove, runTransaction } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { VesselJob, BLData, BLChecklist, ResourceLock, ChatUser, Attachment, ShipRegistry } from "../types";
import { parseDocument } from "./geminiService";
import { User } from "firebase/auth";

// State Containers (Singleton Cache)
let dbJobs: VesselJob[] = [];
let dbBLs: BLData[] = [];
let dbChecklists: Record<string, BLChecklist> = {};
let dbCategories: string[] = ['BAIT', 'FISHING_GEAR', 'NETS', 'PORT_EQUIPMENT', 'GENERAL'];

// Listener Management (Prevent Duplicates)
const jobListeners: Array<(jobs: VesselJob[]) => void> = [];
const blListeners: Array<(bls: BLData[]) => void> = [];
const checklistListeners: Array<(checklists: Record<string, BLChecklist>) => void> = [];
const categoryListeners: Array<(categories: string[]) => void> = [];

let dbShipRegistries: ShipRegistry[] = [];
const shipRegistryListeners: Array<(registries: ShipRegistry[]) => void> = [];

// Firestore Unsubscribe Functions
let unsubscribeJobs: any = null;
let unsubscribeBLs: any = null;
let unsubscribeChecklists: any = null;
let unsubscribeCategories: any = null;
let unsubscribeShipRegistries: any = null;

const notifyJobs = () => {
    // Sort locally to ensure consistency
    const sorted = [...dbJobs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    jobListeners.forEach(l => l(sorted));
};

const notifyBLs = () => {
    const sorted = [...dbBLs].sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime());
    blListeners.forEach(l => l(sorted));
};

const notifyChecklists = () => {
    checklistListeners.forEach(l => l(dbChecklists));
};

const notifyCategories = () => {
    categoryListeners.forEach(fn => fn([...dbCategories]));
};

const notifyShipRegistries = () => {
    shipRegistryListeners.forEach(fn => fn([...dbShipRegistries]));
};

export const dataService = {
    // CRITICAL: Clear data and stop listeners on logout to prevent leaks
    clearCache: () => {
        dbJobs = [];
        dbBLs = [];
        dbChecklists = {};
        dbCategories = [];
        dbShipRegistries = [];

        // Detach Firestore Listeners
        if (unsubscribeJobs) { unsubscribeJobs(); unsubscribeJobs = null; }
        if (unsubscribeBLs) { unsubscribeBLs(); unsubscribeBLs = null; }
        if (unsubscribeChecklists) { unsubscribeChecklists(); unsubscribeChecklists = null; }
        if (unsubscribeCategories) { unsubscribeCategories(); unsubscribeCategories = null; }
        if (unsubscribeShipRegistries) { unsubscribeShipRegistries(); unsubscribeShipRegistries = null; }

        // Notify UI to clear
        notifyJobs();
        notifyBLs();
        notifyChecklists();
        notifyCategories();
        notifyShipRegistries();

        console.log("Data cache cleared and listeners detached.");
    },

    // --- JOB MANAGEMENT ---

    subscribeJobs: (callback: (jobs: VesselJob[]) => void) => {
        jobListeners.push(callback);
        callback(dbJobs); // Initial cache return

        // Only start Firestore listener if not already active (Singleton Pattern)
        if (!unsubscribeJobs && db) {
            try {
                const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
                unsubscribeJobs = onSnapshot(q, (snapshot) => {
                    dbJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VesselJob));
                    notifyJobs();
                }, (error) => console.error("Jobs Subscribe Error:", error));
            } catch (e) { console.error("Jobs Query Error:", e); }
        }

        return () => {
            const idx = jobListeners.indexOf(callback);
            if (idx > -1) jobListeners.splice(idx, 1);
            // Clean up Firestore connection if no listeners left
            if (jobListeners.length === 0 && unsubscribeJobs) {
                unsubscribeJobs();
                unsubscribeJobs = null;
            }
        };
    },

    addJob: async (job: Omit<VesselJob, 'id'>) => {
        if (!db) return;
        try {
            await addDoc(collection(db, "jobs"), job);
        } catch (e) { console.error("Add Job Error:", e); alert("Failed to add job."); }
    },

    updateJob: async (jobId: string, updates: Partial<VesselJob>) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, "jobs", jobId), updates);
            // Optimistic update
            dbJobs = dbJobs.map(j => j.id === jobId ? { ...j, ...updates } : j);
            notifyJobs();
        } catch (e) { console.error("Update Job Error:", e); }
    },

    deleteJob: async (jobId: string) => {
        if (!db) return;
        try {
            // Optimistic Delete: Remove from local cache immediately for UI responsiveness
            dbJobs = dbJobs.filter(j => j.id !== jobId);
            notifyJobs(); // Notify UI immediately for responsiveness

            await deleteDoc(doc(db, "vessel_jobs", jobId)); // Changed collection name to vessel_jobs
        } catch (error) {
            console.error("Error deleting job:", error);
            throw error; // Re-throw to allow calling component to handle
        }
    },

    // --- SHIP REGISTRY MANAGEMENT ---

    subscribeShipRegistries: (callback: (registries: ShipRegistry[]) => void) => {
        if (!db) return () => { };
        shipRegistryListeners.push(callback);
        callback([...dbShipRegistries]);

        if (!unsubscribeShipRegistries) {
            const q = query(collection(db, "ship_registry"));
            unsubscribeShipRegistries = onSnapshot(q, (snapshot) => {
                dbShipRegistries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShipRegistry));
                notifyShipRegistries();
            }, (err) => {
                console.error("Ship Registries Subscribe Error:", err);
            });
        }

        return () => {
            const index = shipRegistryListeners.indexOf(callback);
            if (index > -1) shipRegistryListeners.splice(index, 1);
        };
    },

    getShipRegistry: async (id: string): Promise<ShipRegistry | null> => {
        if (!db) return null;
        try {
            const docRef = doc(db, "ship_registry", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as ShipRegistry;
            }
            return null;
        } catch (error) {
            console.error("Error getting ship registry:", error);
            return null;
        }
    },

    updateShipRegistry: async (id: string, data: Partial<ShipRegistry>): Promise<void> => {
        if (!db) return;
        try {
            const docRef = doc(db, "ship_registry", id);
            const docSnap = await getDoc(docRef);
            const payload = { ...data, lastUpdated: new Date().toISOString() };

            if (docSnap.exists()) {
                await updateDoc(docRef, payload);
            } else {
                await setDoc(docRef, { ...payload, id, vesselName: data.vesselName || id });
            }
        } catch (error) {
            console.error("Error updating ship registry:", error);
            throw error;
        }
    },

    // --- BL MANAGEMENT ---

    subscribeBLs: (callback: (bls: BLData[]) => void) => {
        blListeners.push(callback);
        callback(dbBLs);

        if (!unsubscribeBLs && db) {
            try {
                const q = query(collection(db, "bls"), orderBy("uploadDate", "desc"));
                unsubscribeBLs = onSnapshot(q, (snapshot) => {
                    dbBLs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BLData));
                    notifyBLs();
                }, (error) => console.error("BLs Subscribe Error:", error));
            } catch (e) { console.error("BLs Query Error:", e); }
        }

        return () => {
            const idx = blListeners.indexOf(callback);
            if (idx > -1) blListeners.splice(idx, 1);
            if (blListeners.length === 0 && unsubscribeBLs) {
                unsubscribeBLs();
                unsubscribeBLs = null;
            }
        };
    },

    addBL: async (bl: BLData) => {
        if (!db) return;
        try {
            await setDoc(doc(db, "bls", bl.id), bl);
        } catch (e) { console.error("Add BL Error:", e); alert("Failed to save BL."); }
    },

    updateBL: async (blId: string, updates: Partial<BLData>) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, "bls", blId), updates);
            // Optimistic
            dbBLs = dbBLs.map(b => b.id === blId ? { ...b, ...updates } : b);
            notifyBLs();
        } catch (e) { console.error("Update BL Error:", e); }
    },

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
                    newAttachments = newAttachments.filter(a => a.id !== payload);
                } else if (operation === 'rename') {
                    const { id, newName } = payload;
                    newAttachments = newAttachments.map(a => a.id === id ? { ...a, name: newName } : a);
                } else if (operation === 'add') {
                    newAttachments = [...newAttachments, ...payload];
                }
                transaction.update(blRef, { attachments: newAttachments });
            });
        } catch (e) { console.error("Attachment Transaction Failed:", e); throw e; }
    },

    deleteBL: async (blId: string) => {
        if (!db) return;
        try {
            // Optimistic Delete
            dbBLs = dbBLs.filter(b => b.id !== blId);
            notifyBLs();

            await deleteDoc(doc(db, "bls", blId));
        } catch (e) { console.error("Delete BL Error:", e); }
    },

    bulkDeleteBLs: async (ids: string[]) => {
        if (!db || ids.length === 0) return;
        // Optimistic
        dbBLs = dbBLs.filter(b => !ids.includes(b.id));
        notifyBLs();
        await Promise.all(ids.map(id => deleteDoc(doc(db, "bls", id))));
    },

    // --- CHECKLIST MANAGEMENT ---

    subscribeChecklists: (callback: (checklists: Record<string, BLChecklist>) => void) => {
        checklistListeners.push(callback);
        callback(dbChecklists);

        if (!unsubscribeChecklists && db) {
            try {
                unsubscribeChecklists = onSnapshot(collection(db, "checklists"), (snapshot) => {
                    const newChecklists: Record<string, BLChecklist> = {};
                    snapshot.docs.forEach(doc => {
                        const data = doc.data() as BLChecklist;
                        newChecklists[data.blId] = data;
                    });
                    dbChecklists = newChecklists;
                    notifyChecklists();
                }, (error) => console.error("Checklist Subscribe Error", error));
            } catch (e) { console.error(e); }
        }

        return () => {
            const idx = checklistListeners.indexOf(callback);
            if (idx > -1) checklistListeners.splice(idx, 1);
            if (checklistListeners.length === 0 && unsubscribeChecklists) {
                unsubscribeChecklists();
                unsubscribeChecklists = null;
            }
        };
    },

    updateChecklist: async (blId: string, checklist: BLChecklist) => {
        if (!db) return;
        try {
            await setDoc(doc(db, "checklists", blId), checklist);
            // Local update
            dbChecklists[blId] = checklist;
            notifyChecklists();
        } catch (e) { console.error("Update Checklist Error", e); }
    },

    // --- SETTINGS / CATEGORIES ---

    subscribeCategories: (callback: (categories: string[]) => void) => {
        categoryListeners.push(callback);
        callback(dbCategories);

        if (!unsubscribeCategories && db) {
            const docRef = doc(db, "settings", "categories");
            unsubscribeCategories = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.list && Array.isArray(data.list)) {
                        dbCategories = data.list;
                        notifyCategories();
                    }
                } else {
                    setDoc(docRef, { list: dbCategories }, { merge: true });
                }
            });
        }

        return () => {
            const idx = categoryListeners.indexOf(callback);
            if (idx > -1) categoryListeners.splice(idx, 1);
            if (categoryListeners.length === 0 && unsubscribeCategories) {
                unsubscribeCategories();
                unsubscribeCategories = null;
            }
        };
    },

    addCategory: async (category: string) => {
        if (!db || !category) return;
        try {
            await setDoc(doc(db, "settings", "categories"), { list: arrayUnion(category) }, { merge: true });
        } catch (e) { console.error("Add Category Error:", e); }
    },

    deleteCategory: async (category: string) => {
        if (!db || !category) return;
        try {
            await updateDoc(doc(db, "settings", "categories"), { list: arrayRemove(category) });
        } catch (e) { console.error("Delete Category Error:", e); }
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
        } catch (e) { console.error("Update Category Error:", e); }
    },

    // --- Global Settings (Logo) ---
    subscribeReportLogo: (callback: (url: string | null) => void) => {
        if (!db) return () => { };
        return onSnapshot(doc(db, "settings", "general"), (docSnap) => {
            callback(docSnap.exists() ? docSnap.data()?.reportLogoUrl || null : null);
        });
    },

    updateReportLogo: async (url: string | null) => {
        if (!db) return;
        try {
            await setDoc(doc(db, "settings", "general"), { reportLogoUrl: url }, { merge: true });
        } catch (e) { console.error("Update Report Logo Error:", e); }
    },

    // --- Concurrency / Locking ---
    subscribeLock: (lockId: string, callback: (lock: ResourceLock | null) => void) => {
        if (!db) return () => { };
        return onSnapshot(doc(db, "locks", lockId), (docSnap) => {
            callback(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ResourceLock : null);
        });
    },

    acquireLock: async (lockId: string, user: User) => {
        if (!db) return;
        await setDoc(doc(db, "locks", lockId), {
            id: lockId, userId: user.uid, userEmail: user.email || 'Anonymous', timestamp: Date.now()
        });
    },

    releaseLock: async (lockId: string) => {
        if (!db) return;
        await deleteDoc(doc(db, "locks", lockId));
    },

    maintainLock: async (lockId: string) => {
        if (!db) return;
        await updateDoc(doc(db, "locks", lockId), { timestamp: Date.now() });
    },

    // --- Users & Presence ---
    updateUserPresence: async (user: User) => {
        if (!db) return;
        try {
            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);
            const existingData = snapshot.exists() ? snapshot.data() : {};
            const chatUser: ChatUser = {
                uid: user.uid, displayName: user.displayName || 'User', email: user.email || '', photoURL: user.photoURL || '',
                lastSeen: Date.now(), status: 'online', contacts: existingData.contacts || [], authorized: existingData.authorized || false
            };
            await setDoc(userRef, chatUser, { merge: true });
        } catch (e) { console.error("Presence Update Error:", e); }
    },

    updateUserStatus: async (uid: string, status: 'online' | 'offline' | 'away') => {
        if (!db) return;
        await updateDoc(doc(db, "users", uid), { status: status, lastSeen: Date.now() });
    },

    // --- Auth & Access ---
    setupNotifications: async (user: User) => {
        if (!messaging || !db) { console.warn("Notifications not supported"); return; }
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
            const vapidKey = "BGHuWZuil2RC5hdb7ZECk416MgjIhGT-MxRbmjJAcXNGJppfYORP2mAYJ2JU-HCyVPA3FglkVHPDPS1eeeEiQA8";
            const currentToken = await getToken(messaging, { vapidKey });
            if (currentToken) {
                await updateDoc(doc(db, "users", user.uid), { fcmTokens: arrayUnion(currentToken) });
                if (functions) await httpsCallable(functions, 'subscribeToGlobalChat')({ token: currentToken });
            }
        } catch (e) { console.error("Notification setup failed:", e); }
    },

    checkUserAuthorization: async (uid: string): Promise<boolean> => {
        if (!db) return false;
        try {
            const snap = await getDoc(doc(db, "users", uid));
            return snap.exists() && snap.data().authorized === true;
        } catch (e) { return false; }
    },

    verifyAccessCode: async (code: string): Promise<boolean> => {
        if (!db) return false;
        try {
            const snap = await getDoc(doc(db, "secret_codes", code));
            return snap.exists();
        } catch (e) { return false; }
    },

    grantAuthorization: async (uid: string) => {
        if (!db) return;
        await setDoc(doc(db, "users", uid), { authorized: true }, { merge: true });
    }
};
