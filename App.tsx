

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard, BriefingReport } from './components/Dashboard';
import { VesselList } from './components/VesselList';
import { VesselDetail } from './components/VesselDetail';
import { Settings } from './components/Settings';
import { BLManagement } from './components/BLManagement';
import { ShipmentDetail } from './components/ShipmentDetail';
import { TabNavigation, Tab } from './components/TabNavigation';
import { VesselJob, BLData, ViewState, BLChecklist, AppSettings, CargoSourceType, BackgroundTask, NotificationLog } from './types';
import { parseBLImage } from './services/geminiService';
import { dataService } from './services/dataService';
import { uploadFileToStorage } from './services/storageService';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Login } from './components/Login';
import { AlertCircle, Loader2, X, Ship as ShipIcon, Clock, Archive, CheckCircle, BrainCircuit, Bell, Inbox, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({
    language: 'ko', theme: 'light', fontSize: 'medium', fontStyle: 'sans', viewMode: 'pc'
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'dashboard', type: 'dashboard', title: 'Dashboard' }]);
  const [activeTabId, setActiveTabId] = useState('dashboard');
  const [vesselJobs, setVesselJobs] = useState<VesselJob[]>([]);
  const [blData, setBLData] = useState<BLData[]>([]);
  const [checklists, setChecklists] = useState<Record<string, BLChecklist>>({});
  
  // Task & Notification State
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationLog[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isProcessing, setIsProcessing] = useState(false); // Legacy for bulk upload
  const [progressMessage, setProgressMessage] = useState(''); // Legacy for bulk upload
  const [expirationAlert, setExpirationAlert] = useState<{count: number} | null>(null);

  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    const fontClass = settings.fontStyle === 'serif' ? 'font-serif' : settings.fontStyle === 'mono' ? 'font-mono' : 'font-sans';
    document.body.className = `${fontClass} text-slate-900 dark:text-slate-100 transition-colors duration-200 antialiased`;

    // Apply Global Font Size Scaling
    const root = document.documentElement;
    switch(settings.fontSize) {
      case 'small': root.style.fontSize = '14px'; break;
      case 'large': root.style.fontSize = '18px'; break;
      case 'xl': root.style.fontSize = '20px'; break;
      default: root.style.fontSize = '16px'; // Medium
    }
  }, [settings.theme, settings.fontStyle, settings.fontSize]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Click outside listener for notifications
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
    if (!user) return;
    
    // Subscribe to REAL Firebase data
    const unsubJobs = dataService.subscribeJobs(setVesselJobs);
    const unsubBLs = dataService.subscribeBLs((data) => {
        setBLData(data);
        checkExpiration(data);
    });
    const unsubChecklists = dataService.subscribeChecklists(setChecklists);
    
    return () => { unsubJobs(); unsubBLs(); unsubChecklists(); };
  }, [user]);

  // Check for files older than 3 months
  const checkExpiration = (data: BLData[]) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const expiredCount = data.filter(bl => {
       const uploadDate = new Date(bl.uploadDate);
       return uploadDate < threeMonthsAgo;
    }).length;

    if (expiredCount > 0) {
      setExpirationAlert({ count: expiredCount });
    } else {
      setExpirationAlert(null);
    }
  };

  // Task Management Functions
  const addTask = (task: BackgroundTask) => {
    setTasks(prev => [task, ...prev]);
    // Auto remove success tasks after 5 seconds
    if (task.status === 'success') {
      setTimeout(() => removeTask(task.id), 5000);
      addToHistory(task.title, task.message || 'Completed successfully', 'success');
    } else if (task.status === 'error') {
      addToHistory(task.title, task.message || 'Operation failed', 'error');
    }
  };

  const updateTask = (id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => {
        const next = prev.map(t => {
            if (t.id === id) {
               const updated = { ...t, ...updates };
               // If transition to success/error, log it
               if (updates.status === 'success' && t.status !== 'success') {
                   setTimeout(() => removeTask(id), 5000);
                   addToHistory(updated.title, updated.message || 'Done', 'success');
               } else if (updates.status === 'error' && t.status !== 'error') {
                   addToHistory(updated.title, updated.message || 'Failed', 'error');
               }
               return updated;
            }
            return t;
        });
        return next;
    });
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addToHistory = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
      setNotificationHistory(prev => [{
          id: Date.now().toString() + Math.random(),
          title,
          message,
          type,
          timestamp: new Date().toISOString()
      }, ...prev].slice(0, 50)); // Keep last 50
  };

  const clearHistory = () => {
      setNotificationHistory([]);
  };

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const activateTab = (id: string) => setActiveTabId(id);
  
  const closeTab = (id: string) => {
    if (id === 'dashboard') return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1]?.id || 'dashboard');
    }
  };

  const openVesselTab = (jobId: string, initialTab: 'cargo' | 'checklist' = 'cargo', blId?: string) => {
    const job = vesselJobs.find(j => j.id === jobId);
    if (!job) return;

    const tabId = `vessel-${jobId}`;
    const existingTab = tabs.find(t => t.id === tabId);
    
    if (existingTab) {
      setTabs(prev => prev.map(t => t.id === tabId ? { 
        ...t, 
        data: { ...t.data, initialTab, initialBLId: blId, timestamp: Date.now() } 
      } : t));
      setActiveTabId(tabId);
    } else {
      const newTab: Tab = { 
        id: tabId, 
        type: 'vessel-detail', 
        title: job.vesselName, 
        data: { vesselId: jobId, initialTab, initialBLId: blId, timestamp: Date.now() } 
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const openShipmentDetailTab = (blId: string) => {
    const bl = blData.find(b => b.id === blId);
    if (!bl) return;

    const tabId = `shipment-${blId}`;
    const existingTab = tabs.find(t => t.id === tabId);

    if (existingTab) {
      setActiveTabId(tabId);
    } else {
      const newTab: Tab = {
        id: tabId,
        type: 'shipment-detail', 
        title: `Detail: ${bl.blNumber}`,
        data: { blId: blId }
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  };
  
  const openBriefingTab = (date: Date) => {
     const tabId = 'briefing-report';
     const existingTab = tabs.find(t => t.id === tabId);
     
     if (existingTab) {
        // Update the date in data
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, data: { date } } : t));
        setActiveTabId(tabId);
     } else {
        const newTab: Tab = {
            id: tabId,
            type: 'briefing',
            title: 'Report',
            data: { date }
        };
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
    let contextJobId = activeTab?.type === 'vessel-detail' ? activeTab.data.vesselId : undefined;

    // Log start
    addToHistory('Bulk Upload Started', `Uploading ${files.length} files...`, 'info');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setProgressMessage(`${i + 1}/${files.length} Analyzing...`);
        // Always upload to storage (no guest mode)
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
          consignee: rawData.consignee || '', notifyParty: rawData.notifyParty || '', vesselName: rawData.vesselName || '',
          voyageNo: rawData.voyageNo || '', portOfLoading: rawData.portOfLoading || '', portOfDischarge: rawData.portOfDischarge || '',
          date: rawData.date || '', sourceType: sourceType, cargoItems: rawData.cargoItems || []
        });
      } catch (error: any) { 
          alert("Error: " + error.message); 
          addToHistory('Upload Error', `${file.name}: ${error.message}`, 'error');
      }
    }
    setIsProcessing(false); setProgressMessage('');
    addToHistory('Bulk Upload Completed', `Processed ${files.length} files.`, 'success');
  };

  const renderContent = () => {
    if (!activeTab) return <div className="p-10 flex flex-col items-center"><Loader2 className="animate-spin text-blue-500 mb-2" /> Loading...</div>;

    switch (activeTab.type) {
      case 'dashboard':
        return (
            <Dashboard 
                jobs={vesselJobs} 
                bls={blData} 
                onSelectJob={openVesselTab} 
                language={settings.language} 
                onUpdateBL={dataService.updateBL} 
                onOpenBriefing={openBriefingTab}
            />
        );
      case 'briefing':
         return (
             <BriefingReport 
                jobs={vesselJobs}
                bls={blData}
                initialDate={activeTab.data?.date || new Date()}
                language={settings.language}
                logoUrl={settings.logoUrl}
                onUpdateBL={dataService.updateBL}
             />
         );
      case 'vessel-list':
        return <VesselList jobs={vesselJobs} allBLs={blData} onSelectJob={openVesselTab} onCreateJob={dataService.addJob} onUpdateJob={dataService.updateJob} onDeleteJob={dataService.deleteJob} getBLCount={(id) => blData.filter(b => b.vesselJobId === id).length} getTotalWeight={(id) => 0} language={settings.language} />;
      case 'bl-list':
        return <BLManagement bls={blData} jobs={vesselJobs} checklists={checklists} onUploadBLs={(f) => handleBLUpload(f)} onAssignBL={dataService.updateBL} onCreateJob={dataService.addJob} onNavigateToBL={(id) => openShipmentDetailTab(id)} isProcessing={isProcessing} progressMessage={progressMessage} language={settings.language} />;
      case 'settings':
        return (
          <Settings 
            settings={settings} 
            onUpdateSettings={setSettings} 
            user={user} 
            onLogout={() => { if (user) signOut(auth); }}
            bls={blData}
            jobs={vesselJobs}
            onDeleteBLs={dataService.bulkDeleteBLs}
          />
        );
      case 'shipment-detail':
        const currentBL = blData.find(b => b.id === activeTab.data.blId);
        if(!currentBL) return <div className="p-10 text-slate-400">Document not found</div>;
        return (
            <ShipmentDetail 
                bl={currentBL} 
                language={settings.language} 
                onUpdateBL={dataService.updateBL} 
                onClose={() => closeTab(activeTabId)}
                checklist={checklists[currentBL.id]}
                onDelete={(id) => dataService.deleteBL(id)}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onNavigateToChecklist={() => {
                   if (currentBL.vesselJobId) {
                      openVesselTab(currentBL.vesselJobId, 'checklist', currentBL.id);
                   } else {
                      alert("Please assign to a vessel first to view checklist.");
                   }
                }}
            />
        );
      case 'vessel-detail':
        const { vesselId, blId } = activeTab.data || {};
        
        const currentJob = vesselJobs.find(j => j.id === vesselId);
        if (!currentJob) return <div className="p-10 text-slate-400">Vessel not found</div>;

        return (
          <VesselDetail 
            key={activeTab.id} 
            job={currentJob}
            bls={blData.filter(bl => bl.vesselJobId === currentJob.id)} 
            checklists={checklists} 
            onClose={() => closeTab(activeTabId)} 
            onUploadBLs={handleBLUpload} 
            onCreateManualBL={dataService.addBL} 
            onUpdateChecklist={dataService.updateChecklist} 
            onUpdateBL={dataService.updateBL}
            isProcessing={isProcessing} 
            progressMessage={progressMessage} 
            language={settings.language} 
            initialTab={activeTab.data?.initialTab}
            initialBLId={activeTab.data?.initialBLId}
            lastUpdate={activeTab.data?.timestamp}
            onOpenBLDetail={(id) => openShipmentDetailTab(id)}
          />
        );
      default:
        return <div className="p-10">Menu item not implemented yet.</div>;
    }
  };

  if (authLoading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 font-bold tracking-widest uppercase">Initializing LOGI1...</div>;
  if (!user) return <Login />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 print:h-auto print:overflow-visible relative">
      <Sidebar 
        currentView={activeTab?.type as ViewState} 
        onNavigate={handleSidebarNavigation} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        language={settings.language} 
        user={user} 
      />
      <main className="flex-1 flex flex-col overflow-hidden relative print:overflow-visible print:h-auto print:block">
        <div className="flex justify-between items-end bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pr-4 print:hidden">
            <TabNavigation tabs={tabs} activeTabId={activeTabId} onTabClick={activateTab} onTabClose={closeTab} />
            
            {/* Notification Bell */}
            <div className="relative mb-1" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                >
                    <Bell size={18} />
                    {notificationHistory.some(n => n.type === 'error' && new Date(n.timestamp).getTime() > Date.now() - 60000) && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                    )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                   <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-fade-in origin-top-right">
                       <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-300">Notification History</h4>
                          <button onClick={clearHistory} className="text-slate-400 hover:text-red-500 text-[10px] flex items-center gap-1">
                             <Trash2 size={10} /> Clear
                          </button>
                       </div>
                       <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          {notificationHistory.length === 0 ? (
                             <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                <Inbox size={24} className="mb-2 opacity-50"/>
                                <span className="text-xs">No notifications</span>
                             </div>
                          ) : (
                             <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                {notificationHistory.map(log => (
                                   <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                      <div className="flex justify-between items-start mb-1">
                                         <p className={`text-xs font-bold ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                            {log.title}
                                         </p>
                                         <span className="text-[10px] text-slate-400 tabular-nums">
                                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                         </span>
                                      </div>
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
        
        {/* Task Toast Notifications (Active Process) */}
        <div className="absolute top-14 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none print:hidden">
          {tasks.map(task => (
            <div key={task.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 pointer-events-auto animate-fade-in flex items-start gap-3">
               <div className="mt-0.5">
                  {task.status === 'processing' && <Loader2 size={18} className="animate-spin text-blue-600" />}
                  {task.status === 'success' && <CheckCircle size={18} className="text-emerald-500" />}
                  {task.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                  {task.status === 'pending' && <Clock size={18} className="text-slate-400" />}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{task.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{task.message}</p>
                  {task.status === 'processing' && (
                     <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${task.progress}%` }}></div>
                     </div>
                  )}
               </div>
               <button onClick={() => removeTask(task.id)} className="text-slate-300 hover:text-slate-500"><X size={14}/></button>
            </div>
          ))}
        </div>

        {expirationAlert && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 px-4 py-2 text-sm font-medium flex items-center justify-between border-b border-red-100 dark:border-red-900 animate-fade-in-up print:hidden">
             <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>
                  {settings.language === 'ko' 
                    ? `보관 기한(3개월)이 지난 파일이 ${expirationAlert.count}건 있습니다. 환경설정에서 백업 후 삭제해주세요.`
                    : `${expirationAlert.count} files have expired (older than 3 months). Please backup and clean them in Settings.`}
                </span>
             </div>
             <button onClick={() => handleSidebarNavigation('settings')} className="underline hover:text-red-800 dark:hover:text-red-100">
                {settings.language === 'ko' ? '설정으로 이동' : 'Go to Settings'}
             </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900 print:overflow-visible print:h-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;