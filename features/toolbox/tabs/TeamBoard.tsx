import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { Pin, Trash2, CheckCircle2, Circle, MessageSquare, Plus, PenSquare } from 'lucide-react';
import { WritePostModal } from '../components/WritePostModal';
import { useUIStore } from '../../../store/uiStore';
import { getToolboxStrings } from '../i18n';

// --- Types ---
interface Comment {
    id: string;
    content: string;
    author: string;
    authorUid?: string; // Add Uid
    createdAt: any;
}

interface Post {
    id: string;
    type: 'notice' | 'task' | 'post';
    content: string;
    author: string;
    authorUid?: string; // Add Uid
    createdAt: any;
    completed?: boolean;
}

// Mock User (In real app, get from Context)
const CURRENT_USER = {
    uid: 'mock-user-123', // Replace with real auth user
    name: 'User'
};

// Safe HTML Viewer
const SafeHtmlViewer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
    return (
        <div
            className={`prose dark:prose-invert max-w-none text-sm ${className}`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export const TeamBoard: React.FC = () => {
    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);

    const [posts, setPosts] = useState<Post[]>([]);
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    // Comment UI State
    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});

    // Track comment subscriptions
    const commentUnsubscribesRef = useRef<Record<string, () => void>>({});

    useEffect(() => {
        const q = query(collection(db, 'toolbox_posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            setPosts(loadedPosts);
        });
        return () => {
            unsubscribe();
            // Clean up all comment subscriptions
            const refs = commentUnsubscribesRef.current;
            for (const key in refs) {
                if (refs[key]) refs[key]();
            }
        };
    }, []);

    const toggleComments = (postId: string) => {
        if (activeCommentPostId === postId) {
            setActiveCommentPostId(null);
            return;
        }

        setActiveCommentPostId(postId);

        // If already subscribed, don't subscribe again
        if (commentUnsubscribesRef.current[postId]) return;

        // Set up real-time subscription for comments
        const q = query(collection(db, `toolbox_posts/${postId}/comments`), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[];
            setCommentsByPost(prev => ({ ...prev, [postId]: loadedComments }));
        });
        commentUnsubscribesRef.current[postId] = unsubscribe;
    };

    const handleSubmit = async (content: string, type: string) => {
        if (editingPost) {
            const postRef = doc(db, 'toolbox_posts', editingPost.id);
            await updateDoc(postRef, {
                content,
                type,
                // Optional: updatedAt: serverTimestamp()
            });
        } else {
            await addDoc(collection(db, 'toolbox_posts'), {
                type,
                content, // Now HTML
                author: CURRENT_USER.name,
                authorUid: CURRENT_USER.uid,
                createdAt: serverTimestamp(),
                completed: false
            });
        }
        setEditingPost(null);
        setIsWriteModalOpen(false);
    };

    const openEditModal = (post: Post) => {
        setEditingPost(post);
        setIsWriteModalOpen(true);
    };

    // Wrapper for new post to clear edit state
    const openNewPostModal = () => {
        setEditingPost(null);
        setIsWriteModalOpen(true);
    };

    const handleAddComment = async (postId: string) => {
        if (!commentText.trim()) return;

        const commentData = {
            content: commentText,
            author: CURRENT_USER.name,
            authorUid: CURRENT_USER.uid,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, `toolbox_posts/${postId}/comments`), commentData);

        // Optimistic Update
        const newComment = { id: docRef.id, ...commentData };
        setCommentsByPost(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment as Comment]
        }));
        setCommentText('');
    };

    const toggleTask = async (id: string, currentStatus: boolean, authorUid?: string) => {
        // Permission check for task toggle? Maybe allow anyone to toggle tasks
        const postRef = doc(db, 'toolbox_posts', id);
        await updateDoc(postRef, { completed: !currentStatus });
    };

    const deletePost = async (id: string, authorUid?: string) => {
        if (confirm(t.deletePostConfirm)) {
            await deleteDoc(doc(db, 'toolbox_posts', id));
        }
    };

    const notices = posts.filter(p => p.type === 'notice');
    const tasks = posts.filter(p => p.type === 'task');
    const generalPosts = posts.filter(p => p.type === 'post');

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 relative">
            <WritePostModal
                isOpen={isWriteModalOpen}
                onClose={() => { setIsWriteModalOpen(false); setEditingPost(null); }}
                onSubmit={handleSubmit}
                initialContent={editingPost?.content}
                initialType={editingPost?.type}
            />

            <button
                onClick={openNewPostModal}
                className="absolute bottom-6 right-6 z-20 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-blue-500/40 flex items-center justify-center transition-all transform hover:scale-105"
                title={t.writePost}
            >
                <PenSquare size={24} />
            </button>

            {/* Notices */}
            {notices.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 p-4 shrink-0">
                    <div className="flex items-center space-x-2 mb-2 text-amber-700 dark:text-amber-500 font-bold text-xs uppercase tracking-wide">
                        <Pin size={12} className="fill-current" />
                        <span>{t.pinnedNotices}</span>
                    </div>
                    <div className="space-y-2">
                        {notices.map(notice => (
                            <div key={notice.id} className="relative group pl-3 border-l-2 border-amber-300 dark:border-amber-600">
                                <SafeHtmlViewer content={notice.content} />
                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 flex items-center bg-white dark:bg-gray-800 rounded shadow-sm">
                                    <button onClick={() => openEditModal(notice)} className="p-1 text-gray-400 hover:text-blue-500">
                                        <PenSquare size={12} />
                                    </button>
                                    <button onClick={() => deletePost(notice.id, notice.authorUid)} className="p-1 text-gray-400 hover:text-red-500">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Main Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                    {generalPosts.map(post => {
                        const comments = commentsByPost[post.id] || [];
                        const isOwner = post.authorUid === CURRENT_USER.uid;

                        return (
                            <div key={post.id} className="group bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isOwner ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                            {post.author[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{post.author} {isOwner && <span className="text-[10px] text-blue-500 bg-blue-50 px-1 rounded ml-1">{t.you}</span>}</p>
                                            <p className="text-[10px] text-gray-400">
                                                {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleString() : t.justNow}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(post)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <PenSquare size={14} />
                                        </button>
                                        <button onClick={() => deletePost(post.id, post.authorUid)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="ml-1 mb-4">
                                    <SafeHtmlViewer content={post.content} />
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex items-center justify-between">
                                    <button
                                        onClick={() => toggleComments(post.id)}
                                        className="text-xs text-gray-500 hover:text-blue-600 flex items-center space-x-1"
                                    >
                                        <MessageSquare size={14} />
                                        <span>{comments.length > 0 ? `${comments.length} ${t.comments}` : t.comment}</span>
                                    </button>
                                </div>

                                {/* Comments Section */}
                                {activeCommentPostId === post.id && (
                                    <div className="mt-3 pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-3 animate-in slide-in-from-top-2">
                                        {comments.map(comment => (
                                            <div key={comment.id} className="text-xs group/comment flex justify-between">
                                                <div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 mr-2">{comment.author}</span>
                                                    <span className="text-gray-600 dark:text-gray-400">{comment.content}</span>
                                                </div>
                                                {/* Only implemented delete own comment logic conceptually here */}
                                            </div>
                                        ))}
                                        <div className="flex items-center space-x-2 mt-2">
                                            <input
                                                type="text"
                                                placeholder={t.writeComment}
                                                className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border-none rounded-lg py-1.5 focus:ring-1 focus:ring-blue-500"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {generalPosts.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <p>{t.noPostsYet}</p>
                        </div>
                    )}
                </div>

                {/* Tasks Sidebar (Right) */}
                <div className="w-72 bg-gray-50/50 dark:bg-gray-800/30 border-l border-gray-200 dark:border-gray-800 p-4 overflow-y-auto hidden lg:block">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.teamTasks}</h3>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{tasks.filter(t => !t.completed).length} {t.open}</span>
                    </div>

                    <div className="space-y-2">
                        {tasks.map(task => (
                            <div key={task.id} className="group p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-transparent hover:border-blue-200 transition-all">
                                <div className="flex items-start space-x-3">
                                    <button
                                        onClick={() => toggleTask(task.id, !!task.completed)}
                                        className={`mt-0.5 ${task.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-blue-500'}`}
                                    >
                                        {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    </button>
                                    <div className="flex-1">
                                        <SafeHtmlViewer content={task.content} className={task.completed ? 'opacity-50 line-through' : ''} />
                                    </div>
                                </div>
                                <div className="w-full text-right mt-1 opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                                    <button onClick={() => openEditModal(task)} className="text-[10px] text-blue-400 hover:text-blue-500">{t.edit}</button>
                                    <button onClick={() => deletePost(task.id, task.authorUid)} className="text-[10px] text-red-400 hover:text-red-500">{t.remove}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
