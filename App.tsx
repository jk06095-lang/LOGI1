
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard, BriefingReport } from './components/Dashboard';
import { VesselList } from './components/VesselList';
import { VesselDetail } from './components/VesselDetail';
import { Settings } from './components/Settings';
import { BLManagement } from './components/BLManagement';
import { ShipmentDetail } from './components/ShipmentDetail';
import { TabNavigation, Tab } from './components/TabNavigation';
import { ChatWindow } from './components/ChatWindow'; 
import { MobileLayout } from './components/MobileLayout'; 
import { AccessGate } from './components/AccessGate';
import { GlobalCloudManager } from './components/GlobalCloudManager';
import { CloudFileManager } from './components/CloudFileManager';
import { VesselJob, BLData, BLChecklist, AppSettings, CargoSourceType, BackgroundTask, NotificationLog, ViewState } from './types';
import { parseBLImage } from './services/geminiService';
import { dataService } from './services/dataService';
import { chatService } from './services/chatService';
import { uploadFileToStorage, deleteFileFromStorage } from './services/storageService';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Login } from './components/Login';
import { AlertCircle, Loader2, X, Ship as ShipIcon, Clock, Archive, CheckCircle, BrainCircuit, Bell, Inbox, Trash2 } from 'lucide-react';
import { WindowContext } from './contexts/WindowContext';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null); 
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      language: 'ko', 
      theme: 'light', 
      fontSize: 'medium', 
      fontStyle: 'sans', 
      viewMode: isMobile ? 'mobile' : 'pc'
    };
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Floating Windows State (Apps)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [isCloudMinimized, setIsCloudMinimized] = useState(false);
  
  // BL-specific Cloud Managers (Hoisted)
  const [activeBLClouds, setActiveBLClouds] = useState<{ id: string; minimized: boolean }[]>([]);
  
  // Window Z-Index Stack
  const [windowStack, setWindowStack] = useState<string[]>(['chat', 'cloud']);

  const focusWindow = (windowId: string) => {
    setWindowStack(prev => {
      const filtered = prev.filter(id => id !== windowId);
      return [...filtered, windowId];
    });
  };

  const getZIndex = (windowId: string) => {
    const baseZ = 100;
    const index = windowStack.indexOf(windowId);
    return index === -1 ? baseZ : baseZ + (index * 10);
  };

  const handleToggleChat = () => {
      if (isChatOpen) {
          if (isChatMinimized) {
              setIsChatMinimized(false); // Restore
              focusWindow('chat');
          } else {
              setIsChatOpen(false); // Close
          }
      } else {
          setIsChatOpen(true);
          setIsChatMinimized(false);
          focusWindow('chat');
          updateLastRead();
      }
  };

  const handleToggleCloud = () => {
      if (isCloudOpen) {
          if (isCloudMinimized) {
              setIsCloudMinimized(false); // Restore
              focusWindow('cloud');
          } else {
              setIsCloudOpen(false); // Close
          }
      } else {
          setIsCloudOpen(true);
          setIsCloudMinimized(false);
          focusWindow('cloud');
      }
  };

  // BL Cloud Window Handlers
  const openBLCloud = (blId: string) => {
    setActiveBLClouds(prev => {
        const exists = prev.find(w => w.id === blId);
        if (exists) {
            return prev.map(w => w.id === blId ? { ...w, minimized: false } : w);
        }
        return [...prev, { id: blId, minimized: false }];
    });
    focusWindow(`bl-cloud-${blId}`);
  };

  const closeBLCloud = (blId: string) => {
    setActiveBLClouds(prev => prev.filter(w => w.id !== blId));
  };

  const minimizeBLCloud = (blId: string) => {
    setActiveBLClouds(prev => prev.map(w => w.id === blId ? { ...w, minimized: true } : w));
  };

  // BL Cloud File Operations
  const handleBLCloudUpload = async (blId: string, files: File[]) => {
      const taskId = `cloud-upload-${Date.now()}`;
      addTask({ id: taskId, title: `Uploading ${files.length} files...`, status: 'processing', progress: 0, message: 'Starting...' });
      
      const bl = blData.find(b => b.id === blId);
      if (!bl) return;

      const newAttachments = [...(bl.attachments || [])];
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
              const url = await uploadFileToStorage(file);
              newAttachments.push({
                  id: Date.now().toString() + i,
                  name: file.name,
                  url: url,
                  type: file.type,
                  size: file.size,
                  uploadDate: new Date().toISOString()
              });
              successCount++;
              updateTask(taskId, { progress: Math.round(((i + 1) / files.length) * 100) });
          } catch (e) {
              console.error(e);
          }
      }

      if (successCount > 0) {
          await dataService.updateBL(blId, { attachments: newAttachments });
          updateTask(taskId, { status: 'success', message: 'Files uploaded' });
      } else {
          updateTask(taskId, { status: 'error', message: 'Upload failed' });
      }
  };

  const handleBLCloudDelete = async (blId: string, attachmentId: string) => {
      const bl = blData.find(b => b.id === blId);
      if (!bl) return;
      
      const attachment = (bl.attachments || []).find(a => a.id === attachmentId);
      if (attachment && attachment.url) {
          try { await deleteFileFromStorage(attachment.url); } catch(e) { console.warn(e); }
      }
      
      const newAttachments = (bl.attachments || []).filter(a => a.id !== attachmentId);
      await dataService.updateBL(blId, { attachments: newAttachments });
  };
  
  const handleBLCloudRename = async (blId: string, attachmentId: string, newName: string) => {
      const bl = blData.find(b => b.id === blId);
      if (!bl) return;
      
      const newAttachments = (bl.attachments || []).map(a => 
          a.id === attachmentId ? { ...a, name: newName } : a
      );
      await dataService.updateBL(blId, { attachments: newAttachments });
  };
  
  const [latestUnreadTs, setLatestUnreadTs] = useState<number>(0);
  const [lastReadTs, setLastReadTs] = useState<number>(() => {
      const stored = localStorage.getItem('LOGI1_lastReadTs');
      return stored ? parseInt(stored, 10) : 0;
  });

  const hasUnreadMessages = latestUnreadTs > lastReadTs;

  const [tabs, setTabs] = useState<Tab[]>([{ id: 'dashboard', type: 'dashboard', title: 'Dashboard' }]);
  const [activeTabId, setActiveTabId] = useState('dashboard');
  const [vesselJobs, setVesselJobs] = useState<VesselJob[]>([]);
  const [blData, setBLData] = useState<BLData[]>([]);
  const [checklists, setChecklists] = useState<Record<string, BLChecklist>>({});
  const [reportLogoUrl, setReportLogoUrl] = useState<string | null>(null);

  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationLog[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [expirationAlert, setExpirationAlert] = useState<{count: number} | null>(null);

  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    const fontClass = settings.fontStyle === 'serif' ? 'font-serif' : settings.fontStyle === 'mono' ? 'font-mono' : 'font-sans';
    document.body.className = `${fontClass} text-slate-900 dark:text-slate-100 transition-colors duration-200 antialiased`;

    const root = document.documentElement;
    switch(settings.fontSize) {
      case 'small': root.style.fontSize = '14px'; break;
      case 'large': root.style.fontSize = '18px'; break;
      case 'xl': root.style.fontSize = '20px'; break;
      default: root.style.fontSize = '16px'; 
    }
  }, [settings.theme, settings.fontStyle, settings.fontSize]);

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

  useEffect(() => {
      if (!user) return;
      const handleVisibilityChange = () => {
          const status = document.hidden ? 'away' : 'online';
          dataService.updateUserStatus(user.uid, status);
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !isAuthorized) return;
    const unsubJobs = dataService.subscribeJobs(setVesselJobs);
    const unsubBLs = dataService.subscribeBLs((data) => {
        setBLData(data);
        checkExpiration(data);
    });
    const unsubChecklists = dataService.subscribeChecklists(setChecklists);
    const unsubReportLogo = dataService.subscribeReportLogo(setReportLogoUrl);
    // Use chatService for unread status
    const unsubUnread = chatService.subscribeUnreadStatus(user.uid, setLatestUnreadTs);
    return () => { unsubJobs(); unsubBLs(); unsubChecklists(); unsubUnread(); unsubReportLogo(); };
  }, [user, isAuthorized]);

  const checkExpiration = (data: BLData[]) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const expiredCount = data.filter(bl => new Date(bl.uploadDate) < threeMonthsAgo).length;
    if (expiredCount > 0) setExpirationAlert({ count: expiredCount });
    else setExpirationAlert(null);
  };

  const updateLastRead = () => {
      const now = Date.now();
      setLastReadTs(now);
      localStorage.setItem('LOGI1_lastReadTs', now.toString());
  };

  const handleMobileChatCheck = () => {
      updateLastRead();
  };

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

  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const addToHistory = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
      setNotificationHistory(prev => [{ id: Date.now().toString() + Math.random(), title, message, type, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
  };

  const clearHistory = () => setNotificationHistory([]);

  const activateTab = (id: string) => setActiveTabId(id);
  
  const closeTab = (id: string) => {
    if (id === 'dashboard') return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1]?.id || 'dashboard');
  };

  const openVesselTab = (jobId: string, initialTab: 'cargo' | 'checklist' = 'cargo', blId?: string) => {
    const job = vesselJobs.find(j => j.id === jobId);
    if (!job) return;
    const tabId = `vessel-${jobId}`;
    const existingTab = tabs.find(t => t.id === tabId);
    if (existingTab) {
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, data: { ...t.data, initialTab, initialBLId: blId, timestamp: Date.now() } } : t));
      setActiveTabId(tabId);
    } else {
      const newTab: Tab = { id: tabId, type: 'vessel-detail', title: job.vesselName, data: { vesselId: jobId, initialTab, initialBLId: blId, timestamp: Date.now() } };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const openShipmentDetailTab = (blId: string) => {
    const bl = blData.find(b => b.id === blId);
    if (!bl) return;
    const tabId = `shipment-${blId}`;
    const existingTab = tabs.find(t => t.id === tabId);
    let title = bl.blNumber;
    if (bl.vesselJobId) {
        const job = vesselJobs.find(j => j.id === bl.vesselJobId);
        if (job && job.vesselName) {
            const vName = job.vesselName.trim();
            const suffix = vName.length > 4 ? vName.slice(-4) : vName;
            title = `${suffix}: ${bl.blNumber}`;
        }
    }
    if (existingTab) {
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title } : t));
      setActiveTabId(tabId);
    } else {
      const newTab: Tab = { id: tabId, type: 'shipment-detail', title: title, data: { blId: blId } };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  };
  
  const openBriefingTab = (date: Date) => {
     const tabId = 'briefing-report';
     const existingTab = tabs.find(t => t.id === tabId);
     if (existingTab) {
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, data: { date } } : t));
        setActiveTabId(tabId);
     } else {
        const newTab: Tab = { id: tabId, type: 'briefing', title: 'Report', data: { date } };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
     }
  };

  const handleSidebarNavigation = (view: ViewState) => {
    if (view === 'dashboard') activateTab('dashboard');
    else if (view === 'settings') { 
      if (!tabs.find(t => t.id === 'settings')) setTabs([...tabs, { id: 'settings', type: 'settings', title: 'Settings' }]); 
      activateTab('settings'); 
    }
    else if (view === 'vessel-list') { 
      if (!tabs.find(t => t.id === 'vessel-list')) setTabs([...tabs, { id: 'vessel-list', type: 'vessel-list', title: 'Vessels' }]); 
      activateTab('vessel-list'); 
    }
    else if (view === 'bl-list') { 
      if (!tabs.find(t => t.id === 'bl-list')) setTabs([...tabs, { id: 'bl-list', type: 'bl-list', title: 'Doc Mgmt' }]); 
      activateTab('bl-list'); 
    }
  };

  const handleBLUpload = async (files: File[], sourceType: CargoSourceType = 'TRANSIT') => {
    setIsProcessing(true);
    let contextJobId = activeTabId.startsWith('vessel-') ? tabs.find(t=>t.id===activeTabId)?.data?.vesselId : undefined;
    let contextJobName = '';
    if (contextJobId) {
        const j = vesselJobs.find(x => x.id === contextJobId);
        if (j) contextJobName = j.vesselName;
    }
    addToHistory('Bulk Upload Started', `Uploading ${files.length} files...`, 'info');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setProgressMessage(`${i + 1}/${files.length} Analyzing...`);
        const downloadUrl = await uploadFileToStorage(file);
        const rawData = await parseBLImage(file, sourceType);
        let matchedJobId = contextJobId;
        if (!matchedJobId && rawData.vesselName) {
           const job = vesselJobs.find(j => j.vesselName.toLowerCase().includes((rawData.vesselName || '').toLowerCase()));
           if (job) matchedJobId = job.id;
        }
        await dataService.addBL({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          vesselJobId: matchedJobId, fileName: file.name, fileUrl: downloadUrl, uploadDate: new Date().toISOString(),
          status: 'completed', blNumber: rawData.blNumber || 'UNKNOWN', shipper: rawData.shipper || '',
          consignee: rawData.consignee || '', notifyParty: rawData.notifyParty || '', 
          vesselName: contextJobName || rawData.vesselName || '', voyageNo: rawData.voyageNo || '', 
          portOfLoading: rawData.portOfLoading || '', portOfDischarge: rawData.portOfDischarge || '',
          date: rawData.date || '', sourceType: sourceType, cargoItems: rawData.cargoItems || []
        });
      } catch (error: any) { 
          addToHistory('Upload Error', `${file.name}: ${error.message}`, 'error');
      }
    }
    setIsProcessing(false); 
    setProgressMessage('');
    addToHistory('Bulk Upload Completed', `Processed ${files.length} files.`, 'success');
    if (files.length > 0 && settings.viewMode !== 'mobile') handleSidebarNavigation('bl-list');
  };

  const handleAccessVerify = async (code: string) => {
      if (!user) return false;
      const isValid = await dataService.verifyAccessCode(code);
      if (isValid) {
          await dataService.grantAuthorization(user.uid);
          setIsAuthorized(true);
      }
      return isValid;
  };

  const handleUpdateLogo = async (file: File) => {
      try {
          const url = await uploadFileToStorage(file);
          setSettings(prev => ({ ...prev, logoUrl: url }));
          addToHistory('Settings Updated', 'Company logo updated successfully', 'success');
      } catch (e: any) {
          addToHistory('Update Failed', `Logo upload failed: ${e.message}`, 'error');
      }
  };

  const handleUpdateReportLogo = async (file: File) => {
      try {
          const url = await uploadFileToStorage(file);
          await dataService.updateReportLogo(url);
          addToHistory('Report Logo Updated', 'Custom report logo has been updated.', 'success');
      } catch (e: any) {
          addToHistory('Logo Update Failed', e.message, 'error');
      }
  };

  const handleResetReportLogo = async () => {
      try {
          await dataService.updateReportLogo(null);
          addToHistory('Report Logo Reset', 'Restored default logo.', 'success');
      } catch (e: any) { console.error(e); }
  };

  const renderTabContent = (tab: Tab) => {
    switch (tab.type) {
      case 'dashboard':
        return <Dashboard jobs={vesselJobs} bls={blData} onSelectJob={openVesselTab} language={settings.language} onUpdateBL={dataService.updateBL} onOpenBriefing={openBriefingTab} onUploadBLs={handleBLUpload} onUpdateJob={dataService.updateJob} />;
      case 'briefing':
         return <BriefingReport jobs={vesselJobs} bls={blData} initialDate={tab.data?.date || new Date()} language={settings.language} logoUrl={settings.logoUrl} reportLogoUrl={reportLogoUrl} onUpdateBL={dataService.updateBL} onUpdateLogo={handleUpdateLogo} onUpdateReportLogo={handleUpdateReportLogo} onResetReportLogo={handleResetReportLogo} />;
      case 'vessel-list':
        return <VesselList jobs={vesselJobs} allBLs={blData} onSelectJob={openVesselTab} onCreateJob={dataService.addJob} onUpdateJob={dataService.updateJob} onDeleteJob={dataService.deleteJob} getBLCount={(id) => blData.filter(b => b.vesselJobId === id).length} getTotalWeight={(id) => 0} language={settings.language} />;
      case 'bl-list':
        return <BLManagement bls={blData} jobs={vesselJobs} checklists={checklists} onUploadBLs={(f) => handleBLUpload(f)} onAssignBL={(blId, jobId) => dataService.updateBL(blId, { vesselJobId: jobId })} onCreateJob={dataService.addJob} onNavigateToBL={(id) => openShipmentDetailTab(id)} isProcessing={isProcessing} progressMessage={progressMessage} language={settings.language} />;
      case 'settings':
        return <Settings settings={settings} onUpdateSettings={setSettings} user={user} onLogout={() => { if (user) signOut(auth); }} bls={blData} jobs={vesselJobs} onDeleteBLs={dataService.bulkDeleteBLs} />;
      case 'shipment-detail':
        const currentBL = blData.find(b => b.id === tab.data.blId);
        if(!currentBL) return <div className="p-10 text-slate-400">Document not found</div>;
        return <ShipmentDetail 
            bl={currentBL} 
            jobs={vesselJobs} 
            language={settings.language} 
            onUpdateBL={dataService.updateBL} 
            onClose={() => closeTab(tab.id)} 
            checklist={checklists[currentBL.id]} 
            onDelete={(id) => dataService.deleteBL(id)} 
            onAddTask={addTask} 
            onUpdateTask={updateTask} 
            onNavigateToChecklist={() => { if (currentBL.vesselJobId) { openVesselTab(currentBL.vesselJobId, 'checklist', currentBL.id); } else { alert("Please assign to a vessel first to view checklist."); } }} 
            onOpenCloudManager={() => openBLCloud(currentBL.id)} 
        />;
      case 'vessel-detail':
        const currentJob = vesselJobs.find(j => j.id === tab.data.vesselId);
        if (!currentJob) return <div className="p-10 text-slate-400">Vessel not found</div>;
        return <VesselDetail key={tab.id} job={currentJob} bls={blData.filter(bl => bl.vesselJobId === currentJob.id)} checklists={checklists} onClose={() => closeTab(tab.id)} onUploadBLs={handleBLUpload} onCreateManualBL={dataService.addBL} onUpdateChecklist={dataService.updateChecklist} onUpdateBL={dataService.updateBL} isProcessing={isProcessing} progressMessage={progressMessage} language={settings.language} initialTab={tab.data?.initialTab} initialBLId={tab.data?.initialBLId} lastUpdate={tab.data?.timestamp} onOpenBLDetail={(id) => openShipmentDetailTab(id)} />;
      default: return null;
    }
  };

  if (authLoading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 font-bold tracking-widest uppercase">Initializing LOGI1...</div>;
  if (!user) return <Login />;
  if (isAuthorized === false) return <AccessGate onVerify={handleAccessVerify} onLogout={() => signOut(auth)} userEmail={user.email || ''} />;
  if (isAuthorized === null) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500 mb-4" size={40} /><p className="text-slate-500 font-bold">Verifying Access Rights...</p></div>;

  if (settings.viewMode === 'mobile') {
      return <MobileLayout user={user} settings={settings} onUpdateSettings={setSettings} onLogout={() => { if (user) signOut(auth); }} bls={blData} jobs={vesselJobs} checklists={checklists} onUpdateBL={dataService.updateBL} onDeleteBL={dataService.deleteBL} onAddTask={addTask} onUpdateTask={updateTask} hasUnreadMessages={hasUnreadMessages} onCheckMessages={handleMobileChatCheck} />;
  }

  return (
    <WindowContext.Provider value={{ focusWindow, getZIndex }}>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 print:h-auto print:overflow-visible relative">
        <Sidebar 
          currentView={activeTabId as ViewState} 
          onNavigate={handleSidebarNavigation} 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          language={settings.language} 
          user={user} 
          isChatOpen={isChatOpen}
          onToggleChat={handleToggleChat}
          logoUrl={settings.logoUrl}
          hasUnreadMessages={hasUnreadMessages}
          isCloudOpen={isCloudOpen}
          onToggleCloud={handleToggleCloud}
        />
        
        {/* Floating Apps Layer */}
        <GlobalCloudManager 
            isOpen={isCloudOpen}
            isMinimized={isCloudMinimized}
            onClose={() => setIsCloudOpen(false)}
            onMinimize={() => setIsCloudMinimized(true)}
            jobs={vesselJobs}
            bls={blData}
            onUpdateBL={dataService.updateBL}
            zIndex={getZIndex('cloud')}
            onFocus={() => focusWindow('cloud')}
        />
        
        <ChatWindow 
           isOpen={isChatOpen}
           isMinimized={isChatMinimized}
           onClose={() => setIsChatOpen(false)} 
           onMinimize={() => setIsChatMinimized(true)}
           sidebarWidth={isSidebarCollapsed ? 64 : 224} 
           user={user} 
           zIndex={getZIndex('chat')}
           onFocus={() => focusWindow('chat')}
        />

        {/* BL-specific Cloud Windows (Hoisted) */}
        {activeBLClouds.map(window => {
            const bl = blData.find(b => b.id === window.id);
            if (!bl) return null;
            const winId = `bl-cloud-${bl.id}`;
            
            return (
               <CloudFileManager 
                  key={winId}
                  isOpen={true} // Array presence implies open
                  isMinimized={window.minimized}
                  onClose={() => closeBLCloud(bl.id)}
                  onMinimize={() => minimizeBLCloud(bl.id)}
                  
                  zIndex={getZIndex(winId)}
                  onFocus={() => focusWindow(winId)}
                  
                  attachments={bl.attachments || []}
                  onUpload={(files) => handleBLCloudUpload(bl.id, files)}
                  onDelete={(id) => handleBLCloudDelete(bl.id, id)}
                  onRename={(id, name) => handleBLCloudRename(bl.id, id, name)}
               />
            );
        })}

        <main className="flex-1 flex flex-col overflow-hidden relative print:overflow-visible print:h-auto">
          <div className="flex justify-between items-end bg-slate-100 dark:bg-slate-900 pr-4 print:hidden">
              <TabNavigation tabs={tabs} activeTabId={activeTabId} onTabClick={activateTab} onTabClose={closeTab} />
              
              <div className="relative mb-1 shrink-0" ref={notifRef}>
                  <button onClick={() => setShowNotifications(!showNotifications)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors relative"><Bell size={18} /></button>
                  {showNotifications && (
                     <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-fade-in origin-top-right">
                         <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-300">Notification History</h4>
                            <button onClick={clearHistory} className="text-slate-400 hover:text-red-500 text-[10px] flex items-center gap-1"><Trash2 size={10} /> Clear</button>
                         </div>
                         <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {notificationHistory.length === 0 ? (
                               <div className="p-8 text-center text-slate-400 flex flex-col items-center"><Inbox size={24} className="mb-2 opacity-50"/><span className="text-xs">No notifications</span></div>
                            ) : (
                               <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                  {notificationHistory.map(log => (
                                     <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <div className="flex justify-between items-start mb-1"><p className={`text-xs font-bold ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-emerald-600' : 'text-blue-600'}`}>{log.title}</p><span className="text-[10px] text-slate-400 tabular-nums">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{log.message}</p>
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>
                     </div>
                  )}
              </div>
          </div>
          
          <div className="absolute top-14 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none print:hidden">
            {tasks.map(task => (
              <div key={task.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 pointer-events-auto animate-fade-in flex items-start gap-3">
                 <div className="mt-0.5">
                    {task.status === 'processing' && <Loader2 size={18} className="animate-spin text-blue-600" />}
                    {task.status === 'success' && <CheckCircle size={18} className="text-emerald-500" />}
                    {task.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{task.message}</p>
                    {task.status === 'processing' && <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${task.progress}%` }}></div></div>}
                 </div>
                 <button onClick={() => removeTask(task.id)} className="text-slate-300 hover:text-slate-500"><X size={14}/></button>
              </div>
            ))}
          </div>

          {expirationAlert && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 px-4 py-2 text-sm font-medium flex items-center justify-between border-b border-red-100 dark:border-red-900 animate-fade-in-up print:hidden">
               <div className="flex items-center gap-2"><Clock size={16} /><span>{settings.language === 'ko' ? `보관 기한(3개월)이 지난 파일이 ${expirationAlert.count}건 있습니다. 환경설정에서 백업 후 삭제해주세요.` : `${expirationAlert.count} files have expired (older than 3 months). Please backup and clean them in Settings.`}</span></div>
               <button onClick={() => handleSidebarNavigation('settings')} className="underline hover:text-red-800 dark:hover:text-red-100">{settings.language === 'ko' ? '설정으로 이동' : 'Go to Settings'}</button>
            </div>
          )}

          <div className="flex-1 relative bg-slate-50 dark:bg-slate-900 print:overflow-visible print:h-auto overflow-hidden">
              {/* Multi-Window Rendering Implementation */}
              {tabs.map(tab => (
                <div 
                  key={tab.id}
                  className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden"
                  style={{
                    zIndex: activeTabId === tab.id ? 10 : 0,
                    visibility: activeTabId === tab.id ? 'visible' : 'hidden'
                  }}
                >
                   {renderTabContent(tab)}
                </div>
              ))}
          </div>
        </main>
      </div>
    </WindowContext.Provider>
  );
};

export default App;
