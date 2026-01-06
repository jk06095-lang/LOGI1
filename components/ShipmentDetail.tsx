
import React, { useState, useEffect, useCallback } from 'react';
import { BLData, Language, DocumentScanType, BLChecklist, CargoItem, BackgroundTask, CargoType, CargoClass, ImportSubClass } from '../types';
import { Save, Upload, FileText, CheckCircle, ExternalLink, X, Printer, ArrowRight, Loader2, PieChart, Trash2, Share2, Plus, Copy, ScanLine, BrainCircuit, Building2, Truck, ListChecks, Container, Anchor, ArrowRightLeft } from 'lucide-react';
import { parseDocument } from '../services/geminiService';
import { uploadFileToStorage } from '../services/storageService';

interface ShipmentDetailProps {
  bl: BLData;
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
    shipmentData: '화물 기본 정보',
    blNo: 'B/L 번호 / Order No',
    shipper: '공급자 (Shipper)',
    vessel: '선박명 (Vessel)',
    pol: '선적항 (POL)',
    date: '입항일 (ETA)',
    financialData: '재무 및 화물 상세',
    invAmount: '송장 금액',
    currency: '통화',
    totalPkgs: '총 포장 수량',
    totalWeight: '총 중량 (KG)',
    totalCbm: '총 용적 (CBM)',
    hsCode: 'HS 코드',
    remarks: '비고 / 특이사항',
    workProgress: '업무 진행률',
    clickChecklist: '체크리스트 보기',
    regInfo: '등록 정보',
    regDate: '등록일',
    status: '상태',
    delete: '삭제',
    deleteFile: '파일 삭제',
    deleteConfirm: '정말 이 문서를 삭제하시겠습니까? 복구할 수 없습니다.',
    deleteFileConfirm: '이 파일을 삭제하시겠습니까?',
    share: '공유',
    linkCopied: '링크 복사됨!',
    items: '화물 품목 리스트',
    desc: '품명',
    qty: '수량',
    pkg: '단위',
    weight: '중량',
    cbm: 'CBM',
    cntrNo: '컨테이너 No.',
    addItem: '품목 추가',
    runOCR: 'AI 분석 실행',
    uploading: '업로드 중...',
    analyzing: '분석 중...',
    logisticsPartners: '물류 담당 업체 (Agency & Transport)',
    koreanForwarder: '한국 포워딩 업체 (Forwarder)',
    transporterName: '운송업체 (Trucking Co.)',
    checklistSummary: '주요 진행 상황',
    cargoType: '컨테이너 타입',
    cargoClass: '화물 구분 (I/T)',
    classImport: '수입 (Import)',
    classTransit: '환적 (Transhipment)',
    subClass: '수입 상세 구분',
    subGeneral: '일반 수입',
    subReturn: '반송 수출',
    subStores: '선용품',
    consignee: '수하인 (Consignee)',
    secA: 'A. 수신',
    secB: 'B. 전달',
    secC: 'C. 대행',
    secD: 'D. 운송',
    secE: 'E. 선적'
  },
  en: {
    title: 'Shipment Detail',
    save: 'Save Changes',
    saved: 'Saved successfully.',
    error: 'An error occurred.',
    upload: 'Upload',
    notUploaded: 'Not Uploaded',
    uploaded: 'Uploaded',
    shipmentData: 'Shipment Data',
    blNo: 'B/L Number / Order No',
    shipper: 'Shipper',
    vessel: 'Vessel Name',
    pol: 'Port of Loading',
    date: 'ETA Date',
    financialData: 'Financial & Cargo Details',
    invAmount: 'Inv. Amount',
    currency: 'Currency',
    totalPkgs: 'Total Pkgs',
    totalWeight: 'Total Weight (KG)',
    totalCbm: 'Total CBM',
    hsCode: 'HS Code',
    remarks: 'Remarks / Notes',
    workProgress: 'Work Progress',
    clickChecklist: 'View Checklist',
    regInfo: 'Registration Info',
    regDate: 'Uploaded',
    status: 'Status',
    delete: 'Delete',
    deleteFile: 'Delete File',
    deleteConfirm: 'Are you sure you want to delete this document?',
    deleteFileConfirm: 'Are you sure you want to delete this file?',
    share: 'Share',
    linkCopied: 'Link Copied!',
    items: 'Cargo Items',
    desc: 'Description',
    qty: 'Qty',
    pkg: 'Pkg',
    weight: 'Weight',
    cbm: 'CBM',
    cntrNo: 'Container No.',
    addItem: 'Add Item',
    runOCR: 'Run AI Analysis',
    uploading: 'Uploading...',
    analyzing: 'Analyzing...',
    logisticsPartners: 'Logistics Partners (Agency & Transport)',
    koreanForwarder: 'Korean Forwarder',
    transporterName: 'Transport/Trucking Co.',
    checklistSummary: 'Progress Summary',
    cargoType: 'Container Type',
    cargoClass: 'Classification (I/T)',
    classImport: 'Import (I)',
    classTransit: 'Transhipment (T)',
    subClass: 'Import Category',
    subGeneral: 'General',
    subReturn: 'Return Export',
    subStores: 'Ship Stores',
    consignee: 'Consignee',
    secA: 'A. Rcv',
    secB: 'B. Fwd',
    secC: 'C. Agcy',
    secD: 'D. Trns',
    secE: 'E. Load'
  },
  cn: {
    title: '货物详情',
    save: '保存更改',
    saved: '已保存。',
    error: '发生错误。',
    upload: '上传',
    notUploaded: '未上传',
    uploaded: '已上传',
    shipmentData: '货物基础信息',
    blNo: '提单号 (B/L No)',
    shipper: '发货人',
    vessel: '船名',
    pol: '装货港 (POL)',
    date: '预计抵港日期',
    financialData: '财务及货物明细',
    invAmount: '发票金额',
    currency: '货币',
    totalPkgs: '总件数',
    totalWeight: '总重量 (KG)',
    totalCbm: '总体积 (CBM)',
    hsCode: '海关编码 (HS Code)',
    remarks: '备注',
    workProgress: '作业进度',
    clickChecklist: '查看检查表',
    regInfo: '注册信息',
    regDate: '上传日期',
    status: '状态',
    delete: '删除',
    deleteFile: '删除文件',
    deleteConfirm: '确定要删除此文档吗？',
    deleteFileConfirm: '确定要删除此文件吗？',
    share: '分享',
    linkCopied: '链接已复制!',
    items: '货物清单',
    desc: '描述',
    qty: '数量',
    pkg: '单位',
    weight: '重量',
    cbm: 'CBM',
    cntrNo: '集装箱号',
    addItem: '添加项目',
    runOCR: '执行 AI 智能识别',
    uploading: '上传中...',
    analyzing: '智能分析中...',
    logisticsPartners: '物流合作伙伴',
    koreanForwarder: '韩国货代',
    transporterName: '运输/车队',
    checklistSummary: '进度摘要',
    cargoType: '集装箱类型',
    cargoClass: '货物分类 (I/T)',
    classImport: '进口 (I)',
    classTransit: '中转 (T)',
    subClass: '进口子分类',
    subGeneral: '一般进口',
    subReturn: '退运出口',
    subStores: '船用物料',
    consignee: '收货人',
    secA: 'A. 接收',
    secB: 'B. 转交',
    secC: 'C. 代理',
    secD: 'D. 车队',
    secE: 'E. 装船'
  }
};

export const ShipmentDetail: React.FC<ShipmentDetailProps> = ({ bl, language, onUpdateBL, onClose, onNavigateToChecklist, checklist, onDelete, onAddTask, onUpdateTask }) => {
  const [formData, setFormData] = useState<BLData>(bl);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<DocumentScanType | null>(null);

  const t = translations[language] || translations.ko;

  // Calculate Progress
  const allSteps = checklist ? [...checklist.sectionA, ...checklist.sectionB, ...checklist.sectionC, ...checklist.sectionD, ...checklist.sectionE] : [];
  const checkedCount = allSteps.filter(s => s.checked).length;
  const totalSteps = allSteps.length;
  const progress = totalSteps > 0 ? Math.round((checkedCount / totalSteps) * 100) : 0;

  useEffect(() => { setFormData(bl); }, [bl]);

  // Automatic Classification Logic
  useEffect(() => {
    if (formData.consignee) {
        const c = formData.consignee.toLowerCase();
        // Check for Korea addresses
        const koreaKeywords = ['korea', 'republic of korea', 'seoul', 'busan', 'incheon', 'pyeongtaek', 'gwangyang', 'ulsan', 'masan', 'pohang', 'daegu', 'daejeon', '한국', '서울', '부산', '인천'];
        
        const isKorea = koreaKeywords.some(keyword => c.includes(keyword));
        
        // If Consignee has Korea address -> Import (I), else -> Transhipment (T)
        // Only auto-set if it's currently undefined to avoid overwriting user manual choice
        if (!formData.cargoClass) {
            setFormData(prev => ({
                ...prev,
                cargoClass: isKorea ? 'IMPORT' : 'TRANSHIPMENT',
                importSubClass: isKorea ? 'GENERAL' : undefined
            }));
        }
    }
  }, [formData.consignee]);

  const handleInputChange = (field: keyof BLData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNestedChange = (parent: 'commercialInvoice' | 'packingList' | 'exportDeclaration', field: string, value: any) => {
    setFormData(prev => {
        const currentParent = prev[parent] || {};
        return {
            ...prev,
            [parent]: {
                ...currentParent,
                [field]: value
            }
        };
    });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
        // Ensure that nested objects are valid structures before sending
        const cleanData = { ...formData };
        if (cleanData.packingList) {
             cleanData.packingList = {
                  totalPackageCount: cleanData.packingList.totalPackageCount || 0,
                  totalCbm: cleanData.packingList.totalCbm || 0,
                  totalGrossWeight: cleanData.packingList.totalGrossWeight || 0,
                  fileUrl: cleanData.packingList.fileUrl || ''
             };
        }
        
        await onUpdateBL(bl.id, cleanData);
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

  const handleItemChange = (index: number, field: keyof CargoItem, value: any) => {
    const newItems = [...formData.cargoItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, cargoItems: newItems });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      cargoItems: [...formData.cargoItems, { description: '', quantity: 0, packageType: '', grossWeight: 0, measurement: 0, containerNo: '' }]
    });
  };

  const removeItemRow = (index: number) => {
    const newItems = formData.cargoItems.filter((_, i) => i !== index);
    setFormData({ ...formData, cargoItems: newItems });
  };

  // 1. Only Upload File
  const handleFileUpload = async (type: DocumentScanType, file: File) => {
    setUploadingDoc(type);
    const taskId = `upload-${Date.now()}`;
    
    // Start Background Task UI
    onAddTask({
       id: taskId,
       title: `Upload: ${file.name}`,
       status: 'processing',
       progress: 0,
       message: t.uploading
    });

    try {
        // Upload to Firebase
        const url = await uploadFileToStorage(file);
        
        // Update Progress
        onUpdateTask(taskId, { progress: 80 });

        const updates: Partial<BLData> = {};
        const newFormData = { ...formData }; // Optimistic UI update

        if (type === 'BL') {
            updates.fileUrl = url;
            newFormData.fileUrl = url;
        } else if (type === 'CI') {
            updates.commercialInvoice = { ...formData.commercialInvoice, fileUrl: url, currency: formData.commercialInvoice?.currency || 'USD', totalAmount: formData.commercialInvoice?.totalAmount || 0 };
            newFormData.commercialInvoice = updates.commercialInvoice;
        } else if (type === 'PL') {
             updates.packingList = { ...formData.packingList, fileUrl: url, totalPackageCount: formData.packingList?.totalPackageCount || 0, totalCbm: formData.packingList?.totalCbm || 0, totalGrossWeight: formData.packingList?.totalGrossWeight || 0 };
             newFormData.packingList = updates.packingList;
        } else if (type === 'EXPORT_DEC') {
            updates.exportDeclaration = { ...formData.exportDeclaration, fileUrl: url, declarationNo: formData.exportDeclaration?.declarationNo || '', hsCode: formData.exportDeclaration?.hsCode || '' };
            newFormData.exportDeclaration = updates.exportDeclaration;
        } else if (type === 'MANIFEST') {
            updates.manifest = { fileUrl: url };
            newFormData.manifest = updates.manifest;
        }

        // Save URL to DB
        setFormData(newFormData);
        await onUpdateBL(bl.id, updates);
        
        onUpdateTask(taskId, { status: 'success', progress: 100, message: 'Upload Completed' });
        
    } catch(e: any) {
        console.error(e);
        onUpdateTask(taskId, { status: 'error', message: e.message || 'Upload Failed' });
    } finally {
        setUploadingDoc(null);
    }
  };

  // 2. Separate OCR Trigger
  const handleRunOCR = async (type: DocumentScanType, url: string) => {
      const taskId = `ocr-${Date.now()}`;
      onAddTask({
         id: taskId,
         title: `AI Analysis: ${type}`,
         status: 'processing',
         progress: 10,
         message: t.analyzing
      });

      try {
          // 1. Fetch the file blob from the URL
          const response = await fetch(url);
          const blob = await response.blob();
          const file = new File([blob], "temp_file", { type: blob.type });

          onUpdateTask(taskId, { progress: 30, message: 'Processing Document...' });

          // 2. Run Gemini Parse
          const ocrResult = await parseDocument(file, type);
          
          onUpdateTask(taskId, { progress: 70, message: 'Saving Data...' });

          const updates: Partial<BLData> = {};
          
          if (type === 'CI') {
             updates.commercialInvoice = {
                 ...formData.commercialInvoice!,
                 currency: ocrResult.currency || 'USD',
                 totalAmount: ocrResult.totalAmount || 0
             };
         } else if (type === 'PL') {
              updates.packingList = {
                 ...formData.packingList!,
                 totalPackageCount: ocrResult.totalPackageCount || 0,
                 totalCbm: ocrResult.totalCbm || 0,
                 totalGrossWeight: ocrResult.totalGrossWeight || 0
             };
         } else if (type === 'EXPORT_DEC') {
             updates.exportDeclaration = {
                 ...formData.exportDeclaration!,
                 declarationNo: ocrResult.declarationNo || '',
                 hsCode: ocrResult.mainHsCode || ''
             };
         } else if (type === 'BL') {
             if (ocrResult.shipper) updates.shipper = ocrResult.shipper;
             if (ocrResult.blNumber) updates.blNumber = ocrResult.blNumber;
             if (ocrResult.vesselName) updates.vesselName = ocrResult.vesselName;
             // Use VoyageNo if found, but also look for POL
             if (ocrResult.voyageNo) updates.voyageNo = ocrResult.voyageNo;
             if (ocrResult.portOfLoading) updates.portOfLoading = ocrResult.portOfLoading;
             
             // Update Forwarder & Transporter if found
             if (ocrResult.koreanForwarder) updates.koreanForwarder = ocrResult.koreanForwarder;
             if (ocrResult.transporterName) updates.transporterName = ocrResult.transporterName;
             if (ocrResult.cargoType) updates.cargoType = ocrResult.cargoType;

             // Map Total CBM/Weight/Pkgs from B/L OCR to Packing List fields (Financial & Cargo Details section)
             // This is the primary request: reflect B/L analysis in the details section.
             const existingPL = formData.packingList || { totalPackageCount: 0, totalGrossWeight: 0, totalCbm: 0, fileUrl: '' };
             
             // Prioritize OCR result if found, otherwise keep existing
             updates.packingList = {
                 ...existingPL,
                 totalCbm: ocrResult.totalCbm || existingPL.totalCbm || 0,
                 totalGrossWeight: ocrResult.totalGrossWeight || existingPL.totalGrossWeight || 0,
                 totalPackageCount: ocrResult.totalPackageCount || existingPL.totalPackageCount || 0
             };

             // Also try to update Currency if found in BL (rare but useful)
             if (ocrResult.currency) {
                 const existingCI = formData.commercialInvoice || { currency: 'USD', totalAmount: 0, fileUrl: '' };
                 updates.commercialInvoice = {
                     ...existingCI,
                     currency: ocrResult.currency
                 };
             }

             if (ocrResult.cargoItems && ocrResult.cargoItems.length > 0) {
                updates.cargoItems = ocrResult.cargoItems;
             }
         }

         setFormData(prev => ({ ...prev, ...updates }));
         await onUpdateBL(bl.id, updates);

         onUpdateTask(taskId, { status: 'success', progress: 100, message: 'Analysis Completed' });

      } catch (e: any) {
          console.error(e);
          onUpdateTask(taskId, { status: 'error', message: 'Analysis Failed' });
      }
  };

  const handleFileRemove = async (type: DocumentScanType) => {
    if (!window.confirm(t.deleteFileConfirm)) return;

    const updates: Partial<BLData> = {};
    let newFormData = { ...formData };

    if (type === 'BL') {
        updates.fileUrl = '';
        newFormData.fileUrl = '';
    } else if (type === 'CI') {
        updates.commercialInvoice = { ...formData.commercialInvoice!, fileUrl: '' };
        if(newFormData.commercialInvoice) newFormData.commercialInvoice.fileUrl = '';
    } else if (type === 'PL') {
        updates.packingList = { ...formData.packingList!, fileUrl: '' };
        if(newFormData.packingList) newFormData.packingList.fileUrl = '';
    } else if (type === 'EXPORT_DEC') {
        updates.exportDeclaration = { ...formData.exportDeclaration!, fileUrl: '' };
        if(newFormData.exportDeclaration) newFormData.exportDeclaration.fileUrl = '';
    } else if (type === 'MANIFEST') {
        updates.manifest = { ...formData.manifest!, fileUrl: '' };
        if(newFormData.manifest) newFormData.manifest.fileUrl = '';
    }

    setFormData(newFormData);
    await onUpdateBL(bl.id, updates);
  };

  const DocSlot = ({ title, type, fileUrl }: { title: string, type: DocumentScanType, fileUrl?: string }) => {
    const [slotCopied, setSlotCopied] = useState(false);

    const handleCopy = () => {
      if(fileUrl) {
         navigator.clipboard.writeText(fileUrl);
         setSlotCopied(true);
         setTimeout(() => setSlotCopied(false), 2000);
      }
    };

    return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
       <div className="flex justify-between items-start">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</span>
          <div className="flex items-center gap-1">
          {fileUrl ? (
             <>
                 <button onClick={handleCopy} className="text-slate-400 hover:text-blue-600 p-1 relative" title={t.share}>
                    {slotCopied ? <CheckCircle size={14} className="text-emerald-500"/> : <Share2 size={14} />}
                 </button>
                 <button onClick={() => handleFileRemove(type)} className="text-slate-400 hover:text-red-500 p-1" title={t.deleteFile}>
                    <Trash2 size={14} />
                 </button>
                 <button onClick={() => window.open(fileUrl, '_blank')} className="text-slate-400 hover:text-blue-600 p-1" title="Open">
                    <ExternalLink size={14} />
                 </button>
                 {/* Re-upload button */}
                 <label className="cursor-pointer text-slate-400 hover:text-blue-600 p-1" title={t.upload}>
                    <Upload size={14} />
                    <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => e.target.files?.[0] && handleFileUpload(type, e.target.files[0])} />
                 </label>
             </>
          ) : (
             <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                 {uploadingDoc === type ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} {t.upload}
                 <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => e.target.files?.[0] && handleFileUpload(type, e.target.files[0])} />
             </label>
          )}
          </div>
       </div>
       
       <div className="flex-1 flex flex-col justify-end gap-2">
          {fileUrl ? (
             <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                    <FileText size={18} /> {t.uploaded}
                 </div>
                 {/* OCR Trigger Button */}
                 <button 
                    onClick={() => handleRunOCR(type, fileUrl)}
                    className="flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 py-1.5 px-3 rounded text-xs font-bold transition-colors w-full border border-indigo-100 dark:border-indigo-800"
                 >
                    <BrainCircuit size={14} /> {t.runOCR}
                 </button>
             </div>
          ) : (
             <div className="text-slate-300 text-sm italic">{t.notUploaded}</div>
          )}
       </div>
    </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden animate-fade-in">
       {/* Header */}
       <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-4">
             <div className="bg-blue-600 text-white p-2 rounded-lg"><FileText size={24} /></div>
             <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {formData.blNumber}
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded uppercase">{formData.sourceType}</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs text-slate-500">{t.shipper}: {formData.shipper}</p>
                   {/* Left Side Buttons */}
                   <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300">
                     <button onClick={handleDelete} className="text-slate-400 hover:text-red-600 transition-colors p-1" title={t.delete}>
                        <Trash2 size={16} />
                     </button>
                   </div>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={saveChanges} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {t.save}
             </button>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2"><X size={24} /></button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
             
             {/* Left: Document Slots */}
             <div className="col-span-12 md:col-span-3 space-y-4">
                <DocSlot title="Bill of Lading" type="BL" fileUrl={formData.fileUrl} />
                <DocSlot title="Commercial Invoice" type="CI" fileUrl={formData.commercialInvoice?.fileUrl} />
                <DocSlot title="Packing List" type="PL" fileUrl={formData.packingList?.fileUrl} />
                <DocSlot title="Export Declaration" type="EXPORT_DEC" fileUrl={formData.exportDeclaration?.fileUrl} />
                <DocSlot title="Cargo Manifest" type="MANIFEST" fileUrl={formData.manifest?.fileUrl} /> 
             </div>

             {/* Center: Main Data Form */}
             <div className="col-span-12 md:col-span-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">{t.shipmentData}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.blNo}</label>
                      <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.blNumber} onChange={(e) => handleInputChange('blNumber', e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.shipper}</label>
                      <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.shipper} onChange={(e) => handleInputChange('shipper', e.target.value)} />
                   </div>
                   <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 mb-1">{t.consignee}</label>
                       <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.consignee || ''} onChange={(e) => handleInputChange('consignee', e.target.value)} placeholder="Full Address / Company Name" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.vessel}</label>
                      <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.vesselName} onChange={(e) => handleInputChange('vesselName', e.target.value)} />
                   </div>
                   <div>
                      {/* Changed Voyage to POL */}
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.pol}</label>
                      <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.portOfLoading || ''} onChange={(e) => handleInputChange('portOfLoading', e.target.value)} placeholder="e.g. SHANGHAI" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.date}</label>
                      <input type="date" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.cargoType}</label>
                      <select 
                        className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm font-bold"
                        value={formData.cargoType || 'LCL'}
                        onChange={(e) => handleInputChange('cargoType', e.target.value)}
                      >
                         <option value="LCL">LCL / CFS</option>
                         <option value="FCL">FCL / CY</option>
                      </select>
                   </div>
                </div>

                {/* Classification Section */}
                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-100 dark:border-slate-600 mb-6">
                    <div className="flex flex-col gap-3">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-2">{t.cargoClass}</label>
                             <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="cargoClass" 
                                        checked={formData.cargoClass === 'IMPORT'} 
                                        onChange={() => handleInputChange('cargoClass', 'IMPORT')}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className={`text-sm font-bold ${formData.cargoClass === 'IMPORT' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {t.classImport} (I)
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="cargoClass" 
                                        checked={formData.cargoClass === 'TRANSHIPMENT'} 
                                        onChange={() => handleInputChange('cargoClass', 'TRANSHIPMENT')}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className={`text-sm font-bold ${formData.cargoClass === 'TRANSHIPMENT' ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {t.classTransit} (T)
                                    </span>
                                </label>
                             </div>
                        </div>

                        {formData.cargoClass === 'IMPORT' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t.subClass}</label>
                                <select 
                                    className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm font-bold bg-white"
                                    value={formData.importSubClass || 'GENERAL'}
                                    onChange={(e) => handleInputChange('importSubClass', e.target.value)}
                                >
                                    <option value="GENERAL">{t.subGeneral}</option>
                                    <option value="RETURN_EXPORT">{t.subReturn}</option>
                                    <option value="SHIPS_STORES">{t.subStores}</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center mb-2">
                     <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">{t.items}</h4>
                     <button onClick={addItemRow} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded">
                       <Plus size={14} /> {t.addItem}
                     </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-6">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600 text-xs">
                        <tr>
                            <th className="p-2 w-8">#</th>
                            <th className="p-2 w-28">{t.cntrNo}</th>
                            <th className="p-2">{t.desc}</th>
                            <th className="p-2 w-16 text-right">{t.qty}</th>
                            <th className="p-2 w-16">{t.pkg}</th>
                            <th className="p-2 w-20 text-right">{t.weight}</th>
                            <th className="p-2 w-20 text-right">{t.cbm}</th>
                            <th className="p-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {formData.cargoItems?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-center text-xs text-slate-400">{idx + 1}</td>
                          <td className="p-1"><input type="text" className="w-full p-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-xs font-mono" value={item.containerNo || ''} onChange={e => handleItemChange(idx, 'containerNo', e.target.value)} placeholder="CNTR NO" /></td>
                          <td className="p-1"><input type="text" className="w-full p-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} /></td>
                          <td className="p-1"><input type="number" className="w-full p-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-right" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} /></td>
                          <td className="p-1"><input type="text" className="w-full p-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded" value={item.packageType} onChange={e => handleItemChange(idx, 'packageType', e.target.value)} /></td>
                          <td className="p-1"><input type="number" step="0.01" className="w-full p-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-right" value={item.grossWeight} onChange={e => handleItemChange(idx, 'grossWeight', Number(e.target.value))} /></td>
                          <td className="p-1"><input type="number" step="0.001" className="w-full p-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-right" value={item.measurement || 0} onChange={e => handleItemChange(idx, 'measurement', Number(e.target.value))} placeholder="0.000" /></td>
                          <td className="p-1 text-center"><button onClick={() => removeItemRow(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>

                <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">{t.financialData}</h4>
                <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.invAmount}</label>
                      <input type="number" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.commercialInvoice?.totalAmount || 0} onChange={(e) => handleNestedChange('commercialInvoice', 'totalAmount', Number(e.target.value))} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.currency}</label>
                      <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.commercialInvoice?.currency || 'USD'} onChange={(e) => handleNestedChange('commercialInvoice', 'currency', e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.totalPkgs}</label>
                      <input type="number" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm font-bold" value={formData.packingList?.totalPackageCount || 0} onChange={(e) => handleNestedChange('packingList', 'totalPackageCount', Number(e.target.value))} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.totalWeight}</label>
                      <input type="number" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm font-bold" value={formData.packingList?.totalGrossWeight || 0} onChange={(e) => handleNestedChange('packingList', 'totalGrossWeight', Number(e.target.value))} />
                   </div>
                   {/* Added CBM Input here */}
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.totalCbm}</label>
                      <input type="number" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm font-bold text-blue-600 dark:text-blue-400" value={formData.packingList?.totalCbm || 0} onChange={(e) => handleNestedChange('packingList', 'totalCbm', Number(e.target.value))} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.hsCode}</label>
                      <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded p-2 text-sm" value={formData.exportDeclaration?.hsCode || ''} onChange={(e) => handleNestedChange('exportDeclaration', 'hsCode', e.target.value)} />
                   </div>
                </div>

                <div className="mt-6">
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.remarks}</label>
                   <textarea 
                     className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none" 
                     value={formData.remarks || ''}
                     onChange={(e) => handleInputChange('remarks', e.target.value)}
                   />
                </div>
             </div>

             {/* Right: Logistics & Progress */}
             <div className="col-span-12 md:col-span-3 flex flex-col gap-6">
                 
                 {/* Logistics Partners (Agency & Transport) */}
                 <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3 border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                       <Truck size={16} /> {t.logisticsPartners}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                                <Building2 size={12}/> {t.koreanForwarder}
                            </label>
                            <input 
                                type="text"
                                className="w-full border border-slate-200 dark:border-slate-600 rounded p-2 text-xs bg-slate-50 dark:bg-slate-700 dark:text-white font-bold"
                                value={formData.koreanForwarder || ''}
                                onChange={(e) => handleInputChange('koreanForwarder', e.target.value)}
                                placeholder="Korean FWD"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                                <Truck size={12}/> {t.transporterName}
                            </label>
                            <input 
                                type="text"
                                className="w-full border border-slate-200 dark:border-slate-600 rounded p-2 text-xs bg-slate-50 dark:bg-slate-700 dark:text-white font-bold"
                                value={formData.transporterName || ''}
                                onChange={(e) => handleInputChange('transporterName', e.target.value)}
                                placeholder="Transport Co."
                            />
                        </div>
                    </div>
                 </div>

                 {/* Work Progress (Circular) */}
                 <div 
                   onClick={onNavigateToChecklist}
                   className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 p-6 shadow-sm cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group text-center flex flex-col items-center justify-center min-h-[220px]"
                 >
                    <h3 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest mb-4">{t.workProgress}</h3>
                    <div className="relative w-32 h-32 mx-auto mb-4">
                       <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-700" />
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-blue-600" strokeDasharray={351} strokeDashoffset={351 * (1 - (progress / 100))} strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-blue-600 dark:text-blue-400">
                          {progress}%
                       </div>
                    </div>
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold group-hover:underline text-xs">
                         {t.clickChecklist} <ArrowRight size={12} />
                    </div>
                 </div>

                 {/* Detailed Checklist Summary (Blue Box) */}
                 <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 p-4">
                     <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-tight">
                        <ListChecks size={14} className="text-blue-500" />
                        {t.checklistSummary}
                     </h4>
                     
                     <div className="space-y-2 mb-4">
                        {[
                            { key: 'sectionA', label: t.secA },
                            { key: 'sectionB', label: t.secB },
                            { key: 'sectionC', label: t.secC },
                            { key: 'sectionD', label: t.secD },
                            { key: 'sectionE', label: t.secE },
                        ].map((sec) => {
                            const items = checklist ? (checklist as any)[sec.key] as any[] : [];
                            const total = items?.length || 0;
                            const checked = items?.filter((i: any) => i.checked).length || 0;
                            const percent = total > 0 ? (checked / total) * 100 : 0;
                            const isDone = total > 0 && checked === total;
                            
                            return (
                                <div key={sec.key} className="flex items-center justify-between text-[11px]">
                                    <span className={`font-bold ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {sec.label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                         <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                             <div 
                                                style={{ width: `${percent}%` }} 
                                                className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                             ></div>
                                         </div>
                                         <span className={`w-6 text-right font-mono ${isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                                             {checked}/{total}
                                         </span>
                                    </div>
                                </div>
                            );
                        })}
                     </div>

                     <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
                         <div className="flex justify-between">
                             <span>{t.regDate}:</span>
                             <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(formData.uploadDate).toLocaleDateString()}</span>
                         </div>
                         <div className="flex justify-between items-center">
                             <span>{t.status}:</span>
                             <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${formData.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{formData.status}</span>
                         </div>
                     </div>
                 </div>
                 
             </div>

          </div>
       </div>
    </div>
  );
};
