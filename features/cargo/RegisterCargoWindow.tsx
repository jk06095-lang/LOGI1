
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Upload, Keyboard, Container, Anchor, Box, Ship, ArrowDownCircle, Check, FileText } from 'lucide-react';
import { VesselJob, BLData, CargoSourceType, Language, CargoItem, CargoClass, BaseWindowProps } from '../../types';
import { FileUpload } from '../../components/FileUpload';
import { WindowFrame } from '../../components/ui/WindowFrame';

interface RegisterCargoWindowProps extends BaseWindowProps {
    targetJobId?: string;
    jobs: VesselJob[];
    onUploadBLs: (files: File[], sourceType: CargoSourceType, cargoClass?: CargoClass, targetJobId?: string) => void;
    onCreateManualBL: (blData: BLData) => Promise<void>;
    isProcessing: boolean;
    progressMessage: string;
    language: Language;
}

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
        uploadTitle: 'B/L 문서 업로드',
        uploadDesc: '여러 개의 B/L 이미지를 스캔하여 자동으로 ERP 데이터를 생성합니다.',
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
        uploadTitle: 'Upload B/L Documents',
        uploadDesc: 'Scan multiple B/L images to automatically generate ERP data.',
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
        uploadTitle: '上传提单文档',
        uploadDesc: '扫描多个提单图像以自动生成 ERP 数据。',
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
        // ... add missing translations if needed
    }
};

type CargoMode = 'TRANSIT' | 'IMPORT' | 'FISCO' | 'THIRD_PARTY';

