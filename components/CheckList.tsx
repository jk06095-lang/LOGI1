import React, { useState, useEffect, useRef } from 'react';
import { BLData, BLChecklist, ChecklistStep, CargoItem, Language } from '../types';
import { CheckSquare, FileText, Edit, X, Truck, Building2 } from 'lucide-react';

interface CheckListProps {
  bls: BLData[];
  checklists: Record<string, BLChecklist>;
  onUpdateChecklist: (blId: string, checklist: BLChecklist) => void;
  onUpdateBL: (blId: string, updates: Partial<BLData>) => Promise<void>;
  initialSelectedBLId?: string;
  onOpenBLDetail?: (blId: string) => void;
  language?: Language;
}

const translations = {
  ko: {
    sectionA: 'A. 선사 및 포워더 → Agency 전달사항',
    sectionB: 'B. Agency → 운송사/하역사 전달사항',
    sectionC: 'C. Agency 업무',
    sectionD: 'D. 운송사/하역사 업무',
    sectionE: 'E. 화물 선적 (Loading)',
    selectBL: 'B/L을 선택해주세요.',
    blList: 'B/L 목록',
    transit: '환적',
    fisco: 'LOGI1',
    thirdParty: '3RD',
    import: '수입',
    forwarder: 'Forwarder:',
    transporter: 'Transporter:',
    item: '항목',
    date: '날짜',
    remark: '비고'
  },
  en: {
    sectionA: 'A. Carrier/Fwd → Agency',
    sectionB: 'B. Agency → Transporter',
    sectionC: 'C. Agency Tasks',
    sectionD: 'D. Transport Tasks',
    sectionE: 'E. Loading',
    selectBL: 'Select a B/L.',
    blList: 'B/L List',
    transit: 'TRANSIT',
    fisco: 'LOGI1',
    thirdParty: '3RD',
    import: 'IMP',
    forwarder: 'Forwarder:',
    transporter: 'Transporter:',
    item: 'Item',
    date: 'Date',
    remark: 'Remark'
  },
  cn: {
    sectionA: 'A. 船公司/货代 → 代理',
    sectionB: 'B. 代理 → 运输/装卸',
    sectionC: 'C. 代理业务',
    sectionD: 'D. 运输业务',
    sectionE: 'E. 装船 (Loading)',
    selectBL: '请选择提单',
    blList: '提单列表',
    transit: '中转',
    fisco: 'LOGI1',
    thirdParty: '第三方',
    import: '进口',
    forwarder: '货代:',
    transporter: '运输:',
    item: '项目',
    date: '日期',
    remark: '备注'
  }
};

const EMPTY_CHECKLIST = (blId: string): BLChecklist => ({
  blId,
  sectionA: [
    { id: 'a1', label: 'AN 수령 (Arrival Notice)', checked: false, remarks: '' },
    { id: 'a2', label: '수입적하목록 수령', checked: false, remarks: '' },
    { id: 'a3', label: 'DO INVOICE 수령', checked: false, remarks: '' },
    { id: 'a4', label: 'DO 비용 송금 및 DO 수령', checked: false, remarks: '' },
  ],
  sectionB: [
    { id: 'b1', label: 'BL, PL, 본선 입항일정 전달', checked: false, remarks: '' },
    { id: 'b2', label: '수입 적하목록 전달', checked: false, remarks: '' },
    { id: 'b3', label: 'DO 전달', checked: false, remarks: '' },
    { id: 'b4a', label: 'DEMURRAGE INVOICE 수령 (발생시)', checked: false, remarks: '' },
    { id: 'b4b', label: 'DEMURRAGE 이체확인증', checked: false, remarks: '' },
    { id: 'b5a', label: 'CY 경과보관료 INVOICE 수령 (발생시)', checked: false, remarks: '' },
    { id: 'b6', label: '컨테이너 운송일시 통보', checked: false, remarks: '' },
  ],
  sectionC: [
    { id: 'c1', label: '출항적하목록 신고', checked: false, remarks: '' },
    { id: 'c2', label: '작업선 Booking', checked: false, remarks: '' },
  ],
  sectionD: [
    { id: 'd1', label: '운송사에 운송지시 (DO전달, 비용확인)', checked: false, remarks: '' },
    { id: 'd2', label: '컨테이너 운송내역 항만공사 통보', checked: false, remarks: '' },
  ],
  sectionE: [
    { id: 'e1', label: '운송일 작업선(필요시) 으로 본선에 화물선적', checked: false, remarks: '' },
  ]
});

