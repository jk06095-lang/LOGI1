import React, { useMemo, useState, useRef, useEffect } from 'react';
import { BLData, VesselJob, Attachment } from '../types';
import { Folder, FileText, FileImage, FileSpreadsheet, Download, Trash2, Search, ArrowLeft, Cloud, Ship, Box, X, Share2, Info, UploadCloud } from 'lucide-react';
import { dataService } from '../services/dataService'; 
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalCloudManagerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: VesselJob[];
  bls: BLData[];
  onUpdateBL: (blId: string, updates: Partial<BLData>) => Promise<void>;
  zIndex: number;
  onFocus?: () => void;
}

// Helper to get file icon
const getFileIcon = (file: Attachment) => {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
        return <FileSpreadsheet size={40} className="text-emerald-600" />;
    }
    if (type.includes('word') || type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) {
        return <FileText size={40} className="text-blue-600" />;
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
        return <FileText size={40} className="text-red-500" />;
    }
    if (type.includes('image') || name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.webp')) {
        return <FileImage size={40} className="text-purple-500" />;
    }
    return <FileText size={40} className="text-slate-400" />;
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

type WindowState = 'default' | 'tall' | 'maximized';

export const GlobalCloudManager: React.FC<GlobalCloudManagerProps> = ({ isOpen, onClose, jobs, bls, onUpdateBL, zIndex, onFocus }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // null = All/Root, or specific folder ID
  const [searchTerm, setSearchTerm] = useState('');
  const [windowState, setWindowState] = useState<WindowState>('default');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: (Attachment & { blId: string }) | null } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Aggregation Logic for Sidebar Tree
  const folders = useMemo(() => {
      const map = new Map<string, { id: string; name: string; files: (Attachment & { blId: string })[] }>();
      
      // Initialize folders from jobs
      jobs.forEach(j => {
          map.set(j.id, { id: j.id, name: j.vesselName, files: [] });
      });
      // Add Unassigned folder
      map.set('unassigned', { id: 'unassigned', name: 'Unassigned', files: [] });

      // Populate files
      bls.forEach(bl => {
          const targetId = bl.vesselJobId && map.has(bl.vesselJobId) ? bl.vesselJobId : 'unassigned';
          const attachments = bl.attachments || [];
          const enrichedAttachments = attachments.map(att => ({ ...att, blId: bl.id }));
          
          if (map.has(targetId)) {
              map.get(targetId)?.files.push(...enrichedAttachments);
          } else {
              // Fallback for stale job IDs
              map.get('unassigned')?.files.push(...enrichedAttachments);
          }
      });

      // Filter: Keep folders that have files OR match search term if needed (but sidebar usually shows structure)
      let result = Array.from(map.values());
      
      // Sort: Folders with files first, then by Name
      result.sort((a, b) => {
          if (a.files.length > 0 && b.files.length === 0) return -1;
          if (a.files.length === 0 && b.files.length > 0) return 1;
          return a.name.localeCompare(b.name);
      });

      return result;
  }, [jobs, bls]);

  // Derive Current Content
  const displayedFiles = useMemo(() => {
      let files: (Attachment & { blId: string })[] = [];
      
      if (currentFolderId === 'all' || currentFolderId === null) {
          // Flatten all files
          files = folders.flatMap(f => f.files);
      } else {
          const folder = folders.find(f => f.id === currentFolderId);
          files = folder ? folder.files : [];
      }

      if (searchTerm.trim() !== '') {
          files = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      return files;
  }, [currentFolderId, folders, searchTerm]);

  // Window Controls
  const handleYellowClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWindowState(prev => prev === 'tall' ? 'default' : 'tall');
  };

  const handleGreenClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWindowState(prev => prev === 'maximized' ? 'default' : 'maximized');
  };

  const getWindowDimensions = () => {
      switch (windowState) {
          case 'tall': return { width: 950, height: '90vh' };
          case 'maximized': return { width: '95vw', height: '95vh' };
          default: return { width: 900, height: 600 };
      }
  };
  const dimensions = getWindowDimensions();

  // Actions
  const handleContextMenu = (e: React.MouseEvent, file: Attachment & { blId: string }) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleDeleteFile = async (file: Attachment & { blId: string }) => {
      if (!window.confirm(`Delete ${file.name}?`)) return;
      try {
          await dataService.updateAttachmentsTransaction(file.blId, 'remove', file.id);
      } catch (error) {
          console.error("Delete failed", error);
          alert("Could not delete file. Please try again.");
      }
      setContextMenu(null);
  };

  const handleDownloadFile = (url: string) => {
      window.open(url, '_blank');
      setContextMenu(null);
  };

  const handleShareFile = (url: string) => {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
      setContextMenu(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
            key="global-cloud-popup"
            drag
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
            animate={{ 
                opacity: 1, 
                scale: 1, 
                width: dimensions.width,
                height: dimensions.height,
                x: 100,
                y: 50
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: zIndex 
            }}
            className="flex flex-col rounded-2xl shadow-2xl border border-white/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl backdrop-saturate-150 overflow-hidden pointer-events-auto"
            onPointerDown={onFocus}
        >
            {/* Header (Mac Style) */}
            <div className="h-12 bg-gradient-to-b from-white/20 to-transparent flex items-center px-5 shrink-0 border-b border-white/10 cursor-grab active:cursor-grabbing">
                <div className="flex gap-2 group mr-4" onPointerDown={(e) => e.stopPropagation()}>
                    <button onClick={onClose} className="w-4 h-4 rounded-full bg-[#FF5F57] border border-[#E0443E] shadow-sm flex items-center justify-center hover:bg-[#FF5F57]/80 transition-transform hover:scale-110">
                        <X size={10} className="opacity-0 group-hover:opacity-100 text-black/50" strokeWidth={3} />
                    </button>
                    <button onClick={handleYellowClick} className="w-4 h-4 rounded-full bg-[#FEBC2E] border border-[#D89E24] shadow-sm flex items-center justify-center hover:bg-[#FEBC2E]/80 transition-transform hover:scale-110">
                        <div className="w-2 h-0.5 bg-black/40 opacity-0 group-hover:opacity-100"></div>
                    </button>
                    <button onClick={handleGreenClick} className="w-4 h-4 rounded-full bg-[#28C840] border border-[#1AAB29] shadow-sm flex items-center justify-center hover:bg-[#28C840]/80 transition-transform hover:scale-110">
                        <div className="w-1.5 h-1.5 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full"></div>
                    </button>
                </div>
                
                <div className="flex-1 flex justify-center gap-2 font-bold text-slate-700 dark:text-white/90 text-sm select-none">
                    Cloud Manager
                </div>
                
                <div className="w-20"></div> {/* Spacer */}
            </div>

            {/* Finder Body Layout */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* Sidebar */}
                <div className="w-60 bg-white/40 dark:bg-black/20 backdrop-blur-md border-r border-white/10 flex flex-col p-2 select-none overflow-y-auto custom-scrollbar">
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-3 mb-2 mt-2">Library</p>
                        <div 
                            onClick={() => setCurrentFolderId(null)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${!currentFolderId ? 'bg-blue-500 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}
                        >
                            <Cloud size={16} />
                            <span className="text-xs font-medium">All Files</span>
                        </div>
                        <div 
                            onClick={() => setCurrentFolderId('unassigned')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${currentFolderId === 'unassigned' ? 'bg-blue-500 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}
                        >
                            <Box size={16} />
                            <span className="text-xs font-medium">Unassigned</span>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-3 mb-2">Vessels</p>
                        {folders.filter(f => f.id !== 'unassigned').map(folder => (
                            <div 
                                key={folder.id}
                                onClick={() => setCurrentFolderId(folder.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${currentFolderId === folder.id ? 'bg-blue-500 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}
                            >
                                <Ship size={16} />
                                <span className="text-xs font-medium truncate">{folder.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-white/60 dark:bg-slate-900/40">
                    
                    {/* Toolbar */}
                    <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between shrink-0">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <button 
                                onClick={() => setCurrentFolderId(null)}
                                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                                title="Back to All"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <span className="text-xs font-medium">
                                {currentFolderId === null ? 'All Files' : 
                                 currentFolderId === 'unassigned' ? 'Unassigned' : 
                                 folders.find(f => f.id === currentFolderId)?.name || 'Unknown'}
                            </span>
                            <span className="text-[10px] opacity-60">({displayedFiles.length} items)</span>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input 
                                type="text" 
                                placeholder="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1 bg-black/5 dark:bg-white/10 border border-transparent focus:bg-white dark:focus:bg-black focus:border-blue-500 rounded-md text-xs w-48 outline-none transition-all text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* File Grid */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" onContextMenu={(e) => e.stopPropagation()}>
                        {displayedFiles.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Folder size={48} className="opacity-20 mb-2" />
                                <p className="text-sm">No files found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start">
                                {displayedFiles.map((file, idx) => (
                                    <div 
                                        key={file.id + idx}
                                        onContextMenu={(e) => handleContextMenu(e, file)}
                                        onDoubleClick={() => handleDownloadFile(file.url)}
                                        className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-blue-500/10 dark:hover:bg-blue-400/20 cursor-pointer transition-colors border border-transparent hover:border-blue-500/30"
                                        title={file.name}
                                    >
                                        <div className="w-16 h-16 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200 pointer-events-none">
                                            {getFileIcon(file)}
                                        </div>
                                        <div className="text-center w-full">
                                            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate w-full px-1">
                                                {file.name}
                                            </p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                {formatSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu Portal */}
            {contextMenu && createPortal(
                <div 
                    className="fixed z-[9999] min-w-[160px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in text-xs font-medium"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} 
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <div className="px-3 py-2 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200/50 dark:border-slate-700/50 mb-1 bg-white/20 dark:bg-black/20 truncate max-w-[200px]">
                        {contextMenu.file?.name}
                    </div>
                    
                    <button 
                        onClick={() => contextMenu.file && handleDownloadFile(contextMenu.file.url)} 
                        className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white dark:text-slate-200 flex items-center gap-2 transition-colors"
                    >
                        <Download size={14} /> Download
                    </button>

                    <button 
                        onClick={() => contextMenu.file && handleShareFile(contextMenu.file.url)} 
                        className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white dark:text-slate-200 flex items-center gap-2 transition-colors"
                    >
                        <Share2 size={14} /> Copy Link
                    </button>

                    <button 
                        className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white dark:text-slate-200 flex items-center gap-2 transition-colors"
                        onClick={() => alert(`Size: ${formatSize(contextMenu.file?.size || 0)}\nType: ${contextMenu.file?.type}\nDate: ${new Date(contextMenu.file?.uploadDate || '').toLocaleString()}`)}
                    >
                        <Info size={14} /> Details
                    </button>
                    
                    <div className="h-px bg-slate-200/50 dark:bg-slate-700/50 my-1 mx-2"></div>
                    
                    <button 
                        onClick={() => contextMenu.file && handleDeleteFile(contextMenu.file)}
                        className="w-full text-left px-3 py-2 hover:bg-red-500 hover:text-white text-red-500 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>,
                document.body
            )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};