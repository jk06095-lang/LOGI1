import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, getDocs, increment } from 'firebase/firestore';
import { Pin, Trash2, CheckCircle2, Circle, MessageSquare, Plus, PenSquare, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { WritePostModal } from '../components/WritePostModal';
import { useUIStore } from '../../../store/uiStore';
import { getToolboxStrings } from '../i18n';
import { editorStyles } from '../styles/editorStyles';
import { extractStorageUrls, deleteFiles } from '../utils/fileCleanupService';

// --- Types ---
interface Comment {
    id: string;
    content: string;
    author: string;
    authorUid?: string;
    authorPhotoURL?: string;
    createdAt: any;
}

interface Post {
    id: string;
    type: 'notice' | 'task' | 'post';
    content: string;
    author: string;
    authorUid?: string;
    authorPhotoURL?: string;
    createdAt: any;
    completed?: boolean;
    commentCount?: number;
}

// Mock User (In real app, get from Context)
// Real User from Auth
import { auth } from '../../../lib/firebase';
const CURRENT_USER = {
    get uid() { return auth.currentUser?.uid || 'anonymous'; },
    get name() { return auth.currentUser?.displayName || 'User'; },
    get photoURL() { return auth.currentUser?.photoURL || null; }
};

// Safe HTML Viewer
const SafeHtmlViewer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
    return (
        <div
            className={`prose dark:prose-invert max-w-none text-sm rich-editor-content ${className}`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export const TeamBoard: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);

    const [posts, setPosts] = useState<Post[]>([]);
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [tasksCollapsed, setTasksCollapsed] = useState(false); // New state for collapsible sidebar

    // Mobile Task View State
    const [showMobileTasks, setShowMobileTasks] = useState(false);

    // Comment UI State
    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null); // Track which comment is being edited
    const [editingCommentText, setEditingCommentText] = useState('');
    const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});

    // Track comment subscriptions
    const commentUnsubscribesRef = useRef<Record<string, () => void>>({});

    useEffect(() => {
        const q = query(collection(db, 'toolbox_posts')); // Removed orderBy to prevent index error
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            // Client-side sort
            loadedPosts.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setPosts(loadedPosts);

            // Notify mobile layout about the count of open tasks
            const openCount = loadedPosts.filter(p => p.type === 'task' && !p.completed).length;
            window.dispatchEvent(new CustomEvent('mobile-teamboard-state-update', {
                detail: { openTaskCount: openCount }
            }));
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

    // Effect to notify MobileLayout when showMobileTasks changes
    useEffect(() => {
        if (!isMobile) return;
        window.dispatchEvent(new CustomEvent('mobile-teamboard-state-update', {
            detail: { showMobileTasks }
        }));
    }, [showMobileTasks, isMobile]);

    // Listen for external triggers
    useEffect(() => {
        const handleExternalCreate = () => {
            openNewPostModal();
        };

        const handleMobileToggleTasks = () => {
            setShowMobileTasks(prev => !prev);
        };

        window.addEventListener('mobile-create-new-memo', handleExternalCreate);
        window.addEventListener('mobile-toggle-team-tasks', handleMobileToggleTasks);

        return () => {
            window.removeEventListener('mobile-create-new-memo', handleExternalCreate);
            window.removeEventListener('mobile-toggle-team-tasks', handleMobileToggleTasks);
        };
    }, []);

    const [showNotices, setShowNotices] = useState(true); // [NEW] State for hiding notices

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
                authorPhotoURL: CURRENT_USER.photoURL,
                createdAt: serverTimestamp(),
                completed: false
            });
        }
        setEditingPost(null);
        setIsWriteModalOpen(false);
    };

    const openEditModal = (post: Post) => {
        // [NEW] Permission Check: Standard 'post' is owner-only. Task/Notice is open.
        if (post.type === 'post' && post.authorUid !== CURRENT_USER.uid) {
            alert(t.editPermissionDenied || "Only the author can edit this post.");
            return;
        }
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
            authorPhotoURL: CURRENT_USER.photoURL,
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

        // Increment comment count on the post
        const postRef = doc(db, 'toolbox_posts', postId);
        await updateDoc(postRef, {
            commentCount: increment(1)
        });
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        if (!confirm('Delete this comment?')) return;
        try {
            await deleteDoc(doc(db, `toolbox_posts/${postId}/comments`, commentId));

            // Decrement comment count
            const postRef = doc(db, 'toolbox_posts', postId);
            await updateDoc(postRef, {
                commentCount: increment(-1)
            });

            // Optimistic removal strictly handled by subscription, but we can double check
        } catch (e) {
            console.error("Failed to delete comment", e);
        }
    };

    const startEditingComment = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentText(comment.content);
    };

    const handleUpdateComment = async (postId: string, commentId: string) => {
        if (!editingCommentText.trim()) return;
        try {
            const commentRef = doc(db, `toolbox_posts/${postId}/comments`, commentId);
            await updateDoc(commentRef, {
                content: editingCommentText
            });
            setEditingCommentId(null);
        } catch (e) {
            console.error("Failed to update comment", e);
        }
    };



    const toggleTask = async (id: string, currentStatus: boolean, authorUid?: string) => {
        // Permission check for task toggle? Maybe allow anyone to toggle tasks
        const postRef = doc(db, 'toolbox_posts', id);
        await updateDoc(postRef, { completed: !currentStatus });
    };

    const deletePost = async (id: string, authorUid?: string, type?: string) => {
        // [NEW] Permission Check: Standard 'post' is owner-only. Task/Notice is open.
        if (type === 'post' && authorUid !== CURRENT_USER.uid) {
            alert(t.deletePermissionDenied || "Only the author can delete this post.");
            return;
        }

        if (!confirm(t.deletePostConfirm)) return;

        try {
            // Delete all comments first to avoid orphans
            const commentsRef = collection(db, `toolbox_posts/${id}/comments`);
            const commentsSnapshot = await getDocs(commentsRef);

            const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // [NEW] Cleanup files in storage associated with the post
            const postDoc = await getDocs(query(collection(db, 'toolbox_posts'), where('__name__', '==', id)));
            if (!postDoc.empty) {
                const content = postDoc.docs[0].data().content;
                const fileUrls = extractStorageUrls(content);
                await deleteFiles(fileUrls);
            }

            // Then delete the post
            await deleteDoc(doc(db, 'toolbox_posts', id));
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post");
        }
    };

    const notices = posts.filter(p => p.type === 'notice');
    const tasks = posts.filter(p => p.type === 'task');
    const generalPosts = posts.filter(p => p.type === 'post');

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 relative">
            <style>{editorStyles}</style>
            <WritePostModal
                isOpen={isWriteModalOpen}
                onClose={() => { setIsWriteModalOpen(false); setEditingPost(null); }}
                onSubmit={handleSubmit}
                initialContent={editingPost?.content}
                initialType={editingPost?.type}
            />

            {/* FAB button for desktop - hidden on mobile where MobileLayout handles it */}
            {/* FAB button for desktop - hidden on mobile where MobileLayout handles it */}
            {!isMobile && (
                <button
                    onClick={openNewPostModal}
                    className="hidden md:flex absolute bottom-6 right-6 z-20 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-blue-500/40 items-center justify-center transition-all transform hover:scale-105"
                    title={t.writePost}
                >
                    <PenSquare size={24} />
                </button>
            )}



            {/* Notices */}
            {notices.length > 0 && !showMobileTasks && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 shrink-0 transition-all duration-300">
                    {/* [NEW] Header with Toggle */}
                    <div className="flex items-center justify-between p-2 px-4 bg-amber-100/50 dark:bg-amber-900/20 cursor-pointer" onClick={() => setShowNotices(!showNotices)}>
                        <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-500 font-bold text-xs uppercase tracking-wide">
                            <Pin size={12} className="fill-current" />
                            <span>{t.pinnedNotices} ({notices.length})</span>
                        </div>
                        <button className="text-amber-600 dark:text-amber-500 hover:text-amber-800 focus:outline-none">
                            {showNotices ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    {showNotices && (
                        <div className="p-4 pt-2 space-y-2">
                            {notices.map(notice => (
                                <div key={notice.id} className="relative group pl-3 border-l-2 border-amber-300 dark:border-amber-600">
                                    <SafeHtmlViewer content={notice.content} />
                                    {/* Edit/Delete: Task/Notice open to everyone */}
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 flex items-center bg-white dark:bg-gray-800 rounded shadow-sm">
                                        <button onClick={() => openEditModal(notice)} className="p-1 text-gray-400 hover:text-blue-500">
                                            <PenSquare size={12} />
                                        </button>
                                        <button onClick={() => deletePost(notice.id, notice.authorUid, notice.type)} className="p-1 text-gray-400 hover:text-red-500">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Main Feed - Hidden if showing mobile tasks */}
                {!showMobileTasks && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                        {generalPosts.map(post => {
                            const comments = commentsByPost[post.id] || [];
                            const isOwner = post.authorUid === CURRENT_USER.uid;

                            return (
                                <div key={post.id} className="group bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            {post.authorPhotoURL ? (
                                                <img
                                                    src={post.authorPhotoURL}
                                                    alt={post.author}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isOwner ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                                    {post.author[0]}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{post.author} {isOwner && <span className="text-[10px] text-blue-500 bg-blue-50 px-1 rounded ml-1">{t.you}</span>}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleString() : t.justNow}
                                                </p>
                                            </div>
                                        </div>
                                        {/* [NEW] Permission Logic for Edit/Delete Buttons in Feed */}
                                        {(isOwner || post.type !== 'post') && (
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(post)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                                    <PenSquare size={14} />
                                                </button>
                                                <button onClick={() => deletePost(post.id, post.authorUid, post.type)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
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
                                            <span>{(post.commentCount || 0) > 0 ? `${post.commentCount} ${t.comments}` : t.comment}</span>
                                        </button>
                                    </div>

                                    {/* Comments Section */}
                                    {activeCommentPostId === post.id && (
                                        <div className="mt-3 pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-3 animate-in slide-in-from-top-2">
                                            {comments.map(comment => (
                                                <div key={comment.id} className="text-xs group/comment flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <span className="font-bold text-gray-700 dark:text-gray-300 mr-2">{comment.author}</span>
                                                        {editingCommentId === comment.id ? (
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                <input
                                                                    type="text"
                                                                    className="flex-1 border rounded px-2 py-1 text-xs"
                                                                    value={editingCommentText}
                                                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleUpdateComment(post.id, comment.id)} className="text-blue-500 text-[10px] hover:underline">Save</button>
                                                                <button onClick={() => setEditingCommentId(null)} className="text-gray-500 text-[10px] hover:underline">Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-600 dark:text-gray-400">{comment.content}</span>
                                                        )}
                                                    </div>
                                                    {/* Edit/Delete Actions for Owner */}
                                                    {comment.authorUid === CURRENT_USER.uid && !editingCommentId && (
                                                        <div className="flex items-center space-x-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                            <button onClick={() => startEditingComment(comment)} className="p-1 hover:text-blue-500 text-gray-400">
                                                                <PenSquare size={10} />
                                                            </button>
                                                            <button onClick={() => handleDeleteComment(post.id, comment.id)} className="p-1 hover:text-red-500 text-gray-400">
                                                                <Trash2 size={10} />
                                                            </button>
                                                        </div>
                                                    )}
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
                )}

                {/* Mobile Tasks View - Only shown when toggled on mobile */}
                {showMobileTasks && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 bg-gray-50/50 dark:bg-gray-800/20">
                        {/* Title and count moved to MobileLayout header per request */}
                        {tasks.map(task => (
                            <div key={task.id} className="group p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-start space-x-3">
                                    <button
                                        onClick={() => toggleTask(task.id, !!task.completed)}
                                        className={`mt-0.5 ${task.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-blue-500'}`}
                                    >
                                        {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                    </button>
                                    <div className="flex-1">
                                        <SafeHtmlViewer content={task.content} className={task.completed ? 'opacity-50 line-through' : ''} />
                                    </div>
                                </div>
                                <div className="w-full text-right mt-2 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                                    <button onClick={() => openEditModal(task)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">{t.edit}</button>
                                    <button onClick={() => deletePost(task.id, task.authorUid, task.type)} className="text-xs text-red-500 hover:text-red-600 font-medium">{t.remove}</button>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center py-10 text-gray-400 font-medium">
                                <p>No tasks found.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tasks Sidebar (Right) - Desktop Only */}
                <div
                    className={`${tasksCollapsed ? 'w-14 items-center' : 'w-72'} bg-gray-50/50 dark:bg-gray-800/30 border-l border-gray-200 dark:border-gray-800 hidden lg:flex flex-col transition-all duration-300 relative`}
                >
                    {/* Sidebar Header: Toggle + Title/Count */}
                    <div className={`w-full flex shrink-0 ${tasksCollapsed ? 'flex-col items-center py-4 gap-2' : 'flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800'}`}>

                        <button
                            onClick={() => setTasksCollapsed(!tasksCollapsed)}
                            className={`p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 transition-colors focus:outline-none ${!tasksCollapsed ? 'mr-2' : ''}`}
                            title={tasksCollapsed ? t.expandTasks : t.collapseTasks}
                        >
                            {tasksCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {!tasksCollapsed ? (
                            <div className="flex-1 flex items-center justify-between overflow-hidden">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">{t.teamTasks}</h3>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ml-2">
                                    {tasks.filter(t => !t.completed).length} {t.open}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {tasks.filter(t => !t.completed).length}
                                </span>
                            </div>
                        )}
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
                                {/* [NEW] Edit/Delete allowed for everyone for tasks */}
                                <div className="w-full text-right mt-1 opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                                    <button onClick={() => openEditModal(task)} className="text-[10px] text-blue-400 hover:text-blue-500">{t.edit}</button>
                                    <button onClick={() => deletePost(task.id, task.authorUid, task.type)} className="text-[10px] text-red-400 hover:text-red-500">{t.remove}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

    );
};
