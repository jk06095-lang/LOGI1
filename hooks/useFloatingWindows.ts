
import { useState } from 'react';

export const useFloatingWindows = (
  openWindow: (id: string) => void,
  closeWindow: (id: string) => void,
  focusWindow: (id: string) => void
) => {
  // Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  // Cloud
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [isCloudMinimized, setIsCloudMinimized] = useState(false);

  // Register
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegisterMinimized, setIsRegisterMinimized] = useState(false);
  const [registerTargetJobId, setRegisterTargetJobId] = useState<string | undefined>(undefined);

  // BL specific clouds
  const [activeBLClouds, setActiveBLClouds] = useState<{ id: string; minimized: boolean }[]>([]);

  const handleToggleChat = (updateLastRead?: () => void) => {
    if (isChatOpen) {
        if (isChatMinimized) {
            setIsChatMinimized(false);
            focusWindow('chat');
        } else {
            setIsChatOpen(false);
            closeWindow('chat');
        }
    } else {
        setIsChatOpen(true);
        setIsChatMinimized(false);
        openWindow('chat');
        if (updateLastRead) updateLastRead();
    }
  };

  const handleToggleCloud = () => {
    if (isCloudOpen) {
        if (isCloudMinimized) {
            setIsCloudMinimized(false);
            focusWindow('cloud');
        } else {
            setIsCloudOpen(false);
            closeWindow('cloud');
        }
    } else {
        setIsCloudOpen(true);
        setIsCloudMinimized(false);
        openWindow('cloud');
    }
  };

  const handleOpenRegister = (targetJobId?: string) => {
    setRegisterTargetJobId(targetJobId);
    setIsRegisterOpen(true);
    setIsRegisterMinimized(false);
    openWindow('register');
  };

  const openBLCloud = (blId: string) => {
    const winId = `bl-cloud-${blId}`;
    setActiveBLClouds(prev => {
        const exists = prev.find(w => w.id === blId);
        if (exists) {
            return prev.map(w => w.id === blId ? { ...w, minimized: false } : w);
        }
        return [...prev, { id: blId, minimized: false }];
    });
    openWindow(winId);
  };

  const closeBLCloud = (blId: string) => {
    setActiveBLClouds(prev => prev.filter(w => w.id !== blId));
    closeWindow(`bl-cloud-${blId}`);
  };

  const minimizeBLCloud = (blId: string) => {
    setActiveBLClouds(prev => prev.map(w => w.id === blId ? { ...w, minimized: true } : w));
  };

  return {
    isChatOpen, setIsChatOpen, isChatMinimized, setIsChatMinimized, handleToggleChat,
    isCloudOpen, setIsCloudOpen, isCloudMinimized, setIsCloudMinimized, handleToggleCloud,
    isRegisterOpen, setIsRegisterOpen, isRegisterMinimized, setIsRegisterMinimized, handleOpenRegister, registerTargetJobId,
    activeBLClouds, openBLCloud, closeBLCloud, minimizeBLCloud
  };
};
