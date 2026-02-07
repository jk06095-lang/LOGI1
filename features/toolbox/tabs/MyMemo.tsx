import React, { useState, useEffect } from 'react';
import { PenSquare, Save, Trash2, Plus, FileText, Search, MoreVertical, X, CloudOff, ChevronLeft, Share, Edit } from 'lucide-react';
import { WritePostModal } from '../components/WritePostModal';
import { useUIStore } from '../../../store/uiStore';
import { getToolboxStrings } from '../i18n';
import { editorStyles } from '../styles/editorStyles';
import { extractStorageUrls, deleteFiles } from '../utils/fileCleanupService';
import { db, auth } from '../../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Memo {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
    authorUid: string;
}

// Reuse Renderer
const SafeHtmlViewer: React.FC<{ content: string; emptyText?: string; className?: string }> = ({ content, emptyText, className }) => {
    if (!content) return <div className="text-gray-400 italic">{emptyText || 'Empty memo...'}</div>;

    return (
        <div
            className={`prose dark:prose-invert prose-sm max-w-none rich-editor-content [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-4 [&>ol]:ml-4 ${className}`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

interface MyMemoProps {
    isMobile?: boolean;
}

export const MyMemo: React.FC<MyMemoProps> = ({ isMobile = false }) => {
    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(auth.currentUser);

    // Mobile Navigation State
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return () => unsubscribeAuth();
    }, []);

    // Listen for external trigger from floating button in MobileLayout
    useEffect(() => {
        if (!isMobile) return;

        const handleExternalCreate = () => {
            handleCreateNew();
        };

        window.addEventListener('mobile-create-new-memo', handleExternalCreate);
        return () => window.removeEventListener('mobile-create-new-memo', handleExternalCreate);
    }, [isMobile]);

    useEffect(() => {
        if (!user) {
            setMemos([]);
            return;
        }

        const q = query(
            collection(db, 'toolbox_memos'),
            where('authorUid', '==', user.uid),
            where('authorUid', '==', user.uid)
            // orderBy removed to prevent index error
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedMemos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                updatedAt: doc.data().updatedAt?.toMillis ? doc.data().updatedAt.toMillis() : Date.now()
            })) as Memo[];
            // Client-side sort
            loadedMemos.sort((a, b) => b.updatedAt - a.updatedAt);
            setMemos(loadedMemos);
        });

        return () => unsubscribe();
    }, [user]);

    // Format Date for List
    const getFormattedDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

        if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isYesterday) return t.yesterday || 'Yesterday';
        return date.toLocaleDateString();
    };


    const handleSave = async (content: string, type: string) => {
        if (!user) return;

        // Extract title from content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const text = tempDiv.innerText || tempDiv.textContent || '';
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const title = lines.length > 0 ? lines[0].slice(0, 30) : t.untitledMemo;

        try {
            if (activeMemoId) {
                // Update
                const memoRef = doc(db, 'toolbox_memos', activeMemoId);
                await updateDoc(memoRef, {
                    title,
                    content,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create New
                const docRef = await addDoc(collection(db, 'toolbox_memos'), {
                    title,
                    content,
                    authorUid: user.uid,
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp()
                });
                setActiveMemoId(docRef.id);
            }
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving memo:", error);
            alert("Failed to save memo");
        }
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!confirm(t.deleteMemoConfirm)) return;

        try {
            const memoToDelete = memos.find(m => m.id === id);
            if (memoToDelete) {
                const urls = extractStorageUrls(memoToDelete.content);
                if (urls.length > 0) {
                    deleteFiles(urls).catch(err => console.error("Failed to cleanup files", err));
                }
            }

            await deleteDoc(doc(db, 'toolbox_memos', id));
            if (activeMemoId === id) {
                setActiveMemoId(null);
                if (isMobile) setMobileView('list');
            }
        } catch (error) {
            console.error("Error deleting memo:", error);
            alert("Failed to delete memo");
        }
    };

    const handleCreateNew = () => {
        setActiveMemoId(null);
        setIsEditing(true); // Opens modal
    };

    const handleEditCurrent = () => {
        if (!activeMemoId) return;
        setIsEditing(true);
    };

    const activeMemo = memos.find(m => m.id === activeMemoId);

    const filteredMemos = memos.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!user) {
        return (
            <div className="flex h-full items-center justify-center bg-white dark:bg-gray-900 text-gray-400 flex-col gap-2">
                <CloudOff size={48} />
                <p>Please login to use My Memo</p>
            </div>
        );
    }

    // --- MOBILE VIEW (Apple Notes Style) ---
    if (isMobile) {
        return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-black overflow-hidden relative">
                <style>{editorStyles}</style>

                {/* Mobile List View */}
                {mobileView === 'list' && (
                    <div className="flex-1 flex flex-col h-full">
                        {/* Apple-style Large Header */}
                        <div className="px-5 pt-2 pb-2 bg-slate-50 dark:bg-black">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    className="w-full bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl pl-9 pr-4 py-2 text-[15px] border-none focus:ring-0 placeholder-gray-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-4 pb-32 custom-scrollbar">
                            <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 mt-2">
                                <div className="divide-y divide-gray-100 dark:divide-gray-800 ml-4">
                                    {filteredMemos.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 text-sm italic">No memos found</div>
                                    ) : (
                                        filteredMemos.map((memo, index) => (
                                            <div
                                                key={memo.id}
                                                onClick={() => {
                                                    setActiveMemoId(memo.id);
                                                    setMobileView('detail');
                                                }}
                                                className={`py-3 pr-4 flex flex-col gap-1 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors ${index === filteredMemos.length - 1 ? '' : ''}`}
                                            >
                                                <h3 className="font-bold text-[16px] text-gray-900 dark:text-gray-100 leading-tight truncate">
                                                    {memo.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[14px] leading-snug">
                                                    <span className="text-gray-400 whitespace-nowrap">{getFormattedDate(memo.updatedAt)}</span>
                                                    <span className="text-gray-500 dark:text-gray-400 truncate opacity-90">
                                                        {memo.content.replace(/<[^>]*>/g, '').slice(0, 50)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Memo Count - subtle footer, no longer a fixed bar */}
                            <div className="text-center text-[12px] font-medium text-gray-400 mt-4 pb-2">
                                {memos.length} {t.myMemos?.includes('메모') ? '개의 메모' : 'Memos'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Detail View (Editor) */}
                {mobileView === 'detail' && activeMemo && (
                    <div className="absolute inset-0 z-20 bg-white dark:bg-black flex flex-col animate-in slide-in-from-right duration-200">
                        {/* Navigation Bar */}
                        <div className="h-14 flex items-center justify-between px-2 border-b border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => setMobileView('list')}
                                className="flex items-center text-amber-500 px-2 py-2 hover:opacity-70"
                            >
                                <ChevronLeft size={26} />
                                <span className="text-[17px] font-medium -ml-1">Memos</span>
                            </button>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleDelete(activeMemo.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={handleEditCurrent}
                                    className="p-2 text-amber-500 hover:opacity-70 transition-opacity font-bold text-[17px]"
                                >
                                    Done
                                </button>
                            </div>
                        </div>

                        {/* Editor Content Area */}
                        <div
                            className="flex-1 overflow-y-auto p-5 pb-32 custom-scrollbar"
                            onClick={handleEditCurrent} // Clicking body also triggers edit
                        >
                            <div className="mb-4">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{activeMemo.title}</h1>
                                <p className="text-xs text-gray-400">{new Date(activeMemo.updatedAt).toLocaleString()}</p>
                            </div>
                            <SafeHtmlViewer content={activeMemo.content} className="text-[17px] leading-relaxed" />
                        </div>
                    </div>
                )}

                {/* Clean Editor Modal (Reused) */}
                <WritePostModal
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    onSubmit={handleSave}
                    initialType="post"
                    initialContent={activeMemoId ? activeMemo?.content : ''}
                />
            </div>
        );
    }

    // --- DESKTOP VIEW (Original) ---
    return (
        <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden">
            <style>{editorStyles}</style>
            {/* Sidebar List */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/30 dark:bg-gray-900/50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-gray-700 dark:text-gray-200">{t.myMemos}</h2>
                        <button
                            onClick={handleCreateNew}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                            title={t.newMemo}
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t.searchMemos}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredMemos.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            {t.noMemosFound}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredMemos.map(memo => (
                                <div
                                    key={memo.id}
                                    onClick={() => setActiveMemoId(memo.id)}
                                    className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group relative ${activeMemoId === memo.id ? 'bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                                >
                                    <h3 className={`font-semibold text-sm mb-1 truncate ${activeMemoId === memo.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {memo.title}
                                    </h3>
                                    <p className="text-xs text-gray-400 mb-1">
                                        {new Date(memo.updatedAt).toLocaleDateString()}
                                    </p>
                                    <div className="text-xs text-gray-500 truncate opacity-70 h-4">
                                        {memo.content.replace(/<[^>]*>/g, '')}
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(memo.id, e)}
                                        className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
                {activeMemo ? (
                    <>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <div>
                                <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{activeMemo.title}</h1>
                                <p className="text-xs text-gray-400">{t.lastEdited} {new Date(activeMemo.updatedAt).toLocaleString()}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleDelete(activeMemo.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                    title={t.delete}
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    onClick={handleEditCurrent}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center space-x-2 transition-colors"
                                >
                                    <PenSquare size={16} />
                                    <span>{t.edit}</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="max-w-3xl mx-auto">
                                <SafeHtmlViewer content={activeMemo.content} emptyText={t.emptyMemo} className="text-base" />
                            </div>
                        </div>

                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
                        <p>{t.selectMemoOrCreate}</p>
                        <button
                            onClick={handleCreateNew}
                            className="mt-4 px-4 py-2 bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t.createNewMemo}
                        </button>
                    </div>
                )}
            </div>

            {/* Editor Modal reused - Always render to allow "New Memo" to work */}
            <WritePostModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                onSubmit={handleSave}
                initialType="post"
                initialContent={activeMemoId ? activeMemo?.content : ''}
            />
        </div>
    );
};
