
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatMessage, ChatUser } from '../../types';
import { User } from 'firebase/auth';
import { User as UserIcon, Check, CheckCheck, Reply, Loader2 } from 'lucide-react';

interface MessageListProps {
    messages: ChatMessage[];
    user: User | null;
    allUsers: ChatUser[];
    typingUsers: string[];
    messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    onReaction: (emoji: string, messageId: string) => void;
    onReply: (msg: ChatMessage) => void;
    loadMoreMessages: () => void;
    initialLastReadId: string | null;
}

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const getDateString = (ts: number) => new Date(ts).toLocaleDateString();

export const MessageList: React.FC<MessageListProps> = ({
    messages, user, allUsers, typingUsers, messageRefs, onReaction, onReply, loadMoreMessages, initialLastReadId
}) => {
    const [activeReaction, setActiveReaction] = useState<{ id: string, emoji: string, x: number, y: number } | null>(null);
    // State to track which message has its action menu open (for mobile tap)
    const [mobileMenuMsgId, setMobileMenuMsgId] = useState<string | null>(null);

    React.useEffect(() => {
        const handleClickOutside = () => {
            setActiveReaction(null);
            setMobileMenuMsgId(null);
        };
        // Listen on capture phase to ensure we close before other clicks are processed if needed
        window.addEventListener('click', handleClickOutside, true);
        window.addEventListener('scroll', handleClickOutside, true);

        return () => {
            window.removeEventListener('click', handleClickOutside, true);
            window.removeEventListener('scroll', handleClickOutside, true);
        };
    }, []);

    const handleMessageClick = (e: React.MouseEvent, msgId: string) => {
        e.stopPropagation();
        // Toggle menu on click
        setMobileMenuMsgId(prev => prev === msgId ? null : msgId);
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex justify-center">
                <button
                    onClick={loadMoreMessages}
                    className="text-[10px] bg-white/40 dark:bg-black/40 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full hover:bg-white/60 transition-colors backdrop-blur-sm shadow-sm"
                >
                    History
                </button>
            </div>

            {messages.length === 0 ? (
                <div className="text-center text-slate-500/70 text-sm mt-20 italic">No messages yet. Start the conversation!</div>
            ) : (
                messages.map((msg, index) => {
                    const isMe = msg.senderId === user?.uid;
                    const isRead = msg.readBy && msg.readBy.length > 1;

                    const currentDate = getDateString(msg.timestamp);
                    const prevDate = index > 0 ? getDateString(messages[index - 1].timestamp) : null;
                    const showDate = currentDate !== prevDate;
                    const isMenuOpen = mobileMenuMsgId === msg.id;

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-4">
                                    <div className="bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                                        {new Date(msg.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            )}

                            <div
                                ref={(el) => {
                                    if (el) messageRefs.current.set(msg.id, el);
                                    else messageRefs.current.delete(msg.id);
                                }}
                                data-msg-id={msg.id}
                                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start relative mb-2`}
                            >
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full bg-white/80 dark:bg-slate-700 flex-shrink-0 overflow-hidden shadow-sm mt-1 ring-1 ring-slate-200 dark:ring-slate-600">
                                        {msg.senderPhoto ? <img src={msg.senderPhoto} alt="S" className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-1.5 text-slate-400" />}
                                    </div>
                                )}

                                <div
                                    className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative min-w-[140px] group/msg`}
                                    onClick={(e) => handleMessageClick(e, msg.id)}
                                >
                                    {!isMe && <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1 mb-1 font-bold">{msg.senderName}</span>}

                                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm backdrop-blur-md border border-transparent relative leading-relaxed ${isMe
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border-slate-200 dark:border-slate-700'
                                        } ${msg.pending ? 'opacity-70' : ''}`}>

                                        {msg.replyTo && (
                                            <div className={`mb-1 pl-2 border-l-2 text-xs opacity-90 rounded-r py-1 max-w-full ${isMe ? 'border-white/50 bg-white/10 text-blue-100' : 'border-blue-500 bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                                                <p className="font-bold text-[10px] mb-0.5 opacity-80 truncate">{msg.replyTo.senderName}</p>
                                                <p className="italic text-[10px] opacity-70 break-words whitespace-pre-wrap line-clamp-3">{msg.replyTo.text}</p>
                                            </div>
                                        )}

                                        {msg.text}
                                    </div>

                                    {/* Reactions */}
                                    {msg.reactions && msg.reactions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {msg.reactions.map((r, i) => {
                                                const isActiveDetail = activeReaction?.id === msg.id && activeReaction?.emoji === r.emoji;
                                                return (
                                                    <div key={i} className="relative group/reaction">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setActiveReaction(isActiveDetail ? null : {
                                                                    id: msg.id,
                                                                    emoji: r.emoji,
                                                                    x: rect.left + (rect.width / 2),
                                                                    y: rect.top
                                                                });
                                                            }}
                                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-all hover:scale-105 active:scale-95 ${r.userIds.includes(user?.uid || '')
                                                                ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                                                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                                                                }`}
                                                        >
                                                            <span>{r.emoji}</span>
                                                            <span className="font-bold">{r.userIds.length}</span>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Time & Action Menu Row */}
                                    <div className="flex items-center justify-between w-full mt-1 px-1 relative h-6">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                                                {formatTime(msg.timestamp)}
                                            </span>
                                            {isMe && (
                                                <span className={`${isRead ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                    {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Menu (Visible on Group Hover OR if manually toggled on mobile) */}
                                        <div className={`absolute right-0 -bottom-1.5 transition-all duration-200 z-10 translate-y-2 ${msg.pending
                                            ? 'opacity-50 pointer-events-none'
                                            : isMenuOpen
                                                ? 'opacity-100 translate-y-0'
                                                : 'opacity-0 group-hover/msg:opacity-100 group-hover/msg:translate-y-0 pointer-events-none group-hover/msg:pointer-events-auto'
                                            }`}>
                                            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 p-1 ring-1 ring-black/5">
                                                {msg.pending ? (
                                                    <div className="px-2 py-1 flex items-center justify-center">
                                                        <Loader2 size={12} className="animate-spin text-slate-400" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {['✅', '❌', '👍', '❤️'].map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                onClick={(e) => { e.stopPropagation(); onReaction(emoji, msg.id); setMobileMenuMsgId(null); }}
                                                                className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-transform hover:scale-110 text-base leading-none"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onReply(msg); setMobileMenuMsgId(null); }}
                                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
                                                        >
                                                            <Reply size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* New Messages Divider */}
                            {initialLastReadId === msg.id && index !== messages.length - 1 && (
                                <div className="flex items-center justify-center my-6 animate-fade-in">
                                    <div className="h-px bg-red-200/50 dark:bg-red-900/50 flex-1 max-w-[100px]"></div>
                                    <span className="text-[10px] font-bold text-red-500 dark:text-red-400 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-100 dark:border-red-900/30">
                                        Start of New Messages
                                    </span>
                                    <div className="h-px bg-red-200/50 dark:bg-red-900/50 flex-1 max-w-[100px]"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })
            )}

            {/* Reaction Tooltip Portal */}
            {activeReaction && createPortal(
                <div
                    className="fixed z-[9999] min-w-[120px] pointer-events-auto"
                    style={{
                        top: activeReaction.y - 8, // Just above the button
                        left: activeReaction.x,
                        transform: 'translate(-50%, -100%)' // Center horizontally, shift up
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-slate-800 text-white text-[10px] rounded-lg shadow-xl p-2 animate-fade-in border border-slate-700">
                        {/* Arrow at bottom */}
                        <div className="absolute top-full left-1/2 -ml-1.5 -mt-[1px] border-4 border-transparent border-t-slate-800 pointer-events-none"></div>

                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {(() => {
                                const msg = messages.find(m => m.id === activeReaction.id);
                                if (!msg || !msg.reactions) return null;
                                const reaction = msg.reactions.find(r => r.emoji === activeReaction.emoji);
                                if (!reaction) return null;

                                return reaction.userIds.map(uid => {
                                    const u = allUsers.find(usr => usr.uid === uid);
                                    return (
                                        <div key={uid} className="flex items-center gap-2 whitespace-nowrap px-1 py-0.5 hover:bg-white/10 rounded">
                                            {u?.photoURL ? (
                                                <img src={u.photoURL} alt="" className="w-4 h-4 rounded-full object-cover bg-white shrink-0" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-slate-500 flex items-center justify-center text-[7px] font-bold text-white shrink-0">
                                                    {u?.displayName?.[0] || '?'}
                                                </div>
                                            )}
                                            <span className="truncate max-w-[120px] font-bold">{u?.displayName || 'Unknown User'}</span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <div className="flex gap-2 animate-fade-in-up">
                    <div className="w-8 h-6 rounded-full bg-white/30 dark:bg-slate-800/30 flex items-center justify-center backdrop-blur-md">
                        <div className="flex gap-0.5">
                            <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></span>
                            <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-500 self-center font-medium opacity-80">
                        {typingUsers.join(', ')} typing...
                    </span>
                </div>
            )}
        </div>
    );
};
