
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { BLData, VesselJob, AppSettings, ChatMessage, ChatUser, CargoSourceType, BLChecklist, BackgroundTask } from '../types';
import { 
    Search, Download, FileText, MessageCircle, Settings, LogOut, 
    Monitor, X, Menu, Filter, ArrowLeft, Send, User as UserIcon, 
    Check, CheckCheck, Grid, List as ListIcon, Ship, Anchor, Box, Home, ExternalLink, ChevronDown, Truck, ArrowUpCircle, Smile
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '😭', '😡', '👍', '👎', '🙏', '🔥', '✨', '🎉', '❤️', '💔', '👀', '✅', '❌', '🚀', '💼'];

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
  onCheckMessages?: () => void; // New prop for acknowledging read
}

// Mobile Chat View Component
interface MobileChatViewProps {
  user: User | null;
  view: 'list' | 'room';
  setView: (view: 'list' | 'room') => void;
  activeChannel: { id: string; name: string; type: 'global' | 'dm' };
  setActiveChannel: (channel: { id: string; name: string; type: 'global' | 'dm' }) => void;
  // Pass history handler to parent
  onNavigateToRoom: () => void;
  onBackToList: () => void;
}

const MobileChatView: React.FC<MobileChatViewProps> = ({ user, view, setView, activeChannel, setActiveChannel, onNavigateToRoom, onBackToList }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]); // Typing state
  const [unreadMap, setUnreadMap] = useState<Set<string>>(new Set()); // New: Unread Map for Dots
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // For maintaining focus
  
  // History Limit
  const [messageLimit, setMessageLimit] = useState(150);
  const isHistoryLoadingRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  
  // Typing Refs
  const typingTimeoutRef = useRef<any>(null); 
  const lastTypingSentRef = useRef<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  
  // Fetch users for list view
  useEffect(() => {
    const unsub = dataService.subscribeChatUsers(setUsers);
    return () => unsub();
  }, []);

  // Subscribe to Unread Map (New Feature)
  useEffect(() => {
      if (!user) return;
      const unsub = dataService.subscribeUnreadMap(user.uid, setUnreadMap);
      return () => unsub();
  }, [user]);

  // Read Logic for Mobile: Immediately mark channel read when entering view 'room'
  // AND whenever new messages arrive
  useEffect(() => {
      if (view === 'room' && activeChannel.id && user) {
          // Trigger read logic
          dataService.markChannelRead(activeChannel.id, user.uid);
      }
  }, [view, activeChannel, user, messages.length]);

  // Fetch messages for room view with limit
  useEffect(() => {
    if (view !== 'room' || !activeChannel.id) return;
    
    const unsub = dataService.subscribeChatMessages(activeChannel.id, messageLimit, (msgs) => {
        setMessages(msgs);
    });
    return () => unsub();
  }, [view, activeChannel.id, messageLimit]);

  // SCROLL LOGIC
  useLayoutEffect(() => {
      if (view !== 'room' || !scrollRef.current) return;
      
      const currentScrollHeight = scrollRef.current.scrollHeight;
      
      // 1. Initial Load: Scroll to bottom
      const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
      if (isInitialLoad) {
          scrollRef.current.scrollTop = currentScrollHeight;
      }
      // 2. History Load: Preserve scroll
      else if (isHistoryLoadingRef.current) {
          const heightDiff = currentScrollHeight - previousScrollHeightRef.current;
          if (heightDiff > 0) {
              scrollRef.current.scrollTop += heightDiff;
          }
          isHistoryLoadingRef.current = false;
      }
      // 3. New Message
      else if (messages.length > prevMessagesLengthRef.current) {
          // Auto scroll to bottom if near bottom
          const distanceFromBottom = currentScrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight;
          if (distanceFromBottom < 100) {
              scrollRef.current.scrollTop = currentScrollHeight;
          }
      }

      prevMessagesLengthRef.current = messages.length;
      previousScrollHeightRef.current = currentScrollHeight;
  }, [messages, view]);

  // Subscribe to Typing Status
  useEffect(() => {
      if (view !== 'room' || !activeChannel.id || !user) return;
      const unsub = dataService.subscribeTyping(activeChannel.id, (list) => {
          // Filter by UID to exclude self
          const others = list.filter(u => u.userId !== user.uid).map(u => u.displayName);
          setTypingUsers(others);
      });
      return () => unsub();
  }, [view, activeChannel.id, user?.uid]);

  // Typing Handlers
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

      // Throttle Send (2.5s)
      const now = Date.now();
      if (!isTyping || now - lastTypingSentRef.current > 2500) {
          dataService.sendTypingStatus(activeChannel.id, { 
              uid: user.uid, 
              displayName: user.displayName || 'User' 
          });
          lastTypingSentRef.current = now;
          setIsTyping(true);
      }

      // Debounce Clear (3s)
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
      // Mark read again
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
      
      // Clear typing immediately
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
          pending: true
      };
      
      // Optimistic update
      setMessages(prev => [...prev, msg]);
      // Scroll to bottom
      if (scrollRef.current) {
          setTimeout(() => {
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 50);
      }
      
      await dataService.sendChatMessage(msg);

      // KEEP FOCUS ON INPUT
      if (inputRef.current) {
          inputRef.current.focus();
      }
  };

  const getDmChannelId = (partnerId: string) => {
      if (!user) return '';
      return [user.uid, partnerId].sort().join('_');
  };
  
  // Filter friends
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

  if (view === 'list') {
      return (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar">
              <h2 className="font-bold text-slate-800 mb-4 text-lg">Messages</h2>
              
              <div 
                onClick={() => {
                    setActiveChannel({ id: 'global', name: 'Global Chat', type: 'global' });
                    setMessageLimit(150); // Reset limit
                    prevMessagesLengthRef.current = 0;
                    previousScrollHeightRef.current = 0;
                    onNavigateToRoom(); // Use handler
                }}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 mb-6 cursor-pointer active:scale-95 transition-transform relative"
              >
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <MessageCircle size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-800">Global Chat</h3>
                      <p className="text-xs text-slate-500">Public Team Channel</p>
                  </div>
              </div>

              <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-3">Direct Messages</h3>
              <div className="space-y-2">
                  {myFriends.length === 0 ? (
                      <p className="text-slate-400 text-sm italic">No contacts added. Use PC to add friends.</p>
                  ) : (
                      myFriends.map(friend => {
                          const dmId = getDmChannelId(friend.uid);
                          const hasUnread = unreadMap.has(dmId);

                          return (
                              <div 
                                key={friend.uid}
                                onClick={() => {
                                    setActiveChannel({ id: dmId, name: friend.displayName, type: 'dm' });
                                    setMessageLimit(150); // Reset
                                    prevMessagesLengthRef.current = 0;
                                    previousScrollHeightRef.current = 0;
                                    onNavigateToRoom(); // Use handler
                                }}
                                className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer active:scale-95 transition-transform relative"
                              >
                                  <div className="relative">
                                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                          {friend.photoURL ? <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400"/>}
                                      </div>
                                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                          friend.status === 'online' ? 'bg-emerald-500' : friend.status === 'away' ? 'bg-amber-500' : 'bg-slate-300'
                                      }`}></div>
                                      
                                      {/* NEW: Unread Dot on Profile Picture */}
                                      {hasUnread && (
                                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                                      )}
                                  </div>
                                  <div>
                                      <p className="font-bold text-sm text-slate-800">{friend.displayName}</p>
                                      <p className="text-xs text-slate-500">{friend.status}</p>
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
      <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
          <div className="p-3 bg-white border-b border-slate-200 shadow-sm flex items-center gap-3 z-10 shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                  {activeChannel.name.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                  <h3 className="font-bold text-sm text-slate-800">{activeChannel.name}</h3>
                  <p className="text-[10px] text-slate-500">{activeChannel.type === 'global' ? 'Team Channel' : 'Direct Message'}</p>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef} style={{ WebkitOverflowScrolling: 'touch' }}>
              
              {/* Load More Button */}
              <div className="flex justify-center mb-4">
                  <button 
                    onClick={loadMoreHistory}
                    className="text-xs bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-300 active:scale-95 transition-transform"
                  >
                      <ArrowUpCircle size={12} /> Load Previous Messages
                  </button>
              </div>

              <div className="space-y-3 pb-4">
                  {messages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.uid;
                      const isRead = msg.readBy && msg.readBy.length > 1;

                      return (
                          <div key={msg.id || idx} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              {!isMe && (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden mt-1">
                                      {msg.senderPhoto ? <img src={msg.senderPhoto} alt="U" /> : <UserIcon className="w-full h-full p-1.5 text-slate-400"/>}
                                  </div>
                              )}
                              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                  {!isMe && <span className="text-[10px] text-slate-500 ml-1 mb-0.5">{msg.senderName}</span>}
                                  <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                                      {msg.text}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 px-1">
                                      <span className="text-[10px] text-slate-400">
                                          {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                      </span>
                                      {isMe && (
                                          <span className={`${isRead ? 'text-blue-500' : 'text-slate-300'}`}>
                                              {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                                          </span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      )
                  })}

                  {/* Mobile Typing Indicator */}
                  {typingUsers.length > 0 && (
                     <div className="flex gap-2 animate-fade-in-up">
                         <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                             <div className="flex gap-0.5">
                                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                             </div>
                         </div>
                         <span className="text-xs text-slate-400 self-center">
                            {typingUsers.join(', ')} is typing...
                         </span>
                     </div>
                  )}
              </div>
          </div>

          <div className="p-3 bg-white border-t border-slate-200 shrink-0 safe-area-bottom relative">
              <AnimatePresence>
                  {showEmojiPicker && (
                      <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute bottom-[4.5rem] left-2 right-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3 shadow-2xl grid grid-cols-7 sm:grid-cols-10 gap-1 z-30"
                      >
                          {EMOJIS.map(emoji => (
                              <button
                                  key={emoji}
                                  onClick={() => handleEmojiClick(emoji)}
                                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg transition-colors"
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
                      className={`p-2 rounded-full transition-colors shrink-0 ${showEmojiPicker ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {/* PreventDefault on MouseDown prevents focus loss from input */}
                  <button 
                    type="submit" 
                    disabled={!inputText.trim()} 
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 shrink-0"
                  >
                      <Send size={18} />
                  </button>
              </form>
          </div>
      </div>
  );
};

// Dedicated Read-Only Mobile Detail View
const MobileShipmentDetail = ({ bl, onClose }: { bl: BLData, onClose: () => void }) => {
  const docs = [
    { label: 'Bill of Lading', fileUrl: bl.fileUrl },
    { label: 'Arrival Notice', fileUrl: bl.arrivalNotice?.fileUrl },
    { label: 'Commercial Invoice', fileUrl: bl.commercialInvoice?.fileUrl },
    { label: 'Packing List', fileUrl: bl.packingList?.fileUrl },
    { label: 'Manifest', fileUrl: bl.manifest?.fileUrl },
    { label: 'Export Dec', fileUrl: bl.exportDeclaration?.fileUrl },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in fixed inset-0 z-[60]">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm border-b border-slate-200 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-3">
             <button 
                onClick={onClose} 
                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
             >
                <ArrowLeft size={20} />
             </button>
             <div className="overflow-hidden">
                <h2 className="font-bold text-slate-800 text-lg leading-none truncate max-w-[200px]">{bl.blNumber}</h2>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[200px]">{bl.shipper}</p>
             </div>
         </div>
         <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${bl.sourceType === 'TRANSIT' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
            {bl.sourceType}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-20">
         
         {/* 1. DOCUMENTS SECTION (Top Priority) */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <FileText size={16} className="text-slate-500"/>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Attached Documents</span>
            </div>
            <div className="divide-y divide-slate-50">
               {docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.fileUrl ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-300'}`}>
                           <FileText size={16} />
                        </div>
                        <span className={`text-sm font-bold ${doc.fileUrl ? 'text-slate-700' : 'text-slate-400'}`}>
                            {doc.label}
                        </span>
                     </div>
                     
                     {doc.fileUrl ? (
                        <button 
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            <ExternalLink size={16} />
                        </button>
                     ) : (
                        <span className="text-[10px] text-slate-300 italic px-2">Empty</span>
                     )}
                  </div>
               ))}
            </div>
         </div>

         {/* 2. LOGISTICS INFO */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Truck size={16} className="text-slate-500"/>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logistics Info</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                 <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Vessel</p>
                    <p className="font-bold text-slate-800 truncate">{bl.vesselName || '-'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Voyage</p>
                    <p className="font-bold text-slate-800 truncate">{bl.voyageNo || '-'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">POL</p>
                    <p className="font-medium text-slate-700 truncate">{bl.portOfLoading || '-'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">POD</p>
                    <p className="font-medium text-slate-700 truncate">{bl.portOfDischarge || '-'}</p>
                 </div>
                 <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Consignee</p>
                    <p className="font-medium text-slate-700 truncate">{bl.consignee || '-'}</p>
                 </div>
            </div>
         </div>

         {/* 3. CARGO ITEMS */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Box size={16} className="text-slate-500"/>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargo Items</span>
            </div>
            <div className="divide-y divide-slate-100">
               {bl.cargoItems.map((item, i) => (
                   <div key={i} className="p-4">
                       <div className="flex justify-between items-start mb-1">
                           <span className="font-bold text-slate-800 text-sm line-clamp-2">{item.description}</span>
                           <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs whitespace-nowrap ml-2">
                               {item.quantity} {item.packageType}
                           </span>
                       </div>
                       <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                           {item.containerNo && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">{item.containerNo}</span>}
                           <span>Weight: <strong className="text-slate-700">{item.grossWeight}</strong> kg</span>
                           <span>Vol: <strong className="text-slate-700">{item.measurement}</strong> CBM</span>
                       </div>
                   </div>
               ))}
               {bl.cargoItems.length === 0 && (
                   <div className="p-6 text-center text-slate-400 text-sm italic">No items listed.</div>
               )}
            </div>
         </div>

      </div>
    </div>
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
  // CHANGED: Default view is now Cargo, Home removed
  const [currentView, setCurrentView] = useState<'cargo' | 'chat' | 'settings'>('cargo');
  const [chatView, setChatView] = useState<'list' | 'room'>('list');
  const [activeChannel, setActiveChannel] = useState<{ id: string; name: string; type: 'global' | 'dm' }>({ id: 'global', name: 'Global Chat', type: 'global' });
  const [searchTerm, setSearchTerm] = useState('');
  const [vesselFilter, setVesselFilter] = useState('all');
  const [selectedBLId, setSelectedBLId] = useState<string | null>(null);

  // --- Mobile Back Button Handling (Browser History API) ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
        // Priority 1: Close Detail Modal if open
        if (selectedBLId) {
            setSelectedBLId(null);
            return;
        }
        // Priority 2: Close Chat Room if open
        if (currentView === 'chat' && chatView === 'room') {
            setChatView('list');
            return;
        }
        // If nothing to close, we allow browser default (which might be exiting the app/page)
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedBLId, currentView, chatView]);

  const handleOpenDetail = (id: string) => {
      // Push state so back button works
      window.history.pushState({ modal: true }, '');
      setSelectedBLId(id);
  };

  const handleCloseDetail = () => {
      // Navigate back to remove the pushed state, which triggers popstate handler
      window.history.back();
  };

  const handleOpenChatRoom = () => {
      // Push state
      window.history.pushState({ chatRoom: true }, '');
      setChatView('room');
  };

  const handleCloseChatRoom = () => {
      window.history.back();
  };
  // -----------------------------------------------------------

  // Search logic for Cargo
  const filteredBLs = useMemo(() => {
    let result = bls;

    // Filter by Vessel
    if (vesselFilter !== 'all') {
        if (vesselFilter === 'unassigned') {
            result = result.filter(b => !b.vesselJobId);
        } else {
            result = result.filter(b => b.vesselJobId === vesselFilter);
        }
    }

    // Filter by Search
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

  const renderContent = () => {
    // 1. Detail View Check
    if (selectedBLId) {
        const selectedBL = bls.find(b => b.id === selectedBLId);
        if (selectedBL) {
            return (
                <MobileShipmentDetail 
                    bl={selectedBL}
                    onClose={handleCloseDetail} // Trigger History Back
                />
            );
        } else {
            setSelectedBLId(null);
        }
    }

    switch(currentView) {
      case 'cargo':
        return (
          <div className="flex flex-col h-full">
              <div className="p-4 bg-white border-b border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                      <h2 className="font-bold text-lg text-slate-800">Cargo List</h2>
                      <div className="relative">
                          <select 
                              value={vesselFilter}
                              onChange={(e) => setVesselFilter(e.target.value)}
                              className="pl-3 pr-6 py-1.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none max-w-[200px] truncate"
                              style={{ backgroundImage: 'none' }} 
                          >
                              <option value="all">All Vessels</option>
                              <option value="unassigned">Unassigned</option>
                              {jobs.map(j => (
                                  <option key={j.id} value={j.id}>{j.vesselName}</option>
                              ))}
                          </select>
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ChevronDown size={12} className="text-slate-400" />
                           </div>
                      </div>
                  </div>

                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search B/L, Shipper..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 custom-scrollbar">
                  {filteredBLs.length === 0 ? (
                      <div className="text-center text-slate-400 mt-10">No documents found.</div>
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
                            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm active:scale-95 transition-transform"
                          >
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                      {bl.blNumber}
                                  </span>
                                  {bl.fileUrl && <ExternalLink size={14} className="text-blue-500" onClick={(e) => { e.stopPropagation(); window.open(bl.fileUrl, '_blank'); }} />}
                              </div>
                              <h4 className="font-bold text-sm text-slate-800 mb-1 line-clamp-1">{bl.shipper}</h4>
                              <p className="text-xs text-slate-500 mb-3 line-clamp-1">{bl.vesselName}</p>
                              
                              <div className="flex gap-1.5 mt-2">
                                  {docs.map(doc => (
                                      <div 
                                          key={doc.id} 
                                          className={`w-2 h-2 rounded-full ${doc.has ? doc.color : 'bg-slate-200'}`} 
                                          title={doc.label}
                                      />
                                  ))}
                              </div>
                          </div>
                      )})
                  )}
              </div>
          </div>
        );
      case 'chat':
          return (
             <div className="h-full flex flex-col relative">
                {chatView === 'room' && (
                    <button 
                        onClick={handleCloseChatRoom} 
                        className="absolute top-3 left-3 z-20 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm"
                    >
                        <ArrowLeft size={20} className="text-slate-700"/>
                    </button>
                )}
                <MobileChatView 
                    user={user} 
                    view={chatView} 
                    setView={setChatView} 
                    activeChannel={activeChannel}
                    setActiveChannel={setActiveChannel}
                    onNavigateToRoom={handleOpenChatRoom} // Pass the history push handler
                    onBackToList={handleCloseChatRoom}
                />
             </div>
          );
      case 'settings':
        return (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                <h2 className="font-bold text-xl text-slate-800 mb-6">Settings</h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Dark Mode</span>
                        <button 
                            onClick={() => onUpdateSettings({...settings, theme: settings.theme === 'dark' ? 'light' : 'dark'})}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Language</span>
                        <select 
                            value={settings.language}
                            onChange={(e) => onUpdateSettings({...settings, language: e.target.value as any})}
                            className="bg-slate-50 text-sm border-none rounded-lg p-2 text-slate-700"
                        >
                            <option value="ko">한국어</option>
                            <option value="en">English</option>
                            <option value="cn">中文</option>
                        </select>
                    </div>
                </div>

                {user && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="text-slate-400 w-6 h-6" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate text-sm">{user.displayName || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>
                )}

                <button 
                    onClick={onLogout}
                    className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 mb-8"
                >
                    <LogOut size={18} /> Log Out
                </button>
                <p className="text-center text-xs text-slate-400 mt-auto pb-6">
                    LOGI1 Mobile v1.0.0
                </p>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 text-slate-900 overflow-hidden z-[100]">
        <div className="flex-1 overflow-hidden relative w-full">
            {renderContent()}
        </div>
        
        {!selectedBLId && !(currentView === 'chat' && chatView === 'room') && (
            <div 
                className="bg-white border-t border-slate-200 px-6 pt-3 flex justify-center gap-16 items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 shrink-0"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
                <button onClick={() => setCurrentView('cargo')} className={`flex flex-col items-center gap-1 ${currentView === 'cargo' ? 'text-blue-600' : 'text-slate-400'}`}>
                    <ListIcon size={24} strokeWidth={currentView === 'cargo' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Cargo</span>
                </button>
                <button 
                    onClick={() => {
                        setCurrentView('chat');
                        if (onCheckMessages) onCheckMessages(); // Acknowledge messages
                    }}
                    className={`flex flex-col items-center gap-1 relative ${currentView === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <div className="relative">
                        <MessageCircle size={24} strokeWidth={currentView === 'chat' ? 2.5 : 2} />
                        {/* Only show dot if unread AND NOT currently in chat view */}
                        {hasUnreadMessages && currentView !== 'chat' && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                    </div>
                    <span className="text-[10px] font-bold">Chat</span>
                </button>
                <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}>
                    <Settings size={24} strokeWidth={currentView === 'settings' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Menu</span>
                </button>
            </div>
        )}
    </div>
  );
};
