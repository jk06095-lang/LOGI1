
import React, { useState, useMemo } from 'react';
import { BLData, VesselJob, Language, BLChecklist } from '../types';
import { FileText, Search, ArrowRight, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Building2, Truck, ListChecks, FolderOpen, Download } from 'lucide-react';

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
    title: '화물 관리',
    subtitle: '업로드된 모든 화물 문서를 검색하고 관리합니다.',
    search: 'B/L 번호, 선박명, 화주, 운송사 검색...',
    unassigned: '미배정',
    tableHeaders: ['문서현황', '소요 선박', '화물분류', 'B/L 번호', '화주 (Shipper)', '수하인 (Consignee)', '품명', '수량', '중량(kg)', 'CBM', '관리'], // Updated header
    allVessels: '모든 선박',
    allTypes: '모든 화물 유형',
    goToChecklist: '상세보기',
    download: '엑셀 다운로드',
    catBait: '베이트',
    catGear: '어구',
    catNets: '그물',
    catPort: '항통장비',
    catGen: '기타',
    stages: {
      A: 'A. 수신 (Recv)',
      B: 'B. 전달 (Fwd)',
      C: 'C. 대행 (Agcy)',
      D: 'D. 운송 (Trns)',
      E: 'E. 선적 (Load)',
      Done: '완료 (Done)'
    },
    status: '문서', // Updated
    vesselName: '선박명',
    cargoCategory: '분류',
    blNumber: 'B/L No.',
    shipper: 'Shipper',
    consignee: 'Consignee',
    itemCount: '품목수',
    uploadDate: '등록일'
  },
  en: {
    title: 'Integrated Document List',
    subtitle: 'Search and manage all uploaded cargo documents.',
    search: 'Search B/L, Vessel, Shipper, Transporter...',
    unassigned: 'Unassigned',
    tableHeaders: ['Docs Status', 'Vessel', 'Category', 'B/L No.', 'Shipper', 'Consignee', 'Description', 'Qty', 'Weight', 'CBM', 'Action'],
    allVessels: 'All Vessels',
    allTypes: 'All Types',
    goToChecklist: 'Detail View',
    download: 'Export Excel',
    catBait: 'BAIT',
    catGear: 'GEAR',
    catNets: 'NETS',
    catPort: 'EQUIP',
    catGen: 'GEN',
    stages: {
        A: 'A. Recv',
        B: 'B. Fwd',
        C: 'C. Agcy',
        D: 'D. Trns',
        E: 'E. Load',
        Done: 'Completed'
    },
    status: 'Docs',
    vesselName: 'Vessel Name',
    cargoCategory: 'Category',
    blNumber: 'B/L No.',
    shipper: 'Shipper',
    consignee: 'Consignee',
    itemCount: 'Item Count',
    uploadDate: 'Date'
  },
  cn: {
    title: '综合单证清单',
    subtitle: '搜索并管理所有已上传的单证资料。',
    search: '搜索提单号、船名、发货人、车队...',
    unassigned: '未关联',
    tableHeaders: ['文档状态', '船舶', '分类', '提单号', '发货人', '收货人', '描述', '数量', '重量', '体积', '操作'],
    allVessels: '所有船舶',
    allTypes: '所有类型',
    goToChecklist: '查看详情',
    download: '导出 Excel',
    catBait: '诱饵',
    catGear: '渔具',
    catNets: '渔网',
    catPort: '港口设备',
    catGen: '一般',
    stages: {
        A: 'A. 接收',
        B: 'B. 转交',
        C: 'C. 代理',
        D: 'D. 车队',
        E: 'E. 装船',
        Done: '已完成'
    },
    status: '文档',
    vesselName: '船名',
    cargoCategory: '分类',
    blNumber: '提单号',
    shipper: '发货人',
    consignee: '收货人',
    itemCount: '项目数',
    uploadDate: '日期'
  }
};

