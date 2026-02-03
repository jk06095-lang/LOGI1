
import { create } from 'zustand';
import { AppSettings, Tab, WindowState } from '../types';

interface UIStore {
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Layout
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Tabs
  tabs: Tab[];
  activeTabId: string;
  addTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  
  // Floating Windows
  windows: Record<string, WindowState>;
  windowStack: string[]; // For Z-Index
  openWindow: (id: string, type: string, data?: any) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string, minimized: boolean) => void;
  focusWindow: (id: string) => void;
  
  // Global Processing
  processing: { isProcessing: boolean; message: string };
  setProcessing: (isProcessing: boolean, message?: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return {
    settings: {
      language: 'ko',
      theme: 'light',
      fontSize: 'medium',
      fontStyle: 'sans',
      viewMode: isMobile ? 'mobile' : 'pc'
    },
    updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    
    sidebarCollapsed: false,
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    
    tabs: [{ id: 'dashboard', type: 'dashboard', title: 'Dashboard' }],
    activeTabId: 'dashboard',
    
    addTab: (tab) => set((state) => {
      const existing = state.tabs.find(t => t.id === tab.id);
      if (existing) {
        // Update data if exists
        const updatedTabs = state.tabs.map(t => t.id === tab.id ? { ...t, data: { ...t.data, ...tab.data } } : t);
        return { tabs: updatedTabs, activeTabId: tab.id };
      }
      return { tabs: [...state.tabs, tab], activeTabId: tab.id };
    }),
    
    closeTab: (id) => set((state) => {
      if (id === 'dashboard') return state;
      const newTabs = state.tabs.filter(t => t.id !== id);
      const newActiveId = state.activeTabId === id 
        ? (newTabs[newTabs.length - 1]?.id || 'dashboard') 
        : state.activeTabId;
      return { tabs: newTabs, activeTabId: newActiveId };
    }),
    
    setActiveTab: (id) => set({ activeTabId: id }),
    
    windows: {},
    windowStack: [],
    
    openWindow: (id, type, data) => set((state) => {
      const newWindows = { ...state.windows, [id]: { isOpen: true, isMinimized: false, type, data } };
      // Move to top of stack
      const newStack = state.windowStack.filter(w => w !== id).concat(id);
      return { windows: newWindows, windowStack: newStack };
    }),
    
    closeWindow: (id) => set((state) => {
      const newWindows = { ...state.windows };
      delete newWindows[id];
      const newStack = state.windowStack.filter(w => w !== id);
      return { windows: newWindows, windowStack: newStack };
    }),
    
    minimizeWindow: (id, minimized) => set((state) => ({
      windows: { ...state.windows, [id]: { ...state.windows[id], isMinimized: minimized } }
    })),
    
    focusWindow: (id) => set((state) => {
      // If already top, do nothing
      if (state.windowStack.length > 0 && state.windowStack[state.windowStack.length - 1] === id) return state;
      const newStack = state.windowStack.filter(w => w !== id).concat(id);
      return { windowStack: newStack };
    }),
    
    processing: { isProcessing: false, message: '' },
    setProcessing: (isProcessing, message = '') => set({ processing: { isProcessing, message } })
  };
});