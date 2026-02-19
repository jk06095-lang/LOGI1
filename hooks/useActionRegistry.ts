
import { VesselJob, BLData, CargoSourceType, CargoClass } from '../types';
import { uploadFileToStorage, deleteFileFromStorage } from '../services/storageService';
import { parseBLImage } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { useUIStore } from '../store/uiStore';
import { auth } from '../lib/firebase';

// Domain Action Interface
export interface AppActions {
  cargo: {
    uploadBL: (files: File[], sourceType?: CargoSourceType, cargoClass?: CargoClass, targetJobId?: string) => Promise<void>;
    uploadCloudFiles: (blId: string, files: File[]) => Promise<void>;
    deleteCloudFile: (blId: string, attachmentId: string) => Promise<void>;
    renameCloudFile: (blId: string, attachmentId: string, newName: string) => Promise<void>;
  };
  settings: {
    updateLogo: (file: File) => Promise<void>;
    updateReportLogo: (file: File) => Promise<void>;
  };
  auth: {
    logout: () => void;
  };
}

export const useActionRegistry = (
  vesselJobs: VesselJob[],
  blData: BLData[],
  addToHistory: (title: string, msg: string, type: 'info' | 'success' | 'error') => void,
  addTask: (task: any) => void,
  updateTask: (id: string, updates: any) => void,
  onLogout: () => void
): AppActions => {
  const { setProcessing, updateSettings } = useUIStore();

  // --- CARGO ACTIONS ---

  const uploadBL = async (files: File[], sourceType: CargoSourceType = 'TRANSIT', cargoClass: CargoClass = 'TRANSHIPMENT', targetJobId?: string) => {
    setProcessing(true, 'Initializing upload...');
    let contextJobName = '';
    if (targetJobId) {
      const j = vesselJobs.find(x => x.id === targetJobId);
      if (j) contextJobName = j.vesselName;
    }

    addToHistory('Bulk Upload Started', `Uploading ${files.length} files...`, 'info');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setProcessing(true, `${i + 1}/${files.length} Analyzing ${file.name}...`);
        const downloadUrl = await uploadFileToStorage(file);
        const rawData = await parseBLImage(file, sourceType);

        let matchedJobId = targetJobId;
        if (!matchedJobId && rawData.vesselName) {
          const job = vesselJobs.find(j => j.vesselName.toLowerCase().includes((rawData.vesselName || '').toLowerCase()));
          if (job) matchedJobId = job.id;
        }

        await dataService.addBL({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          vesselJobId: matchedJobId,
          fileName: file.name,
          fileUrl: downloadUrl,
          uploadDate: new Date().toISOString(),
          status: 'completed',
          blNumber: rawData.blNumber || 'UNKNOWN',
          shipper: rawData.shipper || '',
          consignee: rawData.consignee || '',
          notifyParty: rawData.notifyParty || '',
          vesselName: contextJobName || rawData.vesselName || '',
          voyageNo: rawData.voyageNo || '',
          portOfLoading: rawData.portOfLoading || '',
          portOfDischarge: rawData.portOfDischarge || '',
          date: rawData.date || '',
          sourceType: sourceType,
          cargoClass: cargoClass,
          cargoItems: rawData.cargoItems || [],
          createdBy: auth.currentUser?.uid
        });
      } catch (error: any) {
        addToHistory('Upload Error', `${file.name}: ${error.message}`, 'error');
      }
    }

    setProcessing(false, '');
    addToHistory('Bulk Upload Completed', `Processed ${files.length} files.`, 'success');

    // Show toast notification
    const toastId = `bl-upload-${Date.now()}`;
    addTask({ id: toastId, title: '📦 B/L Upload Complete', status: 'success', message: `${files.length} file(s) analyzed successfully.` });
  };

  const uploadCloudFiles = async (blId: string, files: File[]) => {
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
      } catch (e) { console.error(e); }
    }

    if (successCount > 0) {
      await dataService.updateBL(blId, { attachments: newAttachments });
      updateTask(taskId, { status: 'success', message: 'Files uploaded' });
    } else {
      updateTask(taskId, { status: 'error', message: 'Upload failed' });
    }
  };

  const deleteCloudFile = async (blId: string, attachmentId: string) => {
    const bl = blData.find(b => b.id === blId);
    if (!bl) return;
    const attachment = (bl.attachments || []).find(a => a.id === attachmentId);
    if (attachment && attachment.url) {
      try { await deleteFileFromStorage(attachment.url); } catch (e) { console.warn(e); }
    }
    const newAttachments = (bl.attachments || []).filter(a => a.id !== attachmentId);
    await dataService.updateBL(blId, { attachments: newAttachments });
  };

  const renameCloudFile = async (blId: string, attachmentId: string, newName: string) => {
    const bl = blData.find(b => b.id === blId);
    if (!bl) return;
    const newAttachments = (bl.attachments || []).map(a =>
      a.id === attachmentId ? { ...a, name: newName } : a
    );
    await dataService.updateBL(blId, { attachments: newAttachments });
  };

  // --- SETTINGS ACTIONS ---

  const updateLogo = async (file: File) => {
    try {
      const url = await uploadFileToStorage(file);
      updateSettings({ logoUrl: url });
      addToHistory('Settings Updated', 'Company logo updated successfully', 'success');
    } catch (e: any) {
      addToHistory('Update Failed', `Logo upload failed: ${e.message}`, 'error');
    }
  };

  const updateReportLogo = async (file: File) => {
    try {
      const url = await uploadFileToStorage(file);
      await dataService.updateReportLogo(url);
      addToHistory('Report Logo Updated', 'Custom report logo has been updated.', 'success');
    } catch (e: any) {
      addToHistory('Logo Update Failed', e.message, 'error');
    }
  };

  return {
    cargo: {
      uploadBL,
      uploadCloudFiles,
      deleteCloudFile,
      renameCloudFile
    },
    settings: {
      updateLogo,
      updateReportLogo
    },
    auth: {
      logout: onLogout
    }
  };
};
