
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, User as UserIcon, MessageCircle, ChevronLeft, Download, UserPlus, Settings2, Trash2, ChevronDown, Check, Minus } from 'lucide-react';
import { chatService, generateChannelId } from '../../services/chatService';
import { ChatMessage, ChatUser, BaseWindowProps } from '../../types';
import { User } from 'firebase/auth';
import saveAs from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatScroll } from '../../hooks/useChatScroll';
import { MessageList } from '../../components/chat/MessageList';
import { MessageInput } from '../../components/chat/MessageInput';

interface ChatWindowProps extends BaseWindowProps {
  sidebarWidth: number;
  user: User | null;
}

type WindowState = 'default' | 'tall' | 'maximized';

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, isMinimized, onClose, onMinimize, sidebarWidth, user, zIndex, onFocus }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'dm'>('global');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadMap, setUnreadMap] = useState<Set<string>>(new Set()); 
  const [windowState, setWindowState] = useState<WindowState>('default');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [messageLimit, setMessageLimit] = useState(150);
  
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isEditingFriends, setIsEditingFriends] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  // Map to store promises of messages currently being sent
  const pendingMsgPromises = useRef<Map<string, Promise<string>>>(new Map());

  const dimensions = useMemo(() => {
      switch (windowState) {
          case 'tall': return { width: 380, height: '90vh' };
          case 'maximized': return { width: 700, height: '90vh' };
          default: return { width: 380, height: 600 };
      }
  }, [windowState]);

  const channelId = useMemo(() => {
    if (activeTab === 'global') return 'global';
    if (selectedUser && user) return generateChannelId(user.uid, selectedUser.uid);
    return null;
  }, [activeTab, selectedUser, user?.uid]);

  // Derived state for live user status
  const liveSelectedUser = useMemo(() => {
      if (!selectedUser) return null;
      return users.find(u => u.uid === selectedUser.uid) || selectedUser;
  }, [users, selectedUser]);

  const { scrollRef, handleScroll, scrollToBottom, showScrollDown, messageRefs, signalHistoryLoad, restoreScrollPosition } = useChatScroll(messages, channelId, user?.uid, isOpen);

  useEffect(() => {
      if (!user) return;
      const unsub = chatService.subscribeUnreadMap(user.uid, setUnreadMap);
      return () => unsub();
  }, [user]);

  useEffect(() => {
     if (isOpen && channelId && user) {
         setUnreadMap(prev => {
             const newMap = new Set(prev);
             newMap.delete(channelId);
             return newMap;
         });
         const timer = setTimeout(() => {
             const hasUnread = messages.some(m => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid)));
             if (hasUnread) chatService.markChannelRead(channelId, user.uid);
         }, 1000);
         return () => clearTimeout(timer);
     }
  }, [isOpen, channelId, user, messages.length]);

  // Reset tracking when channel changes
  useEffect(() => {
      setMessageLimit(150);
      setReplyingTo(null);
  }, [channelId]);

  useEffect(() => {
      if (!isOpen || !channelId) return;
      const unsub = chatService.subscribeChatMessages(channelId, messageLimit, setMessages);
      return () => unsub();
  }, [isOpen, channelId, messageLimit]);

  useEffect(() => {
      if (!isOpen) return;
      const unsub = chatService.subscribeChatUsers(setUsers);
      return () => unsub();
  }, [isOpen]);

  useEffect(() => {
      if (!isOpen || !channelId || !user) return;
      const unsub = chatService.subscribeTyping(channelId, (list) => {
          const others = list.filter(u => u.userId !== user.uid).map(u => u.displayName);
          setTypingUsers(others);
      });
      return () => unsub();
  }, [isOpen, channelId, user?.uid]);

  // Handlers
  const handleTyping = () => {
      if (!user || !channelId) return;
      const now = Date.now();
      if (!isTyping || now - lastTypingSentRef.current > 2500) {
          chatService.sendTypingStatus(channelId, { uid: user.uid, displayName: user.displayName || 'User' });
          lastTypingSentRef.current = now;
          setIsTyping(true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          chatService.clearTypingStatus(channelId, user.uid);
          setIsTyping(false);
      }, 3000);
  };

  const handleStopTyping = () => {
      if (!user || !channelId) return;
      chatService.clearTypingStatus(channelId, user.uid);
      setIsTyping(false);
  };

  const handleSend = async (text: string) => {
      if (!user || !channelId) return;
      
      const tempId = 'temp-' + Date.now();
      const optimisticMsg: ChatMessage = {
          id: tempId, text, senderId: user.uid, senderName: user.displayName || 'User', senderPhoto: user.photoURL || '',
          timestamp: Date.now(), channelId: channelId, readBy: [user.uid], pending: true,
          replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined
      };
      
      setMessages(prev => [...prev, optimisticMsg]);
      setReplyingTo(null);
      setTimeout(scrollToBottom, 50);
      
      const sendPromise = chatService.sendChatMessage(optimisticMsg);
      pendingMsgPromises.current.set(tempId, sendPromise);

      try {
          const realId = await sendPromise;
          setMessages(prev => prev.map(msg => 
              msg.id === tempId ? { ...msg, id: realId, pending: false } : msg
          ));
          pendingMsgPromises.current.delete(tempId);
      } catch (error) {
          console.error("Failed to send message", error);
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          pendingMsgPromises.current.delete(tempId);
          alert("Failed to send message. Please try again.");
      }
  };

  const handleReaction = async (emoji: string, messageId: string) => {
      if (!user) return;
      
      let targetId = messageId;

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

      if (targetId.startsWith('temp-')) {
          const pendingPromise = pendingMsgPromises.current.get(targetId);
          if (pendingPromise) {
              try {
                  targetId = await pendingPromise;
              } catch (e) {
                  console.error("Cannot react: message failed to send");
                  return;
              }
          } else {
              return;
          }
      }

      await chatService.toggleMessageReaction(targetId, user.uid, emoji);
  };

  const handleUserSelect = (targetUser: ChatUser) => {
      if (targetUser.uid === user?.uid || !user) return;
      const dmId = generateChannelId(user.uid, targetUser.uid);
      setUnreadMap(prev => { const newMap = new Set(prev); newMap.delete(dmId); return newMap; });
      chatService.markChannelRead(dmId, user.uid);
      setSelectedUser(targetUser);
  };

  const handleTabSwitch = (tab: 'global' | 'dm') => {
      if (tab === 'global' && user) {
          setUnreadMap(prev => { const newMap = new Set(prev); newMap.delete('global'); return newMap; });
          chatService.markChannelRead('global', user.uid);
      }
      setActiveTab(tab);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!friendEmail.trim() || !user) return;
      setIsAddingFriend(true);
      try {
          await chatService.addContactByEmail(user.uid, friendEmail.trim());
          setFriendEmail(''); setShowAddFriend(false); alert("Friend added successfully!");
      } catch (error: any) { alert(error.message); } finally { setIsAddingFriend(false); }
  };

  const loadMoreMessages = () => {
      signalHistoryLoad();
      setMessageLimit(prev => prev + 100);
  };

  const myFriends = useMemo(() => {
      if (!user || users.length === 0) return [];
      const me = users.find(u => u.uid === user.uid);
      if (!me || !me.contacts) return [];
      return me.contacts.map(contactId => users.find(u => u.uid === contactId)).filter((u): u is ChatUser => !!u);
  }, [users, user]);

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
            animate={{ opacity: isMinimized ? 0 : 1, scale: isMinimized ? 0.9 : 1, y: 0, width: dimensions.width, height: dimensions.height, pointerEvents: isMinimized ? 'none' : 'auto' }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            onAnimationComplete={() => { if (isOpen && !isMinimized) restoreScrollPosition(); }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            style={{ position: 'fixed', left: sidebarWidth + 20, bottom: 20, zIndex: zIndex }}
            className="flex flex-col rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/30 dark:border-white/20 bg-white/15 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150 overflow-hidden pointer-events-auto"
            onPointerDown={onFocus}
        >
            {/* Header */}
            <div className="h-12 bg-gradient-to-b from-white/10 to-transparent flex items-center px-5 justify-between cursor-grab active:cursor-grabbing shrink-0 backdrop-blur-sm border-b border-white/10">
                 <div className="flex items-center gap-2 group" onPointerDown={(e) => e.stopPropagation()}>
                     <button onClick={onClose} className="w-4 h-4 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 flex items-center justify-center shadow-sm hover:scale-110"><X size={10} className="text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={3} /></button>
                     <button onClick={(e) => { e.stopPropagation(); onMinimize && onMinimize(); }} className="w-4 h-4 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 flex items-center justify-center shadow-sm hover:scale-110"><Minus size={10} className="text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={4} /></button>
                     <button onClick={(e) => { e.stopPropagation(); setWindowState(prev => prev === 'maximized' ? 'default' : 'maximized'); }} className="w-4 h-4 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 flex items-center justify-center shadow-sm hover:scale-110"><div className="w-1.5 h-1.5 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full"></div></button>
                 </div>
                 <div className="font-semibold text-slate-800 dark:text-white/90 text-sm select-none drop-shadow-sm flex items-center gap-2">
                    {liveSelectedUser ? (
                        <>
                            <span className={`w-2.5 h-2.5 rounded-full shadow-sm border border-white/20 transition-colors duration-500 ${
                                liveSelectedUser.status === 'online' ? 'bg-emerald-500 shadow-emerald-500/50' : 
                                liveSelectedUser.status === 'away' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-slate-400'
                            }`}></span>
                            {liveSelectedUser.displayName}
                        </>
                    ) : (
                        <><MessageCircle size={14} className="text-blue-500 fill-current" />Team Chat</>
                    )}
                 </div>
                 <div className="flex items-center gap-2">
                     {(activeTab === 'global' || selectedUser) && <button onClick={() => { const blob = new Blob([JSON.stringify(messages, null, 2)], {type: "application/json"}); saveAs(blob, `Chat_Log.json`); }} className="text-slate-500 hover:text-blue-600 dark:text-slate-400 transition-colors"><Download size={16} /></button>}
                 </div>
            </div>

            {!selectedUser && (
                <div className="flex p-1 mx-4 mt-2 bg-white/20 dark:bg-black/30 rounded-lg p-1 shrink-0 backdrop-blur-md">
                    <button onClick={() => handleTabSwitch('global')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all relative ${activeTab === 'global' ? 'bg-white/80 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Global{unreadMap.has('global') && <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</button>
                    <button onClick={() => handleTabSwitch('dm')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all relative ${activeTab === 'dm' ? 'bg-white/80 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>DMs{Array.from(unreadMap).some(id => id !== 'global') && <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}</button>
                </div>
            )}

            {selectedUser && (
                 <div className="px-4 py-2 flex items-center shrink-0">
                     <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors px-2 py-1 bg-white/20 dark:bg-black/20 rounded-full backdrop-blur-sm"><ChevronLeft size={14} /> Back</button>
                 </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 scroll-smooth" ref={scrollRef} onScroll={handleScroll}>
                 {(activeTab === 'global' || selectedUser) && (
                     <MessageList 
                        messages={messages} 
                        user={user}
                        allUsers={users}
                        typingUsers={typingUsers} 
                        messageRefs={messageRefs} 
                        onReaction={handleReaction} 
                        onReply={setReplyingTo} 
                        loadMoreMessages={loadMoreMessages} 
                     />
                 )}

                 {activeTab === 'dm' && !selectedUser && (
                     <div className="space-y-2">
                         <div className="flex gap-2 mb-4">
                             <button onClick={() => setShowAddFriend(true)} className="flex-1 py-2 bg-white/40 dark:bg-white/10 hover:bg-white/60 rounded-xl text-slate-600 dark:text-slate-200 text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-1 shadow-sm"><UserPlus size={14} /> Add Friend</button>
                             <button onClick={() => setIsEditingFriends(!isEditingFriends)} className={`px-3 py-2 rounded-xl transition-all border border-white/20 shadow-sm ${isEditingFriends ? 'bg-blue-500 text-white' : 'bg-white/40 dark:bg-white/10 text-slate-600 dark:text-slate-200 hover:bg-white/60'}`}>{isEditingFriends ? <Check size={14} /> : <Settings2 size={14} />}</button>
                         </div>
                         {myFriends.length === 0 ? <div className="text-center text-slate-500/60 text-sm mt-10">No friends list.<br/>Add email to start.</div> : (
                            <div className="grid grid-cols-1 gap-1">
                                {myFriends.map((friend, index) => (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} key={friend.uid} onClick={() => !isEditingFriends && handleUserSelect(friend)} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer relative group ${isEditingFriends ? 'bg-red-50/50 border border-red-200' : 'bg-white/20 dark:bg-white/5 hover:bg-white/40 border border-white/10 shadow-sm'}`}>
                                        <div className="relative"><div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white/40">{friend.photoURL ? <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400"/>}</div><div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${friend.status === 'away' ? 'bg-amber-500' : friend.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>{unreadMap.has(generateChannelId(user!.uid, friend.uid)) && !isEditingFriends && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-md"></div>}</div>
                                        <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 dark:text-white truncate">{friend.displayName}</p><p className="text-[10px] text-slate-500 truncate opacity-80">{friend.email}</p></div>
                                        {isEditingFriends ? <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Remove?")) chatService.removeContact(user!.uid, friend.uid); }} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><Trash2 size={14} /></button> : <ChevronLeft size={16} className="text-slate-400 rotate-180 opacity-50 group-hover:opacity-100" />}
                                    </motion.div>
                                ))}
                            </div>
                         )}
                     </div>
                 )}
            </div>

            <AnimatePresence>{showScrollDown && <motion.button initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }} onClick={scrollToBottom} className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-full shadow-lg border border-white/20 flex items-center justify-center text-blue-600 dark:text-blue-400 z-30 hover:bg-white/90 transition-colors"><ChevronDown size={16} /></motion.button>}</AnimatePresence>

            {(activeTab === 'global' || selectedUser) && (
                <MessageInput 
                    onSend={handleSend} 
                    onTyping={handleTyping} 
                    onStopTyping={handleStopTyping} 
                    replyingTo={replyingTo} 
                    onCancelReply={() => setReplyingTo(null)} 
                />
            )}

            {showAddFriend && (
                <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/90 dark:bg-slate-800/90 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/20 backdrop-blur-xl">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add Friend</h3>
                        <form onSubmit={handleAddFriend}>
                            <input type="email" required value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm backdrop-blur-sm border border-slate-200 dark:border-slate-600 mb-4" placeholder="Email address" />
                            <div className="flex gap-2"><button type="button" onClick={() => setShowAddFriend(false)} className="flex-1 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl text-sm">Cancel</button><button type="submit" disabled={isAddingFriend} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/30">{isAddingFriend ? "..." : "Add"}</button></div>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
