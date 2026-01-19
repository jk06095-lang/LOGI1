
import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileImage, X, Download, Trash2, Edit2, UploadCloud, FolderOpen, Check } from 'lucide-react';

interface CloudFileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: Attachment[];
  onUpload: (files: File[]) => void;
  onDelete: (attachmentId: string) => void;
  onRename: (attachmentId: string, newName: string) => void;
}

type WindowState = 'default' | 'tall' | 'maximized';

export const CloudFileManager: React.FC<CloudFileManagerProps> = ({ 
  isOpen, onClose, attachments, onUpload, onDelete, onRename 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string | null } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  
  // Window State Logic (Traffic Lights)
  const [windowState, setWindowState] = useState<WindowState>('default');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    // Also close on resize/scroll to avoid floating menu detachment
    window.addEventListener('resize', handleClick);
    return () => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('resize', handleClick);
    };
  }, []);

  // Handlers for Traffic Lights
  const handleYellowClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWindowState(prev => prev === 'tall' ? 'default' : 'tall');
  };

  const handleGreenClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWindowState(prev => prev === 'maximized' ? 'default' : 'maximized');
  };

  // Dynamic Styles
  const getWindowDimensions = () => {
      switch (windowState) {
          case 'tall': return { width: 450, height: '80vh' };
          case 'maximized': return { width: 900, height: '80vh' };
          default: return { width: 700, height: 480 };
      }
  };
  const dimensions = getWindowDimensions();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
      // Clear selection only if clicking directly on the container background
      if (e.target === containerRef.current) {
          setSelectedIds([]);
          setContextMenu(null);
          if (editingId) {
              handleSubmitRename();
          }
      }
  };

  const handleFileClick = (e: React.MouseEvent, fileId: string) => {
      e.stopPropagation();
      // If editing another file, commit that edit first
      if (editingId && editingId !== fileId) {
          handleSubmitRename();
      }

      // Multi-selection logic
      if (e.ctrlKey || e.metaKey) {
          setSelectedIds(prev => {
              if (prev.includes(fileId)) return prev.filter(id => id !== fileId);
              return [...prev, fileId];
          });
      } else {
          // Single selection (unless already editing this one)
          if (editingId !== fileId) {
              setSelectedIds([fileId]);
          }
      }
  };

  const handleFileDoubleClick = (e: React.MouseEvent, file: Attachment) => {
      e.stopPropagation();
      handleDownload(file);
  };

  // Critical: Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
      e.preventDefault(); // Prevent browser default context menu
      e.stopPropagation(); // Stop bubbling
      
      // Auto-select if right-clicked item is not in current selection
      if (!selectedIds.includes(fileId)) {
          setSelectedIds([fileId]);
      }
      
      // Set coordinates for custom menu
      setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  const handleDownload = (attachment: Attachment) => {
      window.open(attachment.url, '_blank');
  };

  const handleBulkDownload = () => {
      const filesToDownload = attachments.filter(a => selectedIds.includes(a.id));
      filesToDownload.forEach(file => {
          // Trigger download in new tab/window
          window.open(file.url, '_blank');
      });
      setContextMenu(null);
  };

  const handleStartRename = () => {
      // We prioritize the file that was right-clicked if tracked in contextMenu, otherwise use single selection logic
      const targetId = (contextMenu?.fileId && selectedIds.includes(contextMenu.fileId)) 
          ? contextMenu.fileId 
          : selectedIds[0];

      if (targetId) {
          const file = attachments.find(a => a.id === targetId);
          if (file) {
              setEditingId(file.id);
              setEditName(file.name);
          }
      }
      setContextMenu(null);
  };

  const handleSubmitRename = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (editingId && editName.trim()) {
          onRename(editingId, editName.trim());
      }
      setEditingId(null);
  };

  const handleBulkDelete = () => {
      if (window.confirm(`Are you sure you want to delete ${selectedIds.length} item(s)?`)) {
          selectedIds.forEach(id => onDelete(id));
          setSelectedIds([]);
      }
      setContextMenu(null);
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
      if (type.includes('image')) return <FileImage size={32} className="text-purple-500" />;
      if (type.includes('pdf')) return <FileText size={32} className="text-red-500" />;
      return <FileText size={32} className="text-blue-500" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            key="cloud-manager-window"
            drag
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                width: dimensions.width,
                height: dimensions.height
            }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            style={{ 
                position: 'fixed',
                bottom: 40,
                right: 40,
                zIndex: 100 
            }}
            className="flex flex-col rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/30 dark:border-white/20 bg-white/15 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150 overflow-hidden pointer-events-auto"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {/* Header (Traffic Lights & Drag Handle) */}
            <div className="h-12 bg-gradient-to-b from-white/10 to-transparent flex items-center px-5 shrink-0 border-b border-white/10 cursor-grab active:cursor-grabbing">
                <div className="flex gap-2 group mr-4" onPointerDown={(e) => e.stopPropagation()}>
                    {/* Red: Close */}
                    <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] shadow-sm flex items-center justify-center hover:bg-[#FF5F57]/80 transition-colors">
                        <X size={8} className="opacity-0 group-hover:opacity-100 text-black/50" strokeWidth={3} />
                    </button>
                    {/* Yellow: Tall */}
                    <button onClick={handleYellowClick} className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] shadow-sm flex items-center justify-center hover:bg-[#FEBC2E]/80 transition-colors">
                        <div className="w-2 h-0.5 bg-black/40 opacity-0 group-hover:opacity-100"></div>
                    </button>
                    {/* Green: Maximize */}
                    <button onClick={handleGreenClick} className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] shadow-sm flex items-center justify-center hover:bg-[#28C840]/80 transition-colors">
                        <div className="w-1.5 h-1.5 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full"></div>
                    </button>
                </div>
                <div className="flex-1 text-center font-bold text-slate-700 dark:text-white/90 text-sm flex items-center justify-center gap-2 select-none">
                    <FolderOpen size={16} className="text-blue-500" />
                    Cloud Documents
                </div>
                <div className="w-10"></div> {/* Spacer for center alignment */}
            </div>

            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium ml-1">
                    {attachments.length} Files {selectedIds.length > 0 && <span className="text-blue-500 font-bold">({selectedIds.length} Selected)</span>}
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                    <UploadCloud size={14} /> Upload
                </button>
                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && onUpload(Array.from(e.target.files))} />
            </div>

            {/* Content Grid */}
            <div 
                ref={containerRef}
                onClick={handleContainerClick}
                className={`flex-1 overflow-y-auto p-6 relative transition-colors custom-scrollbar ${isDragOver ? 'bg-blue-500/10' : ''}`}
            >
                {attachments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500/60 dark:text-slate-400/60 gap-3 border-2 border-dashed border-white/20 rounded-2xl m-4 pointer-events-none">
                        <UploadCloud size={48} className="opacity-50" />
                        <p className="text-sm font-medium">Drag & Drop files here</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                        {attachments.map(file => {
                            const isSelected = selectedIds.includes(file.id);
                            return (
                                <div 
                                    key={file.id}
                                    onContextMenu={(e) => handleContextMenu(e, file.id)}
                                    onClick={(e) => handleFileClick(e, file.id)}
                                    onDoubleClick={(e) => handleFileDoubleClick(e, file)}
                                    onPointerDown={(e) => e.stopPropagation()} // Prevent dragging the window when clicking a file
                                    className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer relative border ${
                                        isSelected 
                                        ? 'bg-blue-100/50 border-blue-500 dark:bg-blue-900/40 dark:border-blue-400 shadow-md ring-1 ring-blue-500/50' 
                                        : 'border-transparent hover:bg-white/40 dark:hover:bg-black/40'
                                    }`}
                                    title={file.name}
                                >
                                    <div className="w-16 h-16 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-sm group-hover:scale-105 transition-transform group-hover:shadow-md border border-white/30 dark:border-white/10 backdrop-blur-sm pointer-events-none">
                                        {getFileIcon(file.type)}
                                    </div>
                                    
                                    {editingId === file.id ? (
                                        <form onSubmit={handleSubmitRename} className="w-full relative z-10" onClick={e => e.stopPropagation()}>
                                            <input 
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={() => handleSubmitRename()}
                                                className="w-full text-center text-xs bg-white dark:bg-black border border-blue-500 rounded px-1 py-0.5 outline-none shadow-sm text-slate-900 dark:text-white"
                                            />
                                        </form>
                                    ) : (
                                        <div className="text-center w-full">
                                            <p className={`text-xs font-bold truncate w-full px-1 ${isSelected ? 'text-blue-700 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {file.name}
                                            </p>
                                            <p className={`text-[9px] font-medium ${isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {formatSize(file.size)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Context Menu (Liquid Glass Style) */}
            {contextMenu && (
                <div 
                    className="fixed z-[9999] min-w-[160px] bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-white/40 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in text-xs font-medium"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    <div className="px-3 py-2 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200/50 dark:border-slate-700/50 mb-1 bg-white/20 dark:bg-black/20">
                        {selectedIds.length} Selected
                    </div>
                    
                    <button 
                        onClick={handleBulkDownload} 
                        className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white dark:text-slate-200 flex items-center gap-2 transition-colors"
                    >
                        <Download size={14} /> Download
                    </button>
                    
                    {selectedIds.length === 1 && (
                        <button 
                            onClick={handleStartRename}
                            className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white dark:text-slate-200 flex items-center gap-2 transition-colors"
                        >
                            <Edit2 size={14} /> Rename
                        </button>
                    )}
                    
                    <div className="h-px bg-slate-200/50 dark:bg-slate-700/50 my-1 mx-2"></div>
                    
                    <button 
                        onClick={handleBulkDelete}
                        className="w-full text-left px-3 py-2 hover:bg-red-500 hover:text-white text-red-500 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
