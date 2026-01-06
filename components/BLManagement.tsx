
import React, { useState, useMemo } from 'react';
import { BLData, VesselJob, Language, BLChecklist } from '../types';
import { FileText, Search, ArrowRight, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Building2, Truck, ListChecks, FolderOpen } from 'lucide-react';

interface BLManagementProps {
  bls: BLData[];
  jobs: VesselJob[];
  checklists: Record<string, BLChecklist>;
  onUploadBLs: (files: File[]) => void;
  onAssignBL: (blId: string, jobId: string) => void;
  onCreateJob: (job: Omit<VesselJob, 'id'>) => void;
  onNavigateToBL: (blId: string, jobId?: string) => void; // This actually triggers opening the Detail Tab
  isProcessing: boolean;
  progressMessage: string;
  language: Language;
}

const translations = {
  ko: {
    title: '문서 관리',
    subtitle: '업로드된 모든 화물 문서를 검색하고 관리합니다.',
    search: 'B/L 번호, 선박명, 화주, 운송사 검색...',
    unassigned: '미배정',
    tableHeaders: ['진행상황', 'B/L 번호', '선박 / 항차', '화주 (Shipper)', '품목 수', '등록일', '관리'],
    allVessels: '모든 선박',
    allTypes: '모든 화물 유형',
    goToChecklist: '상세보기',
    stages: {
      A: 'A. 수신 (Recv)',
      B: 'B. 전달 (Fwd)',
      C: 'C. 대행 (Agcy)',
      D: 'D. 운송 (Trns)',
      E: 'E. 선적 (Load)',
      Done: '완료 (Done)'
    }
  },
  en: {
    title: 'Document Management',
    subtitle: 'Search and manage all uploaded cargo documents.',
    search: 'Search B/L, Vessel, Shipper, Transporter...',
    unassigned: 'Unassigned',
    tableHeaders: ['Progress', 'B/L No.', 'Vessel / Voyage', 'Shipper', 'Items', 'Date', 'Action'],
    allVessels: 'All Vessels',
    allTypes: 'All Types',
    goToChecklist: 'Detail View',
    stages: {
        A: 'A. Recv',
        B: 'B. Fwd',
        C: 'C. Agcy',
        D: 'D. Trns',
        E: 'E. Load',
        Done: 'Completed'
    }
  },
  cn: {
    title: '单证管理',
    subtitle: '搜索并管理所有已上传的单证资料。',
    search: '搜索提单号、船名、发货人、车队...',
    unassigned: '未关联',
    tableHeaders: ['进度', '提单号', '船名/航次', '发货人', '件数', '上传日期', '操作'],
    allVessels: '所有船舶',
    allTypes: '所有类型',
    goToChecklist: '查看详情',
    stages: {
        A: 'A. 接收',
        B: 'B. 转交',
        C: 'C. 代理',
        D: 'D. 车队',
        E: 'E. 装船',
        Done: '已完成'
    }
  }
};

type SortKey = 'status' | 'blNumber' | 'vesselName' | 'shipper' | 'itemCount' | 'uploadDate';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface ProgressInfo {
    percentage: number;
    currentStageLabel: string;
    isUnassigned: boolean;
}

