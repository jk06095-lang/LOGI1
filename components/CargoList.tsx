

import React, { useState, useMemo } from 'react';
import { BLData, Language } from '../types';
import { Download, Package, ArrowRight, Layers, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface CargoListProps {
  data: BLData[];
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
    blNo: 'B/L 번호',
    shipper: '공급자',
    desc: '대표 품명',
    qty: '수량',
    weight: '중량 (kg)',
    cbm: 'CBM',
    action: '관리',
    transit: '환적',
    fisco: 'LOGI1',
    thirdParty: '타사',
    viewDetail: '상세보기',
    andOthers: '외 {count}건',
    clsImport: '수입',
    clsTrans: '환적',
    subReturn: '반송',
    subStore: '선용품',
    subGen: '일반'
  },
  en: {
    title: 'Integrated Cargo List',
    subtitle: 'Total {count} B/Ls registered.',
    download: 'Download Excel',
    noData: 'No cargo registered.',
    firstItem: 'Register Cargo',
    type: 'Type',
    class: 'Class',
    blNo: 'B/L No.',
    shipper: 'Shipper',
    desc: 'Description',
    qty: 'Qty',
    weight: 'Weight',
    cbm: 'CBM',
    action: 'Action',
    transit: 'TRANSIT',
    fisco: 'LOGI1',
    thirdParty: '3RD',
    viewDetail: 'Detail',
    andOthers: '& {count} others',
    clsImport: 'IMP',
    clsTrans: 'T/S',
    subReturn: 'RET',
    subStore: 'STR',
    subGen: 'GEN'
  },
  cn: {
    title: '综合货物清单',
    subtitle: '已登记 {count} 份提单/货运单证。',
    download: '导出 Excel',
    noData: '暂无货物登记。',
    firstItem: '登记首批货物',
    type: '来源',
    class: '分类',
    blNo: '提单/订单号',
    shipper: '发货人',
    desc: '货物描述',
    qty: '数量',
    weight: '重量 (KG)',
    cbm: '体积 (CBM)',
    action: '操作',
    transit: '中转',
    fisco: 'LOGI1',
    thirdParty: '第三方',
    viewDetail: '查看详情',
    andOthers: '等 {count} 项',
    clsImport: '进口',
    clsTrans: '中转',
    subReturn: '退运',
    subStore: '船用',
    subGen: '一般'
  }
};

