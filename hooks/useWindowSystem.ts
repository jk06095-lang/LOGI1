
import { useState } from 'react';

export const useWindowSystem = () => {
  const [windowStack, setWindowStack] = useState<string[]>([]);

  const focusWindow = (windowId: string) => {
    setWindowStack(prev => {
      // If already at the top, do nothing
      if (prev.length > 0 && prev[prev.length - 1] === windowId) return prev;
      const filtered = prev.filter(id => id !== windowId);
      return [...filtered, windowId];
    });
  };

  const openWindow = (windowId: string) => {
    setWindowStack(prev => {
      if (prev.includes(windowId)) {
        return [...prev.filter(id => id !== windowId), windowId];
      }
      return [...prev, windowId];
    });
  };

  const closeWindow = (windowId: string) => {
    setWindowStack(prev => prev.filter(id => id !== windowId));
  };

  const getZIndex = (windowId: string) => {
    const baseZ = 1000;
    const index = windowStack.indexOf(windowId);
    return index === -1 ? baseZ + windowStack.length * 10 : baseZ + (index * 10);
  };

  return {
    windowStack,
    focusWindow,
    openWindow,
    closeWindow,
    getZIndex
  };
};
