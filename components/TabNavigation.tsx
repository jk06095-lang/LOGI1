
import React, { useRef } from 'react';
import { X, FolderOpen, Settings, Ship, Home, FileText, PieChart, ChevronLeft, ChevronRight, Cloud } from 'lucide-react';
import { Tab } from '../types';

interface TabNavigationProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ tabs, activeTabId, onTabClick, onTabClose }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getIcon = (type: Tab['type']) => {
    switch (type) {
      case 'dashboard': return Home;
      case 'settings': return Settings;
      case 'vessel-detail': return Ship;
      case 'vessel-list': return Ship;
      case 'bl-list': return FolderOpen;
      case 'shipment-detail': return FileText;
      case 'briefing': return PieChart;
      case 'cloud': return Cloud;
      default: return FolderOpen;
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex-1 flex items-end min-w-0 gap-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-1 pt-1 h-9 print:hidden">
      
      {/* Scrollable Tab Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 flex items-end gap-0.5 overflow-x-auto scrollbar-hide scroll-smooth h-full"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const Icon = getIcon(tab.type);
          
          return (
            <div
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`
                group relative flex items-center gap-1.5 px-3 py-1.5 min-w-[120px] max-w-[200px] rounded-t-md cursor-pointer select-none transition-all flex-shrink-0
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

      {/* Navigation Controls */}
      <div className="flex items-center gap-0.5 bg-slate-200 dark:bg-slate-800 rounded-md p-0.5 mb-1 shrink-0 shadow-sm">
        <button 
          onClick={() => handleScroll('left')}
          className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
          title="Scroll Left"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>
        <button 
          onClick={() => handleScroll('right')}
          className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
          title="Scroll Right"
        >
          <ChevronRight size={14} />
        </button>
      </div>

    </div>
  );
};
