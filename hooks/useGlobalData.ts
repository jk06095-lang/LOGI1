
import { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, where, orderBy, limit, collectionGroup } from 'firebase/firestore';
import { dataService } from '../services/dataService';
import { chatService } from '../services/chatService';
import { VesselJob, BLData, BLChecklist, BackgroundTask, NotificationLog, AppSettings, ShipRegistry } from '../types';

export const useGlobalData = (settings: AppSettings) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Data States
  const [vesselJobs, setVesselJobs] = useState<VesselJob[]>([]);
  const [blData, setBLData] = useState<BLData[]>([]);
  const [checklists, setChecklists] = useState<Record<string, BLChecklist>>({});
  const [reportLogoUrl, setReportLogoUrl] = useState<string | null>(null);
  const [shipRegistries, setShipRegistries] = useState<ShipRegistry[]>([]);

  // UI States
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationLog[]>([]);
  const [expirationAlert, setExpirationAlert] = useState<{ count: number } | null>(null);

  // Chat Status
  const [latestUnreadTs, setLatestUnreadTs] = useState<number>(0);
  const [lastReadTs, setLastReadTs] = useState<number>(() => {
    const stored = localStorage.getItem('LOGI1_lastReadTs');
    return stored ? parseInt(stored, 10) : 0;
  });

  // Auth & Permissions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        dataService.updateUserPresence(currentUser);
        dataService.setupNotifications(currentUser);
        // Access Gate Disabled: Always authorize logged-in users
        setIsAuthorized(true);
      } else {
        setIsAuthorized(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Presence
  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      const status = document.hidden ? 'away' : 'online';
      dataService.updateUserStatus(user.uid, status);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Data Subscriptions
  useEffect(() => {
    if (!user || !isAuthorized) return;
    const unsubJobs = dataService.subscribeJobs(setVesselJobs);
    const unsubBLs = dataService.subscribeBLs((data) => {
      setBLData(data);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const expiredCount = data.filter(bl => new Date(bl.uploadDate) < threeMonthsAgo).length;
      if (expiredCount > 0) setExpirationAlert({ count: expiredCount });
      else setExpirationAlert(null);
    });
    const unsubChecklists = dataService.subscribeChecklists(setChecklists);
    const unsubReportLogo = dataService.subscribeReportLogo(setReportLogoUrl);
    const unsubUnread = chatService.subscribeUnreadStatus(user.uid, setLatestUnreadTs);
    const unsubShipRegistries = dataService.subscribeShipRegistries(setShipRegistries);

    return () => { unsubJobs(); unsubBLs(); unsubChecklists(); unsubUnread(); unsubReportLogo(); unsubShipRegistries(); };
  }, [user, isAuthorized]);

  // Social & Document Notification Listeners
  useEffect(() => {
    if (!user || !isAuthorized) return;
    const sessionStart = Date.now();

    // 1. Team Board Posts (New posts from others)
    const qPosts = query(collection(db, 'toolbox_posts'), orderBy('createdAt', 'desc'), limit(5));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0;
          if (createdAt > sessionStart && data.authorUid !== user.uid) {
            // Link to Team Board. In a real app we might need specific routing state.
            // For now we assume clicking it might just open the board or we handle navigation in App.tsx
            addToHistory('New Team Post', `${data.author} posted a new ${data.type}`, 'social');
          }
        }
      });
    });

    // 2. Comments on MY posts
    const qComments = query(collectionGroup(db, 'comments'), where('postAuthorUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0;
          if (createdAt > sessionStart && data.authorUid !== user.uid) {
            addToHistory('New Comment', `${data.author} commented on your post`, 'social');
          }
        }
      });
    });

    // 3. Document Uploads (From others)
    const qBLs = query(collection(db, 'bls'), orderBy('uploadDate', 'desc'), limit(5));
    const unsubNewBLs = onSnapshot(qBLs, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as BLData;
          const uploadTime = new Date(data.uploadDate).getTime();
          if (uploadTime > sessionStart && data.createdBy && data.createdBy !== user.uid) {
            addToHistory('New Document', `New BL uploaded: ${data.blNumber}`, 'document');
          }
        }
      });
    });

    return () => { unsubPosts(); unsubComments(); unsubNewBLs(); };
  }, [user, isAuthorized]);

  // Task Management Helpers
  const addToHistory = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' | 'social' | 'document' = 'info', link?: string) => {
    setNotificationHistory(prev => [{ id: Date.now().toString() + Math.random(), title, message, type, timestamp: new Date().toISOString(), link }, ...prev]);
  };

  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const addTask = (task: BackgroundTask) => {
    setTasks(prev => [task, ...prev]);
    if (task.status === 'success') {
      setTimeout(() => removeTask(task.id), 500);
      addToHistory(task.title, task.message || 'Completed successfully', 'success');
    } else if (task.status === 'error') {
      setTimeout(() => removeTask(task.id), 500);
      addToHistory(task.title, task.message || 'Operation failed', 'error');
    }
  };

  const updateTask = (id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        if (updates.status === 'success' && t.status !== 'success') {
          setTimeout(() => removeTask(id), 500);
          addToHistory(updated.title, updated.message || 'Done', 'success');
        } else if (updates.status === 'error' && t.status !== 'error') {
          setTimeout(() => removeTask(id), 500);
          addToHistory(updated.title, updated.message || 'Failed', 'error');
        }
        return updated;
      }
      return t;
    }));
  };

  const clearHistory = () => setNotificationHistory([]);

  const updateLastRead = () => {
    const now = Date.now();
    setLastReadTs(now);
    localStorage.setItem('LOGI1_lastReadTs', now.toString());
  };

  return {
    user, authLoading, isAuthorized, setIsAuthorized,
    vesselJobs, blData, checklists, reportLogoUrl, shipRegistries,
    tasks, notificationHistory, expirationAlert,
    latestUnreadTs, lastReadTs,
    addTask, updateTask, removeTask,
    addToHistory, clearHistory, updateLastRead
  };
};
