
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { BLData, VesselJob, AppSettings, ChatMessage, ChatUser, BLChecklist, BackgroundTask, Language } from '../types';
import {
    Search, FileText, MessageCircle, LogOut, X, ArrowLeft, User as UserIcon,
    Check, List as ListIcon, Box, ExternalLink, ChevronDown, LayoutGrid, Globe, Ship, Anchor, FileSpreadsheet, Scale, Package, Briefcase, Plus
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { chatService } from '../services/chatService';
import { User } from 'firebase/auth';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MessageList } from './chat/MessageList';
import { MessageInput } from './chat/MessageInput';
import { useChatScroll } from '../hooks/useChatScroll';
import { HSCodeSearch } from '../features/toolbox/tabs/HSCodeSearch';
import { MyMemo } from '../features/toolbox/tabs/MyMemo';
import { TeamBoard } from '../features/toolbox/tabs/TeamBoard';
import { HelpSection } from './HelpSection';

const mobileTranslations = {
    ko: {
        cargoList: '화물 목록',
        allVessels: '모든 선박',
        unassigned: '미배정',
        searchPlaceholder: 'B/L, 화주 검색...',
        noDocs: '문서를 찾을 수 없습니다.',
        messages: '메시지',
        globalChat: '전체 채팅 (Global)',
        globalDesc: '팀 공용 채널',
        dms: '다이렉트 메시지 (DM)',
        noContacts: '등록된 친구가 없습니다. PC버전에서 친구를 추가하세요.',
        settings: '설정',
        darkMode: '다크 모드',
        language: '언어 (Language)',
        viewMode: '화면 모드',
        mobile: '모바일',
        pc: 'PC / 태블릿',
        logout: '로그아웃',
        attachedDocs: '첨부 문서 (현장 확인용)',
        arrivalNotice: 'A/N',
        logisticsInfo: '물류 정보',
        cargoItems: '화물 상세',
        vessel: '선박',
        voyage: '항차',
        pol: '선적항',
        pod: '양하항',
        consignee: '수하인',
        weight: '중량',
        vol: '용적',
        empty: '없음',
        noItems: '항목 없음',
        loadPrev: '이전 대화 불러오기',
        noMsgYet: '메시지가 없습니다. 대화를 시작해보세요!',
        typing: '입력 중...',
        isTyping: '님이 입력 중...',
        typeMsg: '메시지 입력...',
        teamChannel: '팀 채널',
        dmChannel: '1:1 메시지',
        version: 'LOGI1 모바일 v1.0.0',
        addFriendHint: '친구 추가는 PC 버전에서 가능합니다.',
        selectVessel: '선박 선택',
        searchVessel: '선박 검색...',
        docBL: 'B/L',
        docCI: 'Invoice',
        docPL: 'Packing List',
        docEtc: '기타 문서',
        open: '열기',
        missing: '미등록',
        toolbox: '도구함',
        hsCode: 'HS코드',
        myMemo: '나의메모',
        teamBoard: '팀게시판',
        locale: 'ko-KR'
    },
    en: {
        cargoList: 'Cargo List',
        allVessels: 'All Vessels',
        unassigned: 'Unassigned',
        searchPlaceholder: 'Search B/L, Shipper...',
        noDocs: 'No documents found.',
        messages: 'Messages',
        globalChat: 'Global Chat',
        globalDesc: 'Public Team Channel',
        dms: 'Direct Messages',
        noContacts: 'No contacts added. Use PC to add friends.',
        settings: 'Settings',
        darkMode: 'Dark Mode',
        language: 'Language',
        viewMode: 'View Mode',
        mobile: 'Mobile',
        pc: 'PC',
        logout: 'Log Out',
        attachedDocs: 'Field Documents',
        arrivalNotice: 'A/N',
        logisticsInfo: 'Logistics Info',
        cargoItems: 'Cargo Items',
        vessel: 'Vessel',
        voyage: 'Voyage',
        pol: 'POL',
        pod: 'POD',
        consignee: 'Consignee',
        weight: 'Weight',
        vol: 'Vol',
        empty: 'Empty',
        noItems: 'No items listed.',
        loadPrev: 'Load Previous Messages',
        noMsgYet: 'No messages yet. Start the conversation!',
        typing: 'typing...',
        isTyping: 'is typing...',
        typeMsg: 'Type a message...',
        teamChannel: 'Team Channel',
        dmChannel: 'Direct Message',
        version: 'LOGI1 Mobile v1.0.0',
        addFriendHint: 'Add friends via PC version.',
        selectVessel: 'Select Vessel',
        searchVessel: 'Search Vessel...',
        docBL: 'B/L',
        docCI: 'Invoice',
        docPL: 'Packing List',
        docEtc: 'Others',
        open: 'Open',
        missing: 'Missing',
        toolbox: 'Toolbox',
        hsCode: 'HS Code',
        myMemo: 'My Memo',
        teamBoard: 'Team Board',
        locale: 'en-US'
    },
    cn: {
        cargoList: '货物清单',
        allVessels: '所有船舶',
        unassigned: '未分配',
        searchPlaceholder: '搜索提单, 发货人...',
        noDocs: '未找到文档。',
        messages: '消息',
        globalChat: '全局聊天',
        globalDesc: '公共团队频道',
        dms: '私信',
        noContacts: '未添加联系人。请使用PC端添加好友。',
        settings: '设置',
        darkMode: '深色模式',
        language: '语言',
        viewMode: '视图模式',
        mobile: '手机',
        pc: '电脑',
        logout: '退出登录',
        attachedDocs: '现场文档',
        arrivalNotice: '到货通知',
        logisticsInfo: '物流信息',
        cargoItems: '货物详情',
        vessel: '船舶',
        voyage: '航次',
        pol: '装货港',
        pod: '卸货港',
        consignee: '收货人',
        weight: '重量',
        vol: '体积',
        empty: '无',
        noItems: '无项目。',
        loadPrev: '加载更多消息',
        noMsgYet: '暂无消息。开始对话吧！',
        typing: '正在输入...',
        isTyping: '正在输入...',
        typeMsg: '输入消息...',
        teamChannel: '团队频道',
        dmChannel: '私信',
        version: 'LOGI1 移动版 v1.0.0',
        addFriendHint: '请在PC端添加好友。',
        selectVessel: '选择船舶',
        searchVessel: '搜索船舶...',
        docBL: '提单',
        docCI: '发票',
        docPL: '装箱单',
        docEtc: '其他',
        open: '打开',
        missing: '缺失',
        toolbox: '工具箱',
        hsCode: 'HS编码',
        myMemo: '我的备忘录',
        teamBoard: '团队看板',
        locale: 'zh-CN'
    }
};

