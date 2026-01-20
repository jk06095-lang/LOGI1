
import React, { useState, useEffect, useRef } from 'react';
import { BLData, Language, DocumentScanType, BLChecklist, CargoItem, BackgroundTask, ImportSubClass, VesselJob, Attachment } from '../types';
import { Save, Upload, FileText, ExternalLink, X, Trash2, Plus, BrainCircuit, Box, DollarSign, Loader2, Copy, Ship, Truck, CheckCircle2, CircleDashed, ArrowRight, MessageSquare, ChevronDown, Pencil, Check, FolderPlus } from 'lucide-react';
import { parseDocument } from '../services/geminiService';
import { uploadFileToStorage } from '../services/storageService';
import { dataService } from '../services/dataService';
import { CloudFileManager } from './CloudFileManager';

interface ShipmentDetailProps {
  bl: BLData;
  jobs?: VesselJob[];
  language: Language;
  onUpdateBL: (blId: string, updates: Partial<BLData>) => Promise<void>;
  onClose: () => void;
  onNavigateToChecklist: () => void;
  checklist?: BLChecklist;
  onDelete?: (blId: string) => void;
  onAddTask: (task: BackgroundTask) => void;
  onUpdateTask: (id: string, updates: Partial<BackgroundTask>) => void;
}

const translations = {
  ko: {
    title: '화물 상세 정보',
    save: '저장하기',
    saved: '저장되었습니다.',
    error: '오류가 발생했습니다.',
    upload: '업로드',
    notUploaded: '파일 없음',
    uploaded: '업로드됨',
    blNo: 'B/L No.',
    houseMaster: '구분',
    master: 'MASTER',
    house: 'HOUSE',
    shipper: '송하인',
    consignee: '수하인',
    notify: '통지처',
    vessel: '선박명',
    carrier: '선사',
    pol: '선적항',
    pod: '양하항',
    eta: '입항일',
    voyage: '항차',
    invAmount: '인보이스 금액',
    currency: '통화',
    totalPkgs: '총 포장단위',
    totalWeight: '총 중량',
    totalCbm: '총 용적',
    hsCode: '세번부호',
    remarks: '비고',
    items: '화물 상세',
    desc: '품명',
    qty: '수량',
    pkg: '단위',
    weight: '중량',
    cbm: '용적',
    cntrNo: '컨테이너 번호',
    cntrType: '타입',
    addItem: '항목 추가',
    runOCR: 'AI 분석',
    deleteFile: '삭제',
    anInfo: 'A/N 정보',
    location: '보세창고',
    copyRow: '행 복사',
    copySpec: '내용복사',
    copied: '복사됨',
    deleteConfirm: '문서를 삭제하시겠습니까?',
    logistics: '화물 정보',
    koreanForwarder: '포워더',
    transporter: '운송사',
    storageLoc: '장치장',
    storagePeriod: '보관기간',
    documents: '첨부 문서',
    arrivalNotice: '화물도착통지서',
    manifest: '적하목록',
    exportDec: '수출신고필증',
    category: '화물 분류',
    importSub: {
        general: '일반수입',
        return: '반송수출',
        shipStore: '선용품'
    },
    selectCategory: '(선택)',
    catBait: '베이트',
    catGear: '어구',
    catNets: '그물',
    catPort: '항통장비',
    catGen: '기타',
    progressTitle: '업무 진행률',
    checklistView: '체크리스트 보기',
    progressStages: {
        A: '수신',
        B: '전달',
        C: '대행',
        D: '운송',
        E: '선적'
    },
    vesselIndicator: '소속 선박',
    noVessel: '-',
    assignVessel: '선박을 지정해주세요',
    class: '화물 구분',
    changeVessel: '선박 변경',
    directInput: '직접 입력',
    cargoTypeLabel: '화물 타입',
    placeholders: {
      company: '회사명 입력',
      vessel: '선박명 입력',
      warehouse: '창고명 입력',
      date: 'YYYY-MM-DD',
      cntr: 'CNTR...',
      type: '20GP'
    }
  },
  en: {
    title: 'Shipment Detail',
    save: 'Save Changes',
    saved: 'Saved successfully.',
    error: 'Error occurred.',
    upload: 'Upload',
    notUploaded: 'No File',
    uploaded: 'Uploaded',
    blNo: 'B/L No.',
    houseMaster: 'Type',
    master: 'MASTER',
    house: 'HOUSE',
    shipper: 'Shipper',
    consignee: 'Consignee',
    notify: 'Notify Party',
    vessel: 'Vessel',
    carrier: 'Carrier',
    pol: 'Port of Loading',
    pod: 'Port of Discharge',
    eta: 'ETA',
    voyage: 'Voyage No',
    invAmount: 'Invoice Amt',
    currency: 'Currency',
    totalPkgs: 'Total Pkgs',
    totalWeight: 'Total Weight',
    totalCbm: 'Total CBM',
    hsCode: 'HS Code',
    remarks: 'Remarks',
    items: 'Cargo Details',
    desc: 'Description',
    qty: 'Qty',
    pkg: 'Unit',
    weight: 'G.Weight',
    cbm: 'CBM',
    cntrNo: 'Container No',
    cntrType: 'Type',
    addItem: 'Add Item',
    runOCR: 'AI Analyze',
    deleteFile: 'Delete',
    anInfo: 'A/N Info',
    location: 'Location',
    copyRow: 'Copy Row',
    copySpec: 'Copy Content',
    copied: 'Copied',
    deleteConfirm: 'Delete this document?',
    logistics: 'Cargo Info',
    koreanForwarder: 'Forwarder',
    transporter: 'Transporter',
    storageLoc: 'Storage / Warehouse',
    storagePeriod: 'Storage Period',
    documents: 'Attached Documents',
    arrivalNotice: 'Arrival Notice',
    manifest: 'Manifest',
    exportDec: 'Export Dec',
    category: 'Category',
    importSub: {
        general: 'General',
        return: 'Re-Export',
        shipStore: 'Ship Store'
    },
    selectCategory: '(Select)',
    catBait: 'BAIT',
    catGear: 'GEAR',
    catNets: 'NETS',
    catPort: 'EQUIP',
    catGen: 'GEN',
    progressTitle: 'Work Progress',
    checklistView: 'View Checklist',
    progressStages: {
        A: 'Receiving',
        B: 'Forwarding',
        C: 'Agency',
        D: 'Transport',
        E: 'Loading'
    },
    vesselIndicator: 'Assigned Vessel Job',
    noVessel: '-',
    assignVessel: 'Please assign vessel',
    class: 'Classification',
    changeVessel: 'Change Vessel',
    directInput: 'Direct Input',
    cargoTypeLabel: 'Cargo Type',
    placeholders: {
      company: 'Company Name',
      vessel: 'Vessel Name',
      warehouse: 'Warehouse Name',
      date: 'YYYY-MM-DD',
      cntr: 'CNTR...',
      type: '20GP'
    }
  },
  cn: {
    title: '货物详情',
    save: '保存',
    saved: '已保存',
    error: '错误',
    upload: '上传',
    notUploaded: '未上传',
    uploaded: '已上传',
    blNo: '提单号',
    houseMaster: '类型',
    master: '主单',
    house: '分单',
    shipper: '发货人',
    consignee: '收货人',
    notify: '通知人',
    vessel: '船名',
    carrier: '承运人',
    pol: '装货港',
    pod: '卸货港',
    eta: '抵港日',
    voyage: '航次',
    invAmount: '金额',
    currency: '币种',
    totalPkgs: '总件数',
    totalWeight: '总重量',
    totalCbm: '总体积',
    hsCode: 'HS编码',
    remarks: '备注',
    items: '货物详情',
    desc: '品名',
    qty: '数量',
    pkg: '单位',
    weight: '重量',
    cbm: '体积',
    cntrNo: '箱号',
    cntrType: '箱型',
    addItem: '添加项目',
    runOCR: '识别',
    deleteFile: '删除',
    anInfo: '到货通知',
    location: '存放地',
    copyRow: '复制',
    copySpec: '复制内容',
    copied: '已复制',
    deleteConfirm: '删除文档?',
    logistics: '货物信息',
    koreanForwarder: '货代',
    transporter: '运输公司',
    storageLoc: '仓库/地点',
    storagePeriod: '保管期间',
    documents: '单证文件',
    arrivalNotice: '到货通知书',
    manifest: '舱单',
    exportDec: '出口报关单',
    category: '货物分类',
    importSub: {
        general: '一般',
        return: '退运',
        shipStore: '船用品'
    },
    selectCategory: '(请选择)',
    catBait: '诱饵',
    catGear: '渔具',
    catNets: '渔网',
    catPort: '港口设备',
    catGen: '一般',
    progressTitle: '作业进度',
    checklistView: '查看检查表',
    progressStages: {
        A: '接收',
        B: '转交',
        C: '代理',
        D: '运输',
        E: '装船'
    },
    vesselIndicator: '所属船舶任务',
    noVessel: '-',
    assignVessel: '请分配船舶',
    class: '货物分类',
    changeVessel: '变更船舶',
    directInput: '直接输入',
    cargoTypeLabel: '货物类型',
    placeholders: {
      company: '公司名称',
      vessel: '船名',
      warehouse: '仓库名称',
      date: 'YYYY-MM-DD',
      cntr: 'CNTR...',
      type: '20GP'
    }
  }
};

