
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

type CargoMode = 'TRANSIT' | 'IMPORT' | 'FISCO' | 'THIRD_PARTY';

export const RegisterCargoWindow: React.FC<RegisterCargoWindowProps> = ({
  isOpen, isMinimized, onClose, onMinimize, zIndex, onFocus, targetJobId, jobs, onUploadBLs, onCreateManualBL, isProcessing, progressMessage, language
}) => {
  const t = translations[language];
  const [windowState, setWindowState] = useState<WindowState>('default');
  
  // UI State for Selection (Fixing the bug by making this the source of truth)
  const [activeMode, setActiveMode] = useState<CargoMode>('TRANSIT');
  
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

  // Helper to convert UI mode to data fields
  const getCargoDataFromMode = (mode: CargoMode) => {
      let sourceType: CargoSourceType = 'TRANSIT';
      let cargoClass: CargoClass = 'TRANSHIPMENT';

      if (mode === 'TRANSIT') {
          sourceType = 'TRANSIT';
          cargoClass = 'TRANSHIPMENT';
      } else if (mode === 'IMPORT') {
          sourceType = 'TRANSIT';
          cargoClass = 'IMPORT';
      } else if (mode === 'FISCO') {
          sourceType = 'FISCO';
          cargoClass = 'IMPORT'; 
      } else if (mode === 'THIRD_PARTY') {
          sourceType = 'THIRD_PARTY';
          cargoClass = 'IMPORT';
      }
      return { sourceType, cargoClass };
  };

  const handleUploadSubmit = (files: File[]) => {
      const { sourceType, cargoClass } = getCargoDataFromMode(activeMode);
      onUploadBLs(files, sourceType, cargoClass, selectedJobId);
      // Window close logic is handled by parent or effect usually, but let's explicit close
      onClose();
  };

  const handleManualSubmit = async () => {
      if (!manualForm.blNumber || !manualForm.shipper) {
          alert(t.required);
          return;
      }
      
      const job = jobs.find(j => j.id === selectedJobId);
      const { sourceType, cargoClass } = getCargoDataFromMode(activeMode);
      
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
          sourceType: sourceType,
          cargoClass: cargoClass
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
          case 'maximized': 
              // Adjusted to be large but not full screen (Better aesthetics)
              return { width: 1100, height: 750, x: (window.innerWidth - 1100) / 2, y: (window.innerHeight - 750) / 2 };
          default: 
              return { width: 900, height: 580, x: (window.innerWidth - 900) / 2, y: (window.innerHeight - 580) / 2 };
      }
  };
  const dims = getWindowDimensions();

  const ModeButton = ({ mode, icon: Icon, label }: { mode: string, icon: any, label: string }) => {
      const isActive = activeMode === mode;
      return (
          <button 
            onClick={() => setActiveMode(mode as CargoMode)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group relative overflow-hidden ${
                isActive 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-600'
            }`}
          >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-blue-500'}`}>
                  <Icon size={18} />
              </div>
              <span className="text-xs font-bold flex-1">{label}</span>
              {isActive && <Check size={16} className="text-white animate-fade-in" strokeWidth={3} />}
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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ 
            opacity: isMinimized ? 0 : 1, 
            scale: isMinimized ? 0.95 : 1,
            width: dims.width,
            height: dims.height,
            x: dims.x,
            y: dims.y,
            pointerEvents: isMinimized ? 'none' : 'auto'
        }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        style={{ 
            position: 'fixed',
            zIndex: zIndex 
        }}
        // Liquid Glass Styling
        className="flex flex-col rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl backdrop-saturate-150"
        onPointerDown={onFocus}
      >
        {/* Header - Mac Style */}
        <div className="h-12 flex items-center px-5 justify-between shrink-0 select-none bg-gradient-to-b from-white/30 to-transparent dark:from-white/5 border-b border-white/20 dark:border-white/5 cursor-grab active:cursor-grabbing">
            <div className="flex gap-2 group mr-4" onPointerDown={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 shadow-sm transition-transform hover:scale-110 active:scale-95 border border-[#E0443E] flex items-center justify-center group/btn">
                    <X size={8} className="opacity-0 group-hover/btn:opacity-100 text-black/60" strokeWidth={3} />
                </button>
                <button onClick={onMinimize} className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 shadow-sm transition-transform hover:scale-110 active:scale-95 border border-[#D89E24] flex items-center justify-center group/btn">
                    <Minus size={8} className="opacity-0 group-hover/btn:opacity-100 text-black/60" strokeWidth={4} />
                </button>
                <button onClick={() => setWindowState(prev => prev === 'maximized' ? 'default' : 'maximized')} className="w-3.5 h-3.5 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 shadow-sm transition-transform hover:scale-110 active:scale-95 border border-[#1AAB29] flex items-center justify-center group/btn">
                    <Maximize2 size={8} className="opacity-0 group-hover/btn:opacity-100 text-black/60" strokeWidth={3} />
                </button>
            </div>
            <div className="flex-1 text-center font-bold text-slate-800 dark:text-white/90 text-sm flex items-center justify-center gap-2 drop-shadow-sm">
                <Layers size={14} className="text-blue-600 dark:text-blue-400" />
                {t.title}
            </div>
            <div className="w-14"></div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar (Configuration) */}
            <div className="w-72 bg-white/40 dark:bg-black/20 border-r border-white/20 dark:border-white/5 p-5 flex flex-col gap-6 overflow-y-auto">
                
                {/* Vessel Select */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">{t.selectVessel}</label>
                    <div className="relative group">
                        <select 
                            value={selectedJobId} 
                            onChange={(e) => setSelectedJobId(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-600/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none shadow-sm truncate hover:bg-white/80 dark:hover:bg-slate-800/80"
                        >
                            <option value="">{t.selectVessel}...</option>
                            {jobs.map(j => (
                                <option key={j.id} value={j.id}>{j.vesselName}</option>
                            ))}
                        </select>
                        <Ship className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ArrowDownCircle size={14} className="text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* Cargo Type */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">{t.selectType}</label>
                    <div className="space-y-2">
                        <ModeButton mode="TRANSIT" icon={Container} label={t.typeTransit} />
                        <ModeButton mode="IMPORT" icon={ArrowDownCircle} label={t.typeImport} />
                        <ModeButton mode="FISCO" icon={Anchor} label={t.typeFisco} />
                        <ModeButton mode="THIRD_PARTY" icon={Box} label={t.typeThird} />
                    </div>
                </div>

                {/* Input Method - Toggle */}
                <div className="mt-auto">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block pl-1">{t.selectMethod}</label>
                    <div className="bg-slate-200/50 dark:bg-black/30 p-1 rounded-xl flex shadow-inner">
                        <button 
                            onClick={() => setInputMode('upload')}
                            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${inputMode === 'upload' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <Upload size={14} /> {t.fileUpload}
                        </button>
                        <button 
                            onClick={() => setInputMode('manual')}
                            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${inputMode === 'manual' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <Keyboard size={14} /> {t.manualInput}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content (Action Area) */}
            <div className="flex-1 bg-white/40 dark:bg-slate-800/40 p-8 relative">
                {inputMode === 'upload' ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300/50 dark:border-slate-600/50 rounded-3xl bg-slate-50/30 dark:bg-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors shadow-inner">
                        <FileUpload 
                            onFilesSelected={handleUploadSubmit} 
                            isProcessing={isProcessing} 
                            progressMessage={progressMessage} 
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2 pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                            <FileText size={18} className="text-blue-500" /> 
                            {t.basicInfo}
                        </h3>
                        
                        <div className="grid grid-cols-3 gap-5 mb-6">
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">{t.blNo}</label>
                                <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 font-bold transition-all placeholder-slate-400" value={manualForm.blNumber} onChange={e => setManualForm({...manualForm, blNumber: e.target.value})} autoFocus placeholder="Required" />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">{t.shipper}</label>
                                <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.shipper} onChange={e => setManualForm({...manualForm, shipper: e.target.value})} placeholder="Required" />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">{t.consignee}</label>
                                <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.consignee} onChange={e => setManualForm({...manualForm, consignee: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 mb-8">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">{t.loadingPort}</label>
                                <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.portOfLoading} onChange={e => setManualForm({...manualForm, portOfLoading: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">{t.dischargePort}</label>
                                <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.portOfDischarge} onChange={e => setManualForm({...manualForm, portOfDischarge: e.target.value})} />
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2 pb-2 border-b border-slate-200/50 dark:border-slate-700/50 mt-auto">
                            <Box size={18} className="text-emerald-500" /> 
                            {t.itemDetails}
                        </h3>

                        <div className="bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-600/50 shadow-sm">
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-6">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block ml-1">{t.desc}</label>
                                    <input type="text" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 font-medium transition-all" value={manualForm.items[0].description} onChange={e => handleItemChange('description', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block text-right pr-1">{t.qty}</label>
                                    <input type="number" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-right text-slate-800 dark:text-slate-100 font-mono transition-all" value={manualForm.items[0].quantity} onChange={e => handleItemChange('quantity', Number(e.target.value))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block text-right pr-1">{t.weight}</label>
                                    <input type="number" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-right text-slate-800 dark:text-slate-100 font-mono transition-all" value={manualForm.items[0].grossWeight} onChange={e => handleItemChange('grossWeight', Number(e.target.value))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block text-right pr-1">{t.cbm}</label>
                                    <input type="number" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-right text-slate-800 dark:text-slate-100 font-mono transition-all" value={manualForm.items[0].measurement} onChange={e => handleItemChange('measurement', Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="h-16 border-t border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 flex items-center justify-end px-6 gap-3 shrink-0 backdrop-blur-md">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors text-xs uppercase tracking-wide">
                {t.cancel}
            </button>
            {inputMode === 'manual' && (
                <button onClick={handleManualSubmit} className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/30 text-xs uppercase tracking-wide active:scale-95">
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
