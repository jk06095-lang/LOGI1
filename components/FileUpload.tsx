
import React, { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  progressMessage?: string;
}

export interface FileUploadRef {
  reset: () => void;
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ onFilesSelected, isProcessing, progressMessage }, ref) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    reset: () => setSelectedFiles([])
  }));

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
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessStart = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Hidden file input — click-to-browse only, NOT for drag-drop */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
        accept="image/*,application/pdf"
        disabled={isProcessing}
      />
      <div className="w-full h-full flex flex-col">
        <div
          className={`flex-1 relative rounded-2xl p-8 text-center transition-all duration-300 flex flex-col items-center justify-center border-2 border-dashed cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300/0 hover:border-blue-400/50'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isProcessing && inputRef.current?.click()}
        >
          <div className="flex flex-col items-center pointer-events-none transform transition-transform duration-300 hover:scale-105">
            <div className="w-20 h-20 bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10 backdrop-blur-md">
              {isProcessing ? <Loader2 className="animate-spin" size={36} /> : <Upload size={36} />}
            </div>
            {isProcessing ? (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Processing...</h3>
                <p className="text-slate-500 dark:text-slate-300 text-sm font-medium">{progressMessage}</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Drag & Drop or Click</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Supports JPG, PNG, PDF (Max 10MB)</p>
              </>
            )}
          </div>
        </div>

        {selectedFiles.length > 0 && !isProcessing && (
          <div className="mt-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selected ({selectedFiles.length})</span>
              <button onClick={() => setSelectedFiles([])} className="text-xs text-red-500 hover:text-red-600 font-bold">Clear All</button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar mb-6">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 bg-blue-100/50 rounded-lg text-blue-600"><FileText size={16} /></div>
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate font-bold">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1 hover:bg-slate-100 rounded-full">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleProcessStart}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
            >
              <CheckCircle size={18} />
              Start OCR Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