type SortKey = 'sourceType' | 'cargoClass' | 'blNumber' | 'shipper' | 'description' | 'quantity' | 'grossWeight' | 'cbm';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const CargoList: React.FC<CargoListProps> = ({ data = [], language = 'ko', onAddRequest, onViewDetail }) => {
  const t = translations[language] || translations.ko;
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper functions to get data, prioritizing Packing List (Manual Entry) as the Standard
  // Updated to strictly enforce Packing List data as standard if present (>0)
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

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';
      switch (sortConfig.key) {
        case 'sourceType': aValue = a.sourceType || ''; bValue = b.sourceType || ''; break;
        case 'cargoClass': aValue = (a.cargoClass || '') + (a.importSubClass || ''); bValue = (b.cargoClass || '') + (b.importSubClass || ''); break;
        case 'blNumber': aValue = a.blNumber; bValue = b.blNumber; break;
        case 'shipper': aValue = a.shipper; bValue = b.shipper; break;
        case 'description': aValue = a.cargoItems[0]?.description || ''; bValue = b.cargoItems[0]?.description || ''; break;
        case 'quantity': 
          aValue = getQty(a);
          bValue = getQty(b);
          break;
        case 'grossWeight':
          aValue = getWeight(a);
          bValue = getWeight(b);
          break;
        case 'cbm':
          aValue = getCbm(a);
          bValue = getCbm(b);
          break;
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-blue-600" /> : <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

  const handleOpenFile = (url?: string) => {
    if (url) window.open(url, '_blank');
    else alert('파일이 없습니다.');
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
    const allItems = data.flatMap(bl => (bl.cargoItems || []).map(item => ({ ...item, blNumber: bl.blNumber, shipper: bl.shipper, cbm: getCbm(bl) })));
    const headers = ["B/L Number", "Class", "Shipper", "Description", "Quantity", "Weight", "CBM"];
    const rows = allItems.map(item => [item.blNumber, item.packageType, item.shipper, item.description, item.quantity, item.grossWeight, item.measurement]);
    const csvContent = "data:text/csv;charset=utf-8,\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `cargo_list.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle.replace('{count}', data.length.toString())}</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm">
          <Download size={16} /> {t.download}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 font-bold uppercase tracking-widest text-[11px]">
              <tr>
                <th onClick={() => handleSort('sourceType')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.type} {renderSortIcon('sourceType')}</div></th>
                <th onClick={() => handleSort('cargoClass')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.class} {renderSortIcon('cargoClass')}</div></th>
                <th onClick={() => handleSort('blNumber')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.blNo} {renderSortIcon('blNumber')}</div></th>
                <th onClick={() => handleSort('shipper')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.shipper} {renderSortIcon('shipper')}</div></th>
                <th onClick={() => handleSort('description')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center gap-1">{t.desc} {renderSortIcon('description')}</div></th>
                <th onClick={() => handleSort('quantity')} className="px-6 py-5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center justify-end gap-1">{t.qty} {renderSortIcon('quantity')}</div></th>
                <th onClick={() => handleSort('grossWeight')} className="px-6 py-5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center justify-end gap-1">{t.weight} {renderSortIcon('grossWeight')}</div></th>
                <th onClick={() => handleSort('cbm')} className="px-6 py-5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><div className="flex items-center justify-end gap-1">{t.cbm} {renderSortIcon('cbm')}</div></th>
                <th className="px-6 py-5 text-center">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {sortedData.map((bl) => {
                const totalQty = getQty(bl);
                const totalWeight = getWeight(bl);
                const totalCbm = getCbm(bl);
                const displayDesc = bl.cargoItems.length > 0 ? bl.cargoItems[0].description + (bl.cargoItems.length > 1 ? ` ${t.andOthers.replace('{count}', (bl.cargoItems.length - 1).toString())}` : '') : '-';

                return (
                  <tr key={bl.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    {/* Source Type Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                       {bl.sourceType === 'TRANSIT' && <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{t.transit}</span>}
                       {bl.sourceType === 'FISCO' && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{t.fisco}</span>}
                       {bl.sourceType === 'THIRD_PARTY' && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{t.thirdParty}</span>}
                    </td>
                    
                    {/* Class / Sub-Class Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                            {bl.cargoClass === 'TRANSHIPMENT' && (
                                <span className="w-fit border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">
                                    {t.clsTrans}
                                </span>
                            )}
                            {bl.cargoClass === 'IMPORT' && (
                                <div className="flex gap-1">
                                    <span className="w-fit border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">
                                        {t.clsImport}
                                    </span>
                                    {bl.importSubClass === 'RETURN_EXPORT' && <span className="text-[10px] font-bold text-red-500 border border-red-200 bg-red-50 px-1 rounded">{t.subReturn}</span>}
                                    {bl.importSubClass === 'SHIPS_STORES' && <span className="text-[10px] font-bold text-purple-500 border border-purple-200 bg-purple-50 px-1 rounded">{t.subStore}</span>}
                                </div>
                            )}
                            {!bl.cargoClass && <span className="text-slate-300 text-[10px]">-</span>}
                        </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 font-mono cursor-pointer hover:underline" onClick={() => handleOpenFile(bl.fileUrl)}>
                        <div className="flex items-center gap-1.5">
                            {bl.blNumber} <ExternalLink size={12} className="opacity-50"/>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium truncate max-w-[150px]" title={bl.shipper}>{bl.shipper}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={displayDesc}>{displayDesc}</td>
                    <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300 tabular-nums font-bold">{totalQty.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400 font-mono tabular-nums">{totalWeight.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400 font-mono tabular-nums font-bold">
                        {totalCbm > 0 ? totalCbm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button 
                            onClick={() => onViewDetail && onViewDetail(bl.id)}
                            className="text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto shadow-sm"
                        >
                            {t.viewDetail} <ArrowRight size={14} />
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