const HS_CODE_DEFAULTS: Record<string, string> = {
    'BAIT': '0303.99.0000',
    'NETS': '5608.11.0000',
    'FISHING_GEAR': '9507.90.0000',
    'PORT_EQUIPMENT': '8426.11.0000',
    'GENERAL': ''
};

// Updated DetailInput with Copy Functionality
const DetailInput = ({ label, value, onChange, className = "", placeholder = "", asTextarea = false, enableCopy = false }: any) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (value) {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={`flex flex-col h-full ${className} relative group`}>
            <div className="flex justify-between items-center mb-1.5 min-h-[16px]">
                {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
                {enableCopy && value && (
                    <button 
                        onClick={handleCopy}
                        className={`transition-all duration-200 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-blue-500'}`}
                        title="Copy to clipboard"
                        type="button"
                    >
                        {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                    </button>
                )}
            </div>
            {asTextarea ? (
                <textarea
                    className="w-full flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-sm px-3 py-2 text-sm resize-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono leading-relaxed" 
                    value={value || ''} 
                    onChange={onChange}
                    placeholder={placeholder}
                />
            ) : (
                <input 
                    type="text" 
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-sm px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium" 
                    value={value || ''} 
                    onChange={onChange} 
                    placeholder={placeholder} 
                />
            )}
        </div>
    );
};

const DocSlot = ({ 
    title, 
    type, 
    fileUrl, 
    isUploading, 
    onRunOCR, 
    onRemove, 
    onUpload 
}: { 
    title: string, 
    type: DocumentScanType, 
    fileUrl?: string, 
    isUploading: boolean,
    onRunOCR: (type: DocumentScanType, url: string) => void,
    onRemove: (type: DocumentScanType) => void,
    onUpload: (type: DocumentScanType, file: File) => void
}) => (
  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded hover:border-blue-400 transition-colors h-10">
     <div className="flex items-center gap-2 overflow-hidden">
        <FileText size={14} className={fileUrl ? "text-emerald-500" : "text-slate-300"} />
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={title}>{title}</span>
     </div>
     <div className="flex items-center gap-0.5">
        {fileUrl ? (
           <>
               <button onClick={() => window.open(fileUrl, '_blank')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-blue-600" title="Open"><ExternalLink size={12} /></button>
               <button onClick={() => onRunOCR(type, fileUrl)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-indigo-600" title="AI Scan"><BrainCircuit size={12} /></button>
               <button onClick={() => onRemove(type)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-red-500" title="Delete"><Trash2 size={12} /></button>
           </>
        ) : (
           <label className="cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-500 hover:text-blue-600">
               {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
               <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => e.target.files?.[0] && onUpload(type, e.target.files[0])} />
           </label>
        )}
     </div>
  </div>
);

export const ShipmentDetail: React.FC<ShipmentDetailProps> = ({ bl, jobs, language, onUpdateBL, onClose, onNavigateToChecklist, checklist, onDelete, onAddTask, onUpdateTask }) => {
  const [formData, setFormData] = useState<BLData>(bl);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<DocumentScanType | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isManualCategory, setIsManualCategory] = useState(false);
  const [headerCopied, setHeaderCopied] = useState(false);
  
  // Cloud File Manager State
  const [isCloudManagerOpen, setIsCloudManagerOpen] = useState(false);

  // Category Dropdown State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const t = translations[language] || translations.ko;

  // Resolve Assigned Job Name
  const assignedJob = jobs?.find(j => j.id === formData.vesselJobId);

  // Calculate attached file count for badge
  const attachmentCount = formData.attachments?.length || 0;

  useEffect(() => { setFormData(bl); }, [bl]);

  useEffect(() => {
     const unsub = dataService.subscribeCategories(setCategories);
     return () => unsub();
  }, []);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
            setIsCategoryDropdownOpen(false);
            setEditingCategory(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (field: keyof BLData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNestedChange = (parent: 'commercialInvoice' | 'packingList' | 'exportDeclaration' | 'arrivalNotice', field: string, value: any) => {
    setFormData(prev => {
        const currentParent = prev[parent] || {};
        return { ...prev, [parent]: { ...currentParent, [field]: value } };
    });
  };

  const handleCategorySelect = (category: string) => {
      handleInputChange('cargoCategory', category);
      
      const currentHS = formData.exportDeclaration?.hsCode;
      const suggestedHS = HS_CODE_DEFAULTS[category];
      
      if (suggestedHS && (!currentHS || Object.values(HS_CODE_DEFAULTS).includes(currentHS))) {
          handleNestedChange('exportDeclaration', 'hsCode', suggestedHS);
      }
      setIsCategoryDropdownOpen(false);
  };

  const handleItemChange = (index: number, field: keyof CargoItem, value: any) => {
    const newItems = [...formData.cargoItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, cargoItems: newItems });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      cargoItems: [...formData.cargoItems, { description: '', quantity: 0, packageType: 'PKGS', grossWeight: 0, measurement: 0, containerNo: '', containerType: '' }]
    });
  };

  const removeItemRow = (index: number) => {
    const newItems = formData.cargoItems.filter((_, i) => i !== index);
    setFormData({ ...formData, cargoItems: newItems });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
        // Auto-save new category if valid and not in list
        if (formData.cargoCategory && 
            formData.cargoCategory.trim() !== '' && 
            !categories.includes(formData.cargoCategory)) {
             await dataService.addCategory(formData.cargoCategory);
        }

        await onUpdateBL(bl.id, formData);
        alert(t.saved);
    } catch(e) {
        alert(t.error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(t.deleteConfirm)) {
        if (onDelete) onDelete(bl.id);
        onClose();
    }
  };

  const handleFileUpload = async (type: DocumentScanType, file: File) => {
    setUploadingDoc(type);
    const taskId = `upload-${Date.now()}`;
    onAddTask({ id: taskId, title: `Upload: ${file.name}`, status: 'processing', progress: 0, message: 'Uploading...' });

    try {
        const url = await uploadFileToStorage(file);
        onUpdateTask(taskId, { progress: 80 });

        const updates: Partial<BLData> = {};
        const newFormData = { ...formData }; 

        if (type === 'BL') { updates.fileUrl = url; newFormData.fileUrl = url; }
        else if (type === 'CI') { updates.commercialInvoice = { ...formData.commercialInvoice, fileUrl: url, currency: 'USD', totalAmount: 0 }; newFormData.commercialInvoice = updates.commercialInvoice; }
        else if (type === 'PL') { updates.packingList = { ...formData.packingList, fileUrl: url, totalPackageCount: 0, totalCbm: 0, totalGrossWeight: 0 }; newFormData.packingList = updates.packingList; }
        else if (type === 'EXPORT_DEC') { updates.exportDeclaration = { ...formData.exportDeclaration, fileUrl: url, declarationNo: '', hsCode: '' }; newFormData.exportDeclaration = updates.exportDeclaration; }
        else if (type === 'MANIFEST') { updates.manifest = { fileUrl: url }; newFormData.manifest = updates.manifest; }
        else if (type === 'AN') { updates.arrivalNotice = { ...formData.arrivalNotice, fileUrl: url }; newFormData.arrivalNotice = updates.arrivalNotice; }

        setFormData(newFormData);
        await onUpdateBL(bl.id, updates);
        onUpdateTask(taskId, { status: 'success', progress: 100, message: 'Done' });
    } catch(e: any) {
        onUpdateTask(taskId, { status: 'error', message: 'Failed' });
    } finally {
        setUploadingDoc(null);
    }
  };

  // --- Cloud File Manager Handlers ---

  const handleGenericUpload = async (files: File[]) => {
      const taskId = `cloud-upload-${Date.now()}`;
      onAddTask({ id: taskId, title: `Uploading ${files.length} files...`, status: 'processing', progress: 0, message: 'Starting...' });
      
      const newAttachments: Attachment[] = [...(formData.attachments || [])];
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
              const url = await uploadFileToStorage(file);
              newAttachments.push({
                  id: Date.now().toString() + i,
                  name: file.name,
                  url: url,
                  type: file.type,
                  size: file.size,
                  uploadDate: new Date().toISOString()
              });
              successCount++;
              onUpdateTask(taskId, { progress: Math.round(((i + 1) / files.length) * 100) });
          } catch (e) {
              console.error(e);
          }
      }

      if (successCount > 0) {
          const updates = { attachments: newAttachments };
          setFormData(prev => ({ ...prev, attachments: newAttachments }));
          await onUpdateBL(bl.id, updates);
          onUpdateTask(taskId, { status: 'success', message: 'Files uploaded' });
      } else {
          onUpdateTask(taskId, { status: 'error', message: 'Upload failed' });
      }
  };

  const handleAttachmentDelete = async (attachmentId: string) => {
      if(!window.confirm("Delete this file?")) return;
      
      const newAttachments = (formData.attachments || []).filter(a => a.id !== attachmentId);
      const updates = { attachments: newAttachments };
      
      setFormData(prev => ({ ...prev, attachments: newAttachments }));
      await onUpdateBL(bl.id, updates);
  };

  const handleAttachmentRename = async (attachmentId: string, newName: string) => {
      const newAttachments = (formData.attachments || []).map(a => {
          if (a.id === attachmentId) return { ...a, name: newName };
          return a;
      });
      const updates = { attachments: newAttachments };
      
      setFormData(prev => ({ ...prev, attachments: newAttachments }));
      await onUpdateBL(bl.id, updates);
  };

  const handleRunOCR = async (type: DocumentScanType, url: string) => {
      const taskId = `ocr-${Date.now()}`;
      onAddTask({ id: taskId, title: `Analyzing ${type}...`, status: 'processing', progress: 10, message: 'Starting AI...' });

      try {
          const response = await fetch(url);
          const blob = await response.blob();
          const file = new File([blob], "temp", { type: blob.type });

          const ocrResult = await parseDocument(file, type);
          onUpdateTask(taskId, { progress: 80, message: 'Applying Data...' });

          const updates: Partial<BLData> = {};
          const newFormData = { ...formData };

          if (type === 'CI') {
             updates.commercialInvoice = { ...formData.commercialInvoice!, currency: ocrResult.currency || 'USD', totalAmount: ocrResult.totalAmount || 0 };
             newFormData.commercialInvoice = { ...newFormData.commercialInvoice, ...updates.commercialInvoice };
          } else if (type === 'PL') {
              updates.packingList = { ...formData.packingList!, totalPackageCount: ocrResult.totalPackageCount || 0, totalCbm: ocrResult.totalCbm || 0, totalGrossWeight: ocrResult.totalGrossWeight || 0 };
              newFormData.packingList = { ...newFormData.packingList, ...updates.packingList };
          } else if (type === 'AN') {
              updates.arrivalNotice = { ...formData.arrivalNotice!, eta: ocrResult.anEta, location: ocrResult.anLocation, freightCost: ocrResult.anFreightCost, otherCosts: ocrResult.anOtherCosts };
              newFormData.arrivalNotice = { ...newFormData.arrivalNotice, ...updates.arrivalNotice };
          } else if (type === 'BL') {
             if (ocrResult.shipper) { updates.shipper = ocrResult.shipper; newFormData.shipper = ocrResult.shipper; }
             if (ocrResult.blNumber) { updates.blNumber = ocrResult.blNumber; newFormData.blNumber = ocrResult.blNumber; }
             if (ocrResult.vesselName) { updates.vesselName = ocrResult.vesselName; newFormData.vesselName = ocrResult.vesselName; }
             if (ocrResult.voyageNo) { updates.voyageNo = ocrResult.voyageNo; newFormData.voyageNo = ocrResult.voyageNo; }
             if (ocrResult.portOfLoading) { updates.portOfLoading = ocrResult.portOfLoading; newFormData.portOfLoading = ocrResult.portOfLoading; }
             if (ocrResult.cargoCategory) { updates.cargoCategory = ocrResult.cargoCategory; newFormData.cargoCategory = ocrResult.cargoCategory; }
             if (ocrResult.cargoType) { updates.cargoType = ocrResult.cargoType; newFormData.cargoType = ocrResult.cargoType; }
             if (ocrResult.consignee) { updates.consignee = ocrResult.consignee; newFormData.consignee = ocrResult.consignee; }
             if (ocrResult.notifyParty) { updates.notifyParty = ocrResult.notifyParty; newFormData.notifyParty = ocrResult.notifyParty; }
             if (ocrResult.cargoItems && ocrResult.cargoItems.length > 0) { updates.cargoItems = ocrResult.cargoItems; newFormData.cargoItems = ocrResult.cargoItems; }
          }

          setFormData(newFormData);
          await onUpdateBL(bl.id, updates);
          onUpdateTask(taskId, { status: 'success', progress: 100, message: 'Complete' });
      } catch (e) {
          console.error(e);
          onUpdateTask(taskId, { status: 'error', message: 'Failed' });
      }
  };

  const handleFileRemove = async (type: DocumentScanType) => {
    if (!window.confirm(t.deleteFile + '?')) return;
    const updates: Partial<BLData> = {};
    const newFormData = { ...formData };

    if (type === 'BL') { updates.fileUrl = ''; newFormData.fileUrl = ''; }
    else if (type === 'CI') { updates.commercialInvoice = { ...formData.commercialInvoice!, fileUrl: '' }; newFormData.commercialInvoice!.fileUrl = ''; }
    else if (type === 'PL') { updates.packingList = { ...formData.packingList!, fileUrl: '' }; newFormData.packingList!.fileUrl = ''; }
    else if (type === 'AN') { updates.arrivalNotice = { ...formData.arrivalNotice!, fileUrl: '' }; newFormData.arrivalNotice!.fileUrl = ''; }
    else if (type === 'EXPORT_DEC') { updates.exportDeclaration = { ...formData.exportDeclaration!, fileUrl: '' }; newFormData.exportDeclaration!.fileUrl = ''; }
    else if (type === 'MANIFEST') { updates.manifest = { ...formData.manifest!, fileUrl: '' }; newFormData.manifest!.fileUrl = ''; }

    setFormData(newFormData);
    await onUpdateBL(bl.id, updates);
  };

  const copyContainerSpec = (item: CargoItem) => {
      const parts = [
          item.containerNo || '',
          item.containerType || '',
          item.description || '',
          item.quantity || '',
          item.packageType || '',
          item.grossWeight || '',
          item.measurement || ''
      ];
      const text = parts.join('\t');
      navigator.clipboard.writeText(text);
  };

  const handleImportSubChange = (val: ImportSubClass) => {
      handleInputChange('importSubClass', val);
  };

  const handleHeaderCopy = () => {
    if (formData.blNumber) {
        navigator.clipboard.writeText(formData.blNumber);
        setHeaderCopied(true);
        setTimeout(() => setHeaderCopied(false), 2000);
    }
  };
  
  // Custom Dropdown Handlers
  const deleteCategory = async (e: React.MouseEvent, cat: string) => {
      e.stopPropagation();
      if(window.confirm(`Delete category '${cat}'?`)) {
          await dataService.deleteCategory(cat);
          if (formData.cargoCategory === cat) handleInputChange('cargoCategory', '');
      }
  }

  const startEditCategory = (e: React.MouseEvent, cat: string) => {
      e.stopPropagation();
      setEditingCategory(cat);
      setNewCategoryName(cat);
  }

  const saveEditCategory = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (editingCategory && newCategoryName.trim()) {
          await dataService.updateCategory(editingCategory, newCategoryName.trim());
          if (formData.cargoCategory === editingCategory) handleInputChange('cargoCategory', newCategoryName.trim());
          setEditingCategory(null);
      }
  }

  const getCategoryLabel = (cat: string) => {
      switch(cat) {
          case 'BAIT': return t.catBait || 'BAIT'; 
          case 'FISHING_GEAR': return t.catGear || 'GEAR';
          case 'NETS': return t.catNets || 'NETS';
          case 'PORT_EQUIPMENT': return t.catPort || 'EQUIP';
          case 'GENERAL': return t.catGen || 'GENERAL';
          default: return cat;
      }
  };

  // Progress Calculation
  const progressStats = React.useMemo(() => {
    if (!checklist) return { total: 0, checked: 0, percent: 0, sectionStats: [] };
    
    const sections = ['sectionA', 'sectionB', 'sectionC', 'sectionD', 'sectionE'] as const;
    const sectionStats = sections.map(key => {
        const items = checklist[key] || [];
        const labelKey = key.replace('section', '') as 'A' | 'B' | 'C' | 'D' | 'E';
        return {
            label: t.progressStages[labelKey],
            total: items.length,
            checked: items.filter(i => i.checked).length
        };
    });

    const total = sectionStats.reduce((acc, curr) => acc + curr.total, 0);
    const checked = sectionStats.reduce((acc, curr) => acc + curr.checked, 0);
    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

    return { total, checked, percent, sectionStats };
  }, [checklist, language]);

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
       
       <CloudFileManager 
          isOpen={isCloudManagerOpen} 
          onClose={() => setIsCloudManagerOpen(false)}
          attachments={formData.attachments || []}
          onUpload={handleGenericUpload}
          onDelete={handleAttachmentDelete}
          onRename={handleAttachmentRename}
       />

       {/* Top Bar with B/L No and Classification */}
       <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-6">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30"><Box size={24} /></div>
              <div>
                  <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.blNo}</span>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                         {formData.blNumber || 'New Entry'}
                      </h2>
                      
                      {/* Vessel Indicator Box (Assigned Job Name) */}
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-3 py-1 rounded-lg ml-2">
                        <Ship size={14} className="text-blue-500" />
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-blue-800 dark:text-blue-200 leading-none mt-0.5 max-w-[150px] truncate">
                                {assignedJob ? assignedJob.vesselName : (formData.vesselName || t.noVessel)}
                            </span>
                        </div>
                      </div>

                      <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 ml-2">
                         <button 
                            onClick={() => handleInputChange('blType', 'MASTER')} 
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${formData.blType === 'MASTER' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-400'} `}
                         >
                            {t.master}
                         </button>
                         <button 
                            onClick={() => handleInputChange('blType', 'HOUSE')} 
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${formData.blType === 'HOUSE' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-400'} `}
                         >
                            {t.house}
                         </button>
                      </div>

                      {/* Source Type Selector */}
                       <div className="ml-2">
                         <select
                            value={formData.sourceType || 'TRANSIT'}
                            onChange={(e) => handleInputChange('sourceType', e.target.value)}
                            className="bg-slate-100 dark:bg-slate-700 border-none text-[11px] font-bold rounded-md py-1 pl-2 pr-6 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                         >
                           <option value="TRANSIT">환적 (Transit)</option>
                           <option value="FISCO">피스코마린 (FISCO MARINE)</option>
                           <option value="THIRD_PARTY">타사 (3rd Party)</option>
                         </select>
                       </div>
                       
                       {/* UNIPASS Button */}
                       <a
                          href="https://unipass.customs.go.kr/csp/index.do"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-bold transition-colors border border-indigo-200 dark:border-indigo-800"
                          title="관세청 유니패스 (Korea Customs Service)"
                       >
                          <ExternalLink size={12} />
                          UNIPASS
                       </a>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={saveChanges} disabled={isSaving} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                 {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} {t.save}
              </button>
              <button onClick={handleDelete} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"><Trash2 size={16} /></button>
              <button onClick={onClose} className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 transition-colors"><X size={16} /></button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: Main Form - Span 9 */}
              <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
                   
                   {/* B/L Document Form Card */}
                   <div className="bg-white dark:bg-slate-800 rounded-sm shadow-sm border border-slate-300 dark:border-slate-600">
                        <div className="grid grid-cols-12 divide-x divide-y divide-slate-300 dark:divide-slate-600">
                            
                            {/* Top Left: Shipper, Consignee, Notify (Stacked) */}
                            <div className="col-span-12 md:col-span-6 flex flex-col">
                                <div className="p-4 border-b border-slate-300 dark:border-slate-600 h-36">
                                    <DetailInput label={t.shipper} value={formData.shipper} onChange={(e: any) => handleInputChange('shipper', e.target.value)} asTextarea />
                                </div>
                                <div className="p-4 border-b border-slate-300 dark:border-slate-600 h-36">
                                    <DetailInput label={t.consignee} value={formData.consignee} onChange={(e: any) => handleInputChange('consignee', e.target.value)} asTextarea />
                                </div>
                                <div className="p-4 h-36">
                                    <DetailInput label={t.notify} value={formData.notifyParty} onChange={(e: any) => handleInputChange('notifyParty', e.target.value)} asTextarea />
                                </div>
                            </div>

                            {/* Top Right: Carrier, Voyage, Ports */}
                            <div className="col-span-12 md:col-span-6 flex flex-col">
                                <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                                     <div className="p-4">
                                         <DetailInput label={t.blNo} value={formData.blNumber} onChange={(e: any) => handleInputChange('blNumber', e.target.value)} enableCopy />
                                     </div>
                                     <div className="p-4">
                                        <DetailInput label={t.voyage} value={formData.voyageNo} onChange={(e: any) => handleInputChange('voyageNo', e.target.value)} />
                                     </div>
                                </div>
                                <div className="p-4 border-b border-slate-300 dark:border-slate-600">
                                     <div className="grid grid-cols-2 gap-4">
                                        <DetailInput label={t.carrier} value={formData.carrierCompany} onChange={(e: any) => handleInputChange('carrierCompany', e.target.value)} placeholder={t.placeholders.company} />
                                        <div className="opacity-70">
                                            <DetailInput label={t.vessel} value={formData.vesselName} onChange={(e: any) => handleInputChange('vesselName', e.target.value)} placeholder={t.placeholders.vessel} />
                                        </div>
                                     </div>
                                </div>
                                <div className="p-4 border-b border-slate-300 dark:border-slate-600">
                                     <DetailInput label={t.pol} value={formData.portOfLoading} onChange={(e: any) => handleInputChange('portOfLoading', e.target.value)} />
                                </div>
                                <div className="p-4 border-b border-slate-300 dark:border-slate-600">
                                     <DetailInput label={t.pod} value={formData.portOfDischarge} onChange={(e: any) => handleInputChange('portOfDischarge', e.target.value)} />
                                </div>
                                <div className="p-4 flex-1 bg-slate-50 dark:bg-slate-700/30">
                                    <div className="grid grid-cols-2 gap-6 h-full">
                                        <div className="flex flex-col gap-3">
                                            <DetailInput label={t.eta} value={formData.date} onChange={(e: any) => handleInputChange('date', e.target.value)} placeholder={t.placeholders.date} />
                                            <div>
                                                 <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide block">{t.cargoTypeLabel}</label>
                                                 <select
                                                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm rounded-sm px-3 py-2 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 font-bold"
                                                    value={formData.cargoType || ''}
                                                    onChange={(e) => handleInputChange('cargoType', e.target.value)}
                                                 >
                                                    <option value="">(Select)</option>
                                                    <option value="LCL">LCL (CFS)</option>
                                                    <option value="FCL">FCL (CY)</option>
                                                 </select>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wide block">{t.class}</label>
                                                <select className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm rounded-sm px-3 py-2 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500" value={formData.cargoClass} onChange={(e) => handleInputChange('cargoClass', e.target.value)}>
                                                    <option value="IMPORT">IMPORT</option>
                                                    <option value="TRANSHIPMENT">TRANSIT</option>
                                                </select>
                                                {formData.cargoClass === 'IMPORT' && (
                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                        <button 
                                                            onClick={() => handleImportSubChange('SHIPS_STORES')}
                                                            className={`px-2 py-1 text-[10px] font-bold rounded border ${formData.importSubClass === 'SHIPS_STORES' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-500 border-slate-200'}`}
                                                        >
                                                            {t.importSub.shipStore}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleImportSubChange('RETURN_EXPORT')}
                                                            className={`px-2 py-1 text-[10px] font-bold rounded border ${formData.importSubClass === 'RETURN_EXPORT' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200'}`}
                                                        >
                                                            {t.importSub.return}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleImportSubChange('GENERAL')}
                                                            className={`px-2 py-1 text-[10px] font-bold rounded border ${formData.importSubClass === 'GENERAL' ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white text-slate-500 border-slate-200'}`}
                                                        >
                                                            {t.importSub.general}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wide block text-blue-600 dark:text-blue-400">{t.category}</label>
                                                {isManualCategory ? (
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="text"
                                                            className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-sm px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 font-bold"
                                                            value={formData.cargoCategory || ''}
                                                            onChange={(e) => handleInputChange('cargoCategory', e.target.value)}
                                                            placeholder="Type new category..."
                                                            autoFocus
                                                        />
                                                        <button 
                                                            onClick={() => { setIsManualCategory(false); handleInputChange('cargoCategory', ''); }} 
                                                            className="p-1.5 bg-slate-100 dark:bg-slate-600 text-slate-500 hover:text-red-500 rounded"
                                                            title="Cancel"
                                                        >
                                                            <X size={16}/>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div ref={categoryDropdownRef} className="relative w-full">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                                            className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm rounded-sm px-3 py-2 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 font-bold flex justify-between items-center text-left"
                                                        >
                                                            <span className={!formData.cargoCategory ? "text-slate-400 font-normal" : ""}>
                                                                {formData.cargoCategory ? getCategoryLabel(formData.cargoCategory) : t.selectCategory}
                                                            </span>
                                                            <ChevronDown size={14} className="opacity-50" />
                                                        </button>

                                                        {isCategoryDropdownOpen && (
                                                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                                                {categories.map(cat => (
                                                                    <div key={cat} className="group flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0" onClick={() => handleCategorySelect(cat)}>
                                                                        {editingCategory === cat ? (
                                                                            <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                                <input 
                                                                                    autoFocus
                                                                                    type="text" 
                                                                                    value={newCategoryName}
                                                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                                                    className="flex-1 border-b border-blue-500 bg-transparent text-sm focus:outline-none"
                                                                                />
                                                                                <button onClick={saveEditCategory} className="text-emerald-500 hover:text-emerald-600 p-1"><Check size={14}/></button>
                                                                                <button onClick={(e) => { e.stopPropagation(); setEditingCategory(null); }} className="text-red-500 hover:text-red-600 p-1"><X size={14}/></button>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{getCategoryLabel(cat)}</span>
                                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button 
                                                                                        onClick={(e) => startEditCategory(e, cat)}
                                                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-blue-500"
                                                                                    >
                                                                                        <Pencil size={12} />
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={(e) => deleteCategory(e, cat)}
                                                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-red-500"
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                <div 
                                                                    className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-blue-600 dark:text-blue-400 font-bold text-sm border-t border-slate-100 dark:border-slate-700 flex items-center gap-2"
                                                                    onClick={() => {
                                                                        setIsManualCategory(true);
                                                                        handleInputChange('cargoCategory', '');
                                                                        setIsCategoryDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <Plus size={14} /> {t.directInput}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                   </div>

                   {/* Logistics Info Card */}
                   <div className="bg-white dark:bg-slate-800 rounded-sm shadow-sm border border-slate-300 dark:border-slate-600 p-6 relative">
                       <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Truck size={16} /> {t.logistics}
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                           <DetailInput label={t.koreanForwarder} value={formData.koreanForwarder} onChange={(e: any) => handleInputChange('koreanForwarder', e.target.value)} />
                           <DetailInput label={t.transporter} value={formData.transporterName} onChange={(e: any) => handleInputChange('transporterName', e.target.value)} />
                           <DetailInput label={t.location} value={formData.arrivalNotice?.location} onChange={(e: any) => handleNestedChange('arrivalNotice', 'location', e.target.value)} />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                           <DetailInput label={t.storageLoc} value={formData.storageLocation} onChange={(e: any) => handleInputChange('storageLocation', e.target.value)} placeholder={t.placeholders.warehouse} />
                           <div className="grid grid-cols-2 gap-4">
                                <DetailInput label={t.storagePeriod} value={formData.storagePeriod} onChange={(e: any) => handleInputChange('storagePeriod', e.target.value)} placeholder={t.placeholders.date + " ~ " + t.placeholders.date} />
                                <div className="grid grid-cols-2 gap-2">
                                    <DetailInput label={t.invAmount} value={formData.commercialInvoice?.totalAmount} onChange={(e: any) => handleNestedChange('commercialInvoice', 'totalAmount', e.target.value)} />
                                    <DetailInput label={t.currency} value={formData.commercialInvoice?.currency} onChange={(e: any) => handleNestedChange('commercialInvoice', 'currency', e.target.value)} />
                                </div>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-900/10 -mx-6 px-6 pb-2">
                           <DetailInput label={t.totalPkgs} value={formData.packingList?.totalPackageCount} onChange={(e: any) => handleNestedChange('packingList', 'totalPackageCount', e.target.value)} />
                           <DetailInput label={t.totalWeight} value={formData.packingList?.totalGrossWeight} onChange={(e: any) => handleNestedChange('packingList', 'totalGrossWeight', e.target.value)} />
                           <DetailInput label={t.totalCbm} value={formData.packingList?.totalCbm} onChange={(e: any) => handleNestedChange('packingList', 'totalCbm', e.target.value)} />
                           <DetailInput label={t.hsCode} value={formData.exportDeclaration?.hsCode} onChange={(e: any) => handleNestedChange('exportDeclaration', 'hsCode', e.target.value)} />
                       </div>
                   </div>

                   {/* Cargo Items Table */}
                   <div className="bg-white dark:bg-slate-800 rounded-sm shadow-sm border border-slate-300 dark:border-slate-600 p-6 overflow-hidden min-h-[300px]">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2"><Box size={16} /> {t.items}</h3>
                          <button onClick={addItemRow} className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors dark:text-slate-200"><Plus size={14}/> {t.addItem}</button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="p-3 w-10 text-center">#</th>
                                    <th className="p-3 w-36">{t.cntrNo}</th>
                                    <th className="p-3 w-24">{t.cntrType}</th>
                                    <th className="p-3 min-w-[240px]">{t.desc}</th>
                                    <th className="p-3 w-24 text-right">{t.qty}</th>
                                    <th className="p-3 w-20">{t.pkg}</th>
                                    <th className="p-3 w-28 text-right">{t.weight}</th>
                                    <th className="p-3 w-24 text-right">{t.cbm}</th>
                                    <th className="p-3 w-20 text-center">{t.copySpec}</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {formData.cargoItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                                        <td className="p-2"><input className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm font-mono text-slate-700 dark:text-slate-300" value={item.containerNo} onChange={e => handleItemChange(idx, 'containerNo', e.target.value)} placeholder={t.placeholders.cntr} /></td>
                                        <td className="p-2"><input className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm text-slate-700 dark:text-slate-300" value={item.containerType} onChange={e => handleItemChange(idx, 'containerType', e.target.value)} placeholder={t.placeholders.type} /></td>
                                        <td className="p-2"><input className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm text-right text-slate-700 dark:text-slate-300" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} /></td>
                                        <td className="p-2"><input className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm text-slate-700 dark:text-slate-300" value={item.packageType} onChange={e => handleItemChange(idx, 'packageType', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm text-right text-slate-700 dark:text-slate-300" value={item.grossWeight} onChange={e => handleItemChange(idx, 'grossWeight', Number(e.target.value))} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm text-right text-slate-700 dark:text-slate-300" value={item.measurement} onChange={e => handleItemChange(idx, 'measurement', Number(e.target.value))} /></td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => copyContainerSpec(item)} className="text-slate-300 hover:text-blue-600 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title={t.copySpec}><Copy size={16} /></button>
                                        </td>
                                        <td className="p-2 text-center"><button onClick={() => removeItemRow(idx)} className="text-slate-200 group-hover:text-red-400 hover:text-red-500 p-1.5"><X size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>

              {/* RIGHT COLUMN: Documents, Progress & Financials - Span 3 */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                  
                  {/* Documents Grid */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                             <FileText size={16} /> {t.documents}
                          </h3>
                          <button 
                            onClick={() => setIsCloudManagerOpen(true)}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 rounded-lg transition-colors relative group"
                            title="Cloud File Manager"
                          >
                              <FolderPlus size={18} />
                              {attachmentCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800 animate-fade-in">
                                    {attachmentCount}
                                </span>
                              )}
                          </button>
                      </div>
                      <div className="flex flex-col gap-3">
                          <DocSlot title="Bill of Lading" type="BL" fileUrl={formData.fileUrl} isUploading={uploadingDoc === 'BL'} onRunOCR={handleRunOCR} onRemove={handleFileRemove} onUpload={handleFileUpload} />
                          <DocSlot title={t.arrivalNotice} type="AN" fileUrl={formData.arrivalNotice?.fileUrl} isUploading={uploadingDoc === 'AN'} onRunOCR={handleRunOCR} onRemove={handleFileRemove} onUpload={handleFileUpload} />
                          <DocSlot title="Commercial Invoice" type="CI" fileUrl={formData.commercialInvoice?.fileUrl} isUploading={uploadingDoc === 'CI'} onRunOCR={handleRunOCR} onRemove={handleFileRemove} onUpload={handleFileUpload} />
                          <DocSlot title="Packing List" type="PL" fileUrl={formData.packingList?.fileUrl} isUploading={uploadingDoc === 'PL'} onRunOCR={handleRunOCR} onRemove={handleFileRemove} onUpload={handleFileUpload} />
                          <DocSlot title={t.manifest} type="MANIFEST" fileUrl={formData.manifest?.fileUrl} isUploading={uploadingDoc === 'MANIFEST'} onRunOCR={handleRunOCR} onRemove={handleFileRemove} onUpload={handleFileUpload} />
                          <DocSlot title={t.exportDec} type="EXPORT_DEC" fileUrl={formData.exportDeclaration?.fileUrl} isUploading={uploadingDoc === 'EXPORT_DEC'} onRunOCR={handleRunOCR} onRemove={handleFileRemove} onUpload={handleFileUpload} />
                      </div>
                  </div>

                  {/* Progress / Checklist Widget - Bar Style */}
                   <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col border-dashed">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                            {t.progressTitle}
                        </h3>
                        <span className={`text-lg font-black ${progressStats.percent === 100 ? 'text-emerald-500' : 'text-blue-600'}`}>{progressStats.percent}%</span>
                      </div>
                      
                      <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-6 overflow-hidden border border-slate-200 dark:border-slate-600">
                           <div 
                              className={`h-full rounded-full transition-all duration-500 ${progressStats.percent === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`} 
                              style={{ width: `${progressStats.percent}%` }}
                           ></div>
                      </div>

                      <div className="w-full space-y-3 mb-6">
                          {progressStats.sectionStats.map((stat, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-600 dark:text-slate-400">{stat.label}</span>
                                  <div className="flex items-center gap-2">
                                     <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                         <div 
                                            className={`h-full rounded-full ${stat.checked === stat.total && stat.total > 0 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${stat.total > 0 ? (stat.checked / stat.total) * 100 : 0}%`}}
                                         ></div>
                                     </div>
                                     <span className="font-mono text-slate-400 tabular-nums text-[10px] w-8 text-right">{stat.checked}/{stat.total}</span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <button 
                        onClick={() => {
                            if (formData.vesselJobId) {
                                onNavigateToChecklist();
                            } else {
                                alert(t.assignVessel);
                            }
                        }}
                        className="w-full py-2.5 rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center gap-2 transition-colors"
                      >
                         {t.checklistView} <ArrowRight size={14} />
                      </button>
                   </div>

                  {/* Remarks Field (Restored) */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                      <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <MessageSquare size={16} /> {t.remarks}
                      </h3>
                      <textarea 
                        className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm focus:border-blue-500 outline-none resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
                        value={formData.remarks || ''}
                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                        placeholder="..."
                      />
                  </div>

              </div>

          </div>
       </div>
    </div>
  );
};
