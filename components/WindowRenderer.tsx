
import React from 'react';
import { useUIStore } from '../store/uiStore';
import { ChatWindow } from '../features/chat/ChatWindow';
import { GlobalCloudManager } from '../features/files/GlobalCloudManager';
import { RegisterCargoWindow } from '../features/cargo/RegisterCargoWindow';
import { CloudFileManager } from '../features/files/CloudFileManager';
import { ToolboxWindow } from '../features/toolbox/ToolboxWindow';
import { VesselJob, BLData, WindowState } from '../types';
import { User } from 'firebase/auth';
import { AppActions } from '../hooks/useActionRegistry';

interface WindowRendererProps {
  user: User | null;
  jobs: VesselJob[];
  bls: BLData[];
  actions: AppActions;
  dataActions: any;
  sidebarWidth: number;
}

// Window Component Registry
const WINDOW_REGISTRY: Record<string, React.FC<any>> = {
  'chat': ChatWindow,
  'cloud': GlobalCloudManager,
  'register': RegisterCargoWindow,
  'bl-cloud': CloudFileManager,
  'toolbox': ToolboxWindow
};

export const WindowRenderer: React.FC<WindowRendererProps> = ({ user, jobs, bls, actions, dataActions, sidebarWidth }) => {
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

        const Component = WINDOW_REGISTRY[state.type];
        if (!Component) {
          console.warn(`No component registered for window type: ${state.type}`);
          return null;
        }

        // Common Props for all windows
        const commonProps = {
          key: id,
          id,
          isOpen: state.isOpen,
          isMinimized: state.isMinimized,
          onClose: () => closeWindow(id),
          onMinimize: () => minimizeWindow(id, true),
          onFocus: () => focusWindow(id),
          zIndex: getZIndex(id),
          data: state.data,
          triggerRect: state.triggerRect,
          sidebarWidth // Pass to all windows
        };

        // Render specific window based on type
        switch (state.type) {
          case 'chat':
            return (
              <Component
                {...commonProps}
                sidebarWidth={sidebarCollapsed ? 64 : 224}
                user={user}
              />
            );

          case 'cloud':
            return (
              <Component
                {...commonProps}
                jobs={jobs}
                bls={bls}
                onUpdateBL={dataActions.updateBL}
              />
            );

          case 'register':
            return (
              <Component
                {...commonProps}
                targetJobId={state.data?.targetJobId}
                jobs={jobs}
                onUploadBLs={actions.cargo.uploadBL}
                onCreateManualBL={dataActions.addBL}
                isProcessing={processing.isProcessing}
                progressMessage={processing.message}
                language={settings.language}
              />
            );

          case 'bl-cloud':
            const blId = state.data?.blId || id.replace('bl-cloud-', '');
            const bl = bls.find(b => b.id === blId);
            if (!bl) return null;

            return (
              <Component
                {...commonProps}
                attachments={bl.attachments || []}
                onUpload={(files: File[]) => actions.cargo.uploadCloudFiles(bl.id, files)}
                onDelete={(attId: string) => actions.cargo.deleteCloudFile(bl.id, attId)}
                onRename={(attId: string, name: string) => actions.cargo.renameCloudFile(bl.id, attId, name)}
              />
            );

          case 'toolbox':
            return (
              <Component
                {...commonProps}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
};