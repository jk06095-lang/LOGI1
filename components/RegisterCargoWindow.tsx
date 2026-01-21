
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, Layers, Upload, Keyboard, Container, Anchor, Box, Ship, ArrowDownCircle, Check, FileText } from 'lucide-react';
import { VesselJob, BLData, CargoSourceType, Language, CargoItem, CargoClass } from '../types';
import { FileUpload } from './FileUpload';

interface RegisterCargoWindowProps {
  isOpen: boolean;
  isMinimized?: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  zIndex: number;
  onFocus?: () => void;
  targetJobId?: string;
  jobs: VesselJob[];
  onUploadBLs: (files: File[], sourceType: CargoSourceType, cargoClass?: CargoClass, targetJobId?: string) => void;
  onCreateManualBL: (blData: BLData) => Promise<void>;
  isProcessing: boolean;
  progressMessage: string;
  language: Language;
}

type WindowState = 'default' | 'maximized';

const translations = {
  ko: {
    title: '화물 신규 등록',
    selectType: '화물 구분',
    selectMethod: '등록 방식',
    typeTransit: '환적 (Transit)',
    typeImport: '수입 (Import)',
    typeFisco: '피스코마린 공급',
    typeThird: '타사 공급 (3rd Party)',
    fileUpload: '파일 업로드',
    manualInput: '직접 입력',
    uploadDesc: '이미지를 업로드하면 AI가 데이터를 추출합니다.',
    manualDesc: '직접 정보를 입력하세요.',
    basicInfo: '기본 정보',
    itemDetails: '화물 상세 정보',
    blNo: 'B/L 번호',
    shipper: '송하인',
    consignee: '수하인',
    loadingPort: '선적항 (POL)',
    dischargePort: '양하항 (POD)',
    desc: '품명',
    qty: '수량',
    weight: '중량',
    cbm: '용적',
    save: '등록하기',
    cancel: '취소',
    selectVessel: '선박 선택',
    required: '필수 항목을 입력해주세요.',
    vessel: '선박',
    voyage: '항차',
  },
  en: {
    title: 'Register New Cargo',
    selectType: 'Cargo Type',
    selectMethod: 'Registration Method',
    typeTransit: 'Transit',
    typeImport: 'Import',
    typeFisco: 'FISCO Supply',
    typeThird: '3rd Party Supply',
    fileUpload: 'File Upload',
    manualInput: 'Manual Entry',
    uploadDesc: 'AI extracts data from uploaded images.',
    manualDesc: 'Enter details manually.',
    basicInfo: 'Basic Info',
    itemDetails: 'Details',
    blNo: 'B/L No',
    shipper: 'Shipper',
    consignee: 'Consignee',
    loadingPort: 'POL',
    dischargePort: 'POD',
    desc: 'Description',
    qty: 'Qty',
    weight: 'Weight',
    cbm: 'CBM',
    save: 'Register',
    cancel: 'Cancel',
    selectVessel: 'Select Vessel',
    required: 'Required fields missing.',
    vessel: 'Vessel',
    voyage: 'Voyage',
  },
  cn: {
    title: '新货物登记',
    selectType: '货物类型',
    selectMethod: '登记方式',
    typeTransit: '中转',
    typeImport: '进口',
    typeFisco: 'FISCO 供应',
    typeThird: '第三方 供应',
    fileUpload: '文件上传',
    manualInput: '手动输入',
    uploadDesc: 'AI自动提取上传图片中的数据。',
    manualDesc: '手动输入详细信息。',
    basicInfo: '基本信息',
    itemDetails: '货物详情',
    blNo: '提单号',
    shipper: '发货人',
    consignee: '收货人',
    loadingPort: '装货港',
    dischargePort: '卸货港',
    desc: '描述',
    qty: '数量',
    weight: '重量',
    cbm: '体积',
    save: '注册',
    cancel: '取消',
    selectVessel: '选择船舶',
    required: '请填写必填项。',
    vessel: '船舶',
    voyage: '航次',
  }
};

