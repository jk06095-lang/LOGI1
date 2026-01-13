import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BLData, VesselJob, AppSettings, ChatMessage, ChatUser, CargoSourceType } from '../types';
import { 
    Search, Download, FileText, MessageCircle, Settings, LogOut, 
    Monitor, X, Menu, Filter, ArrowLeft, Send, User as UserIcon, 
    Check, CheckCheck, Grid, List as ListIcon, Ship, Anchor, Box, Home, ExternalLink
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { User } from 'firebase/auth';

interface MobileLayoutProps {
  user: User | null;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onLogout: () => void;
  bls: BLData[];
  jobs: VesselJob[];
}

// Helper Component for Document Row
const DocRow = ({ title, url }: { title: string, url?: string }) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg flex items-center justify-center ${url ? 'bg-white text-emerald-500 shadow-sm border border-slate-100' : 'bg-slate-100 text-slate-300'}`}>
                <FileText size={18} />
            </div>
            <div className="flex flex-col">
                <span className={`text-sm font-bold ${url ? 'text-slate-700' : 'text-slate-400'}`}>{title}</span>
                <span className={`text-[10px] font-medium ${url ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {url ? 'Available' : 'Not Uploaded'}
                </span>
            </div>
        </div>
        {url && (
            <div className="flex gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition-colors"
                    title="Open Document"
                >
                    <ExternalLink size={18} />
                </button>
            </div>
        )}
    </div>
);

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  user, settings, onUpdateSettings, onLogout, bls, jobs
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'docs' | 'chat' | 'menu'>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]); // Dynamic Categories
  const [selectedDoc, setSelectedDoc] = useState<BLData | null>(null);
  
  // Chat State
  const [chatView, setChatView] = useState<'list' | 'room'>('list');
  const [activeChannel, setActiveChannel] = useState<{id: string, name: string, type: 'global' | 'dm'}>({id: 'global', name: 'Global Chat', type: 'global'});

  useEffect(() => {
    const unsub = dataService.subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  // Active Vessels for Home Tab
  const workingJobs = jobs.filter(j => j.status === 'working');
  const incomingJobs = jobs.filter(j => j.status === 'incoming');

  // -- DOCS VIEW LOGIC --
  const filteredDocs = useMemo(() => {
    return bls.filter(bl => {
        const matchesSearch = 
            bl.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
            bl.shipper.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bl.vesselName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = selectedCategory === 'ALL' || (selectedCategory === 'GENERAL' ? (!bl.cargoCategory || bl.cargoCategory === 'GENERAL') : bl.cargoCategory === selectedCategory);
        return matchesSearch && matchesCat;
    }).sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [bls, searchTerm, selectedCategory]);

  const categoryList = useMemo(() => ['ALL', ...categories], [categories]);

  // Determine if bottom navigation should be hidden (when in a chat room)
  // This prevents layout gap issues when keyboard opens in mobile chat
  const shouldHideBottomNav = activeTab === 'chat' && chatView === 'room';

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-hidden">
        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0 z-20 shadow-sm">
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1 text-slate-800">
                LOGI<span className="text-blue-600">1</span> <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1 font-bold">MOBILE</span>
            </h1>
            <div className="flex items-center gap-2">
                {activeTab === 'docs' && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                        {filteredDocs.length}
                    </div>
                )}
                {activeTab === 'chat' && chatView === 'room' && (
                    <button onClick={() => setChatView('list')} className="p-2 bg-slate-100 rounded-full">
                        <ArrowLeft size={18} />
                    </button>
                )}
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative w-full flex flex-col">
            
            {/* HOME TAB */}
            {activeTab === 'home' && (
                <div className="h-full overflow-y-auto p-4 bg-slate-50 custom-scrollbar">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Ship size={20} className="text-blue-600"/> Active Vessels
                    </h2>
                    <div className="space-y-3 pb-20">
                        {workingJobs.concat(incomingJobs).map(job => (
                            <div key={job.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800">{job.vesselName}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${job.status === 'working' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {job.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-2 font-medium">Voy: {job.voyageNo} | ETA: {job.eta}</p>
                                <div className="flex gap-2">
                                     <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold flex items-center gap-1">
                                        <FileText size={10} /> {bls.filter(b => b.vesselJobId === job.id).length} Docs
                                     </span>
                                </div>
                            </div>
                        ))}
                        {workingJobs.length === 0 && incomingJobs.length === 0 && (
                            <p className="text-slate-400 text-center text-sm italic py-4">No active vessels</p>
                        )}
                    </div>
                    
                    {bls.length > 0 && (
                        <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30 mb-6">
                            <h3 className="font-bold text-lg mb-1">Total Cargo</h3>
                            <div className="flex justify-between items-end">
                                <span className="text-3xl font-black">{bls.length}</span>
                                <span className="text-sm opacity-80 mb-1">Documents</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DOCS TAB */}
            {activeTab === 'docs' && (
                <div className="h-full flex flex-col">
                    {/* Search & Filter Bar */}
                    <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search B/L, Shipper, Vessel..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {categoryList.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    {cat.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Grid (Album View) */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {filteredDocs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <Grid size={48} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium">No documents found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 pb-20">
                                {filteredDocs.map(bl => (
                                    <div 
                                        key={bl.id} 
                                        onClick={() => setSelectedDoc(bl)}
                                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden active:scale-95 transition-transform flex flex-col h-48"
                                    >
                                        <div className="h-28 bg-slate-100 relative flex items-center justify-center overflow-hidden">
                                            {/* Simulate Thumbnail if image */}
                                            {bl.fileUrl && (bl.fileUrl.includes('.jpg') || bl.fileUrl.includes('.png')) ? (
                                                <img src={bl.fileUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-slate-300 flex flex-col items-center">
                                                    <FileText size={32} />
                                                    <span className="text-[10px] mt-1 font-bold uppercase">{bl.fileName.split('.').pop()}</span>
                                                </div>
                                            )}
                                            {/* Type Badge */}
                                            <div className="absolute top-2 left-2">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ${
                                                    bl.sourceType === 'FISCO' ? 'bg-blue-500 text-white' : 
                                                    bl.sourceType === 'THIRD_PARTY' ? 'bg-amber-500 text-white' : 'bg-slate-600 text-white'
                                                }`}>
                                                    {bl.sourceType === 'FISCO' ? 'FISCO' : bl.sourceType === 'THIRD_PARTY' ? '3RD' : 'TRNS'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-800 truncate leading-tight mb-0.5">{bl.blNumber}</h3>
                                                <p className="text-[10px] text-slate-500 truncate">{bl.vesselName || 'No Vessel'}</p>
                                            </div>
                                            <div className="flex justify-between items-end mt-2">
                                                <span className="text-[9px] font-mono text-slate-400">{new Date(bl.uploadDate).toLocaleDateString()}</span>
                                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                    {bl.cargoItems.length} Items
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <MobileChatView 
                    user={user} 
                    view={chatView} 
                    setView={setChatView} 
                    activeChannel={activeChannel} 
                    setActiveChannel={setActiveChannel} 
                />
            )}

            {/* MENU TAB */}
            {activeTab === 'menu' && (
                <div className="p-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center mb-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden border-4 border-slate-50">
                            {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover"/> : <UserIcon size={32} className="text-slate-400"/>}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">{user?.displayName || 'Operator'}</h2>
                        <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>

                    <div className="space-y-3">
                         <button 
                            onClick={() => onUpdateSettings({...settings, viewMode: 'pc'})}
                            className="w-full bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 text-slate-700 font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                         >
                             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Monitor size={20}/></div>
                             <div className="text-left flex-1">
                                 <p>Switch to PC Mode</p>
                                 <p className="text-[10px] text-slate-400 font-normal">Use desktop dashboard view</p>
                             </div>
                         </button>

                         <button 
                            onClick={onLogout}
                            className="w-full bg-white border border-red-100 p-4 rounded-xl flex items-center gap-4 text-red-600 font-bold hover:bg-red-50 active:scale-95 transition-all shadow-sm"
                         >
                             <div className="p-2 bg-red-50 text-red-500 rounded-lg"><LogOut size={20}/></div>
                             <div className="text-left flex-1">
                                 <p>Sign Out</p>
                             </div>
                         </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-300 font-bold tracking-widest uppercase">LOGI1 Mobile v1.4</p>
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Navigation - Hidden when inside a specific Chat Room to avoid keyboard gaps */}
        {!shouldHideBottomNav && (
            <div className="min-h-[4rem] bg-white border-t border-slate-200 flex items-center justify-around pb-[env(safe-area-inset-bottom)] z-30 flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                <button 
                    onClick={() => setActiveTab('docs')}
                    className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'docs' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <Grid size={22} strokeWidth={activeTab === 'docs' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Docs</span>
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <MessageCircle size={22} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Chat</span>
                </button>
                <button 
                    onClick={() => setActiveTab('menu')}
                    className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'menu' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <Settings size={22} strokeWidth={activeTab === 'menu' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Menu</span>
                </button>
            </div>
        )}

        {/* Document Detail Overlay (Read Only) */}
        {selectedDoc && (
            <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
                {/* Header */}
                <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
                    <button onClick={() => setSelectedDoc(null)} className="p-2 -ml-2 text-slate-500">
                        <X size={24} />
                    </button>
                    <h2 className="font-bold text-slate-800 truncate max-w-[200px]">{selectedDoc.blNumber}</h2>
                    <div className="w-10"></div> {/* Placeholder to keep title centered */}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-10">
                    {/* Attached Documents List - Moved to top as the primary interaction area */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText size={14} /> Attached Documents
                        </h3>
                        <div className="space-y-3">
                            <DocRow title="Bill of Lading" url={selectedDoc.fileUrl} />
                            <DocRow title="Arrival Notice" url={selectedDoc.arrivalNotice?.fileUrl} />
                            <DocRow title="Commercial Invoice" url={selectedDoc.commercialInvoice?.fileUrl} />
                            <DocRow title="Packing List" url={selectedDoc.packingList?.fileUrl} />
                            <DocRow title="Manifest" url={selectedDoc.manifest?.fileUrl} />
                            <DocRow title="Export Declaration" url={selectedDoc.exportDeclaration?.fileUrl} />
                        </div>
                    </div>

                    {/* Metadata Cards */}
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Basic Info</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 text-xs">Vessel</p>
                                    <p className="font-bold text-slate-800">{selectedDoc.vesselName || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Category</p>
                                    <p className="font-bold text-slate-800">{selectedDoc.cargoCategory || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Shipper</p>
                                    <p className="font-bold text-slate-800">{selectedDoc.shipper || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Consignee</p>
                                    <p className="font-bold text-slate-800">{selectedDoc.consignee || '-'}</p>
                                </div>
                            </div>
                        </div>

                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cargo Items</h3>
                            <div className="divide-y divide-slate-100">
                                {selectedDoc.cargoItems.map((item, i) => (
                                    <div key={i} className="py-2 first:pt-0 last:pb-0">
                                        <p className="font-bold text-sm text-slate-800">{item.description}</p>
                                        <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                            <span>Qty: <b className="text-slate-700">{item.quantity}</b></span>
                                            <span>Weight: <b className="text-slate-700">{item.grossWeight} kg</b></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

// --- Mobile Chat Sub-Component ---

interface MobileChatViewProps {
    user: User | null;
    view: 'list' | 'room';
    setView: (v: 'list' | 'room') => void;
    activeChannel: {id: string, name: string, type: 'global' | 'dm'};
    setActiveChannel: (c: {id: string, name: string, type: 'global' | 'dm'}) => void;
}

const MobileChatView: React.FC<MobileChatViewProps> = ({ user, view, setView, activeChannel, setActiveChannel }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [unreadChannels, setUnreadChannels] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null); // Ref for input focus

    // Subscribe Users
    useEffect(() => {
        const unsub = dataService.subscribeChatUsers(setUsers);
        return () => unsub();
    }, []);

    // Subscribe Unread Channels
    useEffect(() => {
        if (!user) return;
        const unsub = dataService.subscribeUnreadChannels(user.uid, setUnreadChannels);
        return () => unsub();
    }, [user?.uid]);

    // Subscribe Messages & Typing
    useEffect(() => {
        if (view !== 'room' || !activeChannel.id) return;
        
        const unsubMsg = dataService.subscribeChatMessages(activeChannel.id, (msgs) => {
            setMessages(msgs);
            // Mark visible messages as read when channel is active
            if (user) {
                msgs.forEach(msg => {
                    if (msg.senderId !== user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))) {
                        dataService.markMessageRead(msg.id, user.uid);
                    }
                });
            }
        });
        
        // Typing Subscription
        const unsubTyping = dataService.subscribeTyping(activeChannel.id, (u) => {
            if (user) {
                setTypingUsers(u.filter(name => name !== user.displayName));
            }
        });

        return () => { unsubMsg(); unsubTyping(); };
    }, [view, activeChannel.id, user?.displayName, user?.uid]);

    // Auto Scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, view, typingUsers]);

    const handleInputFocus = () => {
        if (!user || !activeChannel.id) return;
        dataService.sendTypingStatus(activeChannel.id, {
            uid: user.uid,
            displayName: user.displayName || 'User'
        });
        
        // Ensure scroll to bottom on focus (keyboard opening)
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 300);
    };

    const handleInputBlur = () => {
        if (!user || !activeChannel.id) return;
        dataService.clearTypingStatus(activeChannel.id, user.uid);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        if (user && activeChannel.id) {
            dataService.sendTypingStatus(activeChannel.id, {
                uid: user.uid,
                displayName: user.displayName || 'User'
            });
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent form reload and keyboard hiding
        if (!inputText.trim() || !user) return;
        
        if (activeChannel.id) {
            dataService.clearTypingStatus(activeChannel.id, user.uid);
        }

        const msg: any = {
            text: inputText.trim(),
            senderId: user.uid,
            senderName: user.displayName || 'User',
            senderPhoto: user.photoURL || '',
            timestamp: Date.now(),
            channelId: activeChannel.id,
            readBy: [user.uid],
            pending: false
        };
        
        setInputText('');
        
        // Keep focus to maintain keyboard
        inputRef.current?.focus();
        
        await dataService.sendChatMessage(msg);
    };

    const openDM = (targetUser: ChatUser) => {
        if (!user) return;
        const channelId = [user.uid, targetUser.uid].sort().join('_');
        setActiveChannel({ id: channelId, name: targetUser.displayName, type: 'dm' });
        setView('room');
    };

    // Check if user has unread messages
    const hasUnread = (targetUid: string) => {
        if (!user) return false;
        const dmChannelId = [user.uid, targetUid].sort().join('_');
        return unreadChannels.includes(dmChannelId);
    };

    if (view === 'list') {
        return (
            <div className="h-full overflow-y-auto custom-scrollbar p-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Channels</h2>
                
                {/* Global Channel Card */}
                <div 
                    onClick={() => { setActiveChannel({id: 'global', name: 'Global Chat', type: 'global'}); setView('room'); }}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 mb-6 cursor-pointer active:scale-95 transition-transform relative"
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Global Team Chat</h3>
                        <p className="text-xs text-slate-500">General discussion channel</p>
                    </div>
                    {/* Unread Indicator for Global Chat */}
                    {unreadChannels.includes('global') && (
                        <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                </div>

                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Direct Messages</h2>
                <div className="space-y-2">
                    {users.filter(u => u.uid !== user?.uid).map(u => (
                        <div 
                            key={u.uid} 
                            onClick={() => openDM(u)}
                            className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer active:bg-slate-50"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
                                    {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400" />}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                    u.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}></div>
                                
                                {/* Red Notification Dot */}
                                {hasUnread(u.uid) && (
                                    <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-800">{u.displayName}</h3>
                                <p className="text-[10px] text-slate-500">{u.status === 'online' ? 'Online' : 'Offline'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Chat Room View
    return (
        <div className="flex flex-col h-full bg-slate-100">
            <div className="bg-white border-b border-slate-200 p-3 flex justify-center shadow-sm flex-shrink-0">
                <span className="font-bold text-sm text-slate-800">{activeChannel.name}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div key={idx} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isMe && (
                                <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden flex-shrink-0">
                                    {msg.senderPhoto ? <img src={msg.senderPhoto} /> : <UserIcon className="p-1.5 text-slate-500" />}
                                </div>
                            )}
                            <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm'}`}>
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 px-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                     <div className="flex gap-2 animate-fade-in">
                         <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                             <div className="flex gap-0.5">
                                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                             </div>
                         </div>
                         <span className="text-[10px] text-slate-400 self-center">
                            {typingUsers.join(', ')} typing...
                         </span>
                     </div>
                )}
            </div>

            {/* Input Bar - Positioned with safe-area support */}
            <div className="p-3 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] flex-shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                        ref={inputRef}
                        className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                    />
                    <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white disabled:opacity-50">
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};