type SortKey = 'status' | 'blNumber' | 'vesselName' | 'shipper' | 'consignee' | 'itemCount' | 'uploadDate' | 'cargoCategory';
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

  const getCbm = (bl: BLData) => {
      if (bl.packingList && typeof bl.packingList.totalCbm === 'number' && bl.packingList.totalCbm > 0) {
          return bl.packingList.totalCbm;
      }
      const sum = bl.cargoItems.reduce((acc, item) => acc + (Number(item.measurement) || 0), 0);
      return sum;
  };

  const getQty = (bl: BLData) => {
      if (bl.packingList && typeof bl.packingList.totalPackageCount === 'number' && bl.packingList.totalPackageCount > 0) {
          return bl.packingList.totalPackageCount;
      }
      return bl.cargoItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  };

  const getWeight = (bl: BLData) => {
      if (bl.packingList && typeof bl.packingList.totalGrossWeight === 'number' && bl.packingList.totalGrossWeight > 0) {
          return bl.packingList.totalGrossWeight;
      }
      return bl.cargoItems.reduce((acc, item) => acc + (Number(item.grossWeight) || 0), 0);
  };

  // Helper: Count uploaded docs
  const getDocStatus = (bl: BLData) => {
    let count = 0;
    if (bl.fileUrl) count++;
    if (bl.arrivalNotice?.fileUrl) count++;
    if (bl.commercialInvoice?.fileUrl) count++;
    if (bl.packingList?.fileUrl) count++;
    if (bl.manifest?.fileUrl) count++;
    if (bl.exportDeclaration?.fileUrl) count++;
    return count;
  };

  const getJobName = (jobId?: string) => {
      if (!jobId) return undefined;
      return jobs.find(j => j.id === jobId)?.vesselName;
  };

  const filteredBLs = useMemo(() => {
    let result = bls.filter(bl => {
      const lowerSearch = searchTerm.toLowerCase();
      const jobName = getJobName(bl.vesselJobId) || '';

      const matchesSearch = 
        bl.blNumber.toLowerCase().includes(lowerSearch) ||
        bl.vesselName.toLowerCase().includes(lowerSearch) ||
        jobName.toLowerCase().includes(lowerSearch) ||
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
            // Sort by Doc Count instead of Progress Percentage
            aValue = getDocStatus(a); 
            bValue = getDocStatus(b); 
            break;
          case 'cargoCategory': aValue = a.cargoCategory || ''; bValue = b.cargoCategory || ''; break;
          case 'blNumber': aValue = a.blNumber; bValue = b.blNumber; break;
          case 'vesselName': 
             // Sort by Job Name if available, otherwise BL Vessel Name
             aValue = getJobName(a.vesselJobId) || a.vesselName || ''; 
             bValue = getJobName(b.vesselJobId) || b.vesselName || ''; 
             break;
          case 'shipper': aValue = a.shipper; bValue = b.shipper; break;
          case 'consignee': aValue = a.consignee; bValue = b.consignee; break;
          case 'itemCount': aValue = a.cargoItems.length; bValue = b.cargoItems.length; break;
          case 'uploadDate': aValue = new Date(a.uploadDate).getTime(); bValue = new Date(b.uploadDate).getTime(); break;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [bls, searchTerm, vesselFilter, typeFilter, sortConfig, checklists, language, jobs]);

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

  const getCategoryBadge = (cat?: string) => {
      switch(cat) {
          case 'BAIT': return <span className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-pink-200 dark:border-pink-800">{t.catBait}</span>;
          case 'NETS': return <span className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-cyan-200 dark:border-cyan-800">{t.catNets}</span>;
          case 'FISHING_GEAR': return <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-orange-200 dark:border-orange-800">{t.catGear}</span>;
          case 'PORT_EQUIPMENT': return <span className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-300 dark:border-slate-600">{t.catPort}</span>;
          default: return <span className="bg-white text-slate-500 dark:bg-transparent dark:text-slate-400 px-2 py-0.5 rounded text-[10px] border border-slate-200 dark:border-slate-700">{cat || t.catGen}</span>;
      }
  };

  // NEW: 2x3 Grid Layout for Status Dots
  const renderDocStatus = (bl: BLData) => {
      const docs = [
          { id: 'BL', label: 'B/L', has: !!bl.fileUrl, color: 'bg-blue-500' },
          { id: 'AN', label: 'A/N', has: !!bl.arrivalNotice?.fileUrl, color: 'bg-orange-500' },
          { id: 'CI', label: 'C/I', has: !!bl.commercialInvoice?.fileUrl, color: 'bg-emerald-500' },
          { id: 'PL', label: 'P/L', has: !!bl.packingList?.fileUrl, color: 'bg-purple-500' },
          { id: 'MF', label: 'M/F', has: !!bl.manifest?.fileUrl, color: 'bg-cyan-500' },
          { id: 'ED', label: 'E/D', has: !!bl.exportDeclaration?.fileUrl, color: 'bg-rose-500' },
      ];

      return (
          <div className="grid grid-cols-3 gap-1 w-fit mx-auto" title="BL / AN / CI / PL / MF / ED">
              {docs.map(doc => (
                  <div 
                      key={doc.id} 
                      className={`w-1.5 h-1.5 rounded-full ${doc.has ? doc.color : 'bg-slate-200 dark:bg-slate-700'}`} 
                      title={`${doc.label}: ${doc.has ? 'Uploaded' : 'Missing'}`}
                  />
              ))}
          </div>
      );
  };

  const exportCSV = () => {
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      t.status,
      t.vesselName,
      "Voyage",
      t.cargoCategory,
      t.blNumber,
      t.shipper,
      t.consignee,
      t.tableHeaders[6], // Description
      t.tableHeaders[7], // Qty
      t.tableHeaders[8], // Weight
      t.tableHeaders[9], // CBM
      "Korean Forwarder",
      "Transporter"
    ];

    const rows = filteredBLs.map(bl => {
      const { percentage, currentStageLabel, isUnassigned } = getProgressInfo(bl);
      const statusText = isUnassigned ? t.unassigned : `${currentStageLabel} (${percentage}%)`;
      const totalQty = getQty(bl);
      const totalWeight = getWeight(bl);
      const totalCbm = getCbm(bl);
      const displayDesc = bl.cargoItems.length > 0 ? bl.cargoItems[0].description : '-';
      const jobName = getJobName(bl.vesselJobId) || bl.vesselName;

      return [
        statusText,
        jobName,
        bl.voyageNo,
        bl.cargoCategory || '',
        bl.blNumber,
        bl.shipper,
        bl.consignee,
        displayDesc,
        totalQty,
        totalWeight,
        totalCbm,
        bl.koreanForwarder || '',
        bl.transporterName || ''
      ].map(escape);
    });

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cargo_List_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 animate-fade-in space-y-8 w-full">
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-4">
             <FolderOpen size={32} className="text-blue-600" />
             {t.title} 
             <span className="text-sm font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl ml-4">
               {filteredBLs.length} Docs
             </span>
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-base mt-2">{t.subtitle}</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm">
          <Download size={16} /> {t.download}
        </button>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
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

      <div className="w-full bg-white dark:bg-slate-800 rounded-none shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
             <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 font-bold uppercase tracking-widest text-[11px]">
               <tr>
                 {/* Reduced widths for Status, Type, Category */}
                 <th onClick={() => handleSort('status')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors w-16"><div className="flex items-center justify-center">{t.tableHeaders[0]}</div></th>
                 <th onClick={() => handleSort('vesselName')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[1]} {renderSortIcon('vesselName')}</div></th>
                 <th onClick={() => handleSort('cargoCategory')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors w-24"><div className="flex items-center">{t.tableHeaders[2]} {renderSortIcon('cargoCategory')}</div></th>
                 <th onClick={() => handleSort('blNumber')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[3]} {renderSortIcon('blNumber')}</div></th>
                 <th onClick={() => handleSort('shipper')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[4]} {renderSortIcon('shipper')}</div></th>
                 <th onClick={() => handleSort('consignee')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center">{t.tableHeaders[5]} {renderSortIcon('consignee')}</div></th>
                 {/* Increased width for Description via auto expansion and min-width */}
                 <th className="px-4 py-4 min-w-[200px]">{t.tableHeaders[6]}</th>
                 <th className="px-4 py-4 text-right">{t.tableHeaders[7]}</th>
                 <th className="px-4 py-4 text-right">{t.tableHeaders[8]}</th>
                 <th className="px-4 py-4 text-right">{t.tableHeaders[9]}</th>
                 <th className="px-4 py-4 text-center">{t.tableHeaders[10]}</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
               {filteredBLs.map(bl => {
                 const totalQty = getQty(bl);
                 const totalWeight = getWeight(bl);
                 const totalCbm = getCbm(bl);
                 const displayDesc = bl.cargoItems.length > 0 ? bl.cargoItems[0].description : '-';
                 const jobName = getJobName(bl.vesselJobId);

                 return (
                   <tr key={bl.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors">
                     <td className="px-4 py-4 text-center">
                        {/* Changed to 2x3 Grid */}
                        {renderDocStatus(bl)}
                     </td>
                     <td className="px-4 py-4">
                       <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={jobName || bl.vesselName}>
                           {jobName || bl.vesselName}
                       </div>
                       <div className="text-[10px] text-slate-400 font-medium tabular-nums mt-0.5">{bl.voyageNo}</div>
                     </td>
                     
                     <td className="px-4 py-4 text-center">
                         {getCategoryBadge(bl.cargoCategory)}
                     </td>

                     <td className="px-4 py-4">
                        <button onClick={() => handleOpenFile(bl.fileUrl)} className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2">
                          {bl.blNumber} <ExternalLink size={10} className="opacity-40" />
                        </button>
                     </td>
                     <td className="px-4 py-4 text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={bl.shipper}>{bl.shipper}</td>
                     <td className="px-4 py-4 text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={bl.consignee}>{bl.consignee}</td>
                     
                     <td className="px-4 py-4 text-slate-600 dark:text-slate-400 max-w-[300px] text-xs font-medium" title={displayDesc}>{displayDesc}</td>
                     <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300 tabular-nums font-bold">{totalQty.toLocaleString()}</td>
                     <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-400 font-mono tabular-nums">{totalWeight.toLocaleString()}</td>
                     <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-400 font-mono tabular-nums font-bold">
                        {totalCbm > 0 ? totalCbm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '-'}
                     </td>

                     <td className="px-4 py-4 text-center">
                       <button onClick={() => onNavigateToBL(bl.id)} className="text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 mx-auto whitespace-nowrap shadow-sm">
                          {t.goToChecklist} <ArrowRight size={12} />
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
