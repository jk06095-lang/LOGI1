
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
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, CheckCircle, Bell, X, Inbox, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const store = useUIStore();
  const { user, authLoading, vesselJobs, blData, checklists, reportLogoUrl, shipRegistries, tasks, addTask, updateTask, removeTask, addToHistory, notificationHistory, clearHistory, expirationAlert, latestUnreadTs, lastReadTs, updateLastRead } = useGlobalData(store.settings);

  // Custom Hook: Action Registry (Standardized Logic)
  const actions = useActionRegistry(
    vesselJobs,
    blData,
    addToHistory,
    addTask,
    updateTask,
    () => { if (user) signOut(auth); }
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
          if (['settings', 'vessel-list', 'bl-list'].includes(id)) store.addTab({ id, type: id as any, title: id });
          else store.setActiveTab(id);
        }}
        isCollapsed={store.sidebarCollapsed}
        onToggleCollapse={store.toggleSidebar}
        language={store.settings.language} user={user} logoUrl={store.settings.logoUrl}
        isChatOpen={!!store.windows['chat']?.isOpen}
        onToggleChat={(rect) => { store.toggleWindow('chat', 'chat', undefined, rect); updateLastRead(); }}
        isCloudOpen={!!store.windows['cloud']?.isOpen}
        onToggleCloud={(rect) => store.toggleWindow('cloud', 'cloud', undefined, rect)}
        isToolboxOpen={!!store.windows['toolbox']?.isOpen}
        onToggleToolbox={(rect) => store.toggleWindow('toolbox', 'toolbox', undefined, rect)}
        hasUnreadMessages={latestUnreadTs > lastReadTs}
      />

      <WindowRenderer
        user={user}
        jobs={vesselJobs}
        bls={blData}
        actions={actions}
        dataActions={dataService}
        sidebarWidth={store.sidebarCollapsed ? 64 : 224}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-end bg-slate-100 dark:bg-slate-900 pr-4">
          <TabNavigation tabs={store.tabs} activeTabId={store.activeTabId} onTabClick={store.setActiveTab} onTabClose={store.closeTab} />

          {/* Notification Center */}
          <div className="relative mb-1">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-1.5 rounded-lg transition-colors relative ${isNotificationsOpen ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <Bell size={18} />
              {notificationHistory.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: -10, x: 10 }} // Start smaller and slightly offset towards the bell
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -10, x: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{ transformOrigin: "top right" }} // Genie effect anchor
                    className="absolute top-9 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[3000] overflow-hidden flex flex-col max-h-[500px]"
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Notifications</h3>
                      {notificationHistory.length > 0 && (
                        <button
                          onClick={clearHistory}
                          className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={12} /> Clear All
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                      {notificationHistory.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                          <Inbox size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No new notifications</p>
                        </div>
                      ) : (
                        notificationHistory.map((log) => (
                          <div
                            key={log.id}
                            className={`p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group relative ${log.type === 'error' ? 'bg-red-50/50 border-red-100' :
                              log.type === 'success' ? 'bg-emerald-50/50 border-emerald-100' :
                                log.type === 'social' ? 'bg-blue-50/50 border-blue-100' :
                                  'bg-white dark:bg-slate-800'
                              }`}
                            onClick={() => {
                              if (log.type === 'social') {
                                store.toggleWindow('toolbox', 'toolbox');
                              } else if (log.type === 'document') {
                                store.addTab({ id: 'bl-list', type: 'bl-list', title: 'Start' });
                                store.setActiveTab('bl-list');
                              }
                              // Optional: Dismiss on click? setIsNotificationsOpen(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 min-w-[6px] h-1.5 rounded-full ${log.type === 'error' ? 'bg-red-500' :
                                log.type === 'success' ? 'bg-emerald-500' :
                                  log.type === 'social' ? 'bg-blue-500' :
                                    log.type === 'document' ? 'bg-orange-500' :
                                      'bg-slate-400'
                                }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{log.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 break-words line-clamp-2">{log.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1.5 text-right">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Backdrop to close */}
                  <div
                    className="fixed inset-0 z-[2999]"
                    onClick={() => setIsNotificationsOpen(false)}
                  ></div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Task Toast Stack */}
        <div className="absolute top-14 right-4 z-[2000] flex flex-col gap-2 w-80 pointer-events-none no-print">
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
                shipRegistries={shipRegistries}
                logic={actions}
                dataActions={dataService}
                tasks={{ addTask, updateTask, removeTask }}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;