
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, X, User as UserIcon, MessageCircle, ChevronLeft, Check, CheckCheck, Download, UserPlus, Plus } from 'lucide-react';
import { auth } from '../lib/firebase';
import { dataService } from '../services/dataService';
import { ChatMessage, ChatUser } from '../types';
import saveAs from 'file-saver';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarWidth: number;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, sidebarWidth }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'dm'>('global');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadChannels, setUnreadChannels] = useState<string[]>([]);
  
  // Add Friend State
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const currentUser = auth.currentUser;

  // Stable Channel ID calculation
  const channelId = useMemo(() => {
    if (activeTab === 'global') return 'global';
    if (selectedUser && currentUser) {
        return [currentUser.uid, selectedUser.uid].sort().join('_');
    }
    return null;
  }, [activeTab, selectedUser, currentUser?.uid]);

  // Subscribe to Unread Channels
  useEffect(() => {
     if (!currentUser) return;
     const unsub = dataService.subscribeUnreadChannels(currentUser.uid, setUnreadChannels);
     return () => unsub();
  }, [currentUser]);

  // Optimized Mark Read Logic: Filter currently loaded messages and mark read if needed
  useEffect(() => {
     if (!isOpen || !channelId || !currentUser || messages.length === 0) return;
     
     // Find messages in the current view that I haven't marked as read
     const unreadIds = messages
        .filter(msg => msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid)))
        .map(msg => msg.id);

     if (unreadIds.length > 0) {
         // Debounce or just call it. Since we filter by 'loaded' messages, this is efficient.
         // dataService.markMessagesAsRead handles batching.
         dataService.markMessagesAsRead(unreadIds, currentUser.uid);
     }
  }, [isOpen, channelId, messages, currentUser]);

  // Subscribe to Messages
  useEffect(() => {
      if (!isOpen || !channelId) return;
      
      const unsub = dataService.subscribeChatMessages(channelId, (newMessages) => {
          setMessages(newMessages);
          
          // Auto-scroll on new message
          if (scrollRef.current) {
             setTimeout(() => {
                 if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
             }, 100);
          }
      });
      return () => unsub();
  }, [isOpen, channelId]);

  // Subscribe to Users List
  useEffect(() => {
      if (!isOpen) return;
      const unsub = dataService.subscribeChatUsers(setUsers);
      return () => unsub();
  }, [isOpen]);

  // Subscribe to Typing Status
  useEffect(() => {
      if (!isOpen || !channelId || !currentUser) return;
      const unsub = dataService.subscribeTyping(channelId, (u) => {
          setTypingUsers(u.filter(name => name !== currentUser.displayName));
      });
      return () => unsub();
  }, [isOpen, channelId, currentUser?.uid]);

  // Auto-scroll on tab change
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [activeTab, selectedUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputText(val);
      
      if (!currentUser || !channelId) return;

      if (val.trim() === '') {
          dataService.clearTypingStatus(channelId, currentUser.uid);
          return;
      }

      // Send Typing Heartbeat
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      dataService.sendTypingStatus(channelId, { 
          uid: currentUser.uid, 
          displayName: currentUser.displayName || 'User' 
      });
  };

  const handleInputFocus = () => {
      if (!currentUser || !channelId) return;
      // Trigger typing status immediately on focus
      dataService.sendTypingStatus(channelId, { 
          uid: currentUser.uid, 
          displayName: currentUser.displayName || 'User' 
      });
  };

  const handleInputBlur = () => {
      if (!currentUser || !channelId) return;
      dataService.clearTypingStatus(channelId, currentUser.uid);
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || !currentUser || !channelId) return;

      // Clear typing status immediately
      dataService.clearTypingStatus(channelId, currentUser.uid);

      const text = inputText.trim();
      setInputText(''); // Clear immediately for speed

      // Optimistic Update
      const tempId = 'temp-' + Date.now();
      const optimisticMsg: ChatMessage = {
          id: tempId,
          text: text,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'User',
          senderPhoto: currentUser.photoURL || '',
          timestamp: Date.now(),
          channelId: channelId,
          readBy: [currentUser.uid],
          pending: true
      };

      setMessages(prev => [...prev, optimisticMsg]);
      
      // Scroll to bottom immediately
      if (scrollRef.current) {
          setTimeout(() => {
             if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 50);
      }

      await dataService.sendChatMessage(optimisticMsg);
  };

  const handleUserSelect = (user: ChatUser) => {
      if (user.uid === currentUser?.uid) return;
      setSelectedUser(user);
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

  // Filter Friends Only
  const myFriends = useMemo(() => {
      if (!currentUser || users.length === 0) return [];
      
      // Find current user object to get contacts list
      const me = users.find(u => u.uid === currentUser.uid);
      if (!me || !me.contacts) return [];

      return users.filter(u => me.contacts?.includes(u.uid));
  }, [users, currentUser]);

  const handleAddFriend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!friendEmail.trim() || !currentUser) return;

      setIsAddingFriend(true);
      try {
          await dataService.addContactByEmail(currentUser.uid, friendEmail.trim());
          setFriendEmail('');
          setShowAddFriend(false);
          alert("Friend added successfully!");
      } catch (error: any) {
          alert(error.message);
      } finally {
          setIsAddingFriend(false);
      }
  };

  // Unread Checks
  const hasGlobalUnread = unreadChannels.includes('global');
  const hasDmUnread = unreadChannels.some(cid => cid !== 'global');

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
                        onClick={() => setActiveTab('global')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'global' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Global
                        {hasGlobalUnread && <span className="absolute top-0 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('dm')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'dm' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Direct Messages
                        {hasDmUnread && <span className="absolute top-0 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
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
                         <p className="text-[10px] text-slate-500">{selectedUser.email}</p>
                     </div>
                 </div>
             )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 dark:bg-slate-900/50 relative p-4" ref={scrollRef}>
             
             {(activeTab === 'global' || selectedUser) && (
                 <div className="space-y-4 pb-4">
                     {messages.length === 0 ? (
                         <div className="text-center text-slate-400 text-sm mt-10 italic">No messages yet. Say hello!</div>
                     ) : (
                         messages.map((msg, index) => {
                             const isMe = msg.senderId === currentUser?.uid;
                             // Check if read by others (excluding self)
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
                                             {isMe && !msg.pending && (
                                                <span className={`ml-1 ${isRead ? 'text-blue-500' : 'text-slate-300'}`}>
                                                    {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                                                </span>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             );
                         })
                     )}

                     {/* Typing Indicator Bubble */}
                     {typingUsers.length > 0 && (
                         <div className="flex gap-2">
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
             )}

             {activeTab === 'dm' && !selectedUser && (
                 <div className="space-y-4">
                     <button 
                        onClick={() => setShowAddFriend(true)}
                        className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                     >
                        <UserPlus size={18} /> Add Friend (친구 추가)
                     </button>

                     {myFriends.length === 0 ? (
                         <div className="text-center text-slate-400 text-sm italic mt-10">
                            No friends added yet.<br/>Click above to add contacts by email.
                         </div>
                     ) : (
                        <div className="space-y-1">
                            {myFriends.map(user => {
                                const dmChannelId = [currentUser?.uid, user.uid].sort().join('_');
                                const hasUnread = unreadChannels.includes(dmChannelId);

                                return (
                                <div 
                                    key={user.uid} 
                                    onClick={() => handleUserSelect(user)}
                                    className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors relative"
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                            {user.photoURL ? <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400"/>}
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                                            user.status === 'away' ? 'bg-amber-500' : 
                                            user.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                                        }`}></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate flex items-center gap-2">
                                            {user.displayName}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                    {hasUnread && <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>}
                                    <ChevronLeft size={16} className="text-slate-300 rotate-180" />
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
