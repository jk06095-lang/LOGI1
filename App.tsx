import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { VesselList } from './components/VesselList';
import { VesselDetail } from './components/VesselDetail';
import { Settings } from './components/Settings';
import { ChatWindow } from './components/ChatWindow';
import { BLManagement } from './components/BLManagement';
import { MobileLayout } from './components/MobileLayout';
import { AppSettings, BLData, VesselJob, BLChecklist, ViewState, CargoSourceType } from './types';
import { parseBLImage } from './services/geminiService';
import { uploadFileToStorage } from './services/storageService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // App Data
  const [jobs, setJobs] = useState<VesselJob[]>([]);
  const [bls, setBLs] = useState<BLData[]>([]);
  const [checklists, setChecklists] = useState<Record<string, BLChecklist>>({});
  
  // UI State
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastReadTs, setLastReadTs] = useState(Date.now());
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    language: 'ko',
    theme: 'light',
    fontSize: 'medium',
    fontStyle: 'sans',
    viewMode: 'pc'
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Subscriptions
  useEffect(() => {
      if (!user) return;
      
      const qJobs = query(collection(db, 'vessel_jobs'), orderBy('createdAt', 'desc'));
      const unsubJobs = onSnapshot(qJobs, (snap) => {
          setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as VesselJob)));
      });
      
      const qBLs = query(collection(db, 'bl_documents'), orderBy('uploadDate', 'desc'));
      const unsubBLs = onSnapshot(qBLs, (snap) => {
          setBLs(snap.docs.map(d => ({ id: d.id, ...d.data() } as BLData)));
      });

      const unsubChecklists = onSnapshot(collection(db, 'checklists'), (snap) => {
          const map: Record<string, BLChecklist> = {};
          snap.docs.forEach(d => { map[d.id] = d.data() as BLChecklist; });
          setChecklists(map);
      });

      return () => {
          unsubJobs();
          unsubBLs();
          unsubChecklists();
      };
  }, [user]);

  // Actions
  const handleUpdateSettings = (newSettings: AppSettings) => setSettings(newSettings);
  
  const handleCreateJob = async (job: Omit<VesselJob, 'id'>) => {
      await addDoc(collection(db, 'vessel_jobs'), job);
  };

  const handleUpdateJob = async (id: string, updates: Partial<VesselJob>) => {
      await updateDoc(doc(db, 'vessel_jobs', id), updates);
  };

  const handleDeleteJob = async (id: string) => {
      if(window.confirm("Delete job?")) await deleteDoc(doc(db, 'vessel_jobs', id));
  };

  const handleUpdateBL = async (id: string, updates: Partial<BLData>) => {
      await updateDoc(doc(db, 'bl_documents', id), updates);
  };

  const handleDeleteBL = async (id: string) => {
      await deleteDoc(doc(db, 'bl_documents', id));
  };

  const handleUpdateChecklist = async (blId: string, checklist: BLChecklist) => {
      await updateDoc(doc(db, 'checklists', blId), checklist as any); // Using as any to bypass strict type check on partial
  };

  const handleUploadBLs = async (files: File[], sourceType: CargoSourceType = 'TRANSIT') => {
      setIsProcessing(true);
      setProgressMessage("Uploading & Analyzing...");
      
      try {
          for (const file of files) {
              const fileUrl = await uploadFileToStorage(file);
              const ocrData = await parseBLImage(file, sourceType);
              
              const newBL: BLData = {
                  id: Date.now().toString(),
                  vesselJobId: selectedJobId || undefined,
                  fileName: file.name,
                  fileUrl: fileUrl,
                  blNumber: ocrData.blNumber || 'UNKNOWN',
                  shipper: ocrData.shipper || '',
                  consignee: ocrData.consignee || '',
                  notifyParty: ocrData.notifyParty || '',
                  vesselName: ocrData.vesselName || '',
                  voyageNo: ocrData.voyageNo || '',
                  portOfLoading: ocrData.portOfLoading || '',
                  portOfDischarge: '', // Default empty
                  date: ocrData.date || new Date().toISOString().split('T')[0],
                  cargoItems: ocrData.cargoItems || [],
                  status: 'completed',
                  uploadDate: new Date().toISOString(),
                  sourceType: sourceType,
                  cargoCategory: ocrData.cargoCategory,
                  ...ocrData
              };
              
              await addDoc(collection(db, 'bl_documents'), newBL);
              // Init empty checklist
              const checklistRef = doc(db, 'checklists', newBL.id);
              // Assume EMPTY_CHECKLIST logic handles initialization or we trigger cloud function
              // For now, simpler to rely on components creating default state if missing
          }
      } catch (error) {
          console.error(error);
          alert("Error processing files");
      } finally {
          setIsProcessing(false);
          setProgressMessage("");
      }
  };

  const handleCreateManualBL = async (blData: BLData) => {
      await addDoc(collection(db, 'bl_documents'), blData);
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!user) {
      return <Login />;
  }
  
  if (settings.viewMode === 'mobile' || window.innerWidth < 768) {
      return (
          <MobileLayout 
             user={user}
             settings={settings}
             onUpdateSettings={handleUpdateSettings}
             onLogout={() => auth.signOut()}
             bls={bls}
             jobs={jobs}
             checklists={checklists}
             onUpdateBL={handleUpdateBL}
             onDeleteBL={handleDeleteBL}
             onAddTask={() => {}} 
             onUpdateTask={() => {}}
          />
      );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${settings.theme === 'dark' ? 'dark' : ''} font-${settings.fontStyle}`}>
      <Sidebar 
        currentView={currentView} 
        onNavigate={(view) => { setCurrentView(view); if(view !== 'vessel-detail') setSelectedJobId(null); }} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        language={settings.language}
        user={user}
        logoUrl={settings.logoUrl}
        isChatOpen={isChatOpen}
        onToggleChat={() => {
            setIsChatOpen(!isChatOpen);
            setLastReadTs(Date.now());
        }}
        hasUnreadMessages={false}
      />
      
      <ChatWindow 
         isOpen={isChatOpen} 
         onClose={() => setIsChatOpen(false)} 
         sidebarWidth={isSidebarCollapsed ? 64 : 224} 
         lastReadTs={lastReadTs}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-100 dark:bg-slate-900 print:overflow-visible print:h-auto print:block">
         {currentView === 'dashboard' && (
             <Dashboard 
                jobs={jobs} 
                bls={bls} 
                onSelectJob={(id) => { setSelectedJobId(id); setCurrentView('vessel-detail'); }}
                language={settings.language}
                onOpenBriefing={() => {}} 
             />
         )}
         {currentView === 'vessel-list' && (
             <VesselList 
                jobs={jobs} 
                allBLs={bls}
                onSelectJob={(id) => { setSelectedJobId(id); setCurrentView('vessel-detail'); }}
                onCreateJob={handleCreateJob}
                onUpdateJob={handleUpdateJob}
                onDeleteJob={handleDeleteJob}
                getBLCount={() => 0}
                getTotalWeight={() => 0}
                language={settings.language}
             />
         )}
         {currentView === 'vessel-detail' && selectedJobId && (
             <VesselDetail 
                job={jobs.find(j => j.id === selectedJobId)!}
                bls={bls.filter(b => b.vesselJobId === selectedJobId)}
                checklists={checklists}
                onClose={() => setCurrentView('vessel-list')}
                onUploadBLs={handleUploadBLs}
                onCreateManualBL={handleCreateManualBL}
                onUpdateChecklist={handleUpdateChecklist}
                onUpdateBL={handleUpdateBL}
                isProcessing={isProcessing}
                progressMessage={progressMessage}
                language={settings.language}
             />
         )}
         {currentView === 'bl-list' && (
             <BLManagement 
                bls={bls}
                jobs={jobs}
                checklists={checklists}
                onUploadBLs={(files) => handleUploadBLs(files)}
                onAssignBL={(blId, jobId) => handleUpdateBL(blId, { vesselJobId: jobId })}
                onCreateJob={handleCreateJob}
                onNavigateToBL={(id) => { 
                    // This typically opens a modal or navigates
                }}
                isProcessing={isProcessing}
                progressMessage={progressMessage}
                language={settings.language}
             />
         )}
         {currentView === 'settings' && (
             <Settings 
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                user={user}
                onLogout={() => auth.signOut()}
                bls={bls}
                jobs={jobs}
             />
         )}
      </main>
    </div>
  );
};

export default App;