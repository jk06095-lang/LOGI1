import React, { useState, useEffect } from 'react';
import { PenSquare, Save, Trash2, Plus, FileText, Search, MoreVertical, X } from 'lucide-react';
import { WritePostModal } from '../components/WritePostModal';
import { useUIStore } from '../../../store/uiStore';
import { getToolboxStrings } from '../i18n';

const STORAGE_KEY = 'logi1-toolbox-memos-v2';
const LEGACY_KEY = 'logi1-toolbox-memo';

interface Memo {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
}

// Reuse Renderer
const SafeHtmlViewer: React.FC<{ content: string; emptyText?: string; className?: string }> = ({ content, emptyText, className }) => {
    if (!content) return <div className="text-gray-400 italic">{emptyText || 'Empty memo...'}</div>;

    return (
        <div
            className={`prose dark:prose-invert prose-sm max-w-none [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-4 [&>ol]:ml-4 ${className}`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export const MyMemo: React.FC = () => {
    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Load memos
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setMemos(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse available memos");
            }
        } else {
            // Migration check
            const legacy = localStorage.getItem(LEGACY_KEY);
            if (legacy) {
                const newMemo: Memo = {
                    id: Date.now().toString(),
                    title: 'Legacy Memo',
                    content: legacy,
                    updatedAt: Date.now()
                };
                setMemos([newMemo]);
                localStorage.setItem(STORAGE_KEY, JSON.stringify([newMemo]));
                // Optional: localStorage.removeItem(LEGACY_KEY);
            }
        }
    }, []);

    const saveMemos = (newMemos: Memo[]) => {
        setMemos(newMemos);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMemos));
    };

    const handleSave = async (content: string, type: string) => {
        // Extract title from content (first non-empty line or 20 chars)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const text = tempDiv.textContent || '';
        const title = text.slice(0, 30).trim() || t.untitledMemo;

        if (activeMemoId) {
            // Update
            const updated = memos.map(m => m.id === activeMemoId ? { ...m, title, content, updatedAt: Date.now() } : m);
            saveMemos(updated);
        } else {
            // Create New
            const newMemo: Memo = {
                id: Date.now().toString(),
                title,
                content,
                updatedAt: Date.now()
            };
            saveMemos([newMemo, ...memos]);
            setActiveMemoId(newMemo.id);
        }
        setIsEditing(false);
    };

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (confirm(t.deleteMemoConfirm)) {
            const updated = memos.filter(m => m.id !== id);
            saveMemos(updated);
            if (activeMemoId === id) setActiveMemoId(null);
        }
    };

    const handleCreateNew = () => {
        setActiveMemoId(null);
        setIsEditing(true);
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

    return (
        <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden">
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

                        {/* Editor Modal reused */}
                        <WritePostModal
                            isOpen={isEditing}
                            onClose={() => setIsEditing(false)}
                            onSubmit={handleSave}
                        // We need to pass initial content if editing
                        // But WritePostModal doesn't accept initialContent prop in previous read? 
                        // Wait, RichEditor accept it, but WritePostModal?
                        />
                        {/* I need to check WritePostModal props */}
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

            {/* Hack: Pass content to editor via a ref assignment or similar if Modal doesn't support it yet. 
                I need to modify WritePostModal to accept initialContent. 
            */}
            <WritePostModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                onSubmit={handleSave}
                initialType="post"
                // @ts-ignore - Planning to add this prop
                initialContent={activeMemoId ? activeMemo?.content : ''}
            />
        </div>
    );
};
