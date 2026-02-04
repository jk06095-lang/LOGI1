
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Attachment, BaseWindowProps } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileImage, FileSpreadsheet, Download, Trash2, Edit2, UploadCloud, FolderOpen, AlertCircle } from 'lucide-react';
import { WindowFrame } from '../../components/ui/WindowFrame';

interface CloudFileManagerProps extends BaseWindowProps {
    attachments: Attachment[];
    onUpload: (files: File[]) => void;
    onDelete: (attachmentId: string) => void;
    onRename: (attachmentId: string, newName: string) => void;
}

export const CloudFileManager: React.FC<CloudFileManagerProps> = ({
    isOpen, isMinimized, onClose, onMinimize, attachments, onUpload, onDelete, onRename, zIndex = 100, onFocus, triggerRect, id
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string | null } | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Safe Rename States
    const [editNameBase, setEditNameBase] = useState("");
    const [editExtension, setEditExtension] = useState("");

    // Custom Alert State
    const [alertState, setAlertState] = useState<{ show: boolean; title: string; message: string }>({
        show: false, title: '', message: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        window.addEventListener('resize', handleClick);
        return () => {
            window.removeEventListener('click', handleClick);
            window.removeEventListener('resize', handleClick);
        };
    }, []);

    const handleValidationAndUpload = (filesToCheck: File[]) => {
        const validFiles: File[] = [];
        const oversizedFiles: string[] = [];
        const MAX_SIZE = 20 * 1024 * 1024; // 20MB

        filesToCheck.forEach(file => {
            if (file.size > MAX_SIZE) {
                oversizedFiles.push(file.name);
            } else {
                validFiles.push(file);
            }
        });

        if (oversizedFiles.length > 0) {
            setAlertState({
                show: true,
                title: "Upload Failed",
                message: `The following files exceed the 20MB limit:\n${oversizedFiles.join(', ')}`
            });
        }

        if (validFiles.length > 0) {
            onUpload(validFiles);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleValidationAndUpload(Array.from(e.dataTransfer.files));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleValidationAndUpload(Array.from(e.target.files));
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                // Split name and extension
                const lastDotIndex = file.name.lastIndexOf('.');
                if (lastDotIndex !== -1 && lastDotIndex > 0) {
                    setEditNameBase(file.name.substring(0, lastDotIndex));
                    setEditExtension(file.name.substring(lastDotIndex));
                } else {
                    setEditNameBase(file.name);
                    setEditExtension("");
                }
            }
        }
        setContextMenu(null);
    };

    const handleSubmitRename = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editingId && editNameBase.trim()) {
            const finalName = editNameBase.trim() + editExtension;
            onRename(editingId, finalName);
        }
        setEditingId(null);
        setEditNameBase("");
        setEditExtension("");
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

    const getFileIcon = (file: Attachment) => {
        const type = (file.type || '').toLowerCase();
        const name = (file.name || '').toLowerCase();

        // Excel (Green)
        if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv') ||
            name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
            return <FileSpreadsheet size={32} className="text-emerald-600" />;
        }

        // Word (Blue)
        if (type.includes('word') || type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) {
            return <FileText size={32} className="text-blue-600" />;
        }

        // PDF (Red)
        if (type.includes('pdf') || name.endsWith('.pdf')) {
            return <FileText size={32} className="text-red-500" />;
        }

        // Image (Purple)
        if (type.includes('image') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp')) {
            return <FileImage size={32} className="text-purple-500" />;
        }

        // Default (Generic File - Grey)
        return <FileText size={32} className="text-slate-400" />;
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
            initialWidth={700}
            initialHeight={480}
            title={
                <div className="flex items-center gap-2 justify-center">
                    <FolderOpen size={16} className="text-blue-500" />
                    Cloud Documents
                </div>
            }
        >
            {/* Main Container - Handles Drag & Drop */}
            <div className="flex flex-col h-full overflow-hidden"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
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
                    <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileInputChange} />
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
                            <p className="text-sm font-medium">Drag & Drop files here (Max 20MB)</p>
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
                                        className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer relative border ${isSelected
                                                ? 'bg-blue-100/50 border-blue-500 dark:bg-blue-900/40 dark:border-blue-400 shadow-md ring-1 ring-blue-500/50'
                                                : 'border-transparent hover:bg-white/40 dark:hover:bg-black/40'
                                            }`}
                                        title={file.name}
                                    >
                                        <div className="w-16 h-16 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-sm group-hover:scale-105 transition-transform group-hover:shadow-md border border-white/30 dark:border-white/10 backdrop-blur-sm pointer-events-none">
                                            {getFileIcon(file)}
                                        </div>

                                        {editingId === file.id ? (
                                            <form onSubmit={handleSubmitRename} className="w-full relative z-10 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    value={editNameBase}
                                                    onChange={(e) => setEditNameBase(e.target.value)}
                                                    onBlur={() => handleSubmitRename()}
                                                    className="w-full text-center text-xs bg-white dark:bg-black border border-blue-500 rounded px-1 py-0.5 outline-none shadow-sm text-slate-900 dark:text-white"
                                                />
                                                {editExtension && (
                                                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 bg-white/50 dark:bg-black/50 px-1 rounded">
                                                        {editExtension}
                                                    </span>
                                                )}
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
            </div>

            {/* Custom Alert Modal */}
            <AnimatePresence>
                {alertState.show && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                                    <AlertCircle size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{alertState.title}</h3>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 whitespace-pre-wrap">
                                {alertState.message}
                            </p>
                            <button
                                onClick={() => setAlertState(prev => ({ ...prev, show: false }))}
                                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
                            >
                                OK
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Context Menu - Rendered via Portal to escape overflow/transform clipping */}
            {contextMenu && createPortal(
                <div
                    className="fixed z-[9999] min-w-[160px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in text-xs font-medium"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    onContextMenu={(e) => e.preventDefault()} // Prevent browser menu on custom menu
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
                </div>,
                document.body
            )}
        </WindowFrame>
    );
};
