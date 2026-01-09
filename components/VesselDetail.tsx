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
}

const translations = {
  ko: {
    tabs: { cargo: '통합 화물 리스트', checklist: '체크리스트' },
    register: '화물 등록',
    back: '뒤로가기',
    registerTitle: '화물 신규 등록',
    fileUpload: '파일 업로드 (OCR)',
    manualInput: '직접 입력',
    shipper: '공급자 (Shipper) *',
    consignee: '수하인 (Consignee)',
    blNo: 'B/L 번호 / Order No *',
    loadingPort: '선적항 (POL)',
    dischargePort: '양하항 (POD)',
    desc: '품명 (Description) *',
    qty: '수량 *',
    weight: '중량 (KG)',
    cbm: '용적 (CBM)',
    save: '저장하기',
    cancel: '취소',
    voyage: '항차',
    eta: 'ETA',
    required: '필수 입력 항목(B/L No, Shipper, 품명, 수량)을 확인해주세요.',
    typeTransit: '환적 화물 (Transit)',
    typeFisco: 'LOGI1 공급',
    typeThird: '타사 공급 (3rd Party)',
    selectType: '화물 구분',
    selectMethod: '등록 방식',
    itemDetails: '화물 상세 정보',
    basicInfo: '기본 정보'
  },
  en: {
    tabs: { cargo: 'Cargo List', checklist: 'Checklist' },
    register: 'Register',
    back: 'Back',
    registerTitle: 'Register New Cargo',
    fileUpload: 'File Upload (OCR)',
    manualInput: 'Manual Entry',
    shipper: 'Shipper *',
    consignee: 'Consignee',
    blNo: 'B/L No / Order No *',
    loadingPort: 'Port of Loading',
    dischargePort: 'Port of Discharge',
    desc: 'Description *',
    qty: 'Quantity *',
    weight: 'Weight (KG)',
    cbm: 'Measurement (CBM)',
    save: 'Save',
    cancel: 'Cancel',
    voyage: 'VOY',
    eta: 'ETA',
    required: 'Check required fields (B/L No, Shipper, Desc, Qty).',
    typeTransit: 'Transit Cargo',
    typeFisco: 'LOGI1 Supply',
    typeThird: '3rd Party Supply',
    selectType: 'Cargo Type',
    selectMethod: 'Registration Method',
    itemDetails: 'Cargo Details',
    basicInfo: 'Basic Info'
  },
  cn: {
    tabs: { cargo: '货物清单', checklist: '检查表' },
    register: '登记',
    back: '返回',
    registerTitle: '新增货物登记',
    fileUpload: '文件上传 (OCR智能识别)',
    manualInput: '手工录入',
    shipper: '发货人 (Shipper) *',
    consignee: '收货人 (Consignee)',
    blNo: '提单号 (B/L No) *',
    loadingPort: '装货港 (POL)',
    dischargePort: '卸货港 (POD)',
    desc: '货物描述 *',
    qty: '数量 *',
    weight: '重量 (KG)',
    cbm: '体积 (CBM)',
    save: '确认保存',
    cancel: '取消',
    voyage: '航次',
    eta: '预计到达',
    required: '请检查必填项。',
    typeTransit: '中转货物',
    typeFisco: 'LOGI1 供应',
    typeThird: '第三方供应',
    selectType: '选择货物类型',
    selectMethod: '选择登记方式',
    itemDetails: '货物详情',
    basicInfo: '基本信息'
  }
};