const ModeButton = ({ mode, icon: Icon, label, activeMode, setActiveMode }: { mode: string, icon: any, label: string, activeMode: string, setActiveMode: (m: CargoMode) => void }) => {
    const isActive = activeMode === mode;
    return (
        <button
            onClick={() => setActiveMode(mode as CargoMode)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden w-full ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                : 'bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}
        >
            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-transparent text-slate-500 dark:text-slate-400 group-hover:text-blue-500'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-sm font-bold flex-1 ${isActive ? 'text-white' : ''}`}>{label}</span>
            {isActive && <Check size={18} className="text-white animate-fade-in" strokeWidth={3} />}
        </button>
    );
};

export const RegisterCargoWindow: React.FC<RegisterCargoWindowProps> = ({
    isOpen, isMinimized, onClose, onMinimize, zIndex, onFocus, targetJobId, jobs, onUploadBLs, onCreateManualBL, isProcessing, progressMessage, language, triggerRect, id
}) => {
    const t = translations[language];

    // UI State
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

    return (
        <WindowFrame
            id={id}
            isOpen={isOpen}
            isMinimized={isMinimized}
            onClose={onClose}
            onMinimize={onMinimize}
            zIndex={zIndex}
            triggerRect={triggerRect}
            initialWidth={950}
            initialHeight={650}
            title={
                <div className="flex items-center gap-2 justify-center">
                    <Layers size={14} className="text-blue-500" />
                    {t.title}
                </div>
            }
            align="right"
        >
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar (Configuration) */}
                <div className="w-80 bg-white/50 dark:bg-black/20 border-r border-white/20 dark:border-white/5 p-6 flex flex-col gap-6 overflow-y-auto scrollbar-hide backdrop-blur-md">

                    {/* Vessel Select */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">{t.selectVessel}</label>
                        <div className="relative group">
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-600/50 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none shadow-sm truncate hover:bg-white/90 dark:hover:bg-slate-800/90 cursor-pointer"
                            >
                                <option value="">{t.selectVessel}...</option>
                                {jobs.map(j => (
                                    <option key={j.id} value={j.id}>{j.vesselName}</option>
                                ))}
                            </select>
                            <Ship className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none" size={18} />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ArrowDownCircle size={16} className="text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Cargo Type */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">{t.selectType}</label>
                        <div className="space-y-2.5">
                            <ModeButton mode="TRANSIT" icon={Container} label={t.typeTransit} activeMode={activeMode} setActiveMode={setActiveMode} />
                            <ModeButton mode="IMPORT" icon={ArrowDownCircle} label={t.typeImport} activeMode={activeMode} setActiveMode={setActiveMode} />
                            <ModeButton mode="FISCO" icon={Anchor} label={t.typeFisco} activeMode={activeMode} setActiveMode={setActiveMode} />
                            <ModeButton mode="THIRD_PARTY" icon={Box} label={t.typeThird} activeMode={activeMode} setActiveMode={setActiveMode} />
                        </div>
                    </div>

                    {/* Input Method - Toggle */}
                    <div className="mt-auto">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block pl-1">{t.selectMethod}</label>
                        <div className="bg-slate-200/50 dark:bg-white/10 p-1.5 rounded-2xl flex shadow-inner backdrop-blur-md">
                            <button
                                onClick={() => setInputMode('upload')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputMode === 'upload' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                <Upload size={14} /> {t.fileUpload}
                            </button>
                            <button
                                onClick={() => setInputMode('manual')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputMode === 'manual' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                <Keyboard size={14} /> {t.manualInput}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content (Action Area) */}
                <div className="flex-1 p-6 relative flex flex-col scrollbar-hide">
                    {inputMode === 'upload' ? (
                        <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">{t.uploadTitle}</h3>
                                <p className="text-slate-500 dark:text-slate-300 font-medium max-w-sm mx-auto leading-relaxed">{t.uploadDesc}</p>
                            </div>

                            <div className="flex-1 w-full max-w-3xl relative group min-h-[350px] mb-8">
                                <div className="absolute inset-0 border-2 border-dashed border-blue-300 dark:border-blue-700/50 rounded-3xl bg-blue-50/20 dark:bg-blue-900/10 transition-all duration-300 group-hover:bg-blue-100/40 dark:group-hover:bg-blue-800/20 group-hover:border-blue-500 group-hover:scale-[1.01] group-hover:shadow-xl pointer-events-none"></div>
                                <div className="w-full h-full relative z-10">
                                    <FileUpload
                                        onFilesSelected={handleUploadSubmit}
                                        isProcessing={isProcessing}
                                        progressMessage={progressMessage}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col animate-fade-in">

                            {/* Basic Info Card */}
                            <div className="bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-white/30 dark:border-white/5 shadow-sm mb-4">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide opacity-80">
                                    <FileText size={16} className="text-blue-500" />
                                    {t.basicInfo}
                                </h3>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">{t.blNo}</label>
                                        <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 font-bold transition-all placeholder-slate-400" value={manualForm.blNumber} onChange={e => setManualForm({ ...manualForm, blNumber: e.target.value })} autoFocus placeholder="Required" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">{t.shipper}</label>
                                        <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.shipper} onChange={e => setManualForm({ ...manualForm, shipper: e.target.value })} placeholder="Required" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">{t.consignee}</label>
                                        <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.consignee} onChange={e => setManualForm({ ...manualForm, consignee: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">{t.loadingPort}</label>
                                        <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.portOfLoading} onChange={e => setManualForm({ ...manualForm, portOfLoading: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">{t.dischargePort}</label>
                                        <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400" value={manualForm.portOfDischarge} onChange={e => setManualForm({ ...manualForm, portOfDischarge: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Item Details Card */}
                            <div className="bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-white/30 dark:border-white/5 shadow-sm flex-1">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide opacity-80">
                                    <Box size={16} className="text-emerald-500" />
                                    {t.itemDetails}
                                </h3>

                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-6">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">{t.desc}</label>
                                        <input type="text" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100 font-medium transition-all" value={manualForm.items[0].description} onChange={e => handleItemChange('description', e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-right pr-1">{t.qty}</label>
                                        <input type="number" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-right text-slate-800 dark:text-slate-100 font-mono transition-all" value={manualForm.items[0].quantity} onChange={e => handleItemChange('quantity', Number(e.target.value))} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-right pr-1">{t.weight}</label>
                                        <input type="number" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-right text-slate-800 dark:text-slate-100 font-mono transition-all" value={manualForm.items[0].grossWeight} onChange={e => handleItemChange('grossWeight', Number(e.target.value))} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-right pr-1">{t.cbm}</label>
                                        <input type="number" className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-600/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-right text-slate-800 dark:text-slate-100 font-mono transition-all" value={manualForm.items[0].measurement} onChange={e => handleItemChange('measurement', Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end shrink-0">
                                <button onClick={handleManualSubmit} className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/30 text-sm uppercase tracking-wide active:scale-95 flex items-center gap-2">
                                    <Check size={18} /> {t.save}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </WindowFrame>
    );
};