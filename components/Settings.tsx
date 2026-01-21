
import React, { useRef, useState } from 'react';
import { Moon, Sun, Monitor, Globe, Type, LogOut, Upload, Image as ImageIcon, X, Database, Download, Trash2, AlertTriangle, CheckCircle, Loader2, Settings as SettingsIcon, MessageSquare, Calendar } from 'lucide-react';
import { AppSettings, Language, Theme, FontSize, FontStyle, BLData, VesselJob } from '../types';
import { User } from 'firebase/auth';
import { dataService } from '../services/dataService';
import { chatService } from '../services/chatService';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  user?: User | null;
  onLogout?: () => void;
  bls?: BLData[];
  jobs?: VesselJob[];
  onDeleteBLs?: (ids: string[]) => Promise<void>;
}

const translations = {
  ko: {
    title: '환경 설정',
    desc: '언어, 테마, 데이터 백업 등의 설정을 관리합니다.',
    syncActive: '클라우드 동기화 활성',
    logout: '로그아웃',
    themeTitle: '테마 설정',
    themeLight: '라이트 (Light)',
    themeDark: '다크 (Dark)',
    fontTitle: '글꼴 크기 설정',
    fontDesc: 'UI 텍스트 크기를 조절합니다.',
    fontStyleTitle: '글꼴 스타일',
    viewModeTitle: '화면 보기 모드',
    langTitle: '언어 (Language)',
    dataTitle: '데이터 관리 및 백업',
    dataDesc: 'B/L 문서는 3개월간 저장되며, 이후 자동 삭제 대상이 됩니다.',
    backupBtn: '전체 문서 백업 (ZIP)',
    deleteBtn: '만료된 파일 삭제',
    retentionPolicy: '3개월 보관 정책',
    expiredCount: '{count}개의 파일이 만료됨 (3개월 경과)',
    safeCount: '{count}개의 파일 보관 중',
    backupLoading: '다운로드 중... ({current}/{total})',
    deleteConfirm: '정말 만료된 파일을 삭제하시겠습니까? 복구할 수 없습니다.',
    noExpired: '만료된 파일이 없습니다.',
    backupTip: '선박별로 폴더가 정리되어 다운로드됩니다.',
    chatBackupTitle: '채팅 기록 관리',
    chatBackupDesc: '월별 채팅 기록을 다운로드하거나 오래된 대화를 삭제합니다.',
    chatRetention: '1년 보관 정책',
    downloadChat: '채팅 백업',
    globalChat: '글로벌 채팅 (Global)',
    dmChat: '내 DM 전체 (All DMs)',
    selectMonth: '날짜 선택',
    deleteOldChats: '1년 이상 된 대화 삭제',
    deleting: '삭제 중...',
    deleteChatConfirm: '1년 이상 지난 채팅 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    noChatsFound: '해당 기간의 채팅 기록이 없습니다.'
  },
  en: {
    title: 'Settings',
    desc: 'Manage settings including language, theme, and data backup.',
    syncActive: 'CLOUD SYNC ACTIVE',
    logout: 'Log Out',
    themeTitle: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    fontTitle: 'Font Size',
    fontDesc: 'Scale UI text size.',
    fontStyleTitle: 'Font Style',
    viewModeTitle: 'View Mode',
    langTitle: 'Language',
    dataTitle: 'Data Management',
    dataDesc: 'Documents are stored for 3 months, then subject to auto-deletion.',
    backupBtn: 'Backup All Docs (ZIP)',
    deleteBtn: 'Delete Expired Files',
    retentionPolicy: '3-Month Retention Policy',
    expiredCount: '{count} files expired (> 3 months)',
    safeCount: '{count} active files',
    backupLoading: 'Processing... ({current}/{total})',
    deleteConfirm: 'Are you sure? Deleted files cannot be recovered.',
    noExpired: 'No expired files.',
    backupTip: 'Files will be organized by Vessel Name.',
    chatBackupTitle: 'Chat History & Backup',
    chatBackupDesc: 'Download monthly chat logs or clean up old messages.',
    chatRetention: '1-Year Retention Policy',
    downloadChat: 'Download Chat Log',
    globalChat: 'Global Chat',
    dmChat: 'My DMs (All)',
    selectMonth: 'Select Date',
    deleteOldChats: 'Delete Chats > 1 Year',
    deleting: 'Deleting...',
    deleteChatConfirm: 'Delete messages older than 1 year? This cannot be undone.',
    noChatsFound: 'No chat history found for this period.'
  },
  cn: {
    title: '系统设置',
    desc: '系统设置：语言、主题风格及数据备份。',
    syncActive: '云同步已激活',
    logout: '退出登录',
    themeTitle: '界面主题',
    themeLight: '亮色',
    themeDark: '深色',
    fontTitle: '字体大小',
    fontDesc: '缩放界面字体大小。',
    fontStyleTitle: '字体样式',
    viewModeTitle: '视图模式',
    langTitle: '语言设置',
    dataTitle: '数据管理',
    dataDesc: '文档保存3个月，之后将自动删除。',
    backupBtn: '全量文档备份 (ZIP下载)',
    deleteBtn: '删除过期文件',
    retentionPolicy: '3个月保留政策',
    expiredCount: '{count} 个文件过期',
    safeCount: '{count} 个文件正常',
    backupLoading: '处理中... ({current}/{total})',
    deleteConfirm: '确定要删除吗？文件删除后无法恢复。',
    noExpired: '无过期文件。',
    backupTip: '文件将按船名自动分类下载。',
    chatBackupTitle: '聊天记录管理',
    chatBackupDesc: '下载每月聊天记录或清理旧对话。',
    chatRetention: '1年保留政策',
    downloadChat: '下载聊天记录',
    globalChat: '全局聊天 (Global)',
    dmChat: '我的私信 (DMs)',
    selectMonth: '选择日期',
    deleteOldChats: '删除1年前的对话',
    deleting: '删除中...',
    deleteChatConfirm: '确定要删除1年前的聊天记录吗？无法恢复。',
    noChatsFound: '此时段无聊天记录。'
  }
};

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, user, onLogout, bls = [], jobs = [], onDeleteBLs }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[settings.language];
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Chat Export State
  const [chatExportDate, setChatExportDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [chatExportType, setChatExportType] = useState<'global' | 'dm'>('global');
  const [isChatExporting, setIsChatExporting] = useState(false);
  const [isChatDeleting, setIsChatDeleting] = useState(false);

  // Expiration Logic
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const expiredFiles = bls.filter(b => new Date(b.uploadDate) < threeMonthsAgo);
  const activeFiles = bls.filter(b => new Date(b.uploadDate) >= threeMonthsAgo);

  const update = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleLogout = () => {
      dataService.clearCache(); // Security: clear data before logging out
      if (onLogout) onLogout();
  };

  const handleBackup = async () => {
    const validBLs = bls.filter(b => b.fileUrl);
    if (validBLs.length === 0) {
      alert("백업할 파일이 없습니다.");
      return;
    }
    
    setIsZipping(true);
    setZipProgress({ current: 0, total: validBLs.length });

    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;
    const errorLog: string[] = [];

    // Add info file
    zip.file("backup_info.txt", `LOGI1 Backup\nDate: ${new Date().toLocaleString()}\nTotal Documents: ${validBLs.length}\nUser: ${user?.email || 'Guest'}`);

    try {
      // Group files by Vessel
      for (let i = 0; i < validBLs.length; i++) {
         const bl = validBLs[i];
         // Update UI
         setZipProgress({ current: i + 1, total: validBLs.length });

         if (!bl.fileUrl) continue;

         try {
           const response = await fetch(bl.fileUrl, { 
             method: 'GET',
             mode: 'cors', 
             cache: 'no-store',
             headers: { 'Accept': '*/*' }
           });

           if (!response.ok) throw new Error(`HTTP ${response.status}`);
           
           const blob = await response.blob();
           
           // Robust Naming
           let folderName = 'Unassigned';
           if (bl.vesselName && bl.vesselName.trim().length > 0) {
              folderName = bl.vesselName.trim().replace(/[/\\?%*:|"<>]/g, '_');
           }
           
           let ext = 'pdf'; // default
           if (blob.type === 'image/jpeg') ext = 'jpg';
           else if (blob.type === 'image/png') ext = 'png';
           else if (blob.type === 'application/pdf') ext = 'pdf';
           else {
             const parts = bl.fileName.split('.');
             if (parts.length > 1) ext = parts.pop() || 'dat';
           }

           const safeBLNumber = (bl.blNumber || `Doc_${i}`).trim().replace(/[/\\?%*:|"<>]/g, '_');
           const fileName = `${safeBLNumber}.${ext}`;
           
           zip.folder(folderName)?.file(fileName, blob);
           successCount++;

         } catch (e: any) {
           console.error(`Failed to download ${bl.fileName}`, e);
           failCount++;
           const isCorsError = e.message === 'Failed to fetch' || e.name === 'TypeError';
           const errorMsg = isCorsError ? "CORS Error (Check Firebase Console)" : e.message;
           errorLog.push(`[FAILED] ${bl.blNumber}: ${errorMsg} | URL: ${bl.fileUrl}`);
         }
      }

      if (failCount > 0) {
        zip.file("error_log.txt", errorLog.join("\n"));
        alert(`${successCount} files success.\n${failCount} files failed (Check error_log.txt).`);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const dateStr = new Date().toISOString().split('T')[0];
      saveAs(content, `LOGI1_Backup_${dateStr}.zip`);

    } catch (error) {
      console.error("Backup failed", error);
      alert("Error creating backup.");
    } finally {
      setIsZipping(false);
      setZipProgress({ current: 0, total: 0 });
    }
  };

  const handleCleanup = async () => {
    if (expiredFiles.length === 0) {
      alert(t.noExpired);
      return;
    }
    
    if (window.confirm(t.deleteConfirm)) {
      setIsDeleting(true);
      try {
        const ids = expiredFiles.map(f => f.id);
        if (onDeleteBLs) await onDeleteBLs(ids);
      } catch(e) {
        console.error(e);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleChatExport = async () => {
      if (!user) return;
      setIsChatExporting(true);
      
      const [year, month] = chatExportDate.split('-').map(Number);
      const start = new Date(year, month - 1, 1).getTime();
      const end = new Date(year, month, 0, 23, 59, 59).getTime();

      try {
          const messages = await chatService.getMessagesInTimeRange(start, end);
          
          // Filter based on type
          const filtered = messages.filter(msg => {
              if (chatExportType === 'global') return msg.channelId === 'global';
              // For DM: Include if I am sender OR I am a participant (in channelId or readBy, but robust check is tough)
              // Assumption: DM Channel ID format is uid1_uid2 (sorted). 
              // Security: We filter client side.
              if (msg.channelId === 'global') return false;
              const participants = msg.channelId.split('_');
              return participants.includes(user.uid);
          });

          if (filtered.length === 0) {
              alert(t.noChatsFound);
              setIsChatExporting(false);
              return;
          }

          if (chatExportType === 'global') {
              // Simple JSON download
              const blob = new Blob([JSON.stringify(filtered, null, 2)], {type: "application/json"});
              saveAs(blob, `Global_Chat_${chatExportDate}.json`);
          } else {
              // Group by Chat Partner for DMs and ZIP
              const zip = new JSZip();
              const groups: Record<string, typeof filtered> = {};
              
              filtered.forEach(msg => {
                  let partnerId = 'unknown';
                  const parts = msg.channelId.split('_');
                  if (parts.length === 2) {
                      partnerId = parts[0] === user.uid ? parts[1] : parts[0];
                  }
                  if (!groups[partnerId]) groups[partnerId] = [];
                  groups[partnerId].push(msg);
              });

              Object.keys(groups).forEach(partnerId => {
                 zip.file(`DM_${partnerId}.json`, JSON.stringify(groups[partnerId], null, 2));
              });

              const content = await zip.generateAsync({ type: "blob" });
              saveAs(content, `My_DMs_${chatExportDate}.zip`);
          }

      } catch (e) {
          console.error("Chat Export Error", e);
          alert("Failed to export chat history.");
      } finally {
          setIsChatExporting(false);
      }
  };

  const handleDeleteOldChats = async () => {
      if (window.confirm(t.deleteChatConfirm)) {
          setIsChatDeleting(true);
          try {
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
              
              // Recursive deletion via service logic is implicit, here we call service
              let deletedCount = 0;
              let batchCount = 0;
              do {
                  batchCount = await chatService.deleteOldChatMessages(oneYearAgo.getTime());
                  deletedCount += batchCount;
              } while (batchCount >= 400); // 400 matches batch limit in service

              alert(`Deleted ${deletedCount} old messages.`);
          } catch(e) {
              console.error(e);
              alert("Error deleting messages.");
          } finally {
              setIsChatDeleting(false);
          }
      }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 animate-fade-in dark:text-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SettingsIcon className="w-7 h-7 text-blue-600" /> {t.title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {t.desc}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors"
            >
              <LogOut size={16} />
              {t.logout}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Row 1: Theme & Font Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">
                  {t.themeTitle}
                </h3>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button 
                  onClick={() => update('theme', 'light')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${settings.theme === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600'}`}
                >
                  {t.themeLight}
                </button>
                <button 
                  onClick={() => update('theme', 'dark')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${settings.theme === 'dark' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600'}`}
                >
                  {t.themeDark}
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Type size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    {t.fontTitle}
                  </h3>
                  <p className="text-xs text-slate-400">{t.fontDesc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 p-1 rounded-lg mb-2">
                {(['small', 'medium', 'large', 'xl'] as FontSize[]).map(size => (
                  <button 
                    key={size}
                    onClick={() => update('fontSize', size)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${settings.fontSize === size ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Font Style */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Type size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    {t.fontStyleTitle}
                  </h3>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'sans', name: 'Standard (Sans)', font: 'font-sans' },
                  { id: 'serif', name: 'Classic (Serif)', font: 'font-serif' },
                  { id: 'mono', name: 'Technical (Mono)', font: 'font-mono' }
                ].map((style) => (
                  <div 
                    key={style.id}
                    onClick={() => update('fontStyle', style.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${settings.fontStyle === style.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                  >
                    <h4 className={`font-bold mb-2 text-sm ${settings.fontStyle === style.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'} ${style.font}`}>{style.name}</h4>
                    <p className={`text-xs text-slate-500 dark:text-slate-400 mb-1 ${style.font}`}>The quick brown fox jumps over the lazy dog.</p>
                    <p className={`text-xs text-slate-500 dark:text-slate-400 ${style.font}`}>1234567890</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Row 3: View Mode & Language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">
                      {t.viewModeTitle}
                    </h3>
                  </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => update('viewMode', 'mobile')}
                  className={`flex-1 py-3 border rounded-lg text-sm transition-colors ${settings.viewMode === 'mobile' ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                >
                  Mobile
                </button>
                <button 
                  onClick={() => update('viewMode', 'pc')}
                  className={`flex-1 py-3 border rounded-lg text-sm transition-colors ${settings.viewMode === 'pc' ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                >
                  PC / Tablet
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Globe size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    {t.langTitle}
                  </h3>
              </div>
              <div className="relative">
                <select 
                  value={settings.language}
                  onChange={(e) => update('language', e.target.value as Language)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-600 focus:border-blue-500"
                >
                  <option value="ko">KR 한국어 (Korean)</option>
                  <option value="en">EN English</option>
                  <option value="cn">CN 中文 (Chinese)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat Backup Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <MessageSquare size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    {t.chatBackupTitle}
                  </h3>
                  <p className="text-xs text-slate-400">{t.chatBackupDesc}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-600">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Download size={12}/> {t.downloadChat}
                     </h4>
                     <div className="flex flex-col gap-3">
                         <div className="flex gap-2">
                             <input 
                                type="month" 
                                value={chatExportDate}
                                onChange={(e) => setChatExportDate(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm font-medium"
                             />
                             <select 
                                value={chatExportType}
                                onChange={(e) => setChatExportType(e.target.value as 'global' | 'dm')}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm font-medium"
                             >
                                 <option value="global">{t.globalChat}</option>
                                 <option value="dm">{t.dmChat}</option>
                             </select>
                         </div>
                         <button 
                             onClick={handleChatExport}
                             disabled={isChatExporting}
                             className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                         >
                             {isChatExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                             {t.downloadChat}
                         </button>
                     </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-600">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Calendar size={12}/> {t.chatRetention}
                     </h4>
                     <p className="text-xs text-slate-400 mb-4">
                         Chat messages older than 1 year can be permanently deleted to save space and maintain privacy.
                     </p>
                     <button 
                         onClick={handleDeleteOldChats}
                         disabled={isChatDeleting}
                         className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                     >
                         {isChatDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                         {isChatDeleting ? t.deleting : t.deleteOldChats}
                     </button>
                 </div>
            </div>
          </div>
          
          {/* Data Management Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
             
             <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Database size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    {t.dataTitle}
                  </h3>
                  <p className="text-xs text-slate-400">{t.dataDesc}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
               {/* Status Visualization */}
               <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-600">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t.retentionPolicy}</h4>
                  
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-full h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(activeFiles.length / Math.max(1, bls.length)) * 100}%` }} className="bg-emerald-500 h-full"></div>
                        <div style={{ width: `${(expiredFiles.length / Math.max(1, bls.length)) * 100}%` }} className="bg-red-500 h-full"></div>
                     </div>
                  </div>
                  
                  <div className="flex justify-between text-xs mt-3">
                     <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle size={12} />
                        {t.safeCount.replace('{count}', activeFiles.length.toString())}
                     </div>
                     <div className="flex items-center gap-1.5 text-red-500 font-bold">
                        <AlertTriangle size={12} />
                        {t.expiredCount.replace('{count}', expiredFiles.length.toString())}
                     </div>
                  </div>
               </div>

               {/* Actions */}
               <div className="flex flex-col gap-3 justify-center">
                  <button 
                    onClick={handleBackup}
                    disabled={isZipping || bls.length === 0}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isZipping ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                     {isZipping 
                       ? t.backupLoading.replace('{current}', zipProgress.current.toString()).replace('{total}', zipProgress.total.toString()) 
                       : t.backupBtn}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">{t.backupTip}</p>

                  {expiredFiles.length > 0 && (
                    <button 
                      onClick={handleCleanup}
                      disabled={isDeleting}
                      className="flex items-center justify-center gap-2 w-full py-3 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all mt-1"
                    >
                      {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                      {t.deleteBtn}
                    </button>
                  )}
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};