export const BLManagement: React.FC<BLManagementProps> = ({ 
  bls, jobs, checklists, onNavigateToBL, language 
}) => {
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [vesselFilter, setVesselFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const getProgressInfo = (bl: BLData): ProgressInfo => {
      if (!bl.vesselJobId) {
          return { percentage: 0, currentStageLabel: t.unassigned, isUnassigned: true };
      }

      const checklist = checklists[bl.id];
      if (!checklist) {
          return { percentage: 0, currentStageLabel: t.stages.A, isUnassigned: false };
      }

      const sections = [
        { key: 'sectionA' as const, label: t.stages.A },
        { key: 'sectionB' as const, label: t.stages.B },
        { key: 'sectionC' as const, label: t.stages.C },
        { key: 'sectionD' as const, label: t.stages.D },
        { key: 'sectionE' as const, label: t.stages.E }
      ];

      const allItems = sections.flatMap(sec => checklist[sec.key]);
      const total = allItems.length;
      const checked = allItems.filter(i => i.checked).length;
      const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

      // Determine current active stage
      let currentStageLabel = t.stages.Done;
      for (const sec of sections) {
          const items = checklist[sec.key];
          const secTotal = items.length;
          const secChecked = items.filter(i => i.checked).length;
          
          // If section is not empty and not fully checked, this is the current stage
          if (secTotal > 0 && secChecked < secTotal) {
              currentStageLabel = sec.label;
              break;
          }
      }

      return { percentage, currentStageLabel, isUnassigned: false };
  };

  const filteredBLs = useMemo(() => {
    let result = bls.filter(bl => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = 
        bl.blNumber.toLowerCase().includes(lowerSearch) ||
        bl.vesselName.toLowerCase().includes(lowerSearch) ||
        bl.shipper.toLowerCase().includes(lowerSearch) ||
        (bl.transporterName && bl.transporterName.toLowerCase().includes(lowerSearch)) ||
        (bl.koreanForwarder && bl.koreanForwarder.toLowerCase().includes(lowerSearch));
        
      const matchesVessel = vesselFilter === 'all' || (vesselFilter === 'unassigned' && !bl.vesselJobId) || bl.vesselJobId === vesselFilter;
      const matchesType = typeFilter === 'all' || bl.sourceType === typeFilter;
      return matchesSearch && matchesVessel && matchesType;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';
        
        switch (sortConfig.key) {
          case 'status': 
            aValue = getProgressInfo(a).percentage; 
            bValue = getProgressInfo(b).percentage; 
            break;
          case 'blNumber': aValue = a.blNumber; bValue = b.blNumber; break;
          case 'vesselName': aValue = a.vesselName || ''; bValue = b.vesselName || ''; break;
          case 'shipper': aValue = a.shipper; bValue = b.shipper; break;
          case 'itemCount': aValue = a.cargoItems.length; bValue = b.cargoItems.length; break;
          case 'uploadDate': aValue = new Date(a.uploadDate).getTime(); bValue = new Date(b.uploadDate).getTime(); break;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [bls, searchTerm, vesselFilter, typeFilter, sortConfig, checklists, language]); // Added checklists and language as dependencies

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-blue-600" /> : <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

  const handleOpenFile = (url?: string) => {
      if(url) window.open(url, '_blank');
      else alert("파일이 없습니다.");
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 animate-fade-in space-y-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-4">
             <FolderOpen size={32} className="text-blue-600" />
             {t.title} 
             <span className="text-sm font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl ml-4">
               {filteredBLs.length} Units
             </span>
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-base mt-2">{t.subtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
         <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
         </div>
         <select value={vesselFilter} onChange={(e) => setVesselFilter(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold">
           <option value="all">{t.allVessels}</option>
           <option value="unassigned" className="text-red-500">{t.unassigned}</option>
           {jobs.map(j => <option key={j.id} value={j.id}>{j.vesselName}</option>)}
         </select>
         <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold">
           <option value="all">{t.allTypes}</option>
           <option value="TRANSIT">TRANSIT</option>
           <option value="FISCO">FISCO</option>
           <option value="THIRD_PARTY">3RD PARTY</option>
         </select>
      </div>

      <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
             <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 font-bold uppercase tracking-widest text-[11px]">
               <tr>
                 <th onClick={() => handleSort('status')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors w-40"><div className="flex items-center">{t.tableHeaders[0]} {renderSortIcon('status')}</div></th>
                 <th onClick={() => handleSort('blNumber')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[1]} {renderSortIcon('blNumber')}</div></th>
                 <th onClick={() => handleSort('vesselName')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[2]} {renderSortIcon('vesselName')}</div></th>
                 <th onClick={() => handleSort('shipper')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[3]} {renderSortIcon('shipper')}</div></th>
                 <th onClick={() => handleSort('itemCount')} className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center justify-center">{t.tableHeaders[4]} {renderSortIcon('itemCount')}</div></th>
                 <th onClick={() => handleSort('uploadDate')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[5]} {renderSortIcon('uploadDate')}</div></th>
                 <th className="px-6 py-4 text-center">{t.tableHeaders[6]}</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
               {filteredBLs.map(bl => {
                 const { percentage, currentStageLabel, isUnassigned } = getProgressInfo(bl);
                 
                 // Color coding based on stage roughly
                 let stageColor = 'text-slate-600 dark:text-slate-300';
                 let barColor = 'bg-blue-500';

                 if (isUnassigned) {
                     stageColor = 'text-red-500';
                     barColor = 'bg-slate-200 dark:bg-slate-600';
                 } else if (percentage === 100) {
                     stageColor = 'text-emerald-600 dark:text-emerald-400';
                     barColor = 'bg-emerald-500';
                 } else if (percentage === 0) {
                     stageColor = 'text-slate-500';
                     barColor = 'bg-slate-300 dark:bg-slate-600';
                 }

                 return (
                   <tr key={bl.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors">
                     <td className="px-6 py-4">
                       {isUnassigned ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              {t.unassigned}
                          </span>
                       ) : (
                          <div className="flex flex-col gap-1.5 w-32">
                             <div className="flex justify-between items-end">
                                <span className={`text-[10px] font-bold uppercase truncate ${stageColor} max-w-[80px]`} title={currentStageLabel}>
                                   {currentStageLabel}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">{percentage}%</span>
                             </div>
                             <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div style={{ width: `${percentage}%` }} className={`h-full rounded-full transition-all duration-500 ${barColor}`}></div>
                             </div>
                          </div>
                       )}
                     </td>
                     <td className="px-6 py-4">
                        <button onClick={() => handleOpenFile(bl.fileUrl)} className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-xs md:text-sm">
                          {bl.blNumber} <ExternalLink size={12} className="opacity-40" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">{bl.sourceType || 'TRANSIT'}</span>
                     </td>
                     <td className="px-6 py-4">
                       <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px] text-xs md:text-sm" title={bl.vesselName}>{bl.vesselName}</div>
                       <div className="text-[10px] text-slate-400 font-medium tabular-nums mt-0.5">{bl.voyageNo}</div>
                     </td>
                     <td className="px-6 py-4">
                         <div className="text-slate-600 dark:text-slate-400 font-medium max-w-[150px] truncate text-xs md:text-sm" title={bl.shipper}>{bl.shipper}</div>
                         <div className="flex flex-col gap-1 mt-1">
                            {bl.koreanForwarder && (
                                <div className="text-[9px] text-slate-500 flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded w-fit max-w-[150px] truncate" title={bl.koreanForwarder}>
                                    <Building2 size={10} className="flex-shrink-0" /> {bl.koreanForwarder}
                                </div>
                            )}
                            {bl.transporterName && (
                                <div className="text-[9px] text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit max-w-[150px] truncate" title={bl.transporterName}>
                                    <Truck size={10} className="flex-shrink-0" /> {bl.transporterName}
                                </div>
                            )}
                         </div>
                     </td>
                     <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200 tabular-nums">{bl.cargoItems.length}</td>
                     <td className="px-6 py-4 text-slate-400 font-mono text-[10px] tabular-nums">{new Date(bl.uploadDate).toLocaleDateString()}</td>
                     <td className="px-6 py-4 text-center">
                       <button onClick={() => onNavigateToBL(bl.id)} className="text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 mx-auto whitespace-nowrap">
                          {t.goToChecklist} <ArrowRight size={14} />
                       </button>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};
