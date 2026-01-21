
import React, { useState, useEffect } from 'react';
import { VesselJob, BLData, BLChecklist, CargoSourceType, Language, CargoItem } from '../types';
import { ArrowLeft, Upload, FileText, CheckSquare, Download, Calendar, Ship, MapPin, Eye, Container, Package, Truck, Plus, Trash2, Save, Keyboard, Share2, FileImage, X, Link, Check, Anchor, Box, Layers } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { CargoList } from './CargoList';
import { CheckList } from './CheckList';

interface VesselDetailProps {
  job: VesselJob;
  bls: BLData[];
  checklists: Record<string, BLChecklist>;
  onClose: () => void;
  onUploadBLs: (files: File[], sourceType: CargoSourceType) => void;
  onCreateManualBL: (blData: BLData) => Promise<void>;
  onUpdateChecklist: (blId: string, checklist: BLChecklist) => void;
  onUpdateBL: (blId: string, updates: Partial<BLData>) => Promise<void>;
  isProcessing: boolean;
  progressMessage: string;
  initialTab?: 'cargo' | 'checklist';
  initialBLId?: string;
  language?: Language;
  lastUpdate?: number;
  onOpenBLDetail?: (blId: string) => void;
  onOpenRegister?: () => void; // New Prop
}

const translations = {
  ko: {
    tabs: { cargo: '통합 화물 리스트', checklist: '체크리스트' },
    register: '화물 등록',
    back: '뒤로가기',
    registerTitle: '화물 신규 등록',
    voyage: '항차',
    eta: 'ETA',
  },
  en: {
    tabs: { cargo: 'Cargo List', checklist: 'Checklist' },
    register: 'Register',
    back: 'Back',
    registerTitle: 'Register New Cargo',
    voyage: 'VOY',
    eta: 'ETA',
  },
  cn: {
    tabs: { cargo: '货物清单', checklist: '检查表' },
    register: '登记',
    back: '返回',
    registerTitle: '新增货物登记',
    voyage: '航次',
    eta: '预计到达',
  }
};

export const VesselDetail: React.FC<VesselDetailProps> = ({ 
  job, bls, checklists, onClose, onUploadBLs, onCreateManualBL, onUpdateChecklist, onUpdateBL, isProcessing, progressMessage, initialTab, initialBLId, language = 'ko', lastUpdate, onOpenBLDetail, onOpenRegister
}) => {
  const [activeTab, setActiveTab] = useState<'cargo' | 'checklist'>(initialTab || 'cargo');
  const t = translations[language];

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, lastUpdate]);

  const tabs = [
    { id: 'cargo', label: t.tabs.cargo, icon: Download },
    { id: 'checklist', label: t.tabs.checklist, icon: CheckSquare },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 relative">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 flex-shrink-0 shadow-sm relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
               <Ship size={32} />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-2">{job.vesselName}</h1>
               <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                 <span className="flex items-center gap-2"><Calendar size={16} className="text-blue-500" /> {t.eta}: {job.eta}</span>
                 <span className="flex items-center gap-2"><FileText size={16} className="text-blue-500" /> {t.voyage}: {job.voyageNo}</span>
               </div>
             </div>
          </div>
          <button 
            onClick={() => {
                if (onOpenRegister) onOpenRegister();
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30 active:scale-95"
          >
            <Plus size={20} /> {t.register}
          </button>
        </div>
        
        <div className="flex items-center gap-4 -mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
             const Icon = tab.icon;
             const isActive = activeTab === tab.id;
             return (
               <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex items-center gap-2.5 px-8 py-4 text-sm font-bold border-b-4 transition-all whitespace-nowrap uppercase tracking-wider ${
                    isActive 
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                 <Icon size={18} /> {tab.label}
               </button>
             );
          })}
        </div>
      </div>

      <div className={`flex-1 ${activeTab === 'checklist' ? 'overflow-hidden p-0' : 'overflow-auto p-10'} custom-scrollbar bg-slate-50 dark:bg-slate-900`}>
        <div className="max-w-screen-2xl mx-auto h-full">
            {activeTab === 'cargo' && (
                <CargoList 
                    data={bls} 
                    checklists={checklists}
                    language={language} 
                    onAddRequest={() => onOpenRegister && onOpenRegister()}
                    onViewDetail={onOpenBLDetail} 
                />
            )}
            {activeTab === 'checklist' && (
            <CheckList 
                bls={bls} 
                checklists={checklists} 
                onUpdateChecklist={onUpdateChecklist} 
                initialSelectedBLId={initialBLId} 
                onUpdateBL={onUpdateBL}
                onOpenBLDetail={onOpenBLDetail}
                language={language}
            />
            )}
        </div>
      </div>
    </div>
  );
};
