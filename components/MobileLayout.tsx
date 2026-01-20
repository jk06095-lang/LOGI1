
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { BLData, VesselJob, AppSettings, ChatMessage, ChatUser, BLChecklist, BackgroundTask, Language, Attachment } from '../types';
import { 
    Search, Download, FileText, MessageCircle, Settings, LogOut, 
    Monitor, X, Menu, Filter, ArrowLeft, Send, User as UserIcon, 
    Check, CheckCheck, Grid, List as ListIcon, Ship, Anchor, Box, Home, ExternalLink, ChevronDown, Truck, ArrowUpCircle, Smile, LayoutGrid, Globe, Cloud, FolderOpen, FileImage, FileSpreadsheet, Reply, Copy, Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['✅', '❌', '👍', '❤️', '😂', '😮', '😢', '😡'];

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
    attachedDocs: '첨부 문서',
    arrivalNotice: 'Arrival Notice',
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
    locale: 'ko-KR',
    cloud: '클라우드',
    cloudDesc: '선박별 문서 열람 (읽기 전용)',
    replyTo: '답장:',
    cancelReply: '답장 취소',
    copy: '복사',
    reply: '답장',
    files: '파일',
    folderEmpty: '파일이 없습니다.'
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
    attachedDocs: 'Attached Documents',
    arrivalNotice: 'Arrival Notice',
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
    locale: 'en-US',
    cloud: 'Cloud',
    cloudDesc: 'View Docs by Vessel (Read-Only)',
    replyTo: 'Replying to:',
    cancelReply: 'Cancel Reply',
    copy: 'Copy',
    reply: 'Reply',
    files: 'Files',
    folderEmpty: 'No files.'
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
    attachedDocs: '附件文档',
    arrivalNotice: '到货通知书',
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
    locale: 'zh-CN',
    cloud: '云盘',
    cloudDesc: '按船舶查看文档 (只读)',
    replyTo: '回复:',
    cancelReply: '取消回复',
    copy: '复制',
    reply: '回复',
    files: '文件',
    folderEmpty: '无文件。'
  }
};

