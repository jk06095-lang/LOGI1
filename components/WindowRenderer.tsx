
import React from 'react';
import { useUIStore } from '../store/uiStore';
import { ChatWindow } from '../features/chat/ChatWindow';
import { GlobalCloudManager } from '../features/files/GlobalCloudManager';
import { RegisterCargoWindow } from '../features/cargo/RegisterCargoWindow';
import { CloudFileManager } from '../features/files/CloudFileManager';
import { VesselJob, BLData, WindowState } from '../types';
import { User } from 'firebase/auth';
import { AppActions } from '../hooks/useActionRegistry';

interface WindowRendererProps {
  user: User | null;
  jobs: VesselJob[];
  bls: BLData[];
  actions: AppActions;
  dataActions: any; // Direct service access if needed
}

export const WindowRenderer: React.FC<WindowRendererProps> = ({ user, jobs, bls, actions, dataActions }) => {
  const { windows, windowStack, closeWindow, minimizeWindow, focusWindow, sidebarCollapsed, settings, processing } = useUIStore();

  const getZIndex = (id: string) => {
    const baseZ = 1000;
    const index = windowStack.indexOf(id);
    return index === -1 ? baseZ + windowStack.length * 10 : baseZ + (index * 10);
  };

  return (
    <>
      {(Object.entries(windows) as [string, WindowState][]).map(([id, state]) => {
        if (!state.isOpen) return null;

        if (id === 'chat') {
          return (
            <ChatWindow
              key={id}
              id={id}
              isOpen={state.isOpen}
              isMinimized={state.isMinimized}
              onClose={() => closeWindow(id)}
              onMinimize={() => minimizeWindow(id, true)}
              onFocus={() => focusWindow(id)}
              zIndex={getZIndex(id)}
              sidebarWidth={sidebarCollapsed ? 64 : 224}
              user={user}
            />
          );
        }

        if (id === 'cloud') {
          return (
            <GlobalCloudManager
              key={id}
              id={id}
              isOpen={state.isOpen}
              isMinimized={state.isMinimized}
              onClose={() => closeWindow(id)}
              onMinimize={() => minimizeWindow(id, true)}
              onFocus={() => focusWindow(id)}
              zIndex={getZIndex(id)}
              jobs={jobs}
              bls={bls}
              onUpdateBL={dataActions.updateBL}
            />
          );
        }

        if (id === 'register') {
          return (
            <RegisterCargoWindow
              key={id}
              id={id}
              isOpen={state.isOpen}
              isMinimized={state.isMinimized}
              onClose={() => closeWindow(id)}
              onMinimize={() => minimizeWindow(id, true)}
              onFocus={() => focusWindow(id)}
              zIndex={getZIndex(id)}
              targetJobId={state.data?.targetJobId}
              jobs={jobs}
              onUploadBLs={actions.cargo.uploadBL}
              onCreateManualBL={dataActions.addBL}
              isProcessing={processing.isProcessing}
              progressMessage={processing.message}
              language={settings.language}
            />
          );
        }

        if (id.startsWith('bl-cloud-')) {
          const blId = id.replace('bl-cloud-', '');
          const bl = bls.find(b => b.id === blId);
          if (!bl) return null;

          return (
            <CloudFileManager
              key={id}
              id={id}
              isOpen={state.isOpen}
              isMinimized={state.isMinimized}
              onClose={() => closeWindow(id)}
              onMinimize={() => minimizeWindow(id, true)}
              onFocus={() => focusWindow(id)}
              zIndex={getZIndex(id)}
              attachments={bl.attachments || []}
              onUpload={(files) => actions.cargo.uploadCloudFiles(bl.id, files)}
              onDelete={(attId) => actions.cargo.deleteCloudFile(bl.id, attId)}
              onRename={(attId, name) => actions.cargo.renameCloudFile(bl.id, attId, name)}
            />
          );
        }

        return null;
      })}
    </>
  );
};
