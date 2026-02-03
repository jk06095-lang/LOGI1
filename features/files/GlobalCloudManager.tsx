
import React, { useMemo, useState, useEffect } from 'react';
import { BLData, VesselJob, Attachment, BaseWindowProps } from '../../types';
import { FileText, FileImage, FileSpreadsheet, Download, Search, X, FolderOpen, Ship, Box, Minus, Maximize2, Trash2, Edit2 } from 'lucide-react';
import { dataService } from '../../services/dataService'; 
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface GlobalCloudManagerProps extends BaseWindowProps {
  jobs: VesselJob[];
  bls: BLData[];
  onUpdateBL: (blId: string, updates: Partial<BLData>) => Promise<void>;
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

type WindowState = 'default' | 'maximized';

export const GlobalCloudManager: React.FC<GlobalCloudManagerProps> = ({ 
  isOpen, isMinimized, onClose, onMinimize, jobs, bls, onUpdateBL, zIndex, onFocus, triggerRect 
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // null = All/Root
  const [searchTerm, setSearchTerm] = useState('');
  const [windowState, setWindowState] = useState<WindowState>('default');
  
  // Rename State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameBase, setEditNameBase] = useState("");
  const [editExtension, setEditExtension] = useState("");

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: (Attachment & { blId: string }) | null } | null>(null);

  useEffect(() => {
    const handleClick = () => {
        setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Aggregation Logic for Sidebar Tree
  const folders = useMemo(() => {
      const map = new Map<string, { id: string; name: string; files: (Attachment & { blId: string })[] }>();
      
      // Initialize folders from jobs
      jobs.forEach(j => {
          // Extract last 3 chars of voyage
          const shortVoyage = j.voyageNo.trim().length > 3 ? j.voyageNo.trim().slice(-3) : j.voyageNo.trim();
          map.set(j.id, { id: j.id, name: `${j.vesselName} (${shortVoyage})`, files: [] });
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
              map.get('unassigned')?.files.push(...enrichedAttachments);
          }
      });

      let result = Array.from(map.values());
      // Sort: Folders with files first, then by Name
      result.sort((a, b) => {
          if (a.id === 'unassigned') return 1; // Unassigned at bottom
          if (b.id === 'unassigned') return -1;
          if (a.files.length > 0 && b.files.length === 0) return -1;
          if (a.files.length === 0 && b.files.length > 0) return 1;
          return a.name.localeCompare(b.name);
      });

      return result;
  }, [jobs, bls]);

  // Derive Current Content
  const displayedFiles = useMemo(() => {
      let files: (Attachment & { blId: string })[] = [];
      
      if (currentFolderId === null) {
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
      if (onMinimize) onMinimize();
  };

  const handleGreenClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWindowState(prev => prev === 'maximized' ? 'default' : 'maximized');
  };

  const getWindowDimensions = () => {
      switch (windowState) {
          case 'maximized': return { width: '95vw', height: '90vh', x: '2.5vw', y: '5vh' };
          default: return { width: 950, height: 600, x: 100, y: 50 }; // Default fixed position for simplicity
      }
  };
  const dims = getWindowDimensions();

  const variants: Variants = useMemo(() => {
      // Default
      if (!triggerRect) {
          return {
              initial: { opacity: 0, scale: 0.95 },
              animate: { 
                  opacity: isMinimized ? 0 : 1, 
                  scale: isMinimized ? 0.9 : 1,
                  width: dims.width,
                  height: dims.height,
                  x: windowState === 'maximized' ? 0 : undefined,
                  y: windowState === 'maximized' ? 0 : undefined,
                  pointerEvents: isMinimized ? 'none' : 'auto'
              },
              exit: { opacity: 0, scale: 0.95 }
          };
      }

      // Genie Effect
      return {
          initial: {
              position: 'fixed',
              left: triggerRect.x,
              top: triggerRect.y,
              width: triggerRect.width,
              height: triggerRect.height,
              opacity: 0,
              scale: 0,
              borderRadius: "100px",
          },
          animate: {
              position: 'fixed',
              // Use fixed positioning for the window if not maximized, else center
              left: windowState === 'maximized' ? '2.5vw' : '10vw',
              top: windowState === 'maximized' ? '5vh' : '10vh',
              width: dims.width,
              height: dims.height,
              opacity: isMinimized ? 0 : 1,
              scale: isMinimized ? 0 : 1,
              borderRadius: "24px",
              pointerEvents: isMinimized ? 'none' : 'auto',
              transition: { type: "spring", stiffness: 300, damping: 28 }
          },
          exit: {
              position: 'fixed',
              left: triggerRect.x,
              top: triggerRect.y,
              width: triggerRect.width,
              height: triggerRect.height,
              opacity: 0,
              scale: 0,
              borderRadius: "100px",
              transition: { duration: 0.3, ease: "anticipate" }
          }
      };
  }, [triggerRect, isMinimized, dims, windowState]);

  // Context Menu Actions
  const handleContextMenu = (e: React.MouseEvent, file: Attachment & { blId: string }) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleStartRename = () => {
      if (contextMenu?.file) {
          const file = contextMenu.file;
          setEditingId(file.id);
          const lastDotIndex = file.name.lastIndexOf('.');
          if (lastDotIndex !== -1 && lastDotIndex > 0) {
              setEditNameBase(file.name.substring(0, lastDotIndex));
              setEditExtension(file.name.substring(lastDotIndex));
          } else {
              setEditNameBase(file.name);
              setEditExtension("");
          }
      }
      setContextMenu(null);
  };

  const handleSubmitRename = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (editingId && editNameBase.trim()) {
          const file = displayedFiles.find(f => f.id === editingId);
          if (file) {
              const finalName = editNameBase.trim() + editExtension;
              try {
                  await dataService.updateAttachmentsTransaction(file.blId, 'rename', { id: file.id, newName: finalName });
              } catch (error) {
                  console.error("Rename failed", error);
                  alert("Could not rename file.");
              }
          }
      }
      setEditingId(null);
      setEditNameBase("");
      setEditExtension("");
  };

  const handleDeleteFile = async (file: Attachment & { blId: string }) => {
      if (!window.confirm(`Delete ${file.name}?`)) return;
      try {
          await dataService.updateAttachmentsTransaction(file.blId, 'remove', file.id);
      } catch (error) {
          console.error("Delete failed", error);
          alert("Could not delete file.");
      }
      setContextMenu(null);
  };

  const handleDownloadFile = (url: string) => {
      window.open(url, '_blank');
      setContextMenu(null);
  };

  const handleContainerClick = () => {
      if (editingId) handleSubmitRename();
  };

  // If closed completely, don't render. If minimized, render but hidden (controlled by App.tsx wrapper usually, but we can handle opacity here)
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
          key="global-cloud-popup"
          drag={windowState !== 'maximized'}
          dragMomentum={false}
          dragElastic={0.1}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          style={{ 
              zIndex: zIndex,
              // Fallback if no trigger
              ...(triggerRect ? {} : { position: 'fixed', left: windowState === 'maximized' ? '2.5vw' : '10vw', top: windowState === 'maximized' ? '5vh' : '10vh' })
          }}
          className={`flex flex-col rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/30 dark:border-white/20 overflow-hidden 
            bg-white/15 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150
            ${isMinimized ? 'pointer-events-none' : ''}`}
          onPointerDown={onFocus}
      >
          {/* Mac-style Header */}
          <div className="h-12 bg-gradient-to-b from-white/10 to-transparent flex items-center px-4 shrink-0 border-b border-white/10 cursor-grab active:cursor-grabbing">
              <div className="flex gap-2 group mr-4" onPointerDown={(e) => e.stopPropagation()}>
                  <button onClick={onClose} className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] border border-[#E0443E] shadow-sm flex items-center justify-center hover:bg-[#FF5F57]/80 transition-transform hover:scale-110 active:scale-95 group/btn">
                      <X size={8} className="opacity-0 group-hover/btn:opacity-100 text-black/60" strokeWidth={3} />
                  </button>
                  <button onClick={handleYellowClick} className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E] border border-[#D89E24] shadow-sm flex items-center justify-center hover:bg-[#FEBC2E]/80 transition-transform hover:scale-110 active:scale-95 group/btn">
                      <Minus size={8} className="opacity-0 group-hover/btn:opacity-100 text-black/60" strokeWidth={4} />
                  </button>
                  <button onClick={handleGreenClick} className="w-3.5 h-3.5 rounded-full bg-[#28C840] border border-[#1AAB29] shadow-sm flex items-center justify-center hover:bg-[#28C840]/80 transition-transform hover:scale-110 active:scale-95 group/btn">
                      <Maximize2 size={8} className="opacity-0 group-hover/btn:opacity-100 text-black/60" strokeWidth={3} />
                  </button>
              </div>
              
              <div className="flex-1 text-center font-bold text-slate-700 dark:text-white/90 text-sm select-none flex items-center justify-center gap-2">
                  <FolderOpen size={16} className="text-blue-500" />
                  Global Cloud
              </div>
              
              <div className="w-16"></div> 
          </div>

          <div className="flex flex-1 overflow-hidden">
              
              {/* Internal Sidebar */}
              <div className="w-64 bg-white/5 dark:bg-black/10 border-r border-white/10 flex flex-col select-none overflow-y-auto custom-scrollbar">
                  <div className="p-3">
                      <div 
                          onClick={() => setCurrentFolderId(null)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all mb-4 ${currentFolderId === null ? 'bg-blue-500/80 text-white shadow-md backdrop-blur-sm' : 'hover:bg-white/10 text-slate-700 dark:text-slate-300'}`}
                      >
                          <FolderOpen size={18} />
                          <span className="text-sm font-bold">All Files</span>
                          <span className="ml-auto text-xs opacity-70 bg-black/10 px-1.5 rounded-full">{folders.reduce((acc, f) => acc + f.files.length, 0)}</span>
                      </div>

                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2 mb-2">Vessel Jobs</p>
                      
                      <div className="space-y-1">
                          {folders.map(folder => {
                              const isActive = currentFolderId === folder.id;
                              const count = folder.files.length;
                              if (count === 0 && !isActive && folder.id !== 'unassigned') return null; // Hide empty folders unless active

                              return (
                                  <div 
                                      key={folder.id}
                                      onClick={() => setCurrentFolderId(folder.id)}
                                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                                          isActive 
                                          ? 'bg-blue-100/50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 font-bold shadow-sm' 
                                          : 'text-slate-600 dark:text-slate-400 hover:bg-white/10'
                                      }`}
                                  >
                                      {folder.id === 'unassigned' ? <Box size={14} className="opacity-70" /> : <Ship size={14} className="opacity-70" />}
                                      <span className="text-xs truncate flex-1">{folder.name}</span>
                                      {count > 0 && <span className="text-[10px] bg-slate-200/50 dark:bg-white/10 px-1.5 rounded text-slate-500 dark:text-slate-400">{count}</span>}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>

              {/* Main Grid Area */}
              <div className="flex-1 flex flex-col relative">
                  
                  {/* Toolbar */}
                  <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between shrink-0 bg-white/5 dark:bg-black/5">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <span className="text-xs font-bold">
                              {currentFolderId === null ? 'Library' : folders.find(f => f.id === currentFolderId)?.name || 'Unknown'}
                          </span>
                          <span className="text-[10px] opacity-60">
                              {displayedFiles.length} items
                          </span>
                      </div>

                      <div className="relative group">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                          <input 
                              type="text" 
                              placeholder="Search files..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8 pr-3 py-1.5 bg-black/5 dark:bg-white/10 border border-transparent focus:bg-white/20 dark:focus:bg-black/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 rounded-lg text-xs w-48 outline-none transition-all text-slate-800 dark:text-white placeholder-slate-500"
                          />
                      </div>
                  </div>

                  {/* File Grid */}
                  <div 
                      className="flex-1 overflow-y-auto p-5 custom-scrollbar" 
                      onContextMenu={(e) => e.stopPropagation()}
                      onClick={handleContainerClick}
                  >
                      {displayedFiles.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400/60">
                              <FolderOpen size={64} className="opacity-20 mb-3" />
                              <p className="text-sm font-medium">No files in this location</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 content-start">
                              {displayedFiles.map((file, idx) => (
                                  <motion.div 
                                      key={file.id + idx}
                                      layoutId={file.id}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                                      onContextMenu={(e) => handleContextMenu(e, file)}
                                      onDoubleClick={() => handleDownloadFile(file.url)}
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          if (editingId && editingId !== file.id) handleSubmitRename();
                                      }}
                                      className={`group flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-blue-500/10 dark:hover:bg-blue-400/10 cursor-pointer transition-all border border-transparent hover:border-blue-500/20 active:scale-95 min-h-[120px] ${editingId === file.id ? 'bg-blue-500/10 dark:bg-blue-400/10 border-blue-500/30' : ''}`}
                                      title={file.name}
                                  >
                                      <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-white/40 dark:bg-slate-800/40 rounded-2xl shadow-sm group-hover:scale-105 transition-transform duration-200 pointer-events-none border border-white/20 dark:border-white/5 backdrop-blur-sm">
                                          {getFileIcon(file)}
                                      </div>
                                      <div className="text-center w-full px-1">
                                          {editingId === file.id ? (
                                              <form onSubmit={handleSubmitRename} onClick={(e) => e.stopPropagation()}>
                                                  <input 
                                                      autoFocus
                                                      value={editNameBase}
                                                      onChange={(e) => setEditNameBase(e.target.value)}
                                                      onBlur={() => handleSubmitRename()}
                                                      className="w-full text-center text-[11px] bg-white/90 dark:bg-black/80 border border-blue-500 rounded px-1 py-0.5 outline-none shadow-sm text-slate-900 dark:text-white"
                                                  />
                                                  {editExtension && (
                                                      <span className="text-[9px] text-slate-500 font-mono mt-0.5 bg-white/50 dark:bg-black/50 px-1 rounded block">
                                                          {editExtension}
                                                      </span>
                                                  )}
                                              </form>
                                          ) : (
                                              <>
                                                  <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 break-words line-clamp-3 leading-tight" title={file.name}>
                                                      {file.name}
                                                  </p>
                                                  <p className="text-[9px] text-slate-400 mt-1">
                                                      {formatSize(file.size)}
                                                  </p>
                                              </>
                                          )}
                                      </div>
                                  </motion.div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Context Menu */}
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
                      onClick={handleStartRename} 
                      className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white dark:text-slate-200 flex items-center gap-2 transition-colors"
                  >
                      <Edit2 size={14} /> Rename
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
    </AnimatePresence>
  );
};