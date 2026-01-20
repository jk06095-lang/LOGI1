
import React, { useMemo, useState } from 'react';
import { BLData, VesselJob, Attachment } from '../types';
import { Folder, FileText, FileImage, FileSpreadsheet, Download, Trash2, Search, ArrowLeft, Cloud, Ship, Box } from 'lucide-react';

interface GlobalCloudManagerProps {
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

export const GlobalCloudManager: React.FC<GlobalCloudManagerProps> = ({ jobs, bls, onUpdateBL }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Aggregation Logic
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

      // Filter: Keep folders that have files OR match search term
      let result = Array.from(map.values());
      
      // Sort: Folders with files first, then by Name
      result.sort((a, b) => {
          if (a.files.length > 0 && b.files.length === 0) return -1;
          if (a.files.length === 0 && b.files.length > 0) return 1;
          return a.name.localeCompare(b.name);
      });

      return result;
  }, [jobs, bls]);

  // Derive Current Folder View
  const currentFolder = useMemo(() => {
      if (!currentFolderId) return null;
      return folders.find(f => f.id === currentFolderId);
  }, [currentFolderId, folders]);

  // Filter Logic
  const filteredFolders = useMemo(() => {
      if (searchTerm.trim() === '') return folders;
      return folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [folders, searchTerm]);

  const filteredFiles = useMemo(() => {
      if (!currentFolder) return [];
      if (searchTerm.trim() === '') return currentFolder.files;
      return currentFolder.files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [currentFolder, searchTerm]);

  // Actions
  const handleDeleteFile = async (e: React.MouseEvent, file: Attachment & { blId: string }) => {
      e.stopPropagation();
      if (!window.confirm(`Delete ${file.name}?`)) return;

      // Find the BL
      const bl = bls.find(b => b.id === file.blId);
      if (bl) {
          const newAttachments = (bl.attachments || []).filter(a => a.id !== file.id);
          await onUpdateBL(bl.id, { attachments: newAttachments });
      }
  };

  const handleDownloadFile = (e: React.MouseEvent, url: string) => {
      e.stopPropagation();
      window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden animate-fade-in">
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl">
                    <Cloud size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Global Cloud
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        <span 
                            className={`cursor-pointer hover:text-blue-600 transition-colors ${!currentFolderId ? 'font-bold text-blue-600' : ''}`}
                            onClick={() => { setCurrentFolderId(null); setSearchTerm(''); }}
                        >
                            All Folders
                        </span>
                        {currentFolder && (
                            <>
                                <span>/</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{currentFolder.name}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder={currentFolderId ? "Search files..." : "Search folders..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
                />
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {!currentFolderId ? (
                // Folder Grid View
                <>
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Vessel Folders</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredFolders.map(folder => {
                            const hasFiles = folder.files.length > 0;
                            return (
                                <div 
                                    key={folder.id}
                                    onClick={() => { setCurrentFolderId(folder.id); setSearchTerm(''); }}
                                    className={`group bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col items-center text-center gap-3 hover:shadow-lg
                                        ${hasFiles 
                                            ? 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500' 
                                            : 'border-slate-100 dark:border-slate-700/50 opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-1 transition-colors ${hasFiles ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                        {folder.id === 'unassigned' ? <Box size={32} /> : <Folder size={32} fill={hasFiles ? "currentColor" : "none"} />}
                                    </div>
                                    <div className="w-full">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-200 truncate w-full" title={folder.name}>
                                            {folder.name}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                            {folder.files.length} items
                                        </p>
                                    </div>
                                    {hasFiles && (
                                        <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                // File Grid View (Inside Folder)
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setCurrentFolderId(null)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {currentFolder?.id === 'unassigned' ? <Box size={20} /> : <Ship size={20} />}
                            {currentFolder?.name}
                        </h3>
                        <span className="text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400 font-bold">
                            {filteredFiles.length}
                        </span>
                    </div>

                    {filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                            <Folder size={48} className="opacity-20 mb-2" />
                            <p>No cloud files found in this folder.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredFiles.map(file => (
                                <div 
                                    key={file.id}
                                    onClick={(e) => handleDownloadFile(e, file.url)}
                                    className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer relative flex flex-col items-center text-center gap-2"
                                    title={file.name}
                                >
                                    <div className="w-16 h-16 flex items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-lg group-hover:scale-105 transition-transform">
                                        {getFileIcon(file)}
                                    </div>
                                    <div className="w-full mt-1">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate w-full px-1">
                                            {file.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {formatSize(file.size)} • {new Date(file.uploadDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    
                                    {/* Overlay Actions */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => handleDownloadFile(e, file.url)}
                                            className="p-1.5 bg-white/90 dark:bg-black/50 text-blue-600 rounded-md hover:bg-blue-50 shadow-sm border border-slate-200 dark:border-slate-600"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteFile(e, file)}
                                            className="p-1.5 bg-white/90 dark:bg-black/50 text-red-500 rounded-md hover:bg-red-50 shadow-sm border border-slate-200 dark:border-slate-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