export const VesselDetail: React.FC<VesselDetailProps> = ({ 
  job, bls, checklists, onClose, onUploadBLs, onCreateManualBL, onUpdateChecklist, onUpdateBL, isProcessing, progressMessage, initialTab, initialBLId, language = 'ko', lastUpdate, onOpenBLDetail
}) => {
  const [activeTab, setActiveTab] = useState<'cargo' | 'checklist'>(initialTab || 'cargo');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Registration State (Single Page)
  const [selectedSourceType, setSelectedSourceType] = useState<CargoSourceType>('TRANSIT');
  const [inputMode, setInputMode] = useState<'upload' | 'manual'>('upload');
  
  // Manual Entry State
  const [manualForm, setManualForm] = useState({
    blNumber: '',
    shipper: '',
    consignee: '',
    portOfLoading: '',
    portOfDischarge: '',
    // Initialize with one empty item
    items: [{ description: '', quantity: 0, packageType: 'PKGS', grossWeight: 0, measurement: 0 }] as CargoItem[]
  });
  
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

  const handleManualSubmit = async () => {
    // Basic validation
    if (!manualForm.blNumber || !manualForm.shipper) {
        alert(t.required);
        return;
    }
    
    // Check first item validity
    const firstItem = manualForm.items[0];
    if (!firstItem.description || !firstItem.quantity || firstItem.quantity <= 0) {
        alert(t.required);
        return;
    }

    const newBL: BLData = {
        id: Date.now().toString(),
        vesselJobId: job.id,
        fileName: 'Manual Entry',
        blNumber: manualForm.blNumber,
        shipper: manualForm.shipper,
        consignee: manualForm.consignee,
        notifyParty: '',
        vesselName: job.vesselName,
        voyageNo: job.voyageNo,
        portOfLoading: manualForm.portOfLoading,
        portOfDischarge: manualForm.portOfDischarge,
        date: new Date().toISOString().split('T')[0],
        cargoItems: manualForm.items,
        status: 'completed',
        uploadDate: new Date().toISOString(),
        sourceType: selectedSourceType
    };

    await onCreateManualBL(newBL);
    closeRegisterModal();
  };

  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    // Reset form but keep last used type/mode for convenience if desired, or reset all
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
          <button onClick={() => setShowRegisterModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30 active:scale-95">
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
                    onAddRequest={() => setShowRegisterModal(true)}
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

      {/* Simplified Single-Page Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/30">
                 <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers size={20} className="text-blue-600" />
                    {t.registerTitle}
                 </h2>
                 <button onClick={closeRegisterModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                 <div className="space-y-8">
                    
                    {/* Section 1: Type & Method */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.selectType}</label>
                          <div className="flex flex-col gap-2">
                             <button 
                                onClick={() => setSelectedSourceType('TRANSIT')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${selectedSourceType === 'TRANSIT' ? 'border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-300' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400'}`}
                             >
                                <Container size={20} className={selectedSourceType === 'TRANSIT' ? 'text-slate-900 dark:text-white' : 'text-slate-400'} />
                                <span className="font-bold text-sm">{t.typeTransit}</span>
                             </button>
                             <button 
                                onClick={() => setSelectedSourceType('FISCO')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${selectedSourceType === 'FISCO' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-300' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-600 dark:text-slate-400'}`}
                             >
                                <Anchor size={20} className={selectedSourceType === 'FISCO' ? 'text-blue-600' : 'text-slate-400'} />
                                <span className="font-bold text-sm">{t.typeFisco}</span>
                             </button>
                             <button 
                                onClick={() => setSelectedSourceType('THIRD_PARTY')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${selectedSourceType === 'THIRD_PARTY' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 shadow-sm ring-1 ring-amber-300' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 text-slate-600 dark:text-slate-400'}`}
                             >
                                <Box size={20} className={selectedSourceType === 'THIRD_PARTY' ? 'text-amber-600' : 'text-slate-400'} />
                                <span className="font-bold text-sm">{t.typeThird}</span>
                             </button>
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.selectMethod}</label>
                          <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-xl mb-4">
                             <button 
                               onClick={() => setInputMode('upload')}
                               className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'upload' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                             >
                                <Upload size={16} /> {t.fileUpload}
                             </button>
                             <button 
                               onClick={() => setInputMode('manual')}
                               className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'manual' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                             >
                                <Keyboard size={16} /> {t.manualInput}
                             </button>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                             <p className="text-xs text-slate-500 leading-relaxed">
                                {inputMode === 'upload' 
                                  ? 'Upload B/L, Invoice, or Packing List images. The system will automatically extract data using AI.'
                                  : 'Manually enter shipment details if you do not have a digital file or OCR is not required.'}
                             </p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="border-t border-slate-100 dark:border-slate-700"></div>

                    {/* Section 2: Input Area */}
                    <div className="min-h-[300px]">
                       {inputMode === 'upload' ? (
                          <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                             <FileUpload onFilesSelected={(files) => { onUploadBLs(files, selectedSourceType); closeRegisterModal(); }} isProcessing={isProcessing} progressMessage={progressMessage} />
                          </div>
                       ) : (
                          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-blue-500" /> {t.basicInfo}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.blNo}</label>
                                    <input type="text" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={manualForm.blNumber} onChange={e => setManualForm({...manualForm, blNumber: e.target.value})} placeholder="e.g. BL-12345" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.shipper}</label>
                                    <input type="text" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={manualForm.shipper} onChange={e => setManualForm({...manualForm, shipper: e.target.value})} placeholder="e.g. ABC Logistics" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.consignee}</label>
                                    <input type="text" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={manualForm.consignee} onChange={e => setManualForm({...manualForm, consignee: e.target.value})} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">{t.loadingPort}</label>
                                        <input type="text" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm" value={manualForm.portOfLoading} onChange={e => setManualForm({...manualForm, portOfLoading: e.target.value})} />
                                     </div>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">{t.dischargePort}</label>
                                        <input type="text" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm" value={manualForm.portOfDischarge} onChange={e => setManualForm({...manualForm, portOfDischarge: e.target.value})} />
                                     </div>
                                  </div>
                              </div>

                              <div className="border-t border-slate-100 dark:border-slate-700 my-4"></div>

                              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Package size={16} className="text-blue-500" /> {t.itemDetails}
                              </h3>
                              <div className="grid grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                  <div className="col-span-6">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.desc}</label>
                                    <input type="text" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm" value={manualForm.items[0].description} onChange={e => handleItemChange('description', e.target.value)} placeholder="Item Name" />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.qty}</label>
                                    <input type="number" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm text-right" value={manualForm.items[0].quantity} onChange={e => handleItemChange('quantity', Number(e.target.value))} />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.weight}</label>
                                    <input type="number" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm text-right" value={manualForm.items[0].grossWeight} onChange={e => handleItemChange('grossWeight', Number(e.target.value))} />
                                  </div>
                                   <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.cbm}</label>
                                    <input type="number" step="0.001" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg text-sm text-right" value={manualForm.items[0].measurement || 0} onChange={e => handleItemChange('measurement', Number(e.target.value))} />
                                  </div>
                              </div>
                          </div>
                       )}
                    </div>

                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
                  <button onClick={closeRegisterModal} className="px-6 py-3 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                     {t.cancel}
                  </button>
                  {inputMode === 'manual' && (
                    <button onClick={handleManualSubmit} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 active:scale-95">
                        {t.save}
                    </button>
                  )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};