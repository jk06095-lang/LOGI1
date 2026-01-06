import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  progressMessage?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, isProcessing, progressMessage }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessStart = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      // We don't clear selected files here immediately to show them being processed,
      // but the parent might switch views.
    }
  };

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center animate-fade-in">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">B/L 문서 업로드</h2>
          <p className="text-slate-500 mt-2">여러 개의 B/L 이미지를 스캔하여 자동으로 ERP 데이터를 생성합니다.</p>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept="image/*,application/pdf"
            disabled={isProcessing}
          />

          <div className="flex flex-col items-center pointer-events-none">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
            </div>
            {isProcessing ? (
               <div className="space-y-2">
                 <h3 className="text-lg font-semibold text-slate-800">문서 분석 중...</h3>
                 <p className="text-slate-500 text-sm">{progressMessage}</p>
               </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-800">파일을 드래그하거나 클릭하여 업로드</h3>
                <p className="text-slate-500 text-sm mt-1">지원 형식: JPG, PNG (최대 10MB)</p>
              </>
            )}
          </div>
        </div>

        {selectedFiles.length > 0 && !isProcessing && (
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-slate-600 mb-3 flex items-center justify-between">
              <span>선택된 파일 ({selectedFiles.length})</span>
              <button
                 onClick={() => setSelectedFiles([])}
                 className="text-xs text-red-500 hover:text-red-600"
              >
                모두 지우기
              </button>
            </h4>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={20} className="text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate font-medium">{file.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleProcessStart}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <CheckCircle size={20} />
                OCR 분석 시작
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};