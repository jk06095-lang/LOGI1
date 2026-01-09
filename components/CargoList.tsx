
import React, { useState, useMemo } from 'react';
import { BLData, Language, BLChecklist } from '../types';
import { Download, Package, ArrowRight, Layers, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface CargoListProps {
  data: BLData[];
  checklists?: Record<string, BLChecklist>;
  language?: Language;
  onAddRequest?: () => void;
  onViewDetail?: (blId: string) => void;
}

const translations = {
  ko: {
    title: '통합 화물 리스트',
    subtitle: '총 {count}건의 B/L이 등록되었습니다.',
    download: '엑셀 다운로드',
    noData: '등록된 화물이 없습니다.',
    firstItem: '첫 번째 화물 등록하기',
    type: '구분',
    class: '분류',
    category: '화물 종류',
    vessel: '소요 선박',
    blNo: 'B/L 번호',
    shipper: 'Shipper',
    consignee: 'Consignee',
    notify: 'Notify',
    desc: '대표 품명',
    qty: '수량',
    weight: '중량 (kg)',
    cbm: 'CBM',
    action: '관리',
    status: '진행상태',
    transit: '환적',
    fisco: 'LOGI1',
    thirdParty: '타사',
    viewDetail: '상세보기',
    andOthers: '외 {count}건',
    catBait: '베이트',
    catGear: '어구',
    catNets: '그물',
    catPort: '항통장비',
    catGen: '기타',
    stages: {
        A: '수신',
        B: '전달',
        C: '대행',
        D: '운송',
        E: '선적',
        Done: '완료',
        Unassigned: '미배정'
    }
  },
  en: {
    title: 'Integrated Cargo List',
    subtitle: 'Total {count} B/Ls registered.',
    download: 'Download Excel',
    noData: 'No cargo registered.',
    firstItem: 'Register Cargo',
    type: 'Source',
    class: 'Class',
    category: 'Category',
    vessel: 'Vessel',
    blNo: 'B/L No.',
    shipper: 'Shipper',
    consignee: 'Consignee',
    notify: 'Notify',
    desc: 'Description',
    qty: 'Qty',
    weight: 'Weight',
    cbm: 'CBM',
    action: 'Action',
    status: 'Status',
    transit: 'TRANSIT',
    fisco: 'LOGI1',
    thirdParty: '3RD',
    viewDetail: 'Detail',
    andOthers: '& {count} others',
    catBait: 'BAIT',
    catGear: 'GEAR',
    catNets: 'NETS',
    catPort: 'EQUIP',
    catGen: 'GEN',
    stages: {
        A: 'Rcv',
        B: 'Fwd',
        C: 'Agcy',
        D: 'Trns',
        E: 'Load',
        Done: 'Done',
        Unassigned: '-'
    }
  },
  cn: {
    title: '综合货物清单',
    subtitle: '已登记 {count} 份提单/货运单证。',
    download: '导出 Excel',
    noData: '暂无货物登记。',
    firstItem: '登记首批货物',
    type: '来源',
    class: '分类',
    category: '货物类型',
    vessel: '船舶',
    blNo: '提单/订单号',
    shipper: '发货人',
    consignee: '收货人',
    notify: '通知人',
    desc: '货物描述',
    qty: '数量',
    weight: '重量 (KG)',
    cbm: '体积 (CBM)',
    action: '操作',
    status: '状态',
    transit: '中转',
    fisco: 'LOGI1',
    thirdParty: '第三方',
    viewDetail: '查看详情',
    andOthers: '等 {count} 项',
    catBait: '诱饵',
    catGear: '渔具',
    catNets: '渔网',
    catPort: '港口设备',
    catGen: '一般',
    stages: {
        A: '接收',
        B: '转交',
        C: '代理',
        D: '车队',
        E: '装船',
        Done: '完成',
        Unassigned: '未分'
    }
  }
};

type SortKey = 'sourceType' | 'cargoCategory' | 'vesselName' | 'blNumber' | 'shipper' | 'consignee' | 'description' | 'quantity' | 'grossWeight' | 'cbm' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const CargoList: React.FC<CargoListProps> = ({ data = [], checklists = {}, language = 'ko', onAddRequest, onViewDetail }) => {
  const t = translations[language] || translations.ko;
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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

  const getStatus = (bl: BLData) => {
     if (!bl.vesselJobId || !checklists[bl.id]) return { percent: 0, label: t.stages.Unassigned };
     
     const checklist = checklists[bl.id];
     const sections = ['sectionA', 'sectionB', 'sectionC', 'sectionD', 'sectionE'] as const;
     const allItems = sections.flatMap(k => checklist[k]);
     const total = allItems.length;
     const checked = allItems.filter(i => i.checked).length;
     
     let label = t.stages.Done;
     // Determine active stage
     for(const sec of sections) {
         if (checklist[sec].length > 0 && checklist[sec].some(i => !i.checked)) {
             // Map section key to label (A..E)
             const keyChar = sec.replace('section', '') as 'A'|'B'|'C'|'D'|'E';
             label = t.stages[keyChar];
             break;
         }
     }
     
     return { percent: total > 0 ? Math.round((checked / total) * 100) : 0, label };
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';
      switch (sortConfig.key) {
        case 'sourceType': aValue = a.sourceType || ''; bValue = b.sourceType || ''; break;
        case 'cargoCategory': aValue = a.cargoCategory || ''; bValue = b.cargoCategory || ''; break;
        case 'vesselName': aValue = a.vesselName || ''; bValue = b.vesselName || ''; break;
        case 'blNumber': aValue = a.blNumber; bValue = b.blNumber; break;
        case 'shipper': aValue = a.shipper; bValue = b.shipper; break;
        case 'consignee': aValue = a.consignee; bValue = b.consignee; break;
        case 'description': aValue = a.cargoItems[0]?.description || ''; bValue = b.cargoItems[0]?.description || ''; break;
        case 'quantity': aValue = getQty(a); bValue = getQty(b); break;
        case 'grossWeight': aValue = getWeight(a); bValue = getWeight(b); break;
        case 'cbm': aValue = getCbm(a); bValue = getCbm(b); break;
        case 'status': aValue = getStatus(a).percent; bValue = getStatus(b).percent; break;
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, checklists]);

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-blue-600" /> : <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

  const handleOpenFile = (url?: string) => {
    if (url) window.open(url, '_blank');
    else alert('파일이 없습니다.');
  };

  const getSourceBadge = (source?: string) => {
      switch(source) {
          case 'TRANSIT': return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 border border-slate-300">{t.transit}</span>;
          case 'FISCO': return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">{t.fisco}</span>;
          case 'THIRD_PARTY': return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">{t.thirdParty}</span>;
          default: return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">-</span>;
      }
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

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed animate-fade-in">
        <Package size={64} className="text-slate-200 dark:text-slate-700 mb-6" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t.noData}</h3>
        {onAddRequest && (
          <button onClick={onAddRequest} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 mt-4">
            <Layers size={18} /> {t.firstItem}
          </button>
        )}
      </div>
    );
  }

  const exportCSV = () => {
    const allItems = data.flatMap(bl => (bl.cargoItems || []).map(item => ({ ...item, blNumber: bl.blNumber, vessel: bl.vesselName, shipper: bl.shipper, consignee: bl.consignee, category: bl.cargoCategory, cbm: getCbm(bl) })));
    const headers = ["Vessel", "B/L Number", "Category", "Shipper", "Consignee", "Description", "Quantity", "Weight", "CBM"];
    const rows = allItems.map(item => [item.vessel, item.blNumber, item.category || 'GENERAL', item.shipper, item.consignee, item.description, item.quantity, item.grossWeight, item.measurement]);
    const csvContent = "data:text/csv;charset=utf-8,\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `cargo_list.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <div className="flex justify-between items-center px-1">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle.replace('{count}', data.length.toString())}</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm">
          <Download size={16} /> {t.download}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-none shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 font-bold uppercase tracking-widest text-[11px]">
              <tr>
                <th onClick={() => handleSort('status')} className="px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors w-24"><div className="flex items-center gap-1">{t.status} {renderSortIcon('status')}</div></th>
                <th onClick={() => handleSort('sourceType')} className="px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors w-24"><div className="flex items-center gap-1">{t.type} {renderSortIcon('sourceType')}</div></th>
                <th onClick={() => handleSort('cargoCategory')} className="px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.category} {renderSortIcon('cargoCategory')}</div></th>
                <th onClick={() => handleSort('blNumber')} className="px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.blNo} {renderSortIcon('blNumber')}</div></th>
                <th onClick={() => handleSort('shipper')} className="px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.shipper} {renderSortIcon('shipper')}</div></th>
                <th onClick={() => handleSort('consignee')} className="px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.consignee} {renderSortIcon('consignee')}</div></th>
                <th onClick={() => handleSort('description')} className="px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.desc} {renderSortIcon('description')}</div></th>
                <th onClick={() => handleSort('quantity')} className="px-2 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center justify-end gap-1">{t.qty} {renderSortIcon('quantity')}</div></th>
                <th onClick={() => handleSort('grossWeight')} className="px-2 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center justify-end gap-1">{t.weight} {renderSortIcon('grossWeight')}</div></th>
                <th onClick={() => handleSort('cbm')} className="px-2 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center justify-end gap-1">{t.cbm} {renderSortIcon('cbm')}</div></th>
                <th className="px-2 py-3 text-center">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {sortedData.map((bl) => {
                const totalQty = getQty(bl);
                const totalWeight = getWeight(bl);
                const totalCbm = getCbm(bl);
                const displayDesc = bl.cargoItems.length > 0 ? bl.cargoItems[0].description + (bl.cargoItems.length > 1 ? ` ${t.andOthers.replace('{count}', (bl.cargoItems.length - 1).toString())}` : '') : '-';
                const status = getStatus(bl);

                return (
                  <tr key={bl.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    
                    {/* Status Column (ERP Style) */}
                    <td className="px-2 py-2 whitespace-nowrap">
                         {status.percent === 0 && status.label === t.stages.Unassigned ? (
                             <span className="text-slate-400 text-xs">-</span>
                         ) : (
                             <div className="w-20">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[10px] font-bold uppercase ${status.percent === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{status.label}</span>
                                    <span className="text-[9px] font-mono text-slate-400">{status.percent}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div style={{ width: `${status.percent}%` }} className={`h-full rounded-full ${status.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                </div>
                             </div>
                         )}
                    </td>
                    
                    {/* Source Type Column */}
                    <td className="px-2 py-2 text-center">
                        {getSourceBadge(bl.sourceType)}
                    </td>

                    <td className="px-2 py-2 text-center">
                        {getCategoryBadge(bl.cargoCategory)}
                    </td>

                    <td className="px-2 py-2 font-bold text-blue-600 dark:text-blue-400 font-mono cursor-pointer hover:underline" onClick={() => handleOpenFile(bl.fileUrl)}>
                        <div className="flex items-center gap-1.5">
                            {bl.blNumber} <ExternalLink size={10} className="opacity-50"/>
                        </div>
                    </td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]" title={bl.shipper}>{bl.shipper}</td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={bl.consignee}>{bl.consignee}</td>
                    
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400 truncate max-w-[180px] text-xs" title={displayDesc}>{displayDesc}</td>
                    <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300 tabular-nums font-bold">{totalQty.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-400 font-mono tabular-nums">{totalWeight.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-400 font-mono tabular-nums font-bold">
                        {totalCbm > 0 ? totalCbm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '-'}
                    </td>
                    <td className="px-2 py-2 text-center">
                        <button 
                            onClick={() => onViewDetail && onViewDetail(bl.id)}
                            className="text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto shadow-sm"
                        >
                            {t.viewDetail} <ArrowRight size={12} />
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
