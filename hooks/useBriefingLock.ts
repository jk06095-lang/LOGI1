
import { useState, useMemo, useEffect } from 'react';
import { ResourceLock } from '../types';
import { auth } from '../lib/firebase';
import { dataService } from '../services/dataService';

export const useBriefingLock = (currentDate: Date, briefingPeriod: 'week' | 'month') => {
  const [lockData, setLockData] = useState<ResourceLock | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const lockId = useMemo(() => {
      const d = currentDate;
      const periodKey = briefingPeriod === 'month' 
          ? `month-${d.getFullYear()}-${d.getMonth() + 1}`
          : `week-${d.getFullYear()}-w${Math.ceil(d.getDate() / 7)}`;
      return `briefing-${periodKey}`;
  }, [currentDate, briefingPeriod]);

  useEffect(() => {
     const unsub = dataService.subscribeLock(lockId, (lock) => {
         setLockData(lock);
         const currentUser = auth.currentUser;
         if (lock && lock.userId !== currentUser?.uid) {
             // 30 seconds threshold for stale locks
             if (Date.now() - lock.timestamp > 30000) {
                 setIsReadOnly(true); 
             } else {
                 setIsReadOnly(true);
             }
         } else {
             setIsReadOnly(false);
             if (!lock && currentUser) {
                 dataService.acquireLock(lockId, currentUser);
             }
         }
     });

     const heartbeat = window.setInterval(() => {
         const currentUser = auth.currentUser;
         if (lockData && lockData.userId === currentUser?.uid) {
             dataService.maintainLock(lockId);
         } else if (!lockData && currentUser && !isReadOnly) {
             dataService.acquireLock(lockId, currentUser);
         }
     }, 10000); 

     return () => {
         unsub();
         clearInterval(heartbeat);
     };
  }, [lockId, isReadOnly]); 

  const handleForceEdit = () => {
      if (confirm("Are you sure? This may overwrite other user's work.")) {
          if (auth.currentUser) {
              dataService.acquireLock(lockId, auth.currentUser);
              setIsReadOnly(false);
          }
      }
  };

  return { lockData, isReadOnly, handleForceEdit };
};