interface MobileLayoutProps {
    user: User | null;
    settings: AppSettings;
    onUpdateSettings: (s: AppSettings) => void;
    onLogout: () => void;
    bls: BLData[];
    jobs: VesselJob[];
    checklists: Record<string, BLChecklist>;
    onUpdateBL: (id: string, updates: Partial<BLData>) => Promise<void>;
    onDeleteBL: (id: string) => Promise<void>;
    onAddTask: (task: BackgroundTask) => void;
    onUpdateTask: (id: string, updates: Partial<BackgroundTask>) => void;
    hasUnreadMessages?: boolean;
    onCheckMessages?: () => void;
}

// Mobile Chat View Component
interface MobileChatViewProps {
    user: User | null;
    view: 'list' | 'room';
    setView: (view: 'list' | 'room') => void;
    activeChannel: { id: string; name: string; type: 'global' | 'dm' };
    setActiveChannel: (channel: { id: string; name: string; type: 'global' | 'dm' }) => void;
    onNavigateToRoom: () => void;
    onBackToList: () => void;
    language: Language;
}

const MobileChatView: React.FC<MobileChatViewProps> = ({ user, view, setView, activeChannel, setActiveChannel, onNavigateToRoom, onBackToList, language }) => {
    const t = mobileTranslations[language];
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [unreadMap, setUnreadMap] = useState<Set<string>>(new Set());


    // New States for Full Functionality
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    // Use Shared Hook
    const {
        scrollRef, handleScroll, scrollToBottom, showScrollDown, messageRefs, signalHistoryLoad, restoreScrollPosition, initialLastReadId
    } = useChatScroll(messages, activeChannel.id, user?.uid, view === 'room');

    const typingTimeoutRef = useRef<any>(null);
    const lastTypingSentRef = useRef<number>(0);
    const [isTyping, setIsTyping] = useState(false);

    // History Loading Logic
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const prevHeightRef = useRef(0);
    const isHistoryLoadingRef = useRef(false); // Re-introduced for compensation

    const loadMoreHistory = async () => {
        if (!activeChannel.id || isLoadingHistory || !hasMoreHistory || messages.length === 0) return;

        setIsLoadingHistory(true);
        signalHistoryLoad();

        // Capture height for compensation
        if (scrollRef.current) prevHeightRef.current = scrollRef.current.scrollHeight;
        isHistoryLoadingRef.current = true;

        try {
            const oldestMsg = messages[0];
            const history = await chatService.fetchHistoryMessages(activeChannel.id, oldestMsg.timestamp, 50);

            if (history.length > 0) {
                setMessages(prev => [...history, ...prev]);
            } else {
                setHasMoreHistory(false);
            }
        } catch (e) {
            console.error("History Error", e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Scroll Compensation Effect
    useLayoutEffect(() => {
        if (view !== 'room' || !scrollRef.current) return;

        if (isHistoryLoadingRef.current && messages.length > 0) {
            const currentHeight = scrollRef.current.scrollHeight;
            const diff = currentHeight - prevHeightRef.current;
            if (diff > 0) {
                scrollRef.current.scrollTop = diff;
            }
            isHistoryLoadingRef.current = false;
        }
        prevHeightRef.current = scrollRef.current.scrollHeight;
    }, [messages, view]);

    useEffect(() => {
        const unsub = chatService.subscribeChatUsers(setUsers);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsub = chatService.subscribeUnreadMap(user.uid, setUnreadMap);
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (view === 'room' && activeChannel.id && user) {
            chatService.markChannelRead(activeChannel.id, user.uid);
        }
    }, [view, activeChannel, user, messages.length]);

    useEffect(() => {
        if (view !== 'room' || !activeChannel.id) return;

        // Initial Load: Latest 50
        const unsub = chatService.subscribeChatMessages(activeChannel.id, 50, (msgs) => {
            // If we have no history loaded (count <= 50), just take the snapshot (reliable sync).
            // If we have history, we suspect the snapshot is just the tail.

            // Strategy:
            // 1. Identify the 'tail' of the current messages that corresponds to the snapshot range.
            // 2. Or simplified: If `currentMessages.length > 50`, we assume `currentMessages` contains [History + Latest].
            // The snapshot contains [Latest'].
            // We need [History + Latest'].

            // Identification: The snapshot messages have IDs.
            // We can dedup based on IDs.
            // const snapshotIds = new Set(msgs.map(m => m.id)); // Not strictly needed for this merge logic

            // BUT, if the snapshot *missing* some messages because they fell out of the window of 50?
            // That's fine, we treat them as history.
            // What if a message was DELETED or EDITED?
            // The 50 snapshot reflects the current truth of the last 50.
            // History messages (older than 50) are static unless we listen to them too.

            // So: `return [...history, ...msgs]`.
            // We need to ensure `history` implies messages OLDER than `msgs[0]`.
            const firstSnapshotMsg = msgs[0];
            if (!firstSnapshotMsg) {
                setMessages([]); // If snapshot is empty, clear messages
                return;
            }

            setMessages(currentMessages => {
                // Filter out any messages from currentMessages that are also present in the new snapshot
                // or are newer than the oldest message in the snapshot.
                const realHistory = currentMessages.filter(m => m.timestamp < firstSnapshotMsg.timestamp);
                return [...realHistory, ...msgs];
            });
        });
        return () => unsub();
    }, [view, activeChannel.id]);

    useEffect(() => {
        if (view !== 'room' || !activeChannel.id || !user) return;
        const unsub = chatService.subscribeTyping(activeChannel.id, (list) => {
            const others = list.filter(u => u.userId !== user.uid).map(u => u.displayName);
            setTypingUsers(others);
        });
        return () => unsub();
    }, [view, activeChannel.id, user?.uid]);

    const handleTyping = () => {
        if (!user || !activeChannel.id) return;
        const now = Date.now();
        if (!isTyping || now - lastTypingSentRef.current > 2500) {
            chatService.sendTypingStatus(activeChannel.id, { uid: user.uid, displayName: user.displayName || 'User' });
            lastTypingSentRef.current = now;
            setIsTyping(true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            chatService.clearTypingStatus(activeChannel.id, user.uid);
            setIsTyping(false);
        }, 3000);
    };

    const handleStopTyping = () => {
        if (!user || !activeChannel.id) return;
        chatService.clearTypingStatus(activeChannel.id, user.uid);
        setIsTyping(false);
    };

    const handleSend = async (text: string) => {
        if (!user || !activeChannel.id) return;

        const msg: ChatMessage = {
            id: 'temp-' + Date.now(),
            text,
            senderId: user.uid,
            senderName: user.displayName || 'User',
            senderPhoto: user.photoURL || '',
            timestamp: Date.now(),
            channelId: activeChannel.id,
            readBy: [user.uid],
            pending: true,
            replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined
        };

        setMessages(prev => [...prev, msg]);
        setReplyingTo(null);
        setTimeout(scrollToBottom, 50);

        await chatService.sendChatMessage(msg);
    };

    const handleReaction = async (emoji: string, messageId: string) => {
        if (!user) return;

        // Optimistic Update
        setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
                const reactions = (msg.reactions || []).map(r => ({ ...r, userIds: [...r.userIds] }));
                const idx = reactions.findIndex(r => r.emoji === emoji);
                if (idx !== -1) {
                    if (reactions[idx].userIds.includes(user.uid)) {
                        reactions[idx].userIds = reactions[idx].userIds.filter(id => id !== user.uid);
                        if (reactions[idx].userIds.length === 0) reactions.splice(idx, 1);
                    } else {
                        reactions[idx].userIds.push(user.uid);
                    }
                } else {
                    reactions.push({ emoji, userIds: [user.uid] });
                }
                return { ...msg, reactions };
            }
            return msg;
        }));

        await chatService.toggleMessageReaction(messageId, user.uid, emoji);
    };

    const handleDelete = async (messageId: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        try {
            await chatService.deleteChatMessage(messageId);
        } catch (error) {
            console.error('Failed to delete message', error);
        }
    };

    const getDmChannelId = (partnerId: string) => {
        if (!user) return '';
        return [user.uid, partnerId].sort().join('_');
    };

    const myFriends = useMemo(() => {
        if (!user || users.length === 0) return [];
        const me = users.find(u => u.uid === user.uid);
        if (!me || !me.contacts) return [];
        return users.filter(u => me.contacts?.includes(u.uid));
    }, [users, user]);

    // loadMoreHistory refactored above
    /*
    const loadMoreHistory = () => {
        isHistoryLoadingRef.current = true;
        setMessageLimit(prev => prev + 100);
    };
    */

    if (view === 'list') {
        return (
            <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-32">
                <h2 className="font-bold text-slate-800 dark:text-white mb-4 text-lg">{t.messages}</h2>

                <div
                    onClick={() => {
                        setActiveChannel({ id: 'global', name: t.globalChat, type: 'global' });
                        setHasMoreHistory(true);
                        setMessages([]); // Clear messages on channel switch
                        // setMessageLimit(150); // Removed
                        // prevMessagesLengthRef.current = 0; // Removed
                        // previousScrollHeightRef.current = 0; // Removed
                        onNavigateToRoom();
                    }}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 mb-6 cursor-pointer active:scale-95 transition-transform relative"
                >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{t.globalChat}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.globalDesc}</p>
                    </div>
                </div>

                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-3">{t.dms}</h3>
                <div className="space-y-2">
                    {myFriends.length === 0 ? (
                        <p className="text-slate-400 text-sm italic">{t.noContacts}</p>
                    ) : (
                        myFriends.map(friend => {
                            const dmId = getDmChannelId(friend.uid);
                            const hasUnread = unreadMap.has(dmId);

                            return (
                                <div
                                    key={friend.uid}
                                    onClick={() => {
                                        setActiveChannel({ id: dmId, name: friend.displayName, type: 'dm' });
                                        setHasMoreHistory(true);
                                        setMessages([]); // Clear messages on channel switch
                                        // setMessageLimit(150); // Removed
                                        // prevMessagesLengthRef.current = 0; // Removed
                                        // previousScrollHeightRef.current = 0; // Removed
                                        onNavigateToRoom();
                                    }}
                                    className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 cursor-pointer active:scale-95 transition-transform relative"
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                            {friend.photoURL ? <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400" />}
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${friend.status === 'online' ? 'bg-emerald-500' : friend.status === 'away' ? 'bg-amber-500' : 'bg-slate-300'
                                            }`}></div>

                                        {hasUnread && (
                                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{friend.displayName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{friend.status}</p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
            {/* Chat Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-white/75 dark:bg-black/40 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-sm flex items-center gap-3 shrink-0 safe-area-top">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    {activeChannel.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">{activeChannel.name}</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{activeChannel.type === 'global' ? t.teamChannel : t.dmChannel}</p>
                </div>
            </div>

            {/* Chat Content - Using shared MessageList */}
            <div className="flex-1 overflow-y-auto p-4 pt-20 pb-20 custom-scrollbar" ref={scrollRef} onScroll={handleScroll} style={{ WebkitOverflowScrolling: 'touch' }}>
                <MessageList
                    messages={messages}
                    user={user}
                    allUsers={users}
                    typingUsers={typingUsers}
                    messageRefs={messageRefs}
                    onReaction={handleReaction}
                    onReply={setReplyingTo}
                    onDelete={handleDelete}
                    loadMoreMessages={loadMoreHistory}
                    initialLastReadId={initialLastReadId}
                />
            </div>

            <AnimatePresence>
                {showScrollDown && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-20 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 z-30 hover:bg-white/90 dark:hover:bg-black/90 transition-colors"
                    >
                        <ChevronDown size={20} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Footer - Using shared MessageInput */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-2 bg-white/75 dark:bg-black/40 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shrink-0 safe-area-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                <MessageInput
                    onSend={handleSend}
                    onTyping={handleTyping}
                    onStopTyping={handleStopTyping}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                />
            </div>
        </div>
    );
};

// --- REDESIGNED Mobile Shipment Detail (Bottom Sheet / Overlay) ---
const MobileShipmentDetail: React.FC<{
    bl: BLData;
    onClose: () => void;
    language: Language;
}> = ({ bl, onClose, language }) => {
    const t = mobileTranslations[language];
    const totalQty = bl.cargoItems.reduce((acc, i) => acc + (i.quantity || 0), 0);
    const totalWeight = bl.cargoItems.reduce((acc, i) => acc + (i.grossWeight || 0), 0);
    const totalVol = bl.cargoItems.reduce((acc, i) => acc + (i.measurement || 0), 0);

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.y > 100) {
            onClose();
        }
    };

    const DocButton = ({ icon: Icon, label, url, colorClass }: { icon: any, label: string, url?: string, colorClass: string }) => (
        <div
            onClick={() => url ? window.open(url, '_blank') : null}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${url
                ? `bg-white dark:bg-slate-800 cursor-pointer shadow-sm ${colorClass}`
                : 'bg-slate-100 dark:bg-slate-800/50 border-transparent opacity-50 cursor-default'
                }`}
        >
            <div className={`p-2.5 rounded-full mb-1.5 ${url ? 'bg-current/10' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <Icon size={20} className={url ? '' : 'text-slate-400'} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-center leading-tight truncate w-full">{label}</span>
            <span className={`text-[8px] mt-0.5 font-medium ${url ? 'text-current opacity-80' : 'text-slate-400'}`}>
                {url ? t.open : t.missing}
            </span>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-50 dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 py-4 bg-white dark:bg-slate-800 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            {bl.blNumber}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                            <Ship size={14} className="text-blue-500" />
                            {bl.vesselName} <span className="opacity-60">{bl.voyageNo}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-safe-bottom">

                    {/* Quick Document Grid */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <ExternalLink size={16} className="text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.attachedDocs}</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <DocButton
                                icon={FileText}
                                label={t.docBL}
                                url={bl.fileUrl}
                                colorClass="text-blue-600 border-blue-100 dark:border-blue-900/30"
                            />
                            <DocButton
                                icon={FileSpreadsheet}
                                label={t.docCI}
                                url={bl.commercialInvoice?.fileUrl}
                                colorClass="text-emerald-600 border-emerald-100 dark:border-emerald-900/30"
                            />
                            <DocButton
                                icon={Package}
                                label={t.docPL}
                                url={bl.packingList?.fileUrl}
                                colorClass="text-purple-600 border-purple-100 dark:border-purple-900/30"
                            />
                            <DocButton
                                icon={Box}
                                label={t.docEtc}
                                url={bl.arrivalNotice?.fileUrl || bl.exportDeclaration?.fileUrl}
                                colorClass="text-slate-600 border-slate-200 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-4">
                                <Anchor size={16} className="text-slate-400" />
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.logisticsInfo}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">{t.shipper}</label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white break-words leading-snug">{bl.shipper}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">{t.consignee}</label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white break-words leading-snug">{bl.consignee}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">{t.pol}</label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{bl.portOfLoading}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">{t.pod}</label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{bl.portOfDischarge}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-4">
                                <Scale size={16} className="text-slate-400" />
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.cargoItems}</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <div className="text-center">
                                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Q'TY</label>
                                    <p className="text-base font-bold text-slate-800 dark:text-white">{totalQty.toLocaleString()}</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-slate-600">
                                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">{t.weight}</label>
                                    <p className="text-base font-bold text-slate-800 dark:text-white">{totalWeight.toLocaleString()}</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-slate-600">
                                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">{t.vol}</label>
                                    <p className="text-base font-bold text-slate-800 dark:text-white">{totalVol.toFixed(3)}</p>
                                </div>
                            </div>
                            {/* Simple item list preview */}
                            {bl.cargoItems.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
                                        {bl.cargoItems[0].description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export const MobileLayout: React.FC<MobileLayoutProps> = ({
    user,
    settings,
    onUpdateSettings,
    onLogout,
    bls,
    jobs,
    checklists,
    onUpdateBL,
    onDeleteBL,
    onAddTask,
    onUpdateTask,
    hasUnreadMessages,
    onCheckMessages
}) => {
    const t = mobileTranslations[settings.language];
    const [currentView, setCurrentView] = useState<'cargo' | 'chat' | 'settings' | 'toolbox'>('cargo');
    const [chatView, setChatView] = useState<'list' | 'room'>('list');
    const [toolboxTab, setToolboxTab] = useState<'hscode' | 'memo' | 'board'>('memo');
    const [activeChannel, setActiveChannel] = useState<{ id: string; name: string; type: 'global' | 'dm' }>({ id: 'global', name: t.globalChat, type: 'global' });
    const [searchTerm, setSearchTerm] = useState('');
    const [vesselFilter, setVesselFilter] = useState('all');
    const [selectedBLId, setSelectedBLId] = useState<string | null>(null);

    // Enhanced Vessel Selector State
    const [isVesselSelectorOpen, setIsVesselSelectorOpen] = useState(false);
    const [vesselSearchTerm, setVesselSearchTerm] = useState('');

    // TeamBoard Mobile State Tracking
    const [showMobileTasks, setShowMobileTasks] = useState(false);
    const [openTaskCount, setOpenTaskCount] = useState(0);

    useEffect(() => {
        const handleStateUpdate = (e: any) => {
            const { showMobileTasks: newShowTasks, openTaskCount: newCount } = e.detail;
            if (newShowTasks !== undefined) setShowMobileTasks(newShowTasks);
            if (newCount !== undefined) setOpenTaskCount(newCount);
        };

        window.addEventListener('mobile-teamboard-state-update', handleStateUpdate);
        return () => window.removeEventListener('mobile-teamboard-state-update', handleStateUpdate);
    }, []);

    useEffect(() => {
        if (activeChannel.type === 'global') {
            setActiveChannel(prev => ({ ...prev, name: t.globalChat }));
        }
    }, [settings.language]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (selectedBLId) {
                setSelectedBLId(null);
                return;
            }
            if (currentView === 'chat' && chatView === 'room') {
                setChatView('list');
                return;
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [selectedBLId, currentView, chatView]);

    const handleOpenDetail = (id: string) => {
        window.history.pushState({ modal: true }, '');
        setSelectedBLId(id);
    };

    const handleCloseDetail = () => {
        window.history.back();
        // State clear happens in popstate or explicit setter
        setSelectedBLId(null);
    };

    const handleOpenChatRoom = () => {
        window.history.pushState({ chatRoom: true }, '');
        setChatView('room');
    };

    const handleCloseChatRoom = () => {
        window.history.back();
    };

    const filteredBLs = useMemo(() => {
        let result = bls;

        if (vesselFilter !== 'all') {
            if (vesselFilter === 'unassigned') {
                result = result.filter(b => !b.vesselJobId);
            } else {
                result = result.filter(b => b.vesselJobId === vesselFilter);
            }
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(b =>
                b.blNumber.toLowerCase().includes(lower) ||
                b.shipper.toLowerCase().includes(lower) ||
                (b.vesselName || '').toLowerCase().includes(lower)
            );
        }

        return result;
    }, [bls, searchTerm, vesselFilter]);

    // Filtered Jobs for Selector
    const filteredJobs = useMemo(() => {
        if (!vesselSearchTerm.trim()) return jobs;
        return jobs.filter(j =>
            j.vesselName.toLowerCase().includes(vesselSearchTerm.toLowerCase()) ||
            j.voyageNo.toLowerCase().includes(vesselSearchTerm.toLowerCase())
        );
    }, [jobs, vesselSearchTerm]);

    const selectedVesselLabel = useMemo(() => {
        if (vesselFilter === 'all') return t.allVessels;
        if (vesselFilter === 'unassigned') return t.unassigned;
        const j = jobs.find(j => j.id === vesselFilter);
        return j ? `${j.vesselName} (${j.voyageNo})` : t.allVessels;
    }, [vesselFilter, jobs, t]);

    const renderContent = () => {
        switch (currentView) {
            case 'cargo':
                return (
                    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
                        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-white/20 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150 border-b border-white/20 dark:border-white/10 pt-safe-top shadow-sm transition-all">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="font-bold text-lg text-slate-800 dark:text-white">{t.cargoList}</h2>

                                {/* Enhanced Vessel Selector Trigger */}
                                <button
                                    onClick={() => { setIsVesselSelectorOpen(true); setVesselSearchTerm(''); }}
                                    className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white/30 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm backdrop-blur-sm active:scale-95 transition-transform max-w-[70%]"
                                >
                                    <Ship size={14} className="text-blue-500 shrink-0" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{selectedVesselLabel}</span>
                                    <ChevronDown size={14} className="text-slate-400 shrink-0" />
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    type="text"
                                    placeholder={t.searchPlaceholder}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/30 dark:bg-slate-800/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm border border-slate-300 dark:border-slate-600 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 pt-36 custom-scrollbar">
                            {filteredBLs.length === 0 ? (
                                <div className="text-center text-slate-400 dark:text-slate-500 mt-10">{t.noDocs}</div>
                            ) : (
                                filteredBLs.map(bl => {
                                    const docs = [
                                        { id: 'BL', label: 'B/L', has: !!bl.fileUrl, color: 'bg-blue-500' },
                                        { id: 'AN', label: 'A/N', has: !!bl.arrivalNotice?.fileUrl, color: 'bg-orange-500' },
                                        { id: 'CI', label: 'C/I', has: !!bl.commercialInvoice?.fileUrl, color: 'bg-emerald-500' },
                                        { id: 'PL', label: 'P/L', has: !!bl.packingList?.fileUrl, color: 'bg-purple-500' },
                                        { id: 'MF', label: 'M/F', has: !!bl.manifest?.fileUrl, color: 'bg-cyan-500' },
                                        { id: 'ED', label: 'E/D', has: !!bl.exportDeclaration?.fileUrl, color: 'bg-rose-500' },
                                    ];

                                    return (
                                        <div
                                            key={bl.id}
                                            onClick={() => handleOpenDetail(bl.id)}
                                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-transform cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                                                    {bl.blNumber}
                                                </span>
                                                {bl.fileUrl && <ExternalLink size={14} className="text-blue-500" onClick={(e) => { e.stopPropagation(); window.open(bl.fileUrl, '_blank'); }} />}
                                            </div>
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 line-clamp-1">{bl.shipper}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">{bl.vesselName}</p>

                                            <div className="flex gap-1.5 mt-2">
                                                {docs.map(doc => (
                                                    <div
                                                        key={doc.id}
                                                        className={`w-2 h-2 rounded-full ${doc.has ? doc.color : 'bg-slate-200 dark:bg-slate-700'}`}
                                                        title={doc.label}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Vessel Selector Overlay */}
                        <AnimatePresence>
                            {isVesselSelectorOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 100 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 100 }}
                                    className="fixed inset-0 z-[150] bg-white dark:bg-slate-900 flex flex-col pt-safe-top"
                                >
                                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                        <button onClick={() => setIsVesselSelectorOpen(false)} className="p-2 -ml-2 text-slate-500">
                                            <X size={24} />
                                        </button>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.selectVessel}</h3>
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                placeholder={t.searchVessel}
                                                value={vesselSearchTerm}
                                                onChange={(e) => setVesselSearchTerm(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                        <div
                                            onClick={() => { setVesselFilter('all'); setIsVesselSelectorOpen(false); }}
                                            className={`p-4 mb-2 rounded-xl flex items-center justify-between cursor-pointer ${vesselFilter === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                                        >
                                            <span className="font-bold text-sm">{t.allVessels}</span>
                                            {vesselFilter === 'all' && <Check size={18} />}
                                        </div>
                                        <div
                                            onClick={() => { setVesselFilter('unassigned'); setIsVesselSelectorOpen(false); }}
                                            className={`p-4 mb-2 rounded-xl flex items-center justify-between cursor-pointer ${vesselFilter === 'unassigned' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                                        >
                                            <span className="font-bold text-sm">{t.unassigned}</span>
                                            {vesselFilter === 'unassigned' && <Check size={18} />}
                                        </div>
                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-2 mx-2"></div>
                                        {filteredJobs.map(job => (
                                            <div
                                                key={job.id}
                                                onClick={() => { setVesselFilter(job.id); setIsVesselSelectorOpen(false); }}
                                                className={`p-4 mb-2 rounded-xl flex items-center justify-between cursor-pointer ${vesselFilter === job.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                                            >
                                                <div>
                                                    <p className="font-bold text-sm">{job.vesselName}</p>
                                                    <p className="text-xs opacity-70 mt-0.5">{job.voyageNo}</p>
                                                </div>
                                                {vesselFilter === job.id && <Check size={18} />}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            case 'chat':
                return (
                    <div className="h-full flex flex-col relative">
                        {chatView === 'room' && (
                            <button
                                onClick={handleCloseChatRoom}
                                className="absolute top-3 left-3 z-30 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-full shadow-sm top-safe-area"
                            >
                                <ArrowLeft size={20} className="text-slate-700 dark:text-slate-200" />
                            </button>
                        )}
                        <MobileChatView
                            user={user}
                            view={chatView}
                            setView={setChatView}
                            activeChannel={activeChannel}
                            setActiveChannel={setActiveChannel}
                            onNavigateToRoom={handleOpenChatRoom}
                            onBackToList={handleCloseChatRoom}
                            language={settings.language}
                        />
                    </div>
                );
            case 'settings':
                return (
                    <div className="p-6 h-full overflow-y-auto custom-scrollbar pb-32 pt-safe-top">
                        <h2 className="font-bold text-xl text-slate-800 dark:text-white mb-6">{t.settings}</h2>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.darkMode}</span>
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.language}</span>
                                <div className="relative flex items-center gap-2">
                                    <Globe size={16} className="text-slate-400" />
                                    <select
                                        value={settings.language}
                                        onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value as any })}
                                        className="bg-slate-50 dark:bg-slate-700 text-sm border-none rounded-lg p-2 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    >
                                        <option value="ko">한국어</option>
                                        <option value="en">English</option>
                                        <option value="cn">中文</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.viewMode}</span>
                                <div className="flex bg-slate-50 dark:bg-slate-700 p-1 rounded-lg">
                                    <button
                                        onClick={() => onUpdateSettings({ ...settings, viewMode: 'mobile' })}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${settings.viewMode === 'mobile' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        {t.mobile}
                                    </button>
                                    <button
                                        onClick={() => onUpdateSettings({ ...settings, viewMode: 'pc' })}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${settings.viewMode === 'pc' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        {t.pc}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {user && (
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 mb-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="text-slate-400 w-6 h-6" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-white truncate text-sm">{user.displayName || 'User'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                </div>
                            </div>
                        )}

                        {/* Help Section */}
                        <HelpSection language={settings.language} userName={user?.displayName || 'User'} isMobile={true} />

                        <button
                            onClick={onLogout}
                            className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 mb-8"
                        >
                            <LogOut size={18} /> {t.logout}
                        </button>
                        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-auto pb-6">
                            {t.version}
                        </p>
                    </div>
                );
            case 'toolbox':
                return (
                    <div className="flex flex-col h-full bg-slate-50 dark:bg-black pt-safe-top">
                        {/* Apple-style Mobile Header (Segmented Control) */}
                        <div className="bg-slate-50 dark:bg-black px-4 pt-2 pb-2 z-10 custom-safe-top">
                            <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex relative font-medium text-[13px]">
                                <button
                                    onClick={() => setToolboxTab('memo')}
                                    className={`flex-1 py-1.5 rounded-[6px] text-center transition-all ${toolboxTab === 'memo' ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm font-semibold' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {t.myMemo}
                                </button>
                                <button
                                    onClick={() => {
                                        if (toolboxTab === 'board') {
                                            // Toggle to show Team Tasks when pressing tab again
                                            window.dispatchEvent(new CustomEvent('mobile-toggle-team-tasks'));
                                        } else {
                                            setToolboxTab('board');
                                        }
                                    }}
                                    className={`flex-1 py-1.5 rounded-[6px] text-center transition-all ${toolboxTab === 'board' ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm font-semibold' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {toolboxTab === 'board' && showMobileTasks ? '팀 할일' : t.teamBoard}
                                </button>
                                <button
                                    onClick={() => setToolboxTab('hscode')}
                                    className={`flex-1 py-1.5 rounded-[6px] text-center transition-all ${toolboxTab === 'hscode' ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm font-semibold' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {t.hsCode}
                                </button>
                            </div>
                            {/* Open Task Count Badge for Mobile - Centrally located below toggle */}
                            {toolboxTab === 'board' && showMobileTasks && (
                                <div className="flex justify-center mt-2 animate-in fade-in slide-in-from-top-1">
                                    <div className="bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                        {openTaskCount} Open Tasks
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative">
                            {toolboxTab === 'hscode' && <HSCodeSearch />}
                            {toolboxTab === 'memo' && <MyMemo isMobile={true} />}
                            {toolboxTab === 'board' && <TeamBoard isMobile={true} />}
                        </div>
                    </div>
                );
        }
    };

    // Determine if dock should slide left (memo or teamboard active in toolbox)
    const shouldSlideDockLeft = currentView === 'toolbox' && (toolboxTab === 'memo' || toolboxTab === 'board');

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden z-[100]"
            style={{ height: 'var(--mobile-vh, 100vh)' }}
        >
            <div className="flex-1 overflow-hidden relative w-full">
                {renderContent()}
            </div>

            {/* Mobile Detail Overlay - Rendered conditionally but on top */}
            <AnimatePresence>
                {selectedBLId && (
                    <MobileShipmentDetail
                        bl={bls.find(b => b.id === selectedBLId)!}
                        onClose={handleCloseDetail}
                        language={settings.language}
                    />
                )}
            </AnimatePresence>

            {!(currentView === 'chat' && chatView === 'room') && !selectedBLId && (
                <>
                    {/* Navigation Dock with inline FAB */}
                    <div
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 mb-[env(safe-area-inset-bottom)] flex items-center gap-3"
                    >
                        <div className="
                            relative flex items-center justify-around px-2 py-3.5
                            bg-white/30 dark:bg-black/40
                            backdrop-blur-2xl backdrop-saturate-150
                            rounded-full
                            shadow-lg shadow-blue-900/5
                            border border-white/40 dark:border-white/20
                        ">
                            <button
                                onClick={() => setCurrentView('cargo')}
                                className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative group ${currentView === 'cargo' ? 'scale-110' : 'hover:bg-white/20 dark:hover:bg-white/10'}`}
                            >
                                <div className={`absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-md transition-opacity duration-300 ${currentView === 'cargo' ? 'opacity-100' : 'opacity-0'}`} />
                                <ListIcon
                                    size={24}
                                    strokeWidth={currentView === 'cargo' ? 2.5 : 2}
                                    className={`relative z-10 transition-colors duration-300 ${currentView === 'cargo' ? 'text-blue-600 dark:text-blue-400 fill-blue-600/10' : 'text-slate-500 dark:text-slate-400'}`}
                                />
                            </button>

                            <button
                                onClick={() => {
                                    if (currentView !== 'chat') {
                                        setActiveChannel({ id: 'global', name: t.globalChat, type: 'global' });
                                        setChatView('room');
                                        window.history.pushState({ chatRoom: true }, '');
                                    }
                                    setCurrentView('chat');
                                    if (onCheckMessages) onCheckMessages();
                                }}
                                className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative group ${currentView === 'chat' ? 'scale-110' : 'hover:bg-white/20 dark:hover:bg-white/10'}`}
                            >
                                <div className={`absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-md transition-opacity duration-300 ${currentView === 'chat' ? 'opacity-100' : 'opacity-0'}`} />
                                <div className="relative z-10">
                                    <MessageCircle
                                        size={24}
                                        strokeWidth={currentView === 'chat' ? 2.5 : 2}
                                        className={`transition-colors duration-300 ${currentView === 'chat' ? 'text-blue-600 dark:text-blue-400 fill-blue-600/10' : 'text-slate-500 dark:text-slate-400'}`}
                                    />
                                    {hasUnreadMessages && currentView !== 'chat' && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#FF3B30] rounded-full border border-white dark:border-black shadow-sm animate-pulse"></span>
                                    )}
                                </div>
                            </button>

                            <button
                                onClick={() => setCurrentView('toolbox')}
                                className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative group ${currentView === 'toolbox' ? 'scale-110' : 'hover:bg-white/20 dark:hover:bg-white/10'}`}
                            >
                                <div className={`absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-md transition-opacity duration-300 ${currentView === 'toolbox' ? 'opacity-100' : 'opacity-0'}`} />
                                <Briefcase
                                    size={24}
                                    strokeWidth={currentView === 'toolbox' ? 2.5 : 2}
                                    className={`relative z-10 transition-colors duration-300 ${currentView === 'toolbox' ? 'text-blue-600 dark:text-blue-400 fill-blue-600/10' : 'text-slate-500 dark:text-slate-400'}`}
                                />
                            </button>

                            <button
                                onClick={() => setCurrentView('settings')}
                                className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative group ${currentView === 'settings' ? 'scale-110' : 'hover:bg-white/20 dark:hover:bg-white/10'}`}
                            >
                                <div className={`absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-md transition-opacity duration-300 ${currentView === 'settings' ? 'opacity-100' : 'opacity-0'}`} />
                                <LayoutGrid
                                    size={24}
                                    strokeWidth={currentView === 'settings' ? 2.5 : 2}
                                    className={`relative z-10 transition-colors duration-300 ${currentView === 'settings' ? 'text-blue-600 dark:text-blue-400 fill-blue-600/10' : 'text-slate-500 dark:text-slate-400'}`}
                                />
                            </button>
                        </div>

                        {/* Glass-effect floating button for new memo - inline with dock */}
                        <AnimatePresence>
                            {shouldSlideDockLeft && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8, width: 0 }}
                                    animate={{ opacity: 1, scale: 1, width: 56 }}
                                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('mobile-create-new-memo'));
                                    }}
                                    className="w-14 h-14 shrink-0
                                        bg-white/40 dark:bg-black/50
                                        backdrop-blur-2xl backdrop-saturate-150
                                        rounded-full
                                        shadow-lg shadow-amber-500/20
                                        border border-white/50 dark:border-white/20
                                        flex items-center justify-center
                                        active:scale-95 transition-transform overflow-hidden
                                    "
                                >
                                    <Plus size={28} className="text-amber-500" strokeWidth={2.5} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}
        </div>
    );
};
