
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { Send, X, User as UserIcon, MessageCircle, ChevronLeft, Check, CheckCheck, Download, UserPlus, ArrowUpCircle, Settings2, Trash2, ChevronDown, Smile, MoreHorizontal, Reply, Quote, Minus } from 'lucide-react';
import { dataService } from '../services/dataService';
import { ChatMessage, ChatUser } from '../types';
import { User } from 'firebase/auth';
import saveAs from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWindowProps {
  isOpen: boolean;
  isMinimized?: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  sidebarWidth: number;
  user: User | null;
  zIndex: number;
  onFocus?: () => void;
}

// Preset Emoji List
const EMOJIS = ['✅', '❌', '👍', '❤️', '😂', '😮', '😢', '😡'];

type WindowState = 'default' | 'tall' | 'maximized';

// Global Map to persist scroll positions even when component unmounts (closes)
const globalScrollPositions = new Map<string, { top: number, atBottom: boolean }>();

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, isMinimized, onClose, onMinimize, sidebarWidth, user, zIndex, onFocus }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'dm'>('global');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadMap, setUnreadMap] = useState<Set<string>>(new Set()); 
  
  // Window State for Traffic Lights
  const [windowState, setWindowState] = useState<WindowState>('default');
  
  // Interaction State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  const [messageLimit, setMessageLimit] = useState(150);
  const isHistoryLoadingRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isEditingFriends, setIsEditingFriends] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // Track message bubbles
  
  // Scroll to Bottom Button State
  const [showScrollDown, setShowScrollDown] = useState(false);

  const typingTimeoutRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  // Determine Window Dimensions based on State
  const getWindowDimensions = () => {
      switch (windowState) {
          case 'tall':
              return { width: 380, height: '90vh' };
          case 'maximized':
              return { width: 700, height: '90vh' };
          case 'default':
          default:
              return { width: 380, height: 600 };
      }
  };

  const dimensions = getWindowDimensions();

  // Stable Channel ID
  const channelId = useMemo(() => {
    if (activeTab === 'global') return 'global';
    if (selectedUser && user) {
        return [user.uid, selectedUser.uid].sort().join('_');
    }
    return null;
  }, [activeTab, selectedUser, user?.uid]);

  const getDmChannelId = (partnerId: string) => {
      if (!user) return '';
      return [user.uid, partnerId].sort().join('_');
  };

  useEffect(() => {
      if (!user) return;
      const unsub = dataService.subscribeUnreadMap(user.uid, setUnreadMap);
      return () => unsub();
  }, [user]);

  useEffect(() => {
     if (isOpen && channelId && user) {
         setUnreadMap(prev => {
             const newMap = new Set(prev);
             newMap.delete(channelId);
             return newMap;
         });
         // NOTE: Marking read happens slightly delayed to allow UI to scroll to "last read" point first
         const timer = setTimeout(() => {
             const hasUnread = messages.some(m => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid)));
             if (hasUnread) {
                 dataService.markChannelRead(channelId, user.uid);
             }
         }, 1000);
         return () => clearTimeout(timer);
     }
  }, [isOpen, channelId, user, messages.length]);

  // Reset tracking ONLY when channel changes (Switching tabs/users)
  useLayoutEffect(() => {
      setMessageLimit(150);
      prevMessagesLengthRef.current = 0;
      previousScrollHeightRef.current = 0;
      messageRefs.current.clear();
      setReplyingTo(null);
      // Note: We do NOT clear globalScrollPositions here to remember positions if user switches back
  }, [channelId]);

  // Subscription Effect
  useEffect(() => {
      if (!isOpen || !channelId) return;
      
      const unsub = dataService.subscribeChatMessages(channelId, messageLimit, (newMessages) => {
          setMessages(newMessages);
      });
      return () => unsub();
  }, [isOpen, channelId, messageLimit]);

  // --- Scroll Management Logic ---

  // Helper: Explicitly save current position
  const saveCurrentScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      
      // Calculate if we are at bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      // Save to global map
      globalScrollPositions.set(channelId, { top: scrollTop, atBottom: isNearBottom });
  }, [channelId]);

  // Helper: Explicitly restore position
  const restoreScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId) return;
      
      const saved = globalScrollPositions.get(channelId);
      const currentScrollHeight = scrollRef.current.scrollHeight;

      if (saved) {
          if (saved.atBottom) {
              scrollRef.current.scrollTop = currentScrollHeight;
          } else {
              scrollRef.current.scrollTop = saved.top;
          }
      } else {
          // Default: Scroll to bottom if no history
          scrollRef.current.scrollTop = currentScrollHeight;
      }
  }, [channelId]);

  // Event: Handle Scroll (Auto-Save)
  const handleScroll = () => {
      if (!isOpen || !scrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      
      // Save scroll position
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (channelId) {
          globalScrollPositions.set(channelId, { top: scrollTop, atBottom: isNearBottom });
      }
      
      // Show "Scroll Down" button if we are more than 150px away from bottom
      const showBtn = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDown(showBtn);
  };

  // Effect: Save scroll position on unmount/close
  useEffect(() => {
      return () => {
          if (isOpen) { 
              saveCurrentScrollPosition();
          }
      };
  }, [isOpen, saveCurrentScrollPosition]);

  const scrollToBottom = () => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: 'smooth'
          });
      }
  };

  // Smart Scrolling Layout Effect for Message Updates
  useLayoutEffect(() => {
      if (!isOpen || !scrollRef.current || messages.length === 0 || !channelId) return;
      
      const currentScrollHeight = scrollRef.current.scrollHeight;
      const isInitialLoad = prevMessagesLengthRef.current === 0;

      if (isInitialLoad) {
          // Check global store first
          const saved = globalScrollPositions.get(channelId);
          
          if (saved) {
              restoreScrollPosition();
          } else {
              // Fallback: Smart Scroll Logic (Unread or Bottom)
              let firstUnreadIndex = -1;
              if (user) {
                  firstUnreadIndex = messages.findIndex(m => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid)));
              }

              if (firstUnreadIndex !== -1) {
                  const targetMsg = messages[firstUnreadIndex];
                  const el = messageRefs.current.get(targetMsg.id);
                  if (el) {
                      el.scrollIntoView({ block: 'center', behavior: 'auto' });
                  } else {
                      scrollRef.current.scrollTop = currentScrollHeight;
                  }
              } else {
                  scrollRef.current.scrollTop = currentScrollHeight;
              }
          }
      } else if (isHistoryLoadingRef.current) {
          // Restore position after loading history
          const heightDiff = currentScrollHeight - previousScrollHeightRef.current;
          if (heightDiff > 0) scrollRef.current.scrollTop += heightDiff;
          isHistoryLoadingRef.current = false;
      } else if (messages.length > prevMessagesLengthRef.current) {
          // New message received
          const distanceFromBottom = currentScrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight;
          // Auto-scroll ONLY if user is already near bottom (prevent distraction)
          if (distanceFromBottom < 150) {
              scrollRef.current.scrollTop = currentScrollHeight;
          }
      }
      
      prevMessagesLengthRef.current = messages.length;
      previousScrollHeightRef.current = currentScrollHeight;
  }, [messages, channelId, isOpen, restoreScrollPosition]);

  useEffect(() => {
      if (!isOpen) return;
      const unsub = dataService.subscribeChatUsers(setUsers);
      return () => unsub();
  }, [isOpen]);

  useEffect(() => {
      if (!isOpen || !channelId || !user) return;
      const unsub = dataService.subscribeTyping(channelId, (list) => {
          const others = list.filter(u => u.userId !== user.uid).map(u => u.displayName);
          setTypingUsers(others);
      });
      return () => unsub();
  }, [isOpen, channelId, user?.uid]);

  // Traffic Light Handlers
  const handleYellowClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onMinimize) onMinimize();
  };

  const handleGreenClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWindowState(prev => prev === 'maximized' ? 'default' : 'maximized');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputText(val);
      if (!user || !channelId) return;
      if (val.trim() === '') {
          if (isTyping) {
              dataService.clearTypingStatus(channelId, user.uid);
              setIsTyping(false);
          }
          return;
      }
      const now = Date.now();
      if (!isTyping || now - lastTypingSentRef.current > 2500) {
          dataService.sendTypingStatus(channelId, { uid: user.uid, displayName: user.displayName || 'User' });
          lastTypingSentRef.current = now;
          setIsTyping(true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          dataService.clearTypingStatus(channelId, user.uid);
          setIsTyping(false);
      }, 3000);
  };

  const handleReaction = async (emoji: string, messageId: string) => {
      if (!user) return;

      // Optimistic Update for immediate feedback
      setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
              const reactions = (msg.reactions || []).map(r => ({
                  ...r,
                  userIds: Array.isArray(r.userIds) ? [...r.userIds] : []
              }));
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

      await dataService.toggleMessageReaction(messageId, user.uid, emoji);
  };

  const handleReply = (msg: ChatMessage) => {
      setReplyingTo(msg);
      inputRef.current?.focus();
  };

  const handleInputFocus = () => {
      if (!user || !channelId) return;
      dataService.markChannelRead(channelId, user.uid);
      dataService.sendTypingStatus(channelId, { uid: user.uid, displayName: user.displayName || 'User' });
      setIsTyping(true);
      lastTypingSentRef.current = Date.now();
  };

  const handleInputBlur = () => {
      if (!user || !channelId) return;
      if (isTyping) {
          dataService.clearTypingStatus(channelId, user.uid);
          setIsTyping(false);
      }
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || !user || !channelId) return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      dataService.clearTypingStatus(channelId, user.uid);
      setIsTyping(false);
      
      const text = inputText.trim();
      setInputText('');
      
      const tempId = 'temp-' + Date.now();
      const optimisticMsg: ChatMessage = {
          id: tempId, text: text, senderId: user.uid, senderName: user.displayName || 'User', senderPhoto: user.photoURL || '',
          timestamp: Date.now(), channelId: channelId, readBy: [user.uid], pending: true,
          replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined
      };
      
      setMessages(prev => [...prev, optimisticMsg]);
      setReplyingTo(null);
      
      // Auto-scroll on send
      setTimeout(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
      
      await dataService.sendChatMessage(optimisticMsg);
  };

  const handleUserSelect = (targetUser: ChatUser) => {
      if (targetUser.uid === user?.uid) return;
      const dmId = getDmChannelId(targetUser.uid);
      setUnreadMap(prev => { const newMap = new Set(prev); newMap.delete(dmId); return newMap; });
      if (user) dataService.markChannelRead(dmId, user.uid);
      setSelectedUser(targetUser);
  };

  const handleTabSwitch = (tab: 'global' | 'dm') => {
      if (tab === 'global') {
          setUnreadMap(prev => { const newMap = new Set(prev); newMap.delete('global'); return newMap; });
          if (user) dataService.markChannelRead('global', user.uid);
      }
      setActiveTab(tab);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const downloadCurrentChat = () => {
      if (messages.length === 0) { alert("No messages to download."); return; }
      const chatName = activeTab === 'global' ? 'Global_Chat' : `DM_${selectedUser?.displayName || 'Unknown'}`;
      const blob = new Blob([JSON.stringify(messages, null, 2)], {type: "application/json"});
      saveAs(blob, `${chatName}_Log_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const myFriends = useMemo(() => {
      if (!user || users.length === 0) return [];
      const me = users.find(u => u.uid === user.uid);
      if (!me || !me.contacts) return [];
      return me.contacts.map(contactId => users.find(u => u.uid === contactId)).filter((u): u is ChatUser => !!u);
  }, [users, user]);

  const handleAddFriend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!friendEmail.trim() || !user) return;
      setIsAddingFriend(true);
      try {
          await dataService.addContactByEmail(user.uid, friendEmail.trim());
          setFriendEmail(''); setShowAddFriend(false); alert("Friend added successfully!");
      } catch (error: any) { alert(error.message); } finally { setIsAddingFriend(false); }
  };

  const loadMoreMessages = () => {
      isHistoryLoadingRef.current = true;
      setMessageLimit(prev => prev + 100);
  };

  const deleteFriend = async (friendUid: string) => {
      if (!user) return;
      if (window.confirm("Remove this friend from your list?")) { await dataService.removeContact(user.uid, friendUid); }
  };

  const getDateString = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            key="chat-window-container"
            ref={containerRef}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ 
                opacity: isMinimized ? 0 : 1, 
                scale: isMinimized ? 0.9 : 1, 
                y: 0, 
                width: dimensions.width,
                height: dimensions.height,
                pointerEvents: isMinimized ? 'none' : 'auto'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            onAnimationComplete={() => {
                // IMPORTANT: Restore scroll position after animation finishes.
                if (isOpen && !isMinimized) {
                    restoreScrollPosition();
                }
            }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            style={{ 
                position: 'fixed',
                left: sidebarWidth + 20, 
                bottom: 20,
                zIndex: zIndex 
            }}
            className="flex flex-col rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/30 dark:border-white/20 bg-white/15 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150 overflow-hidden pointer-events-auto"
            onPointerDown={onFocus}
        >
            {/* Header */}
            <div className="h-12 bg-gradient-to-b from-white/10 to-transparent flex items-center px-5 justify-between cursor-grab active:cursor-grabbing shrink-0 backdrop-blur-sm border-b border-white/10">
                 <div className="flex items-center gap-2 group" onPointerDown={(e) => e.stopPropagation()}>
                     {/* Red: Close */}
                     <button onClick={onClose} className="w-4 h-4 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-110 border border-[#E0443E]">
                        <X size={10} className="text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={3} />
                     </button>
                     {/* Yellow: Minimize */}
                     <button onClick={handleYellowClick} className="w-4 h-4 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 flex items-center justify-center shadow-sm border border-[#D89E24] transition-transform duration-200 hover:scale-110">
                        <Minus size={10} className="text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={4} />
                     </button>
                     {/* Green: Toggle Maximize */}
                     <button onClick={handleGreenClick} className="w-4 h-4 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 flex items-center justify-center shadow-sm border border-[#1AAB29] transition-transform duration-200 hover:scale-110">
                        <div className="w-1.5 h-1.5 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full"></div>
                     </button>
                 </div>
                 
                 <div className="font-semibold text-slate-800 dark:text-white/90 text-sm select-none drop-shadow-sm flex items-center gap-2">
                    {selectedUser ? (
                        <>
                           <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                           {selectedUser.displayName}
                        </>
                    ) : (
                        <>
                           <MessageCircle size={14} className="text-blue-500 fill-current" />
                           Team Chat
                        </>
                    )}
                 </div>
                 
                 <div className="flex items-center gap-2">
                     {(activeTab === 'global' || selectedUser) && (
                         <button 
                            onClick={downloadCurrentChat}
                            className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                            title="Download chat"
                         >
                             <Download size={16} />
                         </button>
                     )}
                 </div>
            </div>

            {/* Sub-Header / Navigation */}
            {!selectedUser && (
                <div className="flex p-1 mx-4 mt-2 bg-white/20 dark:bg-black/30 rounded-lg p-1 shrink-0 backdrop-blur-md">
                    <button 
                        onClick={() => handleTabSwitch('global')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all relative ${activeTab === 'global' ? 'bg-white/80 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        Global
                        {unreadMap.has('global') && <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    <button 
                        onClick={() => handleTabSwitch('dm')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all relative ${activeTab === 'dm' ? 'bg-white/80 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        Direct Messages
                        {Array.from(unreadMap).some(id => id !== 'global') && <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                </div>
            )}

            {/* Back Button for DM */}
            {selectedUser && (
                 <div className="px-4 py-2 flex items-center shrink-0">
                     <button 
                        onClick={() => setSelectedUser(null)} 
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors px-2 py-1 bg-white/20 dark:bg-black/20 rounded-full backdrop-blur-sm"
                     >
                         <ChevronLeft size={14} /> Back
                     </button>
                 </div>
            )}

            {/* Chat Content Area */}
            <div 
                className="flex-1 overflow-y-auto custom-scrollbar relative p-4 scroll-smooth" 
                ref={scrollRef}
                onScroll={handleScroll}
            >
                 {(activeTab === 'global' || selectedUser) && (
                     <div className="space-y-6 pb-8">
                         <div className="flex justify-center">
                            <button 
                                onClick={loadMoreMessages} 
                                className="text-[10px] bg-white/40 dark:bg-black/40 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-white/60 transition-colors backdrop-blur-sm shadow-sm"
                            >
                                <ArrowUpCircle size={10} /> History
                            </button>
                         </div>

                         {messages.length === 0 ? (
                             <div className="text-center text-slate-500/70 text-sm mt-20 italic">No messages yet. Start the conversation!</div>
                         ) : (
                             messages.map((msg, index) => {
                                 const isMe = msg.senderId === user?.uid;
                                 const isRead = msg.readBy && msg.readBy.length > 1; 
                                 
                                 const currentDate = getDateString(msg.timestamp);
                                 const prevDate = index > 0 ? getDateString(messages[index-1].timestamp) : null;
                                 const showDate = currentDate !== prevDate;

                                 return (
                                     <React.Fragment key={msg.id || index}>
                                         {showDate && (
                                             <div className="flex justify-center my-4">
                                                 <div className="bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                                                     {new Date(msg.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                 </div>
                                             </div>
                                         )}
                                         
                                         <div 
                                            ref={(el) => { if (el && msg.id) messageRefs.current.set(msg.id, el); }}
                                            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start group/msg relative mb-2`}
                                         >
                                             {!isMe && (
                                                 <div className="w-8 h-8 rounded-full bg-white/80 dark:bg-slate-700 flex-shrink-0 overflow-hidden shadow-sm mt-1 ring-1 ring-slate-200 dark:ring-slate-600">
                                                     {msg.senderPhoto ? <img src={msg.senderPhoto} alt="S" className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-1.5 text-slate-400"/>}
                                                 </div>
                                             )}
                                             
                                             <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative min-w-[140px]`}>
                                                 {!isMe && <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1 mb-1 font-bold">{msg.senderName}</span>}
                                                 
                                                 <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm backdrop-blur-md border border-transparent relative leading-relaxed ${
                                                     isMe 
                                                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border-slate-200 dark:border-slate-700'
                                                     } ${msg.pending ? 'opacity-70' : ''}`}>
                                                     
                                                     {/* Reply Fix: Compact & Clean Layout with Wrapping */}
                                                     {msg.replyTo && (
                                                         <div className={`mb-1 pl-2 border-l-2 text-xs opacity-90 rounded-r py-1 max-w-full ${isMe ? 'border-white/50 bg-white/10 text-blue-100' : 'border-blue-500 bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                                                             <p className="font-bold text-[10px] mb-0.5 opacity-80 truncate">{msg.replyTo.senderName}</p>
                                                             <p className="italic text-[10px] opacity-70 break-words whitespace-pre-wrap line-clamp-3">{msg.replyTo.text}</p>
                                                         </div>
                                                     )}

                                                     {msg.text}
                                                 </div>
                                                 
                                                 {/* Reactions: Visible Badges at bottom */}
                                                 {msg.reactions && msg.reactions.length > 0 && (
                                                     <div className="flex flex-wrap gap-1 mt-1">
                                                         {msg.reactions.map((r, i) => (
                                                             <button 
                                                                key={i}
                                                                onClick={(e) => { e.stopPropagation(); handleReaction(r.emoji, msg.id); }}
                                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-all hover:scale-105 active:scale-95 ${
                                                                    r.userIds.includes(user?.uid || '') 
                                                                        ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' 
                                                                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                                                                }`}
                                                             >
                                                                 <span>{r.emoji}</span>
                                                                 <span className="font-bold">{r.userIds.length}</span>
                                                             </button>
                                                         ))}
                                                     </div>
                                                 )}

                                                 {/* Time & Action Menu Row */}
                                                 <div className="flex items-center justify-between w-full mt-1 px-1 relative h-6">
                                                     {/* Time */}
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

                                                     {/* Action Menu (Visible on Group Hover) */}
                                                     <div className="absolute right-0 -bottom-1.5 opacity-0 group-hover/msg:opacity-100 transition-all duration-200 z-10 translate-y-2 group-hover/msg:translate-y-0">
                                                         <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 p-1 ring-1 ring-black/5">
                                                            {['✅', '❌', '👍', '❤️', '😂'].map(emoji => (
                                                                <button 
                                                                    key={emoji} 
                                                                    onClick={(e) => { e.stopPropagation(); handleReaction(emoji, msg.id); }}
                                                                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-transform hover:scale-110 text-base leading-none"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                                                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
                                                            >
                                                                <Reply size={14} strokeWidth={2.5} />
                                                            </button>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     </React.Fragment>
                                 );
                             })
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
                 )}

                 {activeTab === 'dm' && !selectedUser && (
                     <div className="space-y-2">
                         <div className="flex gap-2 mb-4">
                             <button 
                                onClick={() => setShowAddFriend(true)}
                                className="flex-1 py-2 bg-white/40 dark:bg-white/10 hover:bg-white/60 rounded-xl text-slate-600 dark:text-slate-200 text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-1 shadow-sm"
                             >
                                <UserPlus size={14} /> Add Friend
                             </button>
                             <button
                                onClick={() => setIsEditingFriends(!isEditingFriends)}
                                className={`px-3 py-2 rounded-xl transition-all border border-white/20 shadow-sm ${isEditingFriends ? 'bg-blue-500 text-white' : 'bg-white/40 dark:bg-white/10 text-slate-600 dark:text-slate-200 hover:bg-white/60'}`}
                             >
                                 {isEditingFriends ? <Check size={14} /> : <Settings2 size={14} />}
                             </button>
                         </div>

                         {myFriends.length === 0 ? (
                             <div className="text-center text-slate-500/60 text-sm mt-10">
                                No friends list.<br/>Add email to start.
                             </div>
                         ) : (
                            <div className="grid grid-cols-1 gap-1">
                                {myFriends.map((friend, index) => {
                                    const dmId = getDmChannelId(friend.uid);
                                    const hasUnread = unreadMap.has(dmId);

                                    return (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        key={friend.uid} 
                                        onClick={() => !isEditingFriends && handleUserSelect(friend)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer relative group ${
                                            isEditingFriends 
                                            ? 'bg-red-50/50 border border-red-200' 
                                            : 'bg-white/20 dark:bg-white/5 hover:bg-white/40 border border-white/10 shadow-sm'
                                        }`}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white/40">
                                                {friend.photoURL ? <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400"/>}
                                            </div>
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                                friend.status === 'away' ? 'bg-amber-500' : 
                                                friend.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                                            }`}></div>
                                            {hasUnread && !isEditingFriends && (
                                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-md"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                {friend.displayName}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate opacity-80">{friend.email}</p>
                                        </div>
                                        
                                        {isEditingFriends ? (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteFriend(friend.uid); }}
                                                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        ) : (
                                            <ChevronLeft size={16} className="text-slate-400 rotate-180 opacity-50 group-hover:opacity-100" />
                                        )}
                                    </motion.div>
                                    )
                                })}
                            </div>
                         )}
                     </div>
                 )}
            </div>

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
                {showScrollDown && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-full shadow-lg border border-white/20 flex items-center justify-center text-blue-600 dark:text-blue-400 z-30 hover:bg-white/90 transition-colors"
                    >
                        <ChevronDown size={16} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Input Area */}
            {(activeTab === 'global' || selectedUser) && (
                <div className="p-3 shrink-0 relative flex flex-col gap-2">
                    
                    {/* Replying Banner */}
                    <AnimatePresence>
                        {replyingTo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm mx-1"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Reply size={14} className="text-blue-500 shrink-0"/>
                                    <div className="flex flex-col text-xs">
                                        <span className="font-bold text-blue-600 dark:text-blue-400">Replying to {replyingTo.senderName}</span>
                                        <span className="truncate text-slate-500 max-w-[200px]">{replyingTo.text}</span>
                                    </div>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                                    <X size={14} className="text-slate-500"/>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSend} className="flex gap-2 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-white/20 rounded-3xl p-1.5 shadow-lg relative z-20">
                        {/* Emoji Button */}
                        <div className="relative">
                            <button 
                                type="button" 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`p-2 transition-colors rounded-full hover:bg-white/50 ${showEmojiPicker ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}
                            >
                                <Smile size={18} />
                            </button>
                            {/* Emoji Popover */}
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="absolute bottom-12 left-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl grid grid-cols-4 gap-1 z-30 min-w-[160px]"
                                    >
                                        {EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    setInputText(prev => prev + emoji);
                                                    inputRef.current?.focus();
                                                }}
                                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/30 rounded-lg transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <input 
                            ref={inputRef}
                            type="text" 
                            value={inputText}
                            onChange={handleInputChange}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            placeholder="Message..."
                            className="flex-1 bg-transparent border-none text-sm focus:ring-0 outline-none text-slate-800 dark:text-white placeholder-slate-500/70 min-w-0"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputText.trim()} 
                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-90"
                        >
                            <Send size={16} className={inputText.trim() ? "ml-0.5" : ""} />
                        </button>
                    </form>
                </div>
            )}

            {/* Add Friend Overlay */}
            {showAddFriend && (
                <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white/90 dark:bg-slate-800/90 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/20 backdrop-blur-xl"
                    >
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add Friend</h3>
                        <form onSubmit={handleAddFriend}>
                            <input 
                                type="email" 
                                required
                                value={friendEmail}
                                onChange={(e) => setFriendEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm backdrop-blur-sm border border-slate-200 dark:border-slate-600 mb-4"
                                placeholder="Email address"
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowAddFriend(false)} className="flex-1 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl text-sm">Cancel</button>
                                <button type="submit" disabled={isAddingFriend} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/30">
                                    {isAddingFriend ? "..." : "Add"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