// Helper for file icons
const getFileIcon = (file: Attachment) => {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
        return <FileSpreadsheet size={24} className="text-emerald-600" />;
    }
    if (type.includes('word') || type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) {
        return <FileText size={24} className="text-blue-600" />;
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
        return <FileText size={24} className="text-red-500" />;
    }
    if (type.includes('image') || name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.webp')) {
        return <FileImage size={24} className="text-purple-500" />;
    }
    return <FileText size={24} className="text-slate-400" />;
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Mobile Cloud View Component
const MobileCloudView: React.FC<{ bls: BLData[], jobs: VesselJob[], language: Language }> = ({ bls, jobs, language }) => {
    const t = mobileTranslations[language];
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    // Group files by Job
    const folders = useMemo(() => {
        const map = new Map<string, { id: string; name: string; files: Attachment[] }>();
        
        jobs.forEach(j => {
            const shortVoyage = j.voyageNo.trim().length > 3 ? j.voyageNo.trim().slice(-3) : j.voyageNo.trim();
            map.set(j.id, { id: j.id, name: `${j.vesselName} (${shortVoyage})`, files: [] });
        });
        map.set('unassigned', { id: 'unassigned', name: t.unassigned, files: [] });

        bls.forEach(bl => {
            const targetId = bl.vesselJobId && map.has(bl.vesselJobId) ? bl.vesselJobId : 'unassigned';
            if (bl.attachments) {
                map.get(targetId)?.files.push(...bl.attachments);
            }
        });

        // Filter out empty folders except Unassigned if it has files
        return Array.from(map.values()).filter(f => f.files.length > 0).sort((a,b) => a.name.localeCompare(b.name));
    }, [bls, jobs, t.unassigned]);

    const activeFolder = folders.find(f => f.id === selectedFolderId);

    if (selectedFolderId && activeFolder) {
        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 animate-fade-in-up">
                <div className="p-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 pt-safe-top">
                    <button onClick={() => setSelectedFolderId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <ArrowLeft size={20} className="text-slate-700 dark:text-slate-200" />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white leading-none">{activeFolder.name}</h2>
                        <p className="text-xs text-slate-500 mt-1">{activeFolder.files.length} {t.files}</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32">
                    <div className="grid grid-cols-1 gap-3">
                        {activeFolder.files.map((file, idx) => (
                            <div 
                                key={idx}
                                onClick={() => window.open(file.url, '_blank')}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-transform"
                            >
                                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                    {getFileIcon(file)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                                    <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <Download size={16} className="text-slate-400" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 animate-fade-in">
            <div className="p-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 pt-safe-top">
                <h2 className="font-bold text-xl text-slate-800 dark:text-white">{t.cloud}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.cloudDesc}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32">
                <div className="grid grid-cols-2 gap-4">
                    {folders.map(folder => (
                        <button 
                            key={folder.id}
                            onClick={() => setSelectedFolderId(folder.id)}
                            className="aspect-square flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-transform gap-3 group"
                        >
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FolderOpen size={24} />
                            </div>
                            <div className="text-center w-full">
                                <p className="font-bold text-sm text-slate-800 dark:text-white truncate w-full">{folder.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{folder.files.length} {t.files}</p>
                            </div>
                        </button>
                    ))}
                    {folders.length === 0 && (
                        <div className="col-span-2 text-center text-slate-400 py-10 italic text-sm">
                            {t.folderEmpty}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadMap, setUnreadMap] = useState<Set<string>>(new Set()); 
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  
  // New States for Long Press & Reply & Loading
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const [pendingReactions, setPendingReactions] = useState<Set<string>>(new Set());
  
  // New Modal State for viewing reactions
  const [reactionModal, setReactionModal] = useState<{ emoji: string, names: string[] } | null>(null);

  const longPressTimerRef = useRef<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [messageLimit, setMessageLimit] = useState(150);
  const isHistoryLoadingRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  
  const typingTimeoutRef = useRef<any>(null); 
  const lastTypingSentRef = useRef<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    const unsub = dataService.subscribeChatUsers(setUsers);
    return () => unsub();
  }, []);

  useEffect(() => {
      if (!user) return;
      const unsub = dataService.subscribeUnreadMap(user.uid, setUnreadMap);
      return () => unsub();
  }, [user]);

  useEffect(() => {
      if (view === 'room' && activeChannel.id && user) {
          dataService.markChannelRead(activeChannel.id, user.uid);
      }
  }, [view, activeChannel, user, messages.length]);

  useEffect(() => {
    if (view !== 'room' || !activeChannel.id) return;
    
    const unsub = dataService.subscribeChatMessages(activeChannel.id, messageLimit, (msgs) => {
        setMessages(msgs);
    });
    return () => unsub();
  }, [view, activeChannel.id, messageLimit]);

  useLayoutEffect(() => {
      if (view !== 'room' || !scrollRef.current) return;
      
      const currentScrollHeight = scrollRef.current.scrollHeight;
      
      const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
      if (isInitialLoad) {
          scrollRef.current.scrollTop = currentScrollHeight;
      }
      else if (isHistoryLoadingRef.current) {
          const heightDiff = currentScrollHeight - previousScrollHeightRef.current;
          if (heightDiff > 0) {
              scrollRef.current.scrollTop += heightDiff;
          }
          isHistoryLoadingRef.current = false;
      }
      else if (messages.length > prevMessagesLengthRef.current) {
          const distanceFromBottom = currentScrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight;
          if (distanceFromBottom < 100) {
              scrollRef.current.scrollTop = currentScrollHeight;
          }
      }

      prevMessagesLengthRef.current = messages.length;
      previousScrollHeightRef.current = currentScrollHeight;
  }, [messages, view]);

  useEffect(() => {
      if (view !== 'room' || !activeChannel.id || !user) return;
      const unsub = dataService.subscribeTyping(activeChannel.id, (list) => {
          const others = list.filter(u => u.userId !== user.uid).map(u => u.displayName);
          setTypingUsers(others);
      });
      return () => unsub();
  }, [view, activeChannel.id, user?.uid]);

  const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollDown(distanceFromBottom > 150);
  };

  const scrollToBottom = () => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: 'smooth'
          });
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputText(val);
      
      if (!user || !activeChannel.id) return;

      if (val.trim() === '') {
          if (isTyping) {
              dataService.clearTypingStatus(activeChannel.id, user.uid);
              setIsTyping(false);
          }
          return;
      }

      const now = Date.now();
      if (!isTyping || now - lastTypingSentRef.current > 2500) {
          dataService.sendTypingStatus(activeChannel.id, { 
              uid: user.uid, 
              displayName: user.displayName || 'User' 
          });
          lastTypingSentRef.current = now;
          setIsTyping(true);
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          dataService.clearTypingStatus(activeChannel.id, user.uid);
          setIsTyping(false);
      }, 3000);
  };

  const handleEmojiClick = (emoji: string) => {
      setInputText(prev => prev + emoji);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
  };

  const handleInputFocus = () => {
      if (!user || !activeChannel.id) return;
      dataService.markChannelRead(activeChannel.id, user.uid);

      dataService.sendTypingStatus(activeChannel.id, { 
          uid: user.uid, 
          displayName: user.displayName || 'User' 
      });
      setIsTyping(true);
      lastTypingSentRef.current = Date.now();
  };

  const handleInputBlur = () => {
      if (!user || !activeChannel.id) return;
      if (isTyping) {
          dataService.clearTypingStatus(activeChannel.id, user.uid);
          setIsTyping(false);
      }
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || !user || !activeChannel.id) return;
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      dataService.clearTypingStatus(activeChannel.id, user.uid);
      setIsTyping(false);
      setShowEmojiPicker(false);

      const text = inputText.trim();
      setInputText('');

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
          // Include reply info
          replyTo: replyingTo ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              text: replyingTo.text
          } : undefined
      };
      
      setMessages(prev => [...prev, msg]);
      setReplyingTo(null); // Clear reply state

      if (scrollRef.current) {
          setTimeout(() => {
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 50);
      }
      
      await dataService.sendChatMessage(msg);

      if (inputRef.current) {
          inputRef.current.focus();
      }
  };

  // Long Press Handlers
  const handleTouchStart = (msgId: string) => {
      longPressTimerRef.current = setTimeout(() => {
          setLongPressId(msgId);
      }, 500); // 500ms threshold
  };

  const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
      }
  };

  const handleTouchMove = () => {
      // Cancel long press on scroll
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
      }
  };

  // Handler for TOGGLING reaction (via Long Press Menu)
  const handleReactionToggle = async (emoji: string, messageId: string) => {
      if (!user) return;
      setLongPressId(null); // Close menu

      const targetMsg = messages.find(m => m.id === messageId);
      if (!targetMsg) return;

      if (targetMsg.pending) return;

      const reactionKey = `${messageId}_${emoji}`;
      if (pendingReactions.has(reactionKey)) return;

      setPendingReactions(prev => {
          const newSet = new Set(prev);
          newSet.add(reactionKey);
          return newSet;
      });

      try {
          await dataService.toggleMessageReaction(messageId, user.uid, emoji);
      } catch (error) {
          console.error("Reaction failed:", error);
          alert("Reaction failed");
      } finally {
          setPendingReactions(prev => {
              const newSet = new Set(prev);
              newSet.delete(reactionKey);
              return newSet;
          });
      }
  };

  // Handler for VIEWING reaction (via Chip Click)
  const handleReactionClick = (emoji: string, userIds: string[]) => {
      const names = userIds.map(uid => {
          const u = users.find(user => user.uid === uid);
          return u ? u.displayName : 'Unknown';
      });
      setReactionModal({ emoji, names });
  };

  const handleReplyAction = (msg: ChatMessage) => {
      setReplyingTo(msg);
      setLongPressId(null);
      inputRef.current?.focus();
  };

  const handleCopyAction = (text: string) => {
      navigator.clipboard.writeText(text);
      setLongPressId(null);
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

  const loadMoreHistory = () => {
      isHistoryLoadingRef.current = true;
      setMessageLimit(prev => prev + 100); 
  };

  const getDateString = (ts: number) => new Date(ts).toLocaleDateString();

  if (view === 'list') {
      return (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-32">
              <h2 className="font-bold text-slate-800 dark:text-white mb-4 text-lg">{t.messages}</h2>
              
              <div 
                onClick={() => {
                    setActiveChannel({ id: 'global', name: t.globalChat, type: 'global' });
                    setMessageLimit(150);
                    prevMessagesLengthRef.current = 0;
                    previousScrollHeightRef.current = 0;
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
                                    setMessageLimit(150); 
                                    prevMessagesLengthRef.current = 0;
                                    previousScrollHeightRef.current = 0;
                                    onNavigateToRoom(); 
                                }}
                                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 cursor-pointer active:scale-95 transition-transform relative"
                              >
                                  <div className="relative">
                                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                          {friend.photoURL ? <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400"/>}
                                      </div>
                                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                                          friend.status === 'online' ? 'bg-emerald-500' : friend.status === 'away' ? 'bg-amber-500' : 'bg-slate-300'
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
              <button onClick={onBackToList} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                  <ArrowLeft size={20} className="text-slate-600 dark:text-slate-200" />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  {activeChannel.name.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{activeChannel.name}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{activeChannel.type === 'global' ? t.teamChannel : t.dmChannel}</p>
              </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-y-auto p-4 pt-20 pb-24 custom-scrollbar" ref={scrollRef} onScroll={handleScroll} style={{ WebkitOverflowScrolling: 'touch' }}>
              
              <div className="flex justify-center mb-4">
                  <button 
                    onClick={loadMoreHistory}
                    className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-transform"
                  >
                      <ArrowUpCircle size={12} /> {t.loadPrev}
                  </button>
              </div>

              <div className="space-y-4 pb-4">
                  {messages.length === 0 ? (
                      <div className="text-center text-slate-400 text-sm mt-10 italic">{t.noMsgYet}</div>
                  ) : (
                      messages.map((msg, idx) => {
                          const isMe = msg.senderId === user?.uid;
                          const isRead = msg.readBy && msg.readBy.length > 1;

                          const currentDate = getDateString(msg.timestamp);
                          const prevDate = idx > 0 ? getDateString(messages[idx-1].timestamp) : null;
                          const showDate = currentDate !== prevDate;

                          return (
                              <React.Fragment key={msg.id || idx}>
                                  {showDate && (
                                      <div className="flex justify-center my-4">
                                          <div className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-md">
                                              {new Date(msg.timestamp).toLocaleDateString(t.locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                                          </div>
                                      </div>
                                  )}
                                  <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                      {!isMe && (
                                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden mt-1 shadow-sm">
                                              {msg.senderPhoto ? <img src={msg.senderPhoto} alt="U" /> : <UserIcon className="w-full h-full p-1.5 text-slate-400"/>}
                                          </div>
                                      )}
                                      <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                          {!isMe && <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1 mb-0.5">{msg.senderName}</span>}
                                          
                                          {/* Message Bubble */}
                                          <div 
                                            className={`px-3 py-2 rounded-2xl text-sm shadow-sm relative active:scale-95 transition-transform ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'}`}
                                            onTouchStart={() => handleTouchStart(msg.id)}
                                            onTouchEnd={handleTouchEnd}
                                            onTouchMove={handleTouchMove}
                                            onMouseDown={() => handleTouchStart(msg.id)}
                                            onMouseUp={handleTouchEnd}
                                            onMouseLeave={handleTouchEnd}
                                          >
                                              {/* Replying To Banner */}
                                              {msg.replyTo && (
                                                  <div className={`mb-1 pl-2 border-l-2 text-[10px] opacity-90 rounded-r py-1 ${isMe ? 'border-white/50 bg-white/10 text-blue-100' : 'border-blue-500 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                                                      <p className="font-bold opacity-80 truncate">{msg.replyTo.senderName}</p>
                                                      <p className="italic opacity-70 line-clamp-2 break-all">{msg.replyTo.text}</p>
                                                  </div>
                                              )}
                                              
                                              {/* Message Text */}
                                              <span className="whitespace-pre-wrap leading-relaxed">{msg.text}</span>
                                          </div>

                                          {/* Reactions Display - Click to VIEW */}
                                          {msg.reactions && msg.reactions.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1 px-1">
                                                  {msg.reactions.map((r, i) => {
                                                      return (
                                                          <button 
                                                              key={i} 
                                                              onClick={(e) => { e.stopPropagation(); handleReactionClick(r.emoji, r.userIds); }}
                                                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border shadow-sm transition-all active:scale-95 ${
                                                                  r.userIds.includes(user?.uid || '') 
                                                                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' 
                                                                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                                                              }`}
                                                          >
                                                              <span>{r.emoji}</span>
                                                              <span className="font-bold">{r.userIds.length}</span>
                                                          </button>
                                                      );
                                                  })}
                                              </div>
                                          )}

                                          <div className="flex items-center gap-1 mt-1 px-1">
                                              <span className="text-[10px] text-slate-400">
                                                  {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                              </span>
                                              {isMe && (
                                                  <span className={`${isRead ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                      {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              </React.Fragment>
                          )
                      })
                  )}

                  {/* Mobile Typing Indicator */}
                  {typingUsers.length > 0 && (
                     <div className="flex gap-2 animate-fade-in-up px-4">
                         <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                             <div className="flex gap-0.5">
                                 <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></span>
                                 <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-100"></span>
                                 <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-200"></span>
                             </div>
                         </div>
                         <span className="text-xs text-slate-400 self-center">
                            {typingUsers.join(', ')} {t.isTyping}
                         </span>
                     </div>
                  )}
              </div>
          </div>

          <AnimatePresence>
                {showScrollDown && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 z-30 hover:bg-white/90 dark:hover:bg-black/90 transition-colors"
                    >
                        <ChevronDown size={20} />
                    </motion.button>
                )}
          </AnimatePresence>

          {/* Action Menu (Long Press) */}
          <AnimatePresence>
              {longPressId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setLongPressId(null)}>
                      <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }} 
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-2xl w-[80%] max-w-sm"
                          onClick={(e) => e.stopPropagation()}
                      >
                          <div className="flex justify-around mb-4">
                              {['✅', '❌', '👍', '❤️', '😂'].map(emoji => {
                                  const isLoading = pendingReactions.has(`${longPressId}_${emoji}`);
                                  return (
                                      <button 
                                        key={emoji} 
                                        onClick={() => { if(!isLoading) handleReactionToggle(emoji, longPressId!); }} 
                                        disabled={isLoading}
                                        className={`text-2xl transition-transform p-2 ${isLoading ? 'opacity-50 cursor-wait' : 'hover:scale-125'}`}
                                      >
                                          {isLoading ? <Loader2 size={24} className="animate-spin text-slate-500"/> : emoji}
                                      </button>
                                  );
                              })}
                          </div>
                          <div className="space-y-2">
                              {messages.find(m => m.id === longPressId) && (
                                  <>
                                    <button 
                                        onClick={() => handleReplyAction(messages.find(m => m.id === longPressId)!)}
                                        className="w-full py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2"
                                    >
                                        <Reply size={16} /> {t.reply}
                                    </button>
                                    <button 
                                        onClick={() => handleCopyAction(messages.find(m => m.id === longPressId)!.text)}
                                        className="w-full py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2"
                                    >
                                        <Copy size={16} /> {t.copy}
                                    </button>
                                  </>
                              )}
                          </div>
                      </motion.div>
                  </div>
              )}
          </AnimatePresence>

          {/* Reaction Viewer Modal */}
          <AnimatePresence>
                {reactionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setReactionModal(null)}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl min-w-[200px]" 
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                                <span className="text-2xl">{reactionModal.emoji}</span>
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">Reactions</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                {reactionModal.names.map((name, i) => (
                                    <div key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        {name}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
          </AnimatePresence>

          {/* Chat Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-white/75 dark:bg-black/40 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shrink-0 safe-area-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              {/* Replying Banner */}
              <AnimatePresence>
                  {replyingTo && (
                      <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mb-2 text-xs border-l-4 border-blue-500"
                      >
                          <div className="flex flex-col">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{t.replyTo} {replyingTo.senderName}</span>
                              <span className="text-slate-600 dark:text-slate-300 line-clamp-1">{replyingTo.text}</span>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="p-1"><X size={14} /></button>
                      </motion.div>
                  )}
              </AnimatePresence>

              <AnimatePresence>
                  {showEmojiPicker && (
                      <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute bottom-[4.5rem] left-2 right-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-2xl grid grid-cols-7 sm:grid-cols-10 gap-1 z-30"
                      >
                          {EMOJIS.map(emoji => (
                              <button
                                  key={emoji}
                                  onClick={() => handleEmojiClick(emoji)}
                                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                  {emoji}
                              </button>
                          ))}
                      </motion.div>
                  )}
              </AnimatePresence>

              <form onSubmit={handleSend} className="flex gap-2 items-center">
                  <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2 rounded-full transition-colors shrink-0 ${showEmojiPicker ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                  >
                      <Smile size={20} />
                  </button>
                  <input 
                      ref={inputRef}
                      type="text" 
                      value={inputText}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder={t.typeMsg}
                      className="flex-1 bg-slate-100 dark:bg-slate-700 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                  />
                  <button 
                    type="submit" 
                    disabled={!inputText.trim()} 
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 shrink-0 shadow-md"
                  >
                      <Send size={18} />
                  </button>
              </form>
          </div>
      </div>
  );
};

export const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  user, settings, onUpdateSettings, onLogout, bls, jobs, checklists, 
  onUpdateBL, onDeleteBL, onAddTask, onUpdateTask, hasUnreadMessages, onCheckMessages 
}) => {
  const t = mobileTranslations[settings.language];
  const [activeTab, setActiveTab] = useState<'cargo' | 'chat' | 'cloud' | 'settings'>('cargo');
  const [chatView, setChatView] = useState<'list' | 'room'>('list');
  const [activeChannel, setActiveChannel] = useState<{ id: string; name: string; type: 'global' | 'dm' }>({ id: '', name: '', type: 'global' });

  useEffect(() => {
      if (activeTab === 'chat' && hasUnreadMessages && onCheckMessages) {
          onCheckMessages();
      }
  }, [activeTab, hasUnreadMessages]);

  const renderContent = () => {
      switch(activeTab) {
          case 'cargo':
              return (
                  <div className="h-full overflow-y-auto p-4 pb-24 custom-scrollbar">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t.cargoList}</h2>
                      <div className="space-y-3">
                          {bls.map(bl => (
                              <div key={bl.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{bl.blNumber}</span>
                                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{bl.sourceType}</span>
                                  </div>
                                  <div className="text-sm text-slate-700 dark:text-slate-300 mb-1 font-medium truncate">{bl.shipper}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">{bl.cargoItems[0]?.description}</div>
                                  <div className="flex justify-between items-center text-xs text-slate-500">
                                      <span>{bl.vesselName}</span>
                                      <span>{new Date(bl.uploadDate).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          ))}
                          {bls.length === 0 && (
                              <div className="text-center text-slate-400 py-10">{t.noDocs}</div>
                          )}
                      </div>
                  </div>
              );
          case 'chat':
              return <MobileChatView 
                  user={user} 
                  view={chatView} 
                  setView={setChatView} 
                  activeChannel={activeChannel} 
                  setActiveChannel={setActiveChannel} 
                  onNavigateToRoom={() => setChatView('room')}
                  onBackToList={() => setChatView('list')}
                  language={settings.language}
              />;
          case 'cloud':
              return <MobileCloudView bls={bls} jobs={jobs} language={settings.language} />;
          case 'settings':
              return (
                  <div className="h-full overflow-y-auto p-4 pb-24 custom-scrollbar">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t.settings}</h2>
                      
                      <div className="space-y-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center justify-between mb-3">
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{t.darkMode}</span>
                                  <button 
                                      onClick={() => onUpdateSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}
                                  >
                                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                                  </button>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                              <span className="block font-medium text-slate-700 dark:text-slate-200 mb-3">{t.language}</span>
                              <div className="flex gap-2">
                                  {['ko', 'en', 'cn'].map((lang) => (
                                      <button 
                                          key={lang}
                                          onClick={() => onUpdateSettings({ ...settings, language: lang as Language })}
                                          className={`flex-1 py-2 rounded-lg text-sm font-bold border ${
                                              settings.language === lang 
                                              ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' 
                                              : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'
                                          }`}
                                      >
                                          {lang.toUpperCase()}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                              <span className="block font-medium text-slate-700 dark:text-slate-200 mb-3">{t.viewMode}</span>
                              <div className="flex gap-2">
                                  <button className="flex-1 py-2 bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 rounded-lg text-sm font-bold border">
                                      {t.mobile}
                                  </button>
                                  <button 
                                      onClick={() => onUpdateSettings({ ...settings, viewMode: 'pc' })}
                                      className="flex-1 py-2 bg-white border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400 rounded-lg text-sm font-bold border"
                                  >
                                      {t.pc}
                                  </button>
                              </div>
                          </div>

                          <button 
                              onClick={onLogout}
                              className="w-full py-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 mt-8"
                          >
                              <LogOut size={18} /> {t.logout}
                          </button>
                          
                          <div className="text-center text-xs text-slate-400 mt-4">
                              {t.version}
                          </div>
                      </div>
                  </div>
              );
      }
  };

  return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
              {renderContent()}
          </div>

          {!(activeTab === 'chat' && chatView === 'room') && (
              <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe-bottom safe-area-bottom">
                  <div className="flex justify-around items-center h-16">
                      <button 
                          onClick={() => setActiveTab('cargo')}
                          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'cargo' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                      >
                          <ListIcon size={24} />
                          <span className="text-[10px] font-medium mt-1">{t.cargoList}</span>
                      </button>
                      <button 
                          onClick={() => setActiveTab('cloud')}
                          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'cloud' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                      >
                          <Cloud size={24} />
                          <span className="text-[10px] font-medium mt-1">{t.cloud}</span>
                      </button>
                      <button 
                          onClick={() => setActiveTab('chat')}
                          className={`flex flex-col items-center justify-center w-full h-full relative ${activeTab === 'chat' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                      >
                          <div className="relative">
                              <MessageCircle size={24} />
                              {hasUnreadMessages && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                              )}
                          </div>
                          <span className="text-[10px] font-medium mt-1">{t.messages}</span>
                      </button>
                      <button 
                          onClick={() => setActiveTab('settings')}
                          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                      >
                          <Settings size={24} />
                          <span className="text-[10px] font-medium mt-1">{t.settings}</span>
                      </button>
                  </div>
              </div>
          )}
      </div>
  );
};
