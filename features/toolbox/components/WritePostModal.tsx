import React, { useState, useRef, useCallback } from 'react';
import { X, Send, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RichEditor } from './RichEditor';
import { extractStorageUrls, deleteFiles } from '../utils/fileCleanupService';

interface WritePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string, type: string) => Promise<void>;
    initialType?: 'notice' | 'task' | 'post';
    initialContent?: string;
    hideTypeSelector?: boolean;
}

export const WritePostModal: React.FC<WritePostModalProps> = ({ isOpen, onClose, onSubmit, initialType = 'post', initialContent = '', hideTypeSelector = false }) => {
    const [content, setContent] = useState(initialContent);
    const [type, setType] = useState(initialType);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Session tracking: URLs uploaded during this editing session
    const sessionUploadedUrlsRef = useRef<string[]>([]);

    // Track each file uploaded during this session
    const handleFileUploaded = useCallback((url: string) => {
        sessionUploadedUrlsRef.current.push(url);
    }, []);

    // Cleanup orphan files: delete uploaded files not present in saved content
    const cleanupOrphanFiles = useCallback(async (savedContent: string, isCancel: boolean) => {
        try {
            const sessionUrls = sessionUploadedUrlsRef.current;
            if (sessionUrls.length === 0 && !isCancel) {
                // No files uploaded this session, but on save we still need to check
                // if files were removed from the original content during editing
            }

            // URLs that exist in the final saved content
            const savedUrls = new Set(extractStorageUrls(savedContent));

            // 1. Session orphans: files uploaded this session but NOT in saved content
            const sessionOrphans = sessionUrls.filter(url => !savedUrls.has(url));

            // 2. Edit orphans: files that were in initialContent but NOT in saved content (only on save, not cancel)
            let editOrphans: string[] = [];
            if (!isCancel && initialContent) {
                const originalUrls = extractStorageUrls(initialContent);
                editOrphans = originalUrls.filter(url => !savedUrls.has(url));
            }

            const allOrphans = [...new Set([...sessionOrphans, ...editOrphans])];
            if (allOrphans.length > 0) {
                console.log(`[File Cleanup] Deleting ${allOrphans.length} orphan file(s)...`);
                await deleteFiles(allOrphans);
            }
        } catch (err) {
            console.error('[File Cleanup] Error during orphan cleanup:', err);
        }
    }, [initialContent]);

    // Sync state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setContent(initialContent);
            setType(initialType);
            // Reset session tracking for new session
            sessionUploadedUrlsRef.current = [];
        }
    }, [isOpen, initialContent, initialType]);

    const handleSubmit = async () => {
        const isContentEmpty = !content.replace(/<[^>]*>/g, '').trim() && !content.includes('<img') && !content.includes('file-attachment');
        const hasContentChanged = content !== initialContent;
        const hasTypeChanged = type !== initialType;

        // Allow if content is not empty OR if it has changed, or if type has changed
        if (isContentEmpty && !hasContentChanged && !hasTypeChanged) return;

        setIsSubmitting(true);
        await onSubmit(content, type);

        // Clean up files removed during editing (edit orphans + session orphans not in final content)
        await cleanupOrphanFiles(content, false);

        setIsSubmitting(false);
        setContent('');
        sessionUploadedUrlsRef.current = [];
        onClose();
    };

    const handleClose = async () => {
        // On cancel: delete ALL files uploaded this session that aren't in the original content
        // (since we're discarding changes, the original content is what matters)
        if (sessionUploadedUrlsRef.current.length > 0) {
            await cleanupOrphanFiles(initialContent, true);
        }
        sessionUploadedUrlsRef.current = [];
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-white/20 w-full ${isFullscreen ? 'fixed inset-4 h-auto' : 'max-w-4xl h-[70vh]'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 md:px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
                            <div className="flex items-center">
                                {/* Type selector buttons */}
                                {!hideTypeSelector && (
                                    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
                                        {(['post', 'task', 'notice'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setType(t)}
                                                className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium rounded-md transition-all ${type === t ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-3 md:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                >
                                    <span className="hidden md:inline">Publish</span>
                                    <Send size={16} />
                                </button>
                                <button onClick={handleClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content: Rich Editor */}
                        <div className="flex flex-1 overflow-hidden bg-white dark:bg-slate-900">
                            <div className="w-full h-full flex flex-col">
                                <RichEditor
                                    initialContent={initialContent}
                                    onChange={setContent}
                                    placeholder="Type '/' for commands or use the toolbar..."
                                    onFileUploaded={handleFileUploaded}
                                />
                            </div>
                        </div>


                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
