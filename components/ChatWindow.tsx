
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Send, X, User as UserIcon, MessageCircle, ChevronLeft, Check, CheckCheck, Download, UserPlus, Plus, ArrowUpCircle, Settings2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { dataService } from '../services/dataService';
import { ChatMessage, ChatUser } from '../types';
import { User } from 'firebase/auth';
import saveAs from 'file-saver';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarWidth: number;
  user: User | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, sidebarWidth, user }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'dm'>('global');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadMap, setUnreadMap] = useState<Set<string>>(new Set()); // Tracks Channel IDs with unread messages
  
  // History Limit
  const [messageLimit, setMessageLimit] = useState(150); // Default to 150 (approx 3+ days)
  const isHistoryLoadingRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  
  // Add Friend & Edit State
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isEditingFriends, setIsEditingFriends] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  
  // Typing state Refs
  const typingTimeoutRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  // Stable Channel ID calculation
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

  // Subscribe to Unread Map to show dots on DM List
  useEffect(() => {
      if (!user) return;
      const unsub = dataService.subscribeUnreadMap(user.uid, setUnreadMap);
      return () => unsub();
  }, [user]);

  // REAL-TIME READ MARKING:
  useEffect(() => {
     if (isOpen && channelId && user) {
         // 1. Optimistically remove from local unread map to hide dot instantly
         setUnreadMap(prev => {
             const newMap = new Set(prev);
             newMap.delete(channelId);
             return newMap;
         });

         // 2. Check if there are any unread messages for me in the current list
         const hasUnread = messages.some(m => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid)));
         
         if (hasUnread) {
             dataService.markChannelRead(channelId, user.uid);
         }
     }
  }, [isOpen, channelId, user, messages]);

  // Subscribe to Messages with Limit logic
  useEffect(() => {
      if (!isOpen || !channelId) return;
      
      const unsub = dataService.subscribeChatMessages(channelId, messageLimit, (newMessages) => {
          setMessages(newMessages);
      });
      return () => unsub();
  }, [isOpen, channelId, messageLimit]);

  // SCROLL LOGIC
  useLayoutEffect(() => {
      if (!scrollRef.current) return;
      
      const currentScrollHeight = scrollRef.current.scrollHeight;
      
      // 1. Initial Load: Scroll to bottom
      const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
      if (isInitialLoad) {
          scrollRef.current.scrollTop = currentScrollHeight;
      } 
      // 2. History Load: Preserve relative scroll position
      else if (isHistoryLoadingRef.current) {
          const heightDiff = currentScrollHeight - previousScrollHeightRef.current;
          if (heightDiff > 0) {
              scrollRef.current.scrollTop += heightDiff;
          }
          isHistoryLoadingRef.current = false; // Reset flag
      } 
      // 3. New Message: Auto-scroll if near bottom
      else if (messages.length > prevMessagesLengthRef.current) {
          const distanceFromBottom = currentScrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight;
          if (distanceFromBottom < 100) {
              scrollRef.current.scrollTop = currentScrollHeight;
          }
      }
      
      prevMessagesLengthRef.current = messages.length;
      previousScrollHeightRef.current = currentScrollHeight;
  }, [messages]);

  // Subscribe to Users List
  useEffect(() => {
      if (!isOpen) return;
      const unsub = dataService.subscribeChatUsers(setUsers);
      return () => unsub();
  }, [isOpen]);

  // Subscribe to Typing Status
  useEffect(() => {
      if (!isOpen || !channelId || !user) return;
      const unsub = dataService.subscribeTyping(channelId, (list) => {
          // Filter out self by UID
          const others = list.filter(u => u.userId !== user.uid).map(u => u.displayName);
          setTypingUsers(others);
      });
      return () => unsub();
  }, [isOpen, channelId, user?.uid]);

  // Reset limit when switching chats
  useEffect(() => {
      setMessageLimit(150);
      prevMessagesLengthRef.current = 0;
      previousScrollHeightRef.current = 0;
  }, [activeTab, selectedUser]);

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
          dataService.sendTypingStatus(channelId, { 
              uid: user.uid, 
              displayName: user.displayName || 'User' 
          });
          lastTypingSentRef.current = now;
          setIsTyping(true);
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
          dataService.clearTypingStatus(channelId, user.uid);
          setIsTyping(false);
      }, 3000);
  };

  const handleInputFocus = () => {
      if (!user || !channelId) return;
      dataService.markChannelRead(channelId, user.uid);
      
      dataService.sendTypingStatus(channelId, { 
          uid: user.uid, 
          displayName: user.displayName || 'User' 
      });
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
          id: tempId,
          text: text,
          senderId: user.uid,
          senderName: user.displayName || 'User',
          senderPhoto: user.photoURL || '',
          timestamp: Date.now(),
          channelId: channelId,
          readBy: [user.uid],
          pending: true
      };

      setMessages(prev => [...prev, optimisticMsg]);
      
      setTimeout(() => {
         if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);

      await dataService.sendChatMessage(optimisticMsg);
  };

  const handleUserSelect = (targetUser: ChatUser) => {
      if (targetUser.uid === user?.uid) return;
      
      const dmId = getDmChannelId(targetUser.uid);
      setUnreadMap(prev => {
          const newMap = new Set(prev);
          newMap.delete(dmId);
          return newMap;
      });
      if (user) {
          dataService.markChannelRead(dmId, user.uid);
      }

      setSelectedUser(targetUser);
  };

  const handleTabSwitch = (tab: 'global' | 'dm') => {
      if (tab === 'global') {
          setUnreadMap(prev => {
              const newMap = new Set(prev);
              newMap.delete('global');
              return newMap;
          });
          if (user) {
              dataService.markChannelRead('global', user.uid);
          }
      }
      setActiveTab(tab);
  };

  const formatTime = (ts: number) => {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const downloadCurrentChat = () => {
      if (messages.length === 0) {
          alert("No messages to download.");
          return;
      }
      const chatName = activeTab === 'global' ? 'Global_Chat' : `DM_${selectedUser?.displayName || 'Unknown'}`;
      const blob = new Blob([JSON.stringify(messages, null, 2)], {type: "application/json"});
      saveAs(blob, `${chatName}_Log_${new Date().toISOString().slice(0, 10)}.json`);
  };

  // Derive friends list respecting the order in 'contacts' array
  const myFriends = useMemo(() => {
      if (!user || users.length === 0) return [];
      const me = users.find(u => u.uid === user.uid);
      if (!me || !me.contacts) return [];
      
      // Map contacts array IDs to User objects to preserve order
      return me.contacts
          .map(contactId => users.find(u => u.uid === contactId))
          .filter((u): u is ChatUser => !!u);
  }, [users, user]);

  const handleAddFriend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!friendEmail.trim() || !user) return;

      setIsAddingFriend(true);
      try {
          await dataService.addContactByEmail(user.uid, friendEmail.trim());
          setFriendEmail('');
          setShowAddFriend(false);
          alert("Friend added successfully!");
      } catch (error: any) {
          alert(error.message);
      } finally {
          setIsAddingFriend(false);
      }
  };

  const loadMoreMessages = () => {
      isHistoryLoadingRef.current = true;
      setMessageLimit(prev => prev + 100);
  };

  const deleteFriend = async (friendUid: string) => {
      if (!user) return;
      if (window.confirm("Remove this friend from your list?")) {
          await dataService.removeContact(user.uid, friendUid);
      }
  };

  const moveFriend = async (index: number, direction: 'up' | 'down') => {
      if (!user) return;
      const newFriends = [...myFriends];
      if (direction === 'up' && index > 0) {
          [newFriends[index], newFriends[index - 1]] = [newFriends[index - 1], newFriends[index]];
      } else if (direction === 'down' && index < newFriends.length - 1) {
          [newFriends[index], newFriends[index + 1]] = [newFriends[index + 1], newFriends[index]];
      } else {
          return;
      }
      
      const newContactIds = newFriends.map(f => f.uid);
      // Optimistic update handled by Firestore subscription if fast enough, 
      // but strictly relying on subscription is safer.
      await dataService.updateContacts(user.uid, newContactIds);
  };

  return (
    <div 
        className={`fixed top-0 bottom-0 z-30 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 flex flex-col w-80 md:w-96`}
        style={{ 
            left: sidebarWidth,
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            marginLeft: isOpen ? 0 : -sidebarWidth 
        }}
    >
        {/* Header */}
        <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
             <div className="flex items-center justify-between p-4">
                 <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <MessageCircle size={20} className="text-blue-600"/>
                     Team Chat
                 </h2>
                 <div className="flex items-center gap-1">
                     {(activeTab === 'global' || selectedUser) && (
                         <button 
                            onClick={downloadCurrentChat}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 mr-2"
                            title="Download this chat"
                         >
                             <Download size={16} />
                         </button>
                     )}
                     <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500">
                         <X size={18} />
                     </button>
                 </div>
             </div>
             
             {!selectedUser && (
                <div className="flex px-4 pb-0 gap-4">
                    <button 
                        onClick={() => handleTabSwitch('global')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'global' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Global
                        {unreadMap.has('global') && <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    <button 
                        onClick={() => handleTabSwitch('dm')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'dm' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Direct Messages
                        {Array.from(unreadMap).some(id => id !== 'global') && <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                </div>
             )}

             {selectedUser && (
                 <div className="px-4 pb-3 flex items-center gap-2 animate-fade-in">
                     <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 mr-1">
                         <ChevronLeft size={18} />
                     </button>
                     <div className="relative">
                         <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                             {selectedUser.photoURL ? <img src={selectedUser.photoURL} alt="User" className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-1.5 text-slate-400"/>}
                         </div>
                         <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${
                             selectedUser.status === 'away' ? 'bg-amber-500' : 
                             selectedUser.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                         }`}></div>
                     </div>
                     <div>
                         <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{selectedUser.displayName}</p>
                         <p className="text-xs text-slate-500">{selectedUser.email}</p>
                     </div>
                 </div>
             )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 dark:bg-slate-900/50 relative p-4" ref={scrollRef}>
             
             {(activeTab === 'global' || selectedUser) && (
                 <div className="space-y-4 pb-4">
                     
                     <div className="flex justify-center">
                        <button 
                            onClick={loadMoreMessages} 
                            className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            <ArrowUpCircle size={12} /> Load Previous Messages
                        </button>
                     </div>

                     {messages.length === 0 ? (
                         <div className="text-center text-slate-400 text-sm mt-10 italic">No messages yet. Say hello!</div>
                     ) : (
                         messages.map((msg, index) => {
                             const isMe = msg.senderId === user?.uid;
                             const isRead = msg.readBy && msg.readBy.length > 1; 

                             return (
                                 <div key={msg.id || index} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                     {!isMe && (
                                         <div className="w-8 h-8 rounded-full bg-slate-300 flex-shrink-0 overflow-hidden mt-1">
                                             {msg.senderPhoto ? <img src={msg.senderPhoto} alt="S" /> : <UserIcon className="w-full h-full p-1.5 text-slate-500"/>}
                                         </div>
                                     )}
                                     <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                         <div className={`px-3 py-2 rounded-lg text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'} ${msg.pending ? 'opacity-70' : ''}`}>
                                             {msg.text}
                                         </div>
                                         <div className="flex items-center gap-1 mt-1 px-1">
                                             {!isMe && <span className="text-[10px] text-slate-400 font-bold mr-1">{msg.senderName}</span>}
                                             <span className="text-[10px] text-slate-400">
                                                 {formatTime(msg.timestamp)}
                                             </span>
                                             {isMe && (
                                                <span className={`ml-1 ${isRead ? 'text-blue-500' : 'text-slate-300'}`}>
                                                    {isRead ? <CheckCheck size={14} /> : <Check size={14} />}
                                                </span>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             );
                         })
                     )}

                     {/* Typing Indicator */}
                     {typingUsers.length > 0 && (
                         <div className="flex gap-2 animate-fade-in-up">
                             <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                 <div className="flex gap-0.5">
                                     <span className="w-1 h-1 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce"></span>
                                     <span className="w-1 h-1 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                     <span className="w-1 h-1 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                 </div>
                             </div>
                             <span className="text-xs text-slate-400 dark:text-slate-500 self-center">
                                {typingUsers.join(', ')} is typing...
                             </span>
                         </div>
                     )}
                 </div>
             )}

             {activeTab === 'dm' && !selectedUser && (
                 <div className="space-y-4">
                     <div className="flex gap-2">
                         <button 
                            onClick={() => setShowAddFriend(true)}
                            className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                         >
                            <UserPlus size={18} /> Add Friend (친구 추가)
                         </button>
                         <button
                            onClick={() => setIsEditingFriends(!isEditingFriends)}
                            className={`px-4 py-3 border rounded-xl transition-colors flex items-center justify-center ${isEditingFriends ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700'}`}
                            title="Edit Friends List"
                         >
                             {isEditingFriends ? <Check size={18} /> : <Settings2 size={18} />}
                         </button>
                     </div>

                     {myFriends.length === 0 ? (
                         <div className="text-center text-slate-400 text-sm italic mt-10">
                            No friends added yet.<br/>Click above to add contacts by email.
                         </div>
                     ) : (
                        <div className="space-y-1">
                            {myFriends.map((friend, index) => {
                                const dmId = getDmChannelId(friend.uid);
                                const hasUnread = unreadMap.has(dmId);

                                return (
                                <div 
                                    key={friend.uid} 
                                    onClick={() => !isEditingFriends && handleUserSelect(friend)}
                                    className={`flex items-center gap-3 p-2 rounded-lg transition-all relative ${isEditingFriends ? 'bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700' : 'hover:bg-white dark:hover:bg-slate-800 cursor-pointer'}`}
                                >
                                    {isEditingFriends && (
                                        <div className="flex flex-col gap-1 mr-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveFriend(index, 'up'); }} 
                                                disabled={index === 0}
                                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30"
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveFriend(index, 'down'); }}
                                                disabled={index === myFriends.length - 1}
                                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30"
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                            {friend.photoURL ? <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400"/>}
                                        </div>
                                        {!isEditingFriends && (
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                                                friend.status === 'away' ? 'bg-amber-500' : 
                                                friend.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                                            }`}></div>
                                        )}
                                        
                                        {/* UNREAD RED DOT */}
                                        {hasUnread && !isEditingFriends && (
                                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate flex items-center gap-2">
                                            {friend.displayName}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{friend.email}</p>
                                    </div>
                                    
                                    {isEditingFriends ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteFriend(friend.uid); }}
                                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    ) : (
                                        <ChevronLeft size={16} className="text-slate-300 rotate-180" />
                                    )}
                                </div>
                                )
                            })}
                        </div>
                     )}
                 </div>
             )}
        </div>

        {/* Add Friend Modal */}
        {showAddFriend && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add Friend</h3>
                    <form onSubmit={handleAddFriend}>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Friend's Email</label>
                            <input 
                                type="email" 
                                required
                                value={friendEmail}
                                onChange={(e) => setFriendEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="name@example.com"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowAddFriend(false)}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={isAddingFriend}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                            >
                                {isAddingFriend ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Input Area */}
        {(activeTab === 'global' || selectedUser) && (
            <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder={`Message ${activeTab === 'global' ? '#global' : selectedUser?.displayName}...`}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
                    />
                    <button type="submit" disabled={!inputText.trim()} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                        <Send size={18} />
                    </button>
                </form>
            </div>
        )}
    </div>
  );
};
