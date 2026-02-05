
import React from 'react';
import { Anchor, Settings, Ship, ChevronLeft, ChevronRight, Home, FolderOpen, MessageCircle, ExternalLink, Cloud, Briefcase } from 'lucide-react';
import { ViewState, Language, TriggerRect } from '../types';
import { User } from 'firebase/auth';
import { chatService } from '../services/chatService';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  language: Language;
  user?: User | null;
  logoUrl?: string;
  isChatOpen: boolean;
  onToggleChat: (rect?: TriggerRect) => void;
  hasUnreadMessages?: boolean;
  isCloudOpen?: boolean;
  onToggleCloud?: (rect?: TriggerRect) => void;
  isToolboxOpen?: boolean;
  onToggleToolbox?: (rect?: TriggerRect) => void;
}

const translations = {
  ko: {
    dashboard: '대시보드',
    vesselMgmt: '선박 목록',
    blMgmt: '화물 관리',
    settings: '환경 설정',
    cloud: '클라우드',
    toolbox: '도구함',
    role: '운영자',
    menu: '메인 메뉴',
    message: '메시지',
    manageAccount: 'Google 계정 관리'
  },
  en: {
    dashboard: 'Dashboard',
    vesselMgmt: 'Vessel Mgmt',
    blMgmt: 'Cargo Mgmt',
    settings: 'Settings',
    cloud: 'Cloud',
    toolbox: 'Toolbox',
    role: 'Operator',
    menu: 'Main Menu',
    message: 'Messages',
    manageAccount: 'Manage Google Account'
  },
  cn: {
    dashboard: '工作台',
    vesselMgmt: '船舶管理',
    blMgmt: '货物管理',
    settings: '系统设置',
    cloud: '云盘',
    toolbox: '工具箱',
    role: '操作员',
    menu: '主菜单',
    message: '消息',
    manageAccount: '管理 Google 帐户'
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onNavigate, isCollapsed, onToggleCollapse, language, user, logoUrl, isChatOpen, onToggleChat, hasUnreadMessages, isCloudOpen, onToggleCloud, isToolboxOpen, onToggleToolbox
}) => {
  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: Home },
    { id: 'vessel-list', label: t.vesselMgmt, icon: Ship },
    { id: 'bl-list', label: t.blMgmt, icon: FolderOpen },
  ];

  const handleChatClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const trigger: TriggerRect = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };

    onToggleChat(trigger);
    if (!isChatOpen && user) {
      chatService.markChannelRead('global', user.uid);
    }
  };

  const handleCloudClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const trigger: TriggerRect = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
    if (onToggleCloud) onToggleCloud(trigger);
  };

  const handleToolboxClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const trigger: TriggerRect = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
    if (onToggleToolbox) onToggleToolbox(trigger);
  };

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
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActive
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
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${currentView === 'settings' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <Settings size={18} />
          {!isCollapsed && <span>{t.settings}</span>}
        </button>
      </nav>

      {/* Cloud & Message Area */}
      <div className="px-2 mb-2 space-y-1">
        <button
          onClick={handleToolboxClick}
          title={isCollapsed ? t.toolbox : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isToolboxOpen
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:text-amber-600 dark:hover:text-amber-300'
            }`}
        >
          <Briefcase size={18} strokeWidth={isToolboxOpen ? 2.5 : 2} />
          {!isCollapsed && <span>{t.toolbox}</span>}
        </button>
        <button
          onClick={handleCloudClick}
          title={isCollapsed ? t.cloud : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isCloudOpen
            ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-900/10 hover:text-sky-600 dark:hover:text-sky-300'
            }`}
        >
          <Cloud size={18} strokeWidth={isCloudOpen ? 2.5 : 2} />
          {!isCollapsed && <span>{t.cloud}</span>}
        </button>

        <button
          onClick={handleChatClick}
          title={isCollapsed ? t.message : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium relative group ${isChatOpen
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:text-indigo-600 dark:hover:text-indigo-300'
            }`}
        >
          <div className="relative">
            <MessageCircle size={18} className={isChatOpen ? 'fill-current' : ''} />
            {hasUnreadMessages && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 flex justify-between items-center">
              <span>{t.message}</span>
              {hasUnreadMessages && !isChatOpen && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </div>
          )}
        </button>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <a
          href="https://myaccount.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors p-2 cursor-pointer group`}
          title={t.manageAccount}
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group-hover:border-blue-300 transition-colors">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}</span>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors flex-1">
                  {user?.displayName || t.role}
                </p>
                <ExternalLink size={10} className="text-slate-400 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate">{user?.email || 'admin@logi1.com'}</p>
            </div>
          )}
        </a>
      </div>
    </div>
  );
};