export const RegisterCargoWindow: React.FC<RegisterCargoWindowProps> = ({
  isOpen, isMinimized, onClose, onMinimize, zIndex, onFocus, targetJobId, jobs, onUploadBLs, onCreateManualBL, isProcessing, progressMessage, language
}) => {
  const t = translations[language];
  const [windowState, setWindowState] = useState<WindowState>('default');
  
  const [selectedSourceType, setSelectedSourceType] = useState<CargoSourceType>('TRANSIT');
  const [selectedCargoClass, setSelectedCargoClass] = useState<CargoClass>('TRANSHIPMENT'); 
  const [inputMode, setInputMode] = useState<'upload' | 'manual'>('upload');
  const [selectedJobId, setSelectedJobId] = useState<string>(targetJobId || '');

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    blNumber: '', shipper: '', consignee: '', portOfLoading: '', portOfDischarge: '',
    items: [{ description: '', quantity: 0, packageType: 'PKGS', grossWeight: 0, measurement: 0 }] as CargoItem[]
  });

  useEffect(() => {
      if (targetJobId) setSelectedJobId(targetJobId);
  }, [targetJobId, isOpen]);

  const handleModeSelect = (mode: 'TRANSIT' | 'IMPORT' | 'FISCO' | 'THIRD_PARTY') => {
      if (mode === 'TRANSIT') {
          setSelectedSourceType('TRANSIT');
          setSelectedCargoClass('TRANSHIPMENT');
      } else if (mode === 'IMPORT') {
          setSelectedSourceType('TRANSIT');
          setSelectedCargoClass('IMPORT');
      } else if (mode === 'FISCO') {
          setSelectedSourceType('FISCO');
          setSelectedCargoClass('IMPORT'); 
      } else if (mode === 'THIRD_PARTY') {
          setSelectedSourceType('THIRD_PARTY');
          setSelectedCargoClass('IMPORT');
      }
  };

  const activeMode = useMemo(() => {
      if (selectedSourceType === 'FISCO') return 'FISCO';
      if (selectedSourceType === 'THIRD_PARTY') return 'THIRD_PARTY';
      if (selectedSourceType === 'TRANSIT' && selectedCargoClass === 'IMPORT') return 'IMPORT';
      return 'TRANSIT';
  }, [selectedSourceType, selectedCargoClass]);

  const handleManualSubmit = async () => {
      if (!manualForm.blNumber || !manualForm.shipper) {
          alert(t.required);
          return;
      }
      
      const job = jobs.find(j => j.id === selectedJobId);
      
      const newBL: BLData = {
          id: Date.now().toString(),
          vesselJobId: selectedJobId || undefined,
          fileName: 'Manual Entry',
          blNumber: manualForm.blNumber,
          shipper: manualForm.shipper,
          consignee: manualForm.consignee,
          notifyParty: '',
          vesselName: job?.vesselName || '',
          voyageNo: job?.voyageNo || '',
          portOfLoading: manualForm.portOfLoading,
          portOfDischarge: manualForm.portOfDischarge,
          date: new Date().toISOString().split('T')[0],
          cargoItems: manualForm.items,
          status: 'completed',
          uploadDate: new Date().toISOString(),
          sourceType: selectedSourceType,
          cargoClass: selectedCargoClass
      };

      await onCreateManualBL(newBL);
      onClose();
      resetForm();
  };

  const resetForm = () => {
      setManualForm({ 
        blNumber: '', shipper: '', consignee: '', portOfLoading: '', portOfDischarge: '',
        items: [{ description: '', quantity: 0, packageType: 'PKGS', grossWeight: 0, measurement: 0 }] 
      });
  };

  const handleItemChange = (field: keyof CargoItem, value: any) => {
    const updatedItems = [...manualForm.items];
    updatedItems[0] = { ...updatedItems[0], [field]: value };
    setManualForm({ ...manualForm, items: updatedItems });
  };

  const getWindowDimensions = () => {
      switch (windowState) {
          case 'maximized': return { width: '95vw', height: '90vh', x: '2.5vw', y: '5vh' };
          default: return { width: 900, height: 580, x: window.innerWidth / 2 - 450, y: window.innerHeight / 2 - 290 };
      }
  };
  const dims = getWindowDimensions();

  const ModeButton = ({ mode, icon: Icon, label }: { mode: string, icon: any, label: string }) => {
      const isActive = activeMode === mode;
      return (
          <button 
            onClick={() => handleModeSelect(mode as any)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-200 group ${
                isActive 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
              <div className={`p-1.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-blue-500'}`}>
                  <Icon size={16} />
              </div>
              <span className="text-xs font-bold flex-1">{label}</span>
              {isActive && <Check size={14} className="text-white" strokeWidth={3} />}
          </button>
      );
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
      <motion.div
        key="register-cargo-window"
        drag={windowState !== 'maximized'}
        dragMomentum={false}
        dragElastic={0.1}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
            opacity: isMinimized ? 0 : 1, 
            scale: isMinimized ? 0.95 : 1,
            width: dims.width,
            height: dims.height,
            x: windowState === 'maximized' ? 0 : undefined,
            y: windowState === 'maximized' ? 0 : undefined,
            pointerEvents: isMinimized ? 'none' : 'auto'
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        style={{ 
            position: 'fixed',
            top: dims.y, 
            left: dims.x,
            zIndex: zIndex 
        }}
        className="flex flex-col rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-slate-900"
        onPointerDown={onFocus}
      >
        {/* Header */}
        <div className="h-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 justify-between shrink-0 select-none">
            <div className="flex gap-2 group mr-4" onPointerDown={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 shadow-sm transition-transform hover:scale-110 active:scale-95 group/btn border border-[#E0443E]"><X size={6} className="opacity-0 group-hover/btn:opacity-100 text-black/60 mx-auto mt-[1px]" strokeWidth={3} /></button>
                <button onClick={onMinimize} className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 shadow-sm transition-transform hover:scale-110 active:scale-95 group/btn border border-[#D89E24]"><Minus size={6} className="opacity-0 group-hover/btn:opacity-100 text-black/60 mx-auto mt-[1px]" strokeWidth={4} /></button>
                <button onClick={() => setWindowState(prev => prev === 'maximized' ? 'default' : 'maximized')} className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 shadow-sm transition-transform hover:scale-110 active:scale-95 group/btn border border-[#1AAB29]"><Maximize2 size={6} className="opacity-0 group-hover/btn:opacity-100 text-black/60 mx-auto mt-[1px]" strokeWidth={3} /></button>
            </div>
            <div className="flex-1 text-center font-bold text-slate-800 dark:text-white/90 text-sm flex items-center justify-center gap-2">
                <Layers size={14} className="text-blue-600 dark:text-blue-400" />
                {t.title}
            </div>
            <div className="w-14"></div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar (Configuration) */}
            <div className="w-64 bg-slate-100/50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-6 overflow-y-auto">
                
                {/* Vessel Select */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.selectVessel}</label>
                    <div className="relative">
                        <select 
                            value={selectedJobId} 
                            onChange={(e) => setSelectedJobId(e.target.value)} 
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none shadow-sm truncate"
                        >
                            <option value="">{t.selectVessel}...</option>
                            {jobs.map(j => (
                                <option key={j.id} value={j.id}>{j.vesselName}</option>
                            ))}
                        </select>
                        <Ship className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                </div>

                {/* Cargo Type */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.selectType}</label>
                    <div className="space-y-2">
                        <ModeButton mode="TRANSIT" icon={Container} label={t.typeTransit} />
                        <ModeButton mode="IMPORT" icon={ArrowDownCircle} label={t.typeImport} />
                        <ModeButton mode="FISCO" icon={Anchor} label={t.typeFisco} />
                        <ModeButton mode="THIRD_PARTY" icon={Box} label={t.typeThird} />
                    </div>
                </div>

                {/* Input Method - Toggle */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.selectMethod}</label>
                    <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-lg flex">
                        <button 
                            onClick={() => setInputMode('upload')}
                            className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${inputMode === 'upload' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <Upload size={12} /> {t.fileUpload}
                        </button>
                        <button 
                            onClick={() => setInputMode('manual')}
                            className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${inputMode === 'manual' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <Keyboard size={12} /> {t.manualInput}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content (Action Area) */}
            <div className="flex-1 bg-white dark:bg-slate-800 p-6 relative">
                {inputMode === 'upload' ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                        <FileUpload 
                            onFilesSelected={(files) => {
                                onUploadBLs(files, selectedSourceType, selectedCargoClass, selectedJobId);
                                onClose();
                            }} 
                            isProcessing={isProcessing} 
                            progressMessage={progressMessage} 
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                            <FileText size={16} className="text-blue-500" /> 
                            {t.basicInfo}
                        </h3>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{t.blNo}</label>
                                <input type="text" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium" value={manualForm.blNumber} onChange={e => setManualForm({...manualForm, blNumber: e.target.value})} autoFocus />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{t.shipper}</label>
                                <input type="text" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={manualForm.shipper} onChange={e => setManualForm({...manualForm, shipper: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{t.consignee}</label>
                                <input type="text" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={manualForm.consignee} onChange={e => setManualForm({...manualForm, consignee: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{t.loadingPort}</label>
                                <input type="text" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={manualForm.portOfLoading} onChange={e => setManualForm({...manualForm, portOfLoading: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{t.dischargePort}</label>
                                <input type="text" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={manualForm.portOfDischarge} onChange={e => setManualForm({...manualForm, portOfDischarge: e.target.value})} />
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700 mt-auto">
                            <Box size={16} className="text-emerald-500" /> 
                            {t.itemDetails}
                        </h3>

                        <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-100 dark:border-slate-600">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-6">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{t.desc}</label>
                                    <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={manualForm.items[0].description} onChange={e => handleItemChange('description', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-right">{t.qty}</label>
                                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-right text-slate-800 dark:text-slate-100 font-mono" value={manualForm.items[0].quantity} onChange={e => handleItemChange('quantity', Number(e.target.value))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-right">{t.weight}</label>
                                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-right text-slate-800 dark:text-slate-100 font-mono" value={manualForm.items[0].grossWeight} onChange={e => handleItemChange('grossWeight', Number(e.target.value))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-right">{t.cbm}</label>
                                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 text-right text-slate-800 dark:text-slate-100 font-mono" value={manualForm.items[0].measurement} onChange={e => handleItemChange('measurement', Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-end px-6 gap-3 shrink-0">
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs uppercase tracking-wide">
                {t.cancel}
            </button>
            {inputMode === 'manual' && (
                <button onClick={handleManualSubmit} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md text-xs uppercase tracking-wide">
                    {t.save}
                </button>
            )}
        </div>
      </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