// Helper component for IME-safe input
const RemarkInput = ({ 
    initialValue, 
    onSave 
}: { 
    initialValue: string, 
    onSave: (val: string) => void 
}) => {
    const [value, setValue] = useState(initialValue);
    
    // Sync if parent updates (e.g. initial load)
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    return (
        <input 
            type="text" 
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
                if (value !== initialValue) {
                    onSave(value);
                }
            }}
            className="w-full bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none text-slate-600 dark:text-slate-400 text-sm py-1"
            placeholder="..."
        />
    );
};

export const CheckList: React.FC<CheckListProps> = ({ bls, checklists, onUpdateChecklist, initialSelectedBLId, onOpenBLDetail, language = 'ko' }) => {
  const [selectedBLId, setSelectedBLId] = useState<string | null>(initialSelectedBLId || (bls.length > 0 ? bls[0].id : null));
  const t = translations[language];

  const SECTION_TITLES: Record<keyof Omit<BLChecklist, 'blId'>, string> = {
    sectionA: t.sectionA,
    sectionB: t.sectionB,
    sectionC: t.sectionC,
    sectionD: t.sectionD,
    sectionE: t.sectionE
  };

  useEffect(() => {
    if (initialSelectedBLId) {
      setSelectedBLId(initialSelectedBLId);
    }
  }, [initialSelectedBLId]);

  const selectedBL = bls.find(b => b.id === selectedBLId);

  const getChecklist = (blId: string): BLChecklist => {
    return checklists[blId] || EMPTY_CHECKLIST(blId);
  };

  const toggleCheck = (blId: string, section: keyof Omit<BLChecklist, 'blId'>, stepIndex: number) => {
    const currentList = getChecklist(blId);
    // Create deep copy of the section to avoid reference issues
    const updatedSection = currentList[section].map(item => ({...item}));
    
    // Toggle
    updatedSection[stepIndex].checked = !updatedSection[stepIndex].checked;
    
    // Manage date - using empty string instead of undefined to ensure Firestore saves it properly and input stays controlled
    if (updatedSection[stepIndex].checked) {
       updatedSection[stepIndex].checkedDate = new Date().toISOString().split('T')[0];
    } else {
       updatedSection[stepIndex].checkedDate = ''; 
    }

    onUpdateChecklist(blId, { ...currentList, [section]: updatedSection });
  };

  const updateRemark = (blId: string, section: keyof Omit<BLChecklist, 'blId'>, stepIndex: number, text: string) => {
    const currentList = getChecklist(blId);
    const updatedSection = [...currentList[section]];
    updatedSection[stepIndex] = { ...updatedSection[stepIndex], remarks: text };
    onUpdateChecklist(blId, { ...currentList, [section]: updatedSection });
  };

  const updateDate = (blId: string, section: keyof Omit<BLChecklist, 'blId'>, stepIndex: number, date: string) => {
    const currentList = getChecklist(blId);
    const updatedSection = [...currentList[section]];
    
    updatedSection[stepIndex] = {
      ...updatedSection[stepIndex],
      checkedDate: date
    };

    onUpdateChecklist(blId, { ...currentList, [section]: updatedSection });
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

  if (!selectedBLId || !selectedBL) {
    return <div className="p-4 text-center text-slate-400 text-sm italic">{t.selectBL}</div>;
  }

  const activeChecklist = getChecklist(selectedBLId);

  return (
    <div className="flex h-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      {/* Sidebar List - Compact but readable */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 overflow-y-auto custom-scrollbar">
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 sticky top-0 z-10">
           <FileText size={16} className="text-slate-500" />
           <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-tight">{t.blList}</h3>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {bls.map(bl => {
            const cl = getChecklist(bl.id);
            const allSteps = [...cl.sectionA, ...cl.sectionB, ...cl.sectionC, ...cl.sectionD, ...cl.sectionE];
            const checked = allSteps.filter(s => s.checked).length;
            const total = allSteps.length;
            const percent = Math.round((checked / total) * 100);

            // Badge logic
            let badgeClass = "bg-slate-200 text-slate-600";
            let badgeText = t.transit;
            if (bl.sourceType === 'FISCO') {
                badgeClass = "bg-blue-100 text-blue-700";
                badgeText = t.fisco; // Updated
            } else if (bl.sourceType === 'THIRD_PARTY') {
                badgeClass = "bg-amber-100 text-amber-700";
                badgeText = t.thirdParty;
            }
            
            // Classification Badge
            let classBadge = null;
            if (bl.cargoClass === 'IMPORT') {
                classBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">{t.import}</span>;
            } else if (bl.cargoClass === 'TRANSHIPMENT') {
                classBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">TS</span>;
            }

            return (
              <li 
                key={bl.id} 
                onClick={() => setSelectedBLId(bl.id)}
                className={`p-4 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors ${selectedBLId === bl.id ? 'bg-white dark:bg-slate-800 border-l-4 border-l-blue-600 dark:border-l-blue-400 shadow-sm' : ''}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                            {badgeText}
                          </span>
                          {classBadge}
                          {bl.cargoType && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">
                                  {bl.cargoType}
                              </span>
                          )}
                      </div>
                      <div className={`text-sm font-bold tabular-nums truncate ${selectedBLId === bl.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-300'}`}>
                        {bl.blNumber}
                      </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${percent === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {percent}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{bl.shipper}</p>
                {/* Small indicator if Transporter is assigned */}
                {bl.transporterName && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                        <Truck size={10} /> <span className="truncate max-w-[150px]">{bl.transporterName}</span>
                    </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Main Checklist Area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 p-6 custom-scrollbar">
        {/* Info Banner */}
        <div className="relative bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 p-4 mb-6 group">
          <button 
             onClick={() => onOpenBLDetail && onOpenBLDetail(selectedBLId)}
             className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
             title="정보 수정"
          >
             <Edit size={16} />
          </button>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-x-8 gap-y-4 text-sm leading-tight pr-8">
            <div><p className="text-slate-400 font-bold uppercase text-xs mb-1">B/L NO</p><p className="font-bold text-slate-800 dark:text-white tabular-nums">{selectedBL.blNumber}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-xs mb-1">Vessel</p><p className="font-bold text-slate-800 dark:text-white truncate">{selectedBL.vesselName}</p></div>
            <div className="md:col-span-2"><p className="text-slate-400 font-bold uppercase text-xs mb-1">Shipper</p><p className="font-bold text-slate-800 dark:text-white truncate">{selectedBL.shipper}</p></div>
            <div><p className="text-slate-400 font-bold uppercase text-xs mb-1">Qty/Weight</p><p className="font-bold text-slate-800 dark:text-white tabular-nums">{getQty(selectedBL).toLocaleString()} pk / {getWeight(selectedBL).toLocaleString()} kg</p></div>
            <div className="text-right"><p className="text-slate-400 font-bold uppercase text-xs mb-1">ETA</p><p className="font-bold text-slate-800 dark:text-white tabular-nums">{selectedBL.date}</p></div>
          </div>

          {/* Forwarder & Transporter Info Bar */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600 grid grid-cols-2 gap-4">
               <div className="flex items-center gap-2">
                   <Building2 size={14} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t.forwarder}</span>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedBL.koreanForwarder || '-'}</span>
               </div>
               <div className="flex items-center gap-2">
                   <Truck size={14} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t.transporter}</span>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedBL.transporterName || '-'}</span>
               </div>
          </div>
        </div>

        {/* Checklist Sections */}
        <div className="space-y-6">
          {(Object.keys(SECTION_TITLES) as Array<keyof Omit<BLChecklist, 'blId'>>).map((sectionKey) => (
            <div key={sectionKey} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="bg-slate-100 dark:bg-slate-700/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-tight">{SECTION_TITLES[sectionKey]}</h4>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-xs uppercase font-bold">
                    <th className="w-12 py-2"></th>
                    <th className="text-left py-2 px-4 w-1/2">{t.item}</th>
                    <th className="text-center py-2 px-4 w-32">{t.date}</th>
                    <th className="text-left py-2 px-4">{t.remark}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-5 dark:divide-slate-700">
                  {activeChecklist[sectionKey].map((step, idx) => (
                    <tr key={step.id} className={`${step.checked ? 'bg-emerald-50/20 dark:bg-emerald-900/10' : ''} hover:bg-slate-50/50`}>
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => toggleCheck(selectedBLId, sectionKey, idx)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            step.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                          }`}
                        >
                          {step.checked && <CheckSquare size={14} />}
                        </button>
                      </td>
                      <td className={`py-3 px-4 font-medium text-sm ${step.checked ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {step.label}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {step.checked ? (
                          <input
                            type="date"
                            value={step.checkedDate || ''}
                            onChange={(e) => updateDate(selectedBLId, sectionKey, idx, e.target.value)}
                            className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-slate-500 font-mono text-xs text-center w-full cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <RemarkInput 
                            initialValue={step.remarks} 
                            onSave={(val) => updateRemark(selectedBLId, sectionKey, idx, val)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};