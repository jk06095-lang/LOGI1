
import React from 'react';
import { X, FolderOpen, Settings, Ship, Home, FileText, PieChart } from 'lucide-react';

export interface Tab {
  id: string;
  type: 'dashboard' | 'vessel-list' | 'vessel-detail' | 'settings' | 'bl-list' | 'shipment-detail' | 'briefing';
  title: string;
  data?: any; // To store vesselId for detail views
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ tabs, activeTabId, onTabClick, onTabClose }) => {
  const getIcon = (type: Tab['type']) => {
    switch (type) {
      case 'dashboard': return Home;
      case 'settings': return Settings;
      case 'vessel-detail': return Ship;
      case 'vessel-list': return Ship;
      case 'bl-list': return FileText;
      case 'shipment-detail': return FileText;
      case 'briefing': return PieChart;
      default: return FolderOpen;
    }
  };

  return (
    <div className="flex items-end bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-1 pt-1 gap-0.5 overflow-x-auto scrollbar-hide h-9 print:hidden">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        const Icon = getIcon(tab.type);
        
        return (
          <div
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={`
              group relative flex items-center gap-1.5 px-3 py-1.5 min-w-[120px] max-w-[200px] rounded-t-md cursor-pointer select-none transition-all
              ${isActive 
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border-t border-x border-slate-200 dark:border-slate-700 -mb-px z-10' 
                : 'bg-slate-200/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:text-slate-700 dark:hover:text-slate-200'
              }
            `}
          >
            <Icon size={13} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
            <span className="text-[11px] font-bold truncate flex-1 uppercase tracking-tight">{tab.title}</span>
            
            {tab.type !== 'dashboard' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className={`
                  p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
                  ${isActive ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500'}
                `}
              >
                <X size={10} />
              </button>
            )}
            
            {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-md"></div>}
          </div>
        );
      })}
    </div>
  );
};
