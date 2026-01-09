import React from 'react';
import { Anchor, Settings, Ship, ChevronLeft, ChevronRight, Home, FolderOpen } from 'lucide-react';
import { ViewState, Language } from '../types';
import { User } from 'firebase/auth';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  language: Language;
  user?: User | null;
  logoUrl?: string;
}

const translations = {
  ko: {
    dashboard: '대시보드',
    vesselMgmt: '선박 목록', // Updated from '선박 관리'
    blMgmt: '화물 관리', // Unify with Title
    settings: '환경 설정',
    role: '운영자',
    menu: '메인 메뉴'
  },
  en: {
    dashboard: 'Dashboard',
    vesselMgmt: 'Vessel Mgmt',
    blMgmt: 'Cargo Mgmt',
    settings: 'Settings',
    role: 'Operator',
    menu: 'Main Menu'
  },
  cn: {
    dashboard: '工作台',
    vesselMgmt: '船舶管理',
    blMgmt: '货物管理',
    settings: '系统设置',
    role: '操作员',
    menu: '主菜单'
  }
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggleCollapse, language, user, logoUrl }) => {
  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: Home },
    { id: 'vessel-list', label: t.vesselMgmt, icon: Ship },
    { id: 'bl-list', label: t.blMgmt, icon: FolderOpen },
  ];

  return (
    <div 
      className={`${isCollapsed ? 'w-16' : 'w-56'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full font-sans transition-all duration-300 relative z-40 shadow-sm print:hidden`}
    >
      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-sm text-slate-500 hover:text-blue-600 z-50"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className={`px-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-20`}>
        {logoUrl ? (
           <div className={`flex items-center justify-center ${isCollapsed ? 'w-8 h-8' : 'w-auto h-10'}`}>
              <img src={logoUrl} alt="LOGI1" className="max-w-full max-h-full object-contain" />
           </div>
        ) : (
          <>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-500/20">
              <Anchor size={18} strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col justify-center animate-fade-in">
                <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-none flex items-baseline">
                  LOGI<span className="text-blue-600 text-xl">1</span>
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] scale-90 origin-left mt-0.5">Logistics ERP</p>
              </div>
            )}
          </>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-4 mb-2 animate-fade-in">
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest pl-1">{t.menu}</p>
        </div>
      )}

      <nav className="flex-1 px-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewState)}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        <button
           onClick={() => onNavigate('settings')}
           title={isCollapsed ? t.settings : ''}
           className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white`}
        >
          <Settings size={18} />
          {!isCollapsed && <span>{t.settings}</span>}
        </button>
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-1`}>
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
             {user?.photoURL ? (
               <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <span>{user?.displayName ? user.displayName.substring(0,2).toUpperCase() : 'OP'}</span>
             )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.displayName || t.role}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate">{user?.email || 'admin@logi1.com'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};