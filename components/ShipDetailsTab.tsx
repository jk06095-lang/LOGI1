import React, { useState, useEffect } from 'react';
import { ShipRegistry, DocumentScanType } from '../types';
import { Ship, FileText, Upload, Save, CheckCircle, BrainCircuit, X, Trash2, Edit } from 'lucide-react';
import { dataService } from '../services/dataService';
import { parseDocument } from '../services/geminiService';
import { compressImage } from '../services/storageService'; // Will need a utility to get URL if saving to storage, but for now we'll store Base64 or assume file management is handled elsewhere.
import { functions, db } from '../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

interface ShipDetailsTabProps {
    vesselName: string;
    language: 'ko' | 'en' | 'cn';
}

export const ShipDetailsTab: React.FC<ShipDetailsTabProps> = ({ vesselName, language }) => {
    const [registry, setRegistry] = useState<ShipRegistry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<ShipRegistry>>({});
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);

    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        // Generate an ID from vessel name (simple normalization)
        const id = vesselName.trim().toUpperCase().replace(/\s+/g, '_');
        dataService.getShipRegistry(id).then(data => {
            if (data) {
                setRegistry(data);
                setFormData(data);
            } else {
                setFormData({ vesselName });
            }
        });
    }, [vesselName]);

    const handleSave = async () => {
        try {
            const id = vesselName.trim().toUpperCase().replace(/\s+/g, '_');
            await dataService.updateShipRegistry(id, formData);
            setRegistry({ id, ...formData } as ShipRegistry);
            setIsEditing(false);
            showToast('선박 제원이 성공적으로 저장되었습니다.', 'success');
        } catch (e) {
            showToast('저장 중 오류가 발생했습니다.', 'error');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: DocumentScanType) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsOcrProcessing(true);
        showToast('AI 분석을 시작합니다...', 'success');

        try {
            // 1. You would normally upload the file to Firebase Storage here and get the URL.
            // For brevity, we assume the URL logic or skip it, and directly run OCR.
            const ocrResult = await parseDocument(file, type);

            const updates = { ...formData };

            // Auto-fill based on OCR result
            if (type === 'CERT_NATIONALITY') {
                updates.shipType = ocrResult.shipType || updates.shipType;
                updates.callSign = ocrResult.callSign || updates.callSign;
                updates.shipOwner = ocrResult.shipOwner || updates.shipOwner;
                updates.imoNumber = ocrResult.imoNumber || updates.imoNumber;
                updates.nationality = ocrResult.nationality || updates.nationality;
                updates.portOfRegistry = ocrResult.portOfRegistry || updates.portOfRegistry;
                updates.mmsiNumber = ocrResult.mmsiNumber || updates.mmsiNumber;
                updates.nationalityCertFileUrl = 'uploaded_dummy_url'; // In real app, put actual URL
            } else if (type === 'CERT_TONNAGE') {
                updates.callSign = ocrResult.callSign || updates.callSign;
                updates.imoNumber = ocrResult.imoNumber || updates.imoNumber;
                updates.grossTonnage = ocrResult.grossTonnage || updates.grossTonnage;
                updates.netTonnage = ocrResult.netTonnage || updates.netTonnage;
                updates.length = ocrResult.length || updates.length;
                updates.breadth = ocrResult.breadth || updates.breadth;
                updates.depth = ocrResult.depth || updates.depth;
                updates.tonnageCertFileUrl = 'uploaded_dummy_url';
            }

            setFormData(updates);
            setIsEditing(true);
            showToast('OCR 분석이 완료되었습니다. 내용을 확인 후 저장해주세요.', 'success');
        } catch (err: any) {
            showToast(`OCR 오류: ${err.message}`, 'error');
        } finally {
            setIsOcrProcessing(false);
            e.target.value = ''; // Reset input
        }
    };

    const InputField = ({ label, field, type = "text" }: { label: string, field: keyof ShipRegistry, type?: string }) => (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
            {isEditing ? (
                <input
                    type={type}
                    value={(formData[field] as string | number) || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: type === "number" ? parseFloat(e.target.value) : e.target.value })}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                />
            ) : (
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-transparent rounded-lg text-sm text-slate-900 dark:text-slate-100 font-medium h-[38px] flex items-center">
                    {registry?.[field] || '-'}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20 relative">

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-10 right-10 z-50 px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 animate-fade-in-up ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <X size={18} />}
                    {toast.msg}
                </div>
            )}

            {/* Header Actions */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Ship className="text-blue-600" />
                        선박 제원 상세
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        국적증서 및 국제톤수증서 스캔을 통해 제원을 자동 등록할 수 있습니다.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <button onClick={() => { setIsEditing(false); setFormData(registry || { vesselName }); }} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                취소
                            </button>
                            <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all">
                                <Save size={16} /> 저장
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-5 py-2 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-sm font-bold rounded-lg transition-all flex items-center gap-2">
                            <Edit size={16} /> 수정
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Document Parsing Section */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <BrainCircuit size={18} className="text-indigo-500" /> AI OCR 자동 연동
                        {isOcrProcessing && <span className="text-xs text-indigo-500 animate-pulse ml-2">분석 중...</span>}
                    </h3>
                    <div className="flex gap-4">
                        <label className="relative cursor-pointer group flex-1">
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'CERT_NATIONALITY')} disabled={isOcrProcessing} />
                            <div className={`p-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-between
                   ${formData.nationalityCertFileUrl ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${formData.nationalityCertFileUrl ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm ${formData.nationalityCertFileUrl ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>국적증서 (Nationality Cert)</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{formData.nationalityCertFileUrl ? '업로드 완료' : '파일 업로드하여 추출'}</p>
                                    </div>
                                </div>
                                {formData.nationalityCertFileUrl ? <CheckCircle className="text-emerald-500" /> : <Upload className="text-slate-400" size={18} />}
                            </div>
                        </label>

                        <label className="relative cursor-pointer group flex-1">
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'CERT_TONNAGE')} disabled={isOcrProcessing} />
                            <div className={`p-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-between
                   ${formData.tonnageCertFileUrl ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${formData.tonnageCertFileUrl ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm ${formData.tonnageCertFileUrl ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>국제톤수증서 (Tonnage Cert)</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{formData.tonnageCertFileUrl ? '업로드 완료' : '파일 업로드하여 추출'}</p>
                                    </div>
                                </div>
                                {formData.tonnageCertFileUrl ? <CheckCircle className="text-emerald-500" /> : <Upload className="text-slate-400" size={18} />}
                            </div>
                        </label>
                    </div>
                </div>

                <div className="p-8">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">선박 정보 및 톤수</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
                        <InputField label="호출부호 (Call Sign)" field="callSign" />
                        <InputField label="IMO 번호" field="imoNumber" />
                        <InputField label="선박국적" field="nationality" />
                        <InputField label="선박등록항" field="portOfRegistry" />

                        <InputField label="MMSI 번호" field="mmsiNumber" />
                        <InputField label="총톤수 (Gross Tonnage)" field="grossTonnage" type="number" />
                        <InputField label="순톤수 (Net Tonnage)" field="netTonnage" type="number" />
                        <InputField label="선종 (Ship Type)" field="shipType" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-12 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">선체 제원</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6">
                        <InputField label="길이 (Length / LOA)" field="length" type="number" />
                        <InputField label="너비 (Breadth)" field="breadth" type="number" />
                        <InputField label="깊이 (Moulded Depth)" field="depth" type="number" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-12 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">운항 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <InputField label="선주 (Ship Owner)" field="shipOwner" />
                    </div>
                </div>
            </div>
        </div>
    );
};
