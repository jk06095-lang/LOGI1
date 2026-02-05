import React, { useState } from 'react';
import { WindowFrame } from '../../components/ui/WindowFrame';
import { Briefcase, Search, FileText, CheckSquare, Globe, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { HSCodeSearch } from './tabs/HSCodeSearch';
import { MyMemo } from './tabs/MyMemo';

import { TeamBoard } from './tabs/TeamBoard';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';
import { getToolboxStrings } from './i18n';

interface ToolboxWindowProps {
    id: string;
    isOpen: boolean;
    isMinimized: boolean;
    onClose: () => void;
    onMinimize: () => void;
    onFocus: () => void;
    zIndex: number;
}

type TabId = 'hscode' | 'memo' | 'todo' | 'board';

export const ToolboxWindow: React.FC<ToolboxWindowProps> = (props) => {
    const [activeTab, setActiveTab] = useState<TabId>('hscode');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);

    const tabs = [
        { id: 'hscode', label: t.hsCode, icon: Search, component: HSCodeSearch },
        { id: 'memo', label: t.myMemo, icon: FileText, component: MyMemo },
        { id: 'board', label: t.teamBoard, icon: Globe, component: TeamBoard },
    ] as const;

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || HSCodeSearch;

    return (
        <WindowFrame
            title={t.toolbox}
            icon={Briefcase}
            {...props}
            initialWidth={1100}
            initialHeight={750}
            className="bg-white dark:bg-gray-900"
        >
            <div className="flex flex-col md:flex-row h-full overflow-hidden relative">
                {/* Mobile Tab Header */}
                <div className="md:hidden flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Desktop Sidebar */}
                <div className={`hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm transition-all duration-300 relative ${isSidebarCollapsed ? 'w-16 items-center' : 'w-56'}`}>
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute -right-3 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1.5 shadow-md text-gray-500 hover:text-blue-600 z-50 hover:scale-110 transition-all"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                    </button>

                    <div className="p-4 flex flex-col h-full">
                        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-6 px-1 h-8`}>
                            {!isSidebarCollapsed && <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.apps}</h3>}
                        </div>

                        <div className="space-y-1 flex-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center rounded-lg transition-all duration-200 ${isSidebarCollapsed ? 'justify-center w-10 h-10 p-0' : 'w-full space-x-3 px-3 py-2'} ${activeTab === tab.id
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                    title={isSidebarCollapsed ? tab.label : ''}
                                >
                                    <tab.icon size={20} />
                                    {!isSidebarCollapsed && <span className="text-sm font-medium">{tab.label}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 relative">
                    <main className="h-full overflow-y-auto no-scrollbar">
                        <ActiveComponent />
                    </main>
                </div>
            </div>
        </WindowFrame>
    );
};
