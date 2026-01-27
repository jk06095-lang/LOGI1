
import { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { dataService } from '../services/dataService';
import { chatService } from '../services/chatService';
import { VesselJob, BLData, BLChecklist, BackgroundTask, NotificationLog, AppSettings } from '../types';

export const useGlobalData = (settings: AppSettings) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // Data States
  const [vesselJobs, setVesselJobs] = useState<VesselJob[]>([]);
  const [blData, setBLData] = useState<BLData[]>([]);
  const [checklists, setChecklists] = useState<Record<string, BLChecklist>>({});
  const [reportLogoUrl, setReportLogoUrl] = useState<string | null>(null);
  
  // UI States
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationLog[]>([]);
  const [expirationAlert, setExpirationAlert] = useState<{count: number} | null>(null);
  
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
          const authorized = await dataService.checkUserAuthorization(currentUser.uid);
          if (authorized) {
              setIsAuthorized(true);
          } else {
              const tempCode = sessionStorage.getItem('temp_access_code');
              if (tempCode) {
                  const isValid = await dataService.verifyAccessCode(tempCode);
                  if (isValid) {
                      await dataService.grantAuthorization(currentUser.uid);
                      setIsAuthorized(true);
                      sessionStorage.removeItem('temp_access_code');
                  } else {
                      setIsAuthorized(false);
                  }
              } else {
                  setIsAuthorized(false);
              }
          }
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
    
    return () => { unsubJobs(); unsubBLs(); unsubChecklists(); unsubUnread(); unsubReportLogo(); };
  }, [user, isAuthorized]);

  // Task Management Helpers
  const addToHistory = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
      setNotificationHistory(prev => [{ id: Date.now().toString() + Math.random(), title, message, type, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
  };

  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const addTask = (task: BackgroundTask) => {
    setTasks(prev => [task, ...prev]);
    if (task.status === 'success') {
      setTimeout(() => removeTask(task.id), 5000);
      addToHistory(task.title, task.message || 'Completed successfully', 'success');
    } else if (task.status === 'error') {
      addToHistory(task.title, task.message || 'Operation failed', 'error');
    }
  };

  const updateTask = (id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(t => {
        if (t.id === id) {
           const updated = { ...t, ...updates };
           if (updates.status === 'success' && t.status !== 'success') {
               setTimeout(() => removeTask(id), 5000);
               addToHistory(updated.title, updated.message || 'Done', 'success');
           } else if (updates.status === 'error' && t.status !== 'error') {
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
    vesselJobs, blData, checklists, reportLogoUrl,
    tasks, notificationHistory, expirationAlert,
    latestUnreadTs, lastReadTs,
    addTask, updateTask, removeTask,
    addToHistory, clearHistory, updateLastRead
  };
};
