
import React from 'react';
import { Dashboard, BriefingReport } from './Dashboard';
import { VesselList } from './VesselList';
import { VesselDetail } from './VesselDetail';
import { Settings } from './Settings';
import { BLManagement } from './BLManagement';
import { ShipmentDetail } from './ShipmentDetail';
import { Tab, VesselJob, BLData, BLChecklist, BackgroundTask, ShipRegistry } from '../types';
import { User } from 'firebase/auth';
import { useUIStore } from '../store/uiStore';
import { AppActions } from '../hooks/useActionRegistry';

// Explicit interfaces to replace 'any'
interface DataActions {
  updateBL: (blId: string, updates: Partial<BLData>) => Promise<void>;
  updateJob: (jobId: string, updates: Partial<VesselJob>) => Promise<void>;
  addJob: (job: Omit<VesselJob, 'id'>) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  bulkDeleteBLs: (ids: string[]) => Promise<void>;
  updateChecklist: (blId: string, checklist: BLChecklist) => Promise<void>;
  addBL: (bl: BLData) => Promise<void>;
  deleteBL: (blId: string) => Promise<void>;
  updateReportLogo: (url: string | null) => Promise<void>;
}

interface TaskActions {
  addTask: (task: BackgroundTask) => void;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
}

interface TabContentRendererProps {
  activeTabId: string;
  tabs: Tab[];
  jobs: VesselJob[];
  bls: BLData[];
  checklists: Record<string, BLChecklist>;
  user: User | null;
  reportLogoUrl: string | null;
  shipRegistries: ShipRegistry[];
  logic: AppActions;
  dataActions: DataActions;
  tasks: TaskActions;
}

export const TabContentRenderer: React.FC<TabContentRendererProps> = (props) => {
  const { activeTabId, tabs, jobs, bls, checklists, user, reportLogoUrl, shipRegistries, logic, dataActions, tasks } = props;
  const { openWindow, addTab, closeTab, settings, processing, updateSettings } = useUIStore();

  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return null;

  // Navigation Helpers (recreated from Store actions to match prop signature)
  const openVesselTab = (jobId: string, initialTab: 'cargo' | 'checklist' = 'cargo', blId?: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    addTab({
      id: `vessel-${jobId}`,
      type: 'vessel-detail',
      title: job.vesselName,
      data: { vesselId: jobId, initialTab, initialBLId: blId, timestamp: Date.now() }
    });
  };

  const openShipmentDetailTab = (blId: string) => {
    const bl = bls.find(b => b.id === blId);
    if (!bl) return;
    let title = bl.blNumber;
    if (bl.vesselJobId) {
      const job = jobs.find(j => j.id === bl.vesselJobId);
      if (job) title = `${job.vesselName.slice(-4)}: ${bl.blNumber}`;
    }
    addTab({ id: `shipment-${blId}`, type: 'shipment-detail', title, data: { blId } });
  };

  const openBriefingTab = (date: Date) => {
    addTab({ id: 'briefing-report', type: 'briefing', title: 'Report', data: { date } });
  };

  switch (tab.type) {
    case 'dashboard':
      return <Dashboard jobs={jobs} bls={bls} onSelectJob={openVesselTab} language={settings.language} onUpdateBL={dataActions.updateBL} onOpenBriefing={openBriefingTab} onUploadBLs={logic.cargo.uploadBL} onUpdateJob={dataActions.updateJob} />;

    case 'briefing':
      return <BriefingReport jobs={jobs} bls={bls} initialDate={tab.data?.date || new Date()} language={settings.language} logoUrl={settings.logoUrl} reportLogoUrl={reportLogoUrl} onUpdateBL={dataActions.updateBL} onUpdateLogo={logic.settings.updateLogo} onUpdateReportLogo={logic.settings.updateReportLogo} onResetReportLogo={() => dataActions.updateReportLogo(null)} />;

    case 'vessel-list':
      return <VesselList jobs={jobs} allBLs={bls} shipRegistries={shipRegistries} onSelectJob={openVesselTab} onCreateJob={dataActions.addJob} onUpdateJob={dataActions.updateJob} onDeleteJob={dataActions.deleteJob} getBLCount={(id) => bls.filter(b => b.vesselJobId === id).length} getTotalWeight={(id) => 0} language={settings.language} />;

    case 'bl-list':
      return <BLManagement bls={bls} jobs={jobs} checklists={checklists} onUploadBLs={logic.cargo.uploadBL} onAssignBL={(blId, jobId) => dataActions.updateBL(blId, { vesselJobId: jobId })} onCreateJob={dataActions.addJob} onNavigateToBL={(id) => openShipmentDetailTab(id)} isProcessing={processing.isProcessing} progressMessage={processing.message} language={settings.language} />;

    case 'settings':
      return <Settings settings={settings} onUpdateSettings={updateSettings} user={user} onLogout={logic.auth.logout} bls={bls} jobs={jobs} onDeleteBLs={dataActions.bulkDeleteBLs} />;

    case 'shipment-detail':
      const currentBL = bls.find(b => b.id === tab.data.blId);
      if (!currentBL) return <div className="p-10 text-slate-400">Document not found</div>;
      return <ShipmentDetail
        bl={currentBL}
        jobs={jobs}
        language={settings.language}
        onUpdateBL={dataActions.updateBL}
        onClose={() => closeTab(tab.id)}
        checklist={checklists[currentBL.id]}
        onDelete={(id) => dataActions.deleteBL(id)}
        onAddTask={tasks.addTask}
        onUpdateTask={tasks.updateTask}
        onNavigateToChecklist={() => { if (currentBL.vesselJobId) openVesselTab(currentBL.vesselJobId, 'checklist', currentBL.id); else alert("Assign vessel first"); }}
        onOpenCloudManager={(rect) => openWindow(`bl-cloud-${currentBL.id}`, 'bl-cloud', { blId: currentBL.id }, rect)}
        onNavigateToVessel={(jobId) => openVesselTab(jobId, 'cargo')}
      />;

    case 'vessel-detail':
      const currentJob = jobs.find(j => j.id === tab.data.vesselId);
      if (!currentJob) return <div className="p-10 text-slate-400">Vessel not found</div>;
      return <VesselDetail
        key={tab.id}
        job={currentJob}
        bls={bls.filter(bl => bl.vesselJobId === currentJob.id)}
        checklists={checklists}
        onClose={() => closeTab(tab.id)}
        onUploadBLs={(f, type) => logic.cargo.uploadBL(f, type, undefined, currentJob.id)}
        onCreateManualBL={dataActions.addBL}
        onUpdateChecklist={dataActions.updateChecklist}
        onUpdateBL={dataActions.updateBL}
        isProcessing={processing.isProcessing}
        progressMessage={processing.message}
        language={settings.language}
        initialTab={tab.data?.initialTab}
        initialBLId={tab.data?.initialBLId}
        lastUpdate={tab.data?.timestamp}
        onOpenBLDetail={(id) => openShipmentDetailTab(id)}
        onOpenRegister={(rect) => openWindow('register', 'register', { targetJobId: currentJob.id }, rect)}
      />;

    default: return null;
  }
};
