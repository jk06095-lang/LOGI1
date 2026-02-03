
import React from 'react';
import { Sidebar } from './components/Sidebar';
import { TabNavigation } from './components/TabNavigation';
import { MobileLayout } from './components/MobileLayout';
import { Login } from './components/Login';
import { WindowRenderer } from './components/WindowRenderer';
import { TabContentRenderer } from './components/TabContentRenderer';
import { useUIStore } from './store/uiStore';
import { useGlobalData } from './hooks/useGlobalData';
import { useActionRegistry } from './hooks/useActionRegistry';
import { useThemeEffect } from './hooks/useThemeEffect';
import { dataService } from './services/dataService';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AlertCircle, Loader2, CheckCircle, Bell, X, Inbox, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const store = useUIStore();
  const { user, authLoading, vesselJobs, blData, checklists, reportLogoUrl, tasks, addTask, updateTask, removeTask, addToHistory, notificationHistory, clearHistory, expirationAlert, latestUnreadTs, lastReadTs, updateLastRead } = useGlobalData(store.settings);
  
  // Custom Hook: Action Registry (Standardized Logic)
  const actions = useActionRegistry(
      vesselJobs, 
      blData, 
      addToHistory, 
      addTask, 
      updateTask, 
      () => { if(user) signOut(auth); }
  );

  // Custom Hook: Theme
  useThemeEffect(store.settings);

  if (authLoading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 font-bold uppercase">Initializing LOGI1...</div>;
  if (!user) return <Login />;

  if (store.settings.viewMode === 'mobile') {
      return <MobileLayout user={user} settings={store.settings} onUpdateSettings={store.updateSettings} onLogout={actions.auth.logout} bls={blData} jobs={vesselJobs} checklists={checklists} onUpdateBL={dataService.updateBL} onDeleteBL={dataService.deleteBL} onAddTask={addTask} onUpdateTask={updateTask} hasUnreadMessages={latestUnreadTs > lastReadTs} onCheckMessages={updateLastRead} />;
  }

  // --- Main Desktop Layout ---
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
      <Sidebar 
        currentView={store.activeTabId as any} 
        onNavigate={(id) => { 
            if(['settings','vessel-list','bl-list'].includes(id)) store.addTab({id, type: id as any, title: id}); 
            else store.setActiveTab(id); 
        }}
        isCollapsed={store.sidebarCollapsed} 
        onToggleCollapse={store.toggleSidebar} 
        language={store.settings.language} user={user} logoUrl={store.settings.logoUrl}
        isChatOpen={!!store.windows['chat']?.isOpen} 
        onToggleChat={(rect) => store.windows['chat']?.isOpen ? store.closeWindow('chat') : (store.openWindow('chat', 'chat', undefined, rect), updateLastRead())}
        isCloudOpen={!!store.windows['cloud']?.isOpen} 
        onToggleCloud={(rect) => store.windows['cloud']?.isOpen ? store.closeWindow('cloud') : store.openWindow('cloud', 'cloud', undefined, rect)}
        hasUnreadMessages={latestUnreadTs > lastReadTs}
      />
      
      <WindowRenderer user={user} jobs={vesselJobs} bls={blData} actions={actions} dataActions={dataService} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-end bg-slate-100 dark:bg-slate-900 pr-4">
            <TabNavigation tabs={store.tabs} activeTabId={store.activeTabId} onTabClick={store.setActiveTab} onTabClose={store.closeTab} />
            {/* Notification Bell (Inline) */}
            <div className="relative mb-1">
                 <button className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg"><Bell size={18} /></button>
            </div>
        </div>
        
        {/* Task Toast Stack */}
        <div className="absolute top-14 right-4 z-[2000] flex flex-col gap-2 w-80 pointer-events-none">
          {tasks.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 p-3 pointer-events-auto flex items-start gap-3">
               <div className="mt-0.5">{t.status === 'processing' ? <Loader2 size={18} className="animate-spin text-blue-600" /> : t.status === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-red-500" />}</div>
               <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{t.title}</p><p className="text-xs text-slate-500">{t.message}</p></div>
            </div>
          ))}
        </div>

        <div className="flex-1 relative bg-slate-50 dark:bg-slate-900">
            {store.tabs.map(tab => (
              <div key={tab.id} className={`absolute inset-0 w-full h-full overflow-hidden ${store.activeTabId === tab.id ? 'visible z-10' : 'hidden z-0'}`}>
                 <TabContentRenderer 
                    activeTabId={tab.id} 
                    tabs={store.tabs} 
                    jobs={vesselJobs} 
                    bls={blData} 
                    checklists={checklists} 
                    user={user} 
                    reportLogoUrl={reportLogoUrl} 
                    logic={actions} 
                    dataActions={dataService} 
                    tasks={{addTask, updateTask, removeTask}} 
                 />
              </div>
            ))}
        </div>
      </main>
    </div>
  );
};

export default App;