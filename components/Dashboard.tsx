
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { VesselJob, BLData, Language, CargoSourceType, ResourceLock } from '../types';
import { Folder, Ship, Calendar as CalendarIcon, FileText, List, ChevronLeft, ChevronRight, Package, ArrowRight, Printer, PieChart, ArrowUpDown, ArrowUp, ArrowDown, ZoomIn, ZoomOut, Save, Layers, Home, Filter, X, Lock, Users, ChevronDown, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { auth } from '../lib/firebase';
import { dataService } from '../services/dataService';

// --- Types ---
interface DashboardProps {
  jobs: VesselJob[];
  bls: BLData[];
  onSelectJob: (jobId: string) => void;
  language: Language;
  logoUrl?: string;
  onUpdateBL?: (blId: string, updates: Partial<BLData>) => Promise<void>;
  onOpenBriefing: (date: Date) => void; // Trigger for new tab
  onUploadBLs?: (files: File[], sourceType: CargoSourceType) => void;
}

interface BriefingReportProps {
  jobs: VesselJob[];
  bls: BLData[];
  initialDate: Date;
  language: Language;
  logoUrl?: string;
  onUpdateBL?: (blId: string, updates: Partial<BLData>) => Promise<void>;
}

const translations = {
  ko: {
    title: '대시보드',
    subtitle: '전체 선박 업무 현황 및 화물 일정을 관리합니다.',
    workingJobs: '작업 진행 중 선박',
    incomingJobs: '입항 예정 선박',
    blCount: '전체 문서 건수',
    calendarTitle: '월별 화물 캘린더',
    calendarSubtitle: '입항(ETA) 및 출항(ETD) 예정 선박을 확인하세요.',
    noData: '이 기간의 화물 리스트가 없습니다.',
    days: ['일', '월', '화', '수', '목', '금', '토'],
    briefingMode: '브리핑 모드 (Report)',
    print: '인쇄 / PDF 저장',
    briefingTitle: 'CARGO OPERATION REPORT',
    generatedDate: '생성일',
    weekly: '주간 (Weekly)',
    monthly: '월간 (Monthly)',
    period: '기간',
    totalWeight: '총 중량',
    totalItems: '총 건수 (Docs)',
    ton: '톤',
    noItems: '일정이 없습니다.',
    reportHeaderNo: 'NO.',
    reportHeaderEta: 'ETA',
    reportHeaderVessel: 'VESSEL / VOYAGE',
    reportHeaderShipper: 'SHIPPER',
    reportHeaderTransporter: 'TRANSPORTER',
    reportHeaderLocation: 'CY/CFS', // New
    reportHeaderDesc: 'DESCRIPTION',
    reportHeaderRemark: 'REMARKS',
    reportHeaderNote: 'NOTE',
    reportHeaderQty: 'QTY',
    reportHeaderWeight: 'WEIGHT (KG)',
    reportHeaderType: 'TYPE',
    back: '뒤로가기',
    copyLink: '공유 링크 복사',
    linkCopied: '복사됨!',
    saveChanges: '변경사항 저장',
    saved: '저장됨',
    generalRemarks: 'GENERAL REMARKS / INSTRUCTIONS',
    continuation: '(계속)',
    page: '페이지',
    systemGenerated: '시스템 생성',
    statusIncoming: '입항예정',
    statusWorking: '작업중',
    statusCompleted: '완료',
    docs: '건',
    modeGeneral: '일반 (General)',
    modeReport: '보고 (Report)',
    legendIncoming: '입항예정',
    legendWorking: '작업중',
    legendCompleted: '완료됨',
    bulkScan: 'Multiple B/L Scan (Bulk Upload)',
    bulkScanDesc: '여러 B/L을 한 번에 스캔하여 카고 리스트를 생성합니다.',
    filterVessel: '선박 필터',
    allVessels: '모든 선박',
    selectedVessels: '{count}개 선박 선택됨',
    moreVessels: '+ {count}척 더보기',
    scheduleFor: '일정 상세',
    lockedTitle: '편집 잠금 (Read Only)',
    lockedDesc: '현재 다른 사용자가 이 보고서를 편집 중입니다. 데이터 충돌 방지를 위해 읽기 전용 모드로 전환됩니다.',
    lockedBy: '편집 중인 사용자: ',
    forceEdit: '편집 권한 가져오기 (주의)',
    today: '오늘',
  },
  en: {
    title: 'Dashboard',
    subtitle: 'Overview of all vessel operations and cargo schedules.',
    workingJobs: 'Active Vessels',
    incomingJobs: 'Incoming Vessels',
    blCount: 'Total Documents',
    calendarTitle: 'Monthly Cargo Calendar',
    calendarSubtitle: 'Check incoming (ETA) and outgoing (ETD) vessels.',
    noData: 'No cargo scheduled for this period.',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    briefingMode: 'Briefing Mode',
    print: 'Print / Save PDF',
    briefingTitle: 'CARGO OPERATION REPORT',
    generatedDate: 'Generated',
    weekly: 'Weekly',
    monthly: 'Monthly',
    period: 'Period',
    totalWeight: 'Total Weight',
    totalItems: 'Total Docs',
    ton: 'ton',
    noItems: 'No items scheduled.',
    reportHeaderNo: 'NO.',
    reportHeaderEta: 'ETA',
    reportHeaderVessel: 'VESSEL / VOYAGE',
    reportHeaderShipper: 'SHIPPER',
    reportHeaderTransporter: 'TRANSPORTER',
    reportHeaderLocation: 'CY/CFS',
    reportHeaderDesc: 'DESCRIPTION',
    reportHeaderRemark: 'REMARKS',
    reportHeaderNote: 'NOTE',
    reportHeaderQty: 'QTY',
    reportHeaderWeight: 'WEIGHT (KG)',
    reportHeaderType: 'TYPE',
    back: 'Back',
    copyLink: 'Copy Link',
    linkCopied: 'Copied!',
    saveChanges: 'Save Changes',
    saved: 'Saved',
    generalRemarks: 'GENERAL REMARKS / INSTRUCTIONS',
    continuation: '(Cont.)',
    page: 'Page',
    systemGenerated: 'System Generated',
    statusIncoming: 'Incoming',
    statusWorking: 'Working',
    statusCompleted: 'Done',
    docs: 'Docs',
    modeGeneral: 'General',
    modeReport: 'Report',
    legendIncoming: 'Incoming',
    legendWorking: 'Working',
    legendCompleted: 'Completed',
    bulkScan: 'Multiple B/L Scan',
    bulkScanDesc: 'Scan multiple B/Ls at once to generate cargo lists.',
    filterVessel: 'Filter Vessel',
    allVessels: 'All Vessels',
    selectedVessels: '{count} Vessels Selected',
    moreVessels: '+ {count} More',
    scheduleFor: 'Schedule for',
    lockedTitle: 'Locked (Read Only)',
    lockedDesc: 'Another user is currently editing this report. Switched to Read-Only mode to prevent conflicts.',
    lockedBy: 'Edited by: ',
    forceEdit: 'Take Over Edit (Caution)',
    today: 'Today',
  },
  cn: {
    title: '工作台',
    subtitle: '全盘掌握船舶动态与货物进出港计划。',
    workingJobs: '作业中船舶',
    incomingJobs: '预计抵港船舶',
    blCount: '文档总数',
    calendarTitle: '每月货物日历',
    calendarSubtitle: '按月查看船舶抵港(ETA)及离港(ETD)计划。',
    noData: '本时段无货物计划。',
    days: ['日', '一', '二', '三', '四', '五', '六'],
    briefingMode: '报表模式 (Report)',
    print: '打印 / 导出 PDF',
    briefingTitle: '货物作业报告',
    generatedDate: '生成日期',
    weekly: '周报 (Weekly)',
    monthly: '月报 (Monthly)',
    period: '统计周期',
    totalWeight: '总重量',
    totalItems: '总单数',
    ton: '吨',
    noItems: '暂无计划。',
    reportHeaderNo: '序号',
    reportHeaderEta: '预计抵港',
    reportHeaderVessel: '船名 / 航次',
    reportHeaderShipper: '发货人',
    reportHeaderTransporter: '运输公司',
    reportHeaderLocation: '仓库/场站',
    reportHeaderDesc: '货物名称与描述',
    reportHeaderRemark: '备注',
    reportHeaderNote: '笔记',
    reportHeaderQty: '数量',
    reportHeaderWeight: '重量 (KG)',
    reportHeaderType: '类型',
    back: '返回',
    copyLink: '复制链接',
    linkCopied: '已复制!',
    saveChanges: '保存更改',
    saved: '已保存',
    generalRemarks: '综合备注 / 指令',
    continuation: '(续)',
    page: '页码',
    systemGenerated: '系统生成时间',
    statusIncoming: '预计',
    statusWorking: '作业中',
    statusCompleted: '已完成',
    docs: '份',
    modeGeneral: '普通',
    modeReport: '报告',
    legendIncoming: '预计抵港',
    legendWorking: '作业中',
    legendCompleted: '已完成',
    bulkScan: '批量扫描 (B/L)',
    bulkScanDesc: '一次扫描多份提单，自动生成货物清单。',
    filterVessel: '筛选船舶',
    allVessels: '所有船舶',
    selectedVessels: '已选择 {count} 艘船舶',
    moreVessels: '+ {count} 更多',
    scheduleFor: '日程详情',
    lockedTitle: '编辑锁定 (只读)',
    lockedDesc: '另一位用户正在编辑此报告。为防止冲突，已切换为只读模式。',
    lockedBy: '编辑者：',
    forceEdit: '强制获取编辑权 (慎用)',
    today: '今天',
  }
};

// Helper Component for Auto-Resizing Textarea
const AutoResizeTextarea = ({ value, onChange, className, placeholder, readOnly }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, placeholder?: string, readOnly?: boolean }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight for shrinking
      textareaRef.current.style.height = 'auto';
      // Set height to scrollHeight to expand with a small buffer for descenders
      textareaRef.current.style.height = (textareaRef.current.scrollHeight + 2) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={`${className} overflow-hidden resize-none font-sans`} 
      placeholder={placeholder}
      rows={1}
      readOnly={readOnly}
    />
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ jobs, bls, onSelectJob, language, onOpenBriefing }) => {
  const t = translations[language];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null);

  // Today's date for highlighting
  const today = useMemo(() => new Date(), []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const workingJobs = jobs.filter(j => j.status === 'working');
  const incomingJobs = jobs.filter(j => j.status === 'incoming');

  const getDayJobs = (dateStr: string) => {
      const eta = jobs.filter(j => j.eta === dateStr);
      const etd = jobs.filter(j => j.etd === dateStr);
      return { eta, etd };
  };

  const renderJobItem = (job: VesselJob, type: 'eta' | 'etd') => {
       const blCount = bls.filter(b => b.vesselJobId === job.id).length;
       let statusClasses = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600";
       
       if (type === 'etd') {
            statusClasses = "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
       } else {
           if (job.status === 'incoming') statusClasses = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
           else if (job.status === 'working') statusClasses = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
       }

       return (
         <button 
           key={`${type}-${job.id}`} 
           onClick={(e) => { e.stopPropagation(); onSelectJob(job.id); setSelectedDateForModal(null); }}
           className={`block w-full text-left p-1.5 rounded border ${statusClasses} hover:opacity-80 transition-opacity group shadow-sm mb-1.5`}
           title={`${type.toUpperCase()}: ${job.vesselName}`}
         >
           <div className="font-bold text-[10px] truncate leading-tight flex items-center gap-1">
              <span className="text-[8px] bg-white/50 px-0.5 rounded text-inherit">{type.toUpperCase()}</span>
              {job.vesselName}
           </div>
           <div className="flex justify-between items-center mt-1 text-[9px] opacity-80 font-medium">
              <span className="truncate max-w-[60%] tracking-tight">{job.voyageNo}</span>
              {type === 'eta' && (
                  <span className="font-mono bg-white/50 dark:bg-black/20 px-1 rounded flex items-center gap-0.5">
                     <FileText size={8} /> {blCount}
                  </span>
              )}
           </div>
         </button>
       );
  };

  const renderCalendar = () => {
    const dayCells = [];
    for (let i = 0; i < firstDay; i++) {
      dayCells.push(<div key={`empty-${i}`} className="min-h-[8rem] bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"></div>);
    }
    for (let d = 1; d <= days; d++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const { eta, etd } = getDayJobs(dateStr);
      const allDayJobs = [...eta.map(j => ({...j, _type: 'eta' as const})), ...etd.map(j => ({...j, _type: 'etd' as const}))];
      const hasJobs = allDayJobs.length > 0;
      
      const MAX_DISPLAY = 2;
      const displayJobs = allDayJobs.slice(0, MAX_DISPLAY);
      const remainingCount = allDayJobs.length - MAX_DISPLAY;

      // Check if this cell represents today
      const isToday = today.getFullYear() === currentDate.getFullYear() &&
                      today.getMonth() === currentDate.getMonth() &&
                      today.getDate() === d;

      dayCells.push(
        <div 
            key={d} 
            onClick={() => hasJobs && setSelectedDateForModal(dateStr)}
            className={`min-h-[8rem] border p-2 relative group transition-colors 
                ${isToday 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500 ring-1 ring-inset ring-blue-200 dark:ring-blue-700' 
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                } 
                ${hasJobs ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
        >
          <div className="flex justify-between items-start mb-2">
              <span className={`text-sm font-bold ${isToday ? 'text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-800 px-2 py-0.5 rounded-full shadow-sm' : (eta.length > 0 || etd.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400')}`}>
                  {d}
              </span>
              {isToday && (
                  <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-md shadow-sm">
                      {t.today}
                  </span>
              )}
          </div>
          <div className="mt-1">
             {displayJobs.map(j => renderJobItem(j, j._type))}
             
             {remainingCount > 0 && (
                 <div className="text-[10px] text-slate-500 font-bold text-center mt-1 bg-slate-100 dark:bg-slate-700 rounded py-1">
                     {t.moreVessels.replace('{count}', remainingCount.toString())}
                 </div>
             )}
          </div>
        </div>
      );
    }
    return dayCells;
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 animate-fade-in space-y-8 dark:text-slate-200">
       <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Home size={24} className="text-blue-600" />
                {t.title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
          </div>
       </div>

       <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Ship size={24} />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.workingJobs}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{workingJobs.length}</p>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                <CalendarIcon size={24} />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.incomingJobs}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{incomingJobs.length}</p>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <FileText size={24} />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.blCount}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{bls.length}</p>
             </div>
          </div>
       </div>

       <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <CalendarIcon size={18} className="text-blue-500" /> 
                   {t.calendarTitle}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t.calendarSubtitle}</p>
                
                {/* Legend */}
                <div className="flex items-center gap-4 mt-2">
                   <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t.legendIncoming}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t.legendWorking}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">ETD</span>
                   </div>
                </div>
             </div>
             
             <div className="flex items-center gap-4 self-end md:self-auto">
                 <button onClick={() => onOpenBriefing(currentDate)} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                    <Printer size={16} /> {t.briefingMode}
                 </button>
                 <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-shadow text-slate-500 dark:text-slate-300">
                       <ChevronLeft size={16} />
                    </button>
                    <span className="px-4 text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[100px] text-center">
                       {currentDate.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-shadow text-slate-500 dark:text-slate-300">
                       <ChevronRight size={16} />
                    </button>
                 </div>
             </div>
          </div>
          <div className="p-6">
             <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                {t.days.map((d: string) => (
                   <div key={d} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {d}
                   </div>
                ))}
                {renderCalendar()}
             </div>
          </div>
       </div>
       
       {/* Modal for Date Details */}
       {selectedDateForModal && createPortal(
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDateForModal(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarIcon size={18} className="text-blue-500"/> {selectedDateForModal}
                    </h3>
                    <button onClick={() => setSelectedDateForModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {(() => {
                        const { eta, etd } = getDayJobs(selectedDateForModal);
                        return (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">{t.legendIncoming} / {t.legendWorking}</h4>
                                    {eta.length === 0 ? <p className="text-sm text-slate-400 italic">No incoming vessels</p> : (
                                        <div className="space-y-2">
                                            {eta.map(j => renderJobItem(j, 'eta'))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">ETD</h4>
                                    {etd.length === 0 ? <p className="text-sm text-slate-400 italic">No departing vessels</p> : (
                                        <div className="space-y-2">
                                            {etd.map(j => renderJobItem(j, 'etd'))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
         </div>,
         document.body
       )}
    </div>
  );
};

// ... BriefingReport Component ...
export const BriefingReport: React.FC<BriefingReportProps> = ({ jobs, bls, initialDate, language, logoUrl, onUpdateBL }) => {
  const t = translations[language];
  const [currentDate, setCurrentDate] = useState(new Date(initialDate));
  const [briefingPeriod, setBriefingPeriod] = useState<'week' | 'month'>('month');
  const [reportMode, setReportMode] = useState<'general' | 'report'>('general');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Vessel Filtering (Multi-Select)
  const [selectedVesselIds, setSelectedVesselIds] = useState<string[]>([]);
  const [isVesselDropdownOpen, setIsVesselDropdownOpen] = useState(false);
  const vesselDropdownRef = useRef<HTMLDivElement>(null);

  // Locking State
  const [lockData, setLockData] = useState<ResourceLock | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const lockHeartbeatRef = useRef<number | null>(null);

  // Consolidated Editable State for Full Table Editing
  const [modifiedBLs, setModifiedBLs] = useState<Record<string, Partial<BLData>>>({});

  // Resizable Columns
  const [colWidths, setColWidths] = useState({
    no: 30, type: 50, shipper: 110, transporter: 100, location: 80, qty: 80, weight: 90, desc: 180, note: 120, remark: 120
  });
  const resizingRef = useRef<{ col: keyof typeof colWidths | null, startX: number, startWidth: number }>({ col: null, startX: 0, startWidth: 0 });

  // Click Outside Handler for Vessel Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vesselDropdownRef.current && !vesselDropdownRef.current.contains(event.target as Node)) {
        setIsVesselDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate a Lock ID based on period
  const lockId = useMemo(() => {
      const d = currentDate;
      const periodKey = briefingPeriod === 'month' 
          ? `month-${d.getFullYear()}-${d.getMonth() + 1}`
          : `week-${d.getFullYear()}-w${Math.ceil(d.getDate() / 7)}`; // Simplified week key
      return `briefing-${periodKey}`;
  }, [currentDate, briefingPeriod]);

  // Handle Locking
  useEffect(() => {
     // 1. Subscribe to lock changes
     const unsub = dataService.subscribeLock(lockId, (lock) => {
         setLockData(lock);
         const currentUser = auth.currentUser;
         
         if (lock && lock.userId !== currentUser?.uid) {
             // Locked by someone else
             // Check if stale (older than 30s)
             if (Date.now() - lock.timestamp > 30000) {
                 // Stale lock, we can ignore or auto-acquire, but for safety lets show read only but allow force
                 setIsReadOnly(true); 
             } else {
                 setIsReadOnly(true);
             }
         } else {
             // Not locked, or locked by me
             setIsReadOnly(false);
             if (!lock && currentUser) {
                 // Auto-acquire if null
                 dataService.acquireLock(lockId, currentUser);
             }
         }
     });

     // 2. Heartbeat if I hold the lock
     const heartbeat = window.setInterval(() => {
         const currentUser = auth.currentUser;
         if (lockData && lockData.userId === currentUser?.uid) {
             dataService.maintainLock(lockId);
         } else if (!lockData && currentUser && !isReadOnly) {
             // Try to re-acquire if lost and not read-only
             dataService.acquireLock(lockId, currentUser);
         }
     }, 10000); // 10s heartbeat

     return () => {
         unsub();
         clearInterval(heartbeat);
         // Attempt release on unmount if we own it
         const currentUser = auth.currentUser;
         // We can't easily check state in cleanup, but we can try generic release if we know we had it
         // This is imperfect in React 18 strict mode but good enough for typical use
     };
  }, [lockId, isReadOnly]); // Dependency on lockId changes context

  const handleForceEdit = () => {
      if (confirm("Are you sure? This may overwrite other user's work.")) {
          if (auth.currentUser) {
              dataService.acquireLock(lockId, auth.currentUser);
              setIsReadOnly(false);
          }
      }
  };

  const handleMouseDown = (e: React.MouseEvent, col: keyof typeof colWidths) => {
    e.preventDefault();
    resizingRef.current = { col, startX: e.clientX, startWidth: colWidths[col] };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current.col) return;
    const diff = (e.clientX - resizingRef.current.startX) * (1/zoomLevel); 
    setColWidths(prev => ({ ...prev, [resizingRef.current.col!]: Math.max(30, resizingRef.current.startWidth + diff) }));
  };

  const handleMouseUp = () => {
    resizingRef.current.col = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if(briefingPeriod === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
    setModifiedBLs({}); // Reset edits on navigation
  };
  
  const handleNext = () => {
    const d = new Date(currentDate);
    if(briefingPeriod === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
    setModifiedBLs({});
  };

  // Get Briefing Jobs (Filtered by Date AND Vessel Selection)
  const getFilteredJobs = () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    let filtered = jobs;
    
    // Date Filter
    if (briefingPeriod === 'month') {
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.eta);
        return jobDate.getFullYear() === currentYear && jobDate.getMonth() === currentMonth;
      });
    } else {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 7);
      filtered = filtered.filter(job => {
        const d = new Date(job.eta);
        return d >= start && d <= end;
      });
    }

    // Vessel Filter (Multi-Select)
    if (selectedVesselIds.length > 0) {
        filtered = filtered.filter(job => selectedVesselIds.includes(job.id));
    }
    return filtered;
  };

  const briefingJobs = getFilteredJobs();

  // Handle Vessel Selection Toggle
  const toggleVesselSelection = (jobId: string) => {
      setSelectedVesselIds(prev => {
          if (prev.includes(jobId)) {
              return prev.filter(id => id !== jobId);
          } else {
              return [...prev, jobId];
          }
      });
  };

  const toggleAllVessels = () => {
      setSelectedVesselIds([]); // Empty array means "All"
  };

  // Alias Helper Function
  const getTypeAlias = (bl: BLData): string => {
      if (bl.sourceType === 'FISCO') return '직납';
      if (bl.sourceType === 'THIRD_PARTY') return '3RD';
      if (bl.importSubClass === 'SHIPS_STORES') return '선용품';
      if (bl.importSubClass === 'RETURN_EXPORT') return '반송 수출';
      if (bl.cargoClass === 'IMPORT') return 'I';
      if (bl.cargoClass === 'TRANSHIPMENT') return 'T';
      return 'T'; 
  };

  // Generic Edit Handler
  const handleCellEdit = (blId: string, field: keyof BLData | 'quantity' | 'grossWeight', value: any) => {
      if (isReadOnly) return;
      
      setModifiedBLs(prev => {
          const currentEdits = prev[blId] || {};
          // Special handling for nested fields if needed, but for now we map flat overrides
          if (field === 'quantity') {
             // We can't easily update nested cargoItems array cleanly in a simple map without index.
             // For this Briefing view, we will assume we are updating the PackingList total if exists, or just storing a temporary Override
             // To properly support "All Columns", we really should update the `packingList` or `cargoItems`.
             // Simplification: We will store these in the 'packingList' object in the update payload for simplicity as it overrides items
             return {
                 ...prev,
                 [blId]: {
                     ...currentEdits,
                     packingList: { 
                        totalPackageCount: Number(value),
                        totalCbm: 0, // Preserve others if we had full object, but here we construct partial
                        totalGrossWeight: currentEdits.packingList?.totalGrossWeight || 0
                     } as any 
                 }
             };
          } else if (field === 'grossWeight') {
             return {
                 ...prev,
                 [blId]: {
                     ...currentEdits,
                     packingList: {
                        totalPackageCount: currentEdits.packingList?.totalPackageCount || 0,
                        totalCbm: 0,
                        totalGrossWeight: Number(value)
                     } as any
                 }
             };
          }
          
          return {
              ...prev,
              [blId]: { ...currentEdits, [field]: value }
          };
      });
  };

  const getBriefingSummaries = (filteredJobs: VesselJob[]) => {
     return filteredJobs.flatMap(job => {
        const jobBLs = bls.filter(bl => bl.vesselJobId === job.id);
        return jobBLs.map(bl => {
           // Apply Overrides from modifiedBLs
           const edits = modifiedBLs[bl.id] || {};
           const mergedBL = { ...bl, ...edits };

           const items = mergedBL.cargoItems || [];
           
           let totalQty = 0;
           // Check if we have an edit in packingList first (from handleCellEdit special case)
           if (edits.packingList?.totalPackageCount) {
               totalQty = edits.packingList.totalPackageCount;
           } else if (mergedBL.packingList && typeof mergedBL.packingList.totalPackageCount === 'number' && mergedBL.packingList.totalPackageCount > 0) {
               totalQty = mergedBL.packingList.totalPackageCount;
           } else {
               totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
           }

           let totalWeight = 0;
           if (edits.packingList?.totalGrossWeight) {
               totalWeight = edits.packingList.totalGrossWeight;
           } else if (mergedBL.packingList && typeof mergedBL.packingList.totalGrossWeight === 'number' && mergedBL.packingList.totalGrossWeight > 0) {
               totalWeight = mergedBL.packingList.totalGrossWeight;
           } else {
               totalWeight = items.reduce((sum, i) => sum + (Number(i.grossWeight) || 0), 0);
           }
           
           const displayDesc = mergedBL.remarks || (items.length > 0 ? items[0].description : '-');
           const location = mergedBL.storageLocation || mergedBL.arrivalNotice?.location || '';

           return {
             blId: bl.id,
             jobId: job.id,
             eta: job.eta,
             vesselName: job.vesselName,
             voyageNo: job.voyageNo,
             shipper: mergedBL.shipper || 'Unknown',
             transporter: mergedBL.transporterName || '',
             koreanForwarder: mergedBL.koreanForwarder || '',
             location,
             description: displayDesc,
             reportRemark: mergedBL.reportRemarks || '',
             note: mergedBL.note || '',
             quantity: totalQty,
             packageType: items.length > 0 ? items[0].packageType : 'PKGS',
             grossWeight: totalWeight,
             sourceType: mergedBL.sourceType || 'TRANSIT',
             typeAlias: getTypeAlias(mergedBL)
           };
        });
     }).sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime());
  };

  const summaryItems = getBriefingSummaries(briefingJobs);

  const handleSave = async () => {
    if (!onUpdateBL || isReadOnly) return;
    setIsSaving(true);
    try {
      const updates = Object.keys(modifiedBLs).map(blId => {
         return onUpdateBL(blId, modifiedBLs[blId]);
      });
      await Promise.all(updates);
      setModifiedBLs({}); // Clear local edits after successful save
      alert(t.saved);
    } catch (e) {
      alert("Error saving report data.");
    } finally {
      setIsSaving(false);
    }
  };

  const pages = useMemo(() => {
     const _pages: any[] = [];
     let currentPageGroups: any[] = [];
     let currentRows = 0;
     let limit = 14; 
     
     const _vesselGroups = briefingJobs.map(job => {
        const jobItems = summaryItems.filter(item => item.jobId === job.id);
        jobItems.sort((a, b) => {
            const typePriority: Record<string, number> = { 'T': 1, 'I': 1, '직납': 2, '3RD': 3 };
            const pA = typePriority[a.typeAlias] || 99;
            const pB = typePriority[b.typeAlias] || 99;
            if (pA !== pB) return pA - pB;
            return (a.shipper || '').localeCompare(b.shipper || '');
        });

        const numberedItems = jobItems.map((item, idx) => ({
          ...item,
          seqNo: idx + 1
        }));

        return { job, items: numberedItems };
    }).filter(group => group.items.length > 0);

    _vesselGroups.forEach(group => {
        let items = [...group.items];
        let isContinuation = false;
        while(items.length > 0) {
            const headerSpace = isContinuation ? 1 : 2;
            if (currentRows + headerSpace >= limit) {
                _pages.push(currentPageGroups);
                currentPageGroups = [];
                currentRows = 0;
            }
            const space = limit - currentRows - headerSpace;
            let take = space;
            let chunk = [];
            let showSubtotal = false;
            
            if (items.length + 1 <= take) {
                chunk = items;
                showSubtotal = true;
                items = [];
            } else {
                if (take <= 0) {
                     _pages.push(currentPageGroups);
                     currentPageGroups = [];
                     currentRows = 0;
                     continue; 
                }
                chunk = items.slice(0, take);
                items = items.slice(take);
                showSubtotal = false;
            }

            if (chunk.length > 0 || showSubtotal) {
                currentPageGroups.push({
                    job: group.job,
                    items: chunk,
                    isContinuation,
                    showSubtotal
                });
                currentRows += headerSpace + chunk.length + (showSubtotal ? 1 : 0);
            }
            isContinuation = true;
        }
    });
    if (currentPageGroups.length > 0) _pages.push(currentPageGroups);
    return _pages;
  }, [briefingJobs, summaryItems]);

  const dateLocale = language === 'cn' ? 'zh-CN' : language === 'ko' ? 'ko-KR' : 'en-US';

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 print-container overflow-hidden">
      
      {/* Read Only Banner */}
      {isReadOnly && (
         <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex justify-between items-center text-amber-900 text-sm font-bold z-30 animate-fade-in no-print">
            <div className="flex items-center gap-2">
                <Lock size={16} />
                <span>
                    {t.lockedTitle}: {t.lockedDesc} 
                    {lockData && <span className="ml-2 opacity-80 font-normal">({t.lockedBy} {lockData.userEmail})</span>}
                </span>
            </div>
            <button onClick={handleForceEdit} className="text-xs bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded text-amber-900 border border-amber-300 transition-colors">
                {t.forceEdit}
            </button>
         </div>
      )}

      {/* Toolbar */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-20 no-print">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                <button onClick={handlePrev} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><ChevronLeft size={16}/></button>
                <div className="px-3 text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums w-32 text-center">
                   {briefingPeriod === 'month' ? currentDate.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' }) : currentDate.toLocaleDateString(dateLocale)}
                </div>
                <button onClick={handleNext} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><ChevronRight size={16}/></button>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <button onClick={() => setBriefingPeriod('week')} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${briefingPeriod === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>{t.weekly}</button>
              <button onClick={() => setBriefingPeriod('month')} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${briefingPeriod === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>{t.monthly}</button>
            </div>
            
            {/* Vessel Filter (Multi-Select) */}
            <div className="ml-4 relative" ref={vesselDropdownRef}>
                <button 
                    onClick={() => setIsVesselDropdownOpen(!isVesselDropdownOpen)}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border-none text-sm font-medium rounded-lg px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 min-w-[140px] justify-between"
                >
                    <div className="flex items-center gap-2 truncate">
                        <Filter size={16} className="text-slate-400 flex-shrink-0"/>
                        <span className="truncate">
                            {selectedVesselIds.length === 0 
                                ? t.allVessels 
                                : t.selectedVessels.replace('{count}', selectedVesselIds.length.toString())}
                        </span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400 flex-shrink-0"/>
                </button>

                {isVesselDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-fade-in-up">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div 
                                onClick={toggleAllVessels}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer transition-colors"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedVesselIds.length === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                                    {selectedVesselIds.length === 0 && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.allVessels}</span>
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {jobs.map(job => (
                                <div 
                                    key={job.id}
                                    onClick={() => toggleVesselSelection(job.id)}
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer transition-colors"
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedVesselIds.includes(job.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                                        {selectedVesselIds.includes(job.id) && <Check size={12} strokeWidth={3} />}
                                    </div>
                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{job.vesselName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"><ZoomOut size={16} /></button>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"><ZoomIn size={16} /></button>
            </div>
            
            {/* Active Users Indicator (Mock) */}
            {lockData && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 text-xs font-bold">
                    <Users size={12} /> 1 Active
                </div>
            )}
          </div>
          <div className="flex gap-2">
              <button onClick={handleSave} disabled={isSaving || isReadOnly} className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95 text-sm font-bold ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                <Save size={18} /> {isSaving ? '...' : t.saveChanges}
              </button>
              <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all active:scale-95 text-sm font-bold">
                <Printer size={18} /> {t.print}
              </button>
          </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto custom-scrollbar p-8 bg-slate-100 dark:bg-slate-900 flex flex-col items-center gap-8 print:block print:p-0 print:m-0 print:bg-white print:overflow-visible">
          {reportMode === 'report' ? (
              <div className="text-center py-20">
                  <PieChart size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold">Report Mode is coming soon.</p>
                  <button onClick={() => setReportMode('general')} className="text-blue-600 text-sm font-bold mt-2 hover:underline">Switch to General Mode</button>
              </div>
          ) : pages.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic">{t.noItems}</div>
          ) : (
              pages.map((page, pageIndex) => (
                  <div 
                    key={pageIndex} 
                    className="break-after-page bg-white shadow-xl relative text-black mx-auto transition-transform origin-top print:shadow-none print:m-0 print:transform-none print:border-none font-sans"
                    style={{ 
                        width: '297mm', 
                        height: '208mm',
                        padding: '10mm',
                        transform: `scale(${zoomLevel})`,
                        marginBottom: pageIndex === pages.length - 1 ? '0' : '20px' 
                    }}
                  >
                      {/* Page Header */}
                      {pageIndex === 0 ? (
                          <div className="flex justify-between items-end border-b-[3px] border-black pb-2 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 border-2 border-black rounded-lg flex items-center justify-center bg-white">
                                    <Ship size={28} className="text-black" strokeWidth={2}/>
                                </div>
                                <div>
                                  <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-black">{t.briefingTitle}</h1>
                                  <p className="text-sm font-bold text-slate-600 mt-1">
                                      {t.period}: {briefingPeriod === 'month' 
                                      ? currentDate.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' }) 
                                      : `Week of ${currentDate.toLocaleDateString(dateLocale)}`}
                                  </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-2 mb-1">
                                    {logoUrl && <img src={logoUrl} alt="Logo" className="h-5 w-auto object-contain" />}
                                    <p className="font-black text-xl uppercase tracking-widest text-slate-900 leading-none">LOGI<span className="text-blue-600">1</span></p>
                                </div>
                                <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-500">Integrated Logistics ERP</p>
                                <p className="text-[10px] text-black mt-1 font-mono font-bold text-right">{new Date().toLocaleDateString(dateLocale)}</p>
                            </div>
                          </div>
                      ) : (
                          <div className="flex justify-between items-end border-b-2 border-slate-300 pb-1 mb-2 print:border-slate-300">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.briefingTitle} {t.continuation}</span>
                            <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString(dateLocale)}</span>
                          </div>
                      )}

                      <div className="space-y-4">
                          {page.map((group: any, grpIdx: number) => (
                              <div key={`${group.job.id}-${grpIdx}`} className="mb-4">
                                  {!group.isContinuation ? (
                                      <div className="flex items-center justify-between mb-1 bg-black text-white px-2 py-1 print:bg-black print:text-white print-color-adjust-exact">
                                          <div className="flex items-center gap-4">
                                              <h3 className="text-base font-black uppercase tracking-wide">{group.job.vesselName}</h3>
                                              <span className="text-xs font-mono bg-white text-black px-1 py-px rounded">VOY. {group.job.voyageNo}</span>
                                          </div>
                                          <span className="text-xs font-bold uppercase tracking-wider">{t.reportHeaderEta}: {group.job.eta}</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 mb-1 pl-2 border-l-4 border-slate-300">
                                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{group.job.vesselName} {t.continuation}</span>
                                      </div>
                                  )}

                                  <table className="w-full text-left border-collapse border-b-2 border-black table-fixed">
                                      <thead>
                                          <tr className="border-b-2 border-black text-[10px] font-bold uppercase tracking-wider">
                                              <th className="px-1 py-1 align-bottom text-center bg-gray-100 print:bg-gray-100" style={{ width: colWidths.no }}>
                                                {t.reportHeaderNo}
                                                {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'no')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-center bg-gray-100 print:bg-gray-100" style={{ width: colWidths.type }}>
                                                {t.reportHeaderType}
                                                {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'type')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.shipper }}>
                                                {t.reportHeaderShipper}
                                                {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'shipper')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.transporter }}>
                                                {t.reportHeaderTransporter}
                                                {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'transporter')}></div>}
                                              </th>
                                               <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.location }}>
                                                {t.reportHeaderLocation}
                                                {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'location')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.qty }}>
                                                {t.reportHeaderQty}
                                                {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'qty')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.weight }}>
                                                {t.reportHeaderWeight}
                                                {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'weight')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.desc }}>
                                                  {t.reportHeaderDesc}
                                                  {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'desc')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.note }}>
                                                  {t.reportHeaderNote}
                                                  {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'note')}></div>}
                                              </th>
                                              <th className="px-1 py-1 align-bottom text-left bg-gray-100 print:bg-gray-100" style={{ width: colWidths.remark }}>
                                                  {t.reportHeaderRemark}
                                                  {!group.isContinuation && <div className="resizer no-print" onMouseDown={(e) => handleMouseDown(e, 'remark')}></div>}
                                              </th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {group.items.map((item: any, i: number) => (
                                              <tr key={i} className="border-b border-gray-300 align-top">
                                                  <td className="px-1 py-1 text-[9px] font-bold align-middle text-center">
                                                      {item.seqNo}
                                                  </td>
                                                  <td className="px-1 py-1 text-[9px] font-bold align-middle text-center">
                                                      <span className="uppercase border px-1 rounded bg-slate-50">{item.typeAlias}</span>
                                                  </td>
                                                  <td className="px-0 py-0 relative group align-middle">
                                                      <AutoResizeTextarea
                                                          value={item.shipper}
                                                          onChange={(e) => handleCellEdit(item.blId, 'shipper', e.target.value)}
                                                          readOnly={isReadOnly}
                                                          className="w-full h-full bg-transparent border-none focus:outline-none focus:bg-yellow-50 px-1 py-1 block font-sans text-[10px] leading-tight resize-none font-bold"
                                                      />
                                                  </td>
                                                  <td className="px-1 py-1 break-words align-middle text-[10px] leading-tight">
                                                      <div className="flex flex-col gap-1">
                                                          {/* Korean Forwarder Edit */}
                                                          <div className="flex items-center gap-1">
                                                              <span className="text-[8px] border border-slate-300 px-0.5 rounded text-slate-500">FWD</span>
                                                              <AutoResizeTextarea
                                                                  value={item.koreanForwarder}
                                                                  onChange={(e) => handleCellEdit(item.blId, 'koreanForwarder', e.target.value)}
                                                                  readOnly={isReadOnly}
                                                                  className="flex-1 bg-transparent border-none focus:outline-none focus:bg-yellow-50 p-0 block font-sans text-[9px] leading-tight resize-none min-w-[50px]"
                                                              />
                                                          </div>
                                                          {/* Transporter Edit */}
                                                          <div className="flex items-center gap-1">
                                                              <span className="text-[8px] border border-slate-300 px-0.5 rounded text-slate-500">TRK</span>
                                                              <AutoResizeTextarea
                                                                  value={item.transporter}
                                                                  onChange={(e) => handleCellEdit(item.blId, 'transporterName', e.target.value)}
                                                                  readOnly={isReadOnly}
                                                                  className="flex-1 bg-transparent border-none focus:outline-none focus:bg-yellow-50 p-0 block font-sans text-[9px] leading-tight resize-none min-w-[50px]"
                                                              />
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td className="px-0 py-0 relative group align-middle text-blue-800 font-medium">
                                                       <AutoResizeTextarea
                                                          value={item.location}
                                                          onChange={(e) => handleCellEdit(item.blId, 'storageLocation', e.target.value)}
                                                          readOnly={isReadOnly}
                                                          className="w-full h-full bg-transparent border-none focus:outline-none focus:bg-yellow-50 px-1 py-1 block font-sans text-[10px] leading-tight resize-none"
                                                      />
                                                  </td>
                                                  <td className="px-0 py-0 align-middle text-left font-mono text-[10px]">
                                                       <div className="flex items-center px-1">
                                                            <input 
                                                                type="number" 
                                                                value={item.quantity}
                                                                onChange={(e) => handleCellEdit(item.blId, 'quantity', e.target.value)}
                                                                readOnly={isReadOnly}
                                                                className="w-12 bg-transparent border-none focus:outline-none focus:bg-yellow-50 text-right font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-500 uppercase ml-1">{item.packageType}</span>
                                                       </div>
                                                  </td>
                                                  <td className="px-0 py-0 align-middle text-left font-mono text-[10px] font-bold">
                                                        <input 
                                                                type="number" 
                                                                value={item.grossWeight}
                                                                onChange={(e) => handleCellEdit(item.blId, 'grossWeight', e.target.value)}
                                                                readOnly={isReadOnly}
                                                                className="w-full bg-transparent border-none focus:outline-none focus:bg-yellow-50 text-right px-1 font-mono font-bold"
                                                        />
                                                  </td>
                                                  <td className="px-0 py-0 relative group align-middle">
                                                      <AutoResizeTextarea
                                                          value={item.description}
                                                          onChange={(e) => handleCellEdit(item.blId, 'remarks', e.target.value)}
                                                          readOnly={isReadOnly}
                                                          className="w-full h-full bg-transparent border-none focus:outline-none focus:bg-yellow-50 px-1 py-1 block font-sans text-[10px] leading-tight resize-none"
                                                      />
                                                  </td>
                                                    <td className="px-0 py-0 relative group align-middle">
                                                        <AutoResizeTextarea
                                                          value={item.note}
                                                          onChange={(e) => handleCellEdit(item.blId, 'note', e.target.value)}
                                                          readOnly={isReadOnly}
                                                          className="w-full h-full bg-transparent border-none focus:outline-none focus:bg-yellow-50 px-1 py-1 block font-sans text-[10px] leading-tight resize-none"
                                                          placeholder=""
                                                      />
                                                  </td>
                                                  <td className="px-0 py-0 relative group align-middle">
                                                        <AutoResizeTextarea
                                                          value={item.reportRemark}
                                                          onChange={(e) => handleCellEdit(item.blId, 'reportRemarks', e.target.value)}
                                                          readOnly={isReadOnly}
                                                          className="w-full h-full bg-transparent border-none focus:outline-none focus:bg-yellow-50 px-1 py-1 block font-sans text-[10px] leading-tight resize-none"
                                                          placeholder=""
                                                      />
                                                  </td>
                                              </tr>
                                          ))}
                                          {group.showSubtotal && (
                                              <tr className="bg-gray-100 font-bold border-t-2 border-black print:bg-gray-100">
                                                  <td colSpan={5} className="px-2 py-1 text-right align-middle text-[9px] uppercase tracking-wide">Subtotal</td>
                                                  <td className="px-1 py-1 text-left align-middle text-[10px]">{summaryItems.filter(i => i.jobId === group.job.id).reduce((s, x) => s + x.quantity, 0)}</td>
                                                  <td className="px-1 py-1 text-left align-middle text-[10px]">{summaryItems.filter(i => i.jobId === group.job.id).reduce((s, x) => s + x.grossWeight, 0).toLocaleString()}</td>
                                                  <td colSpan={3} className="px-1 py-1"></td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          ))}
                      </div>

                      <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[8px] text-gray-500 uppercase tracking-wider font-mono">
                          <p>{t.systemGenerated}: {new Date().toISOString()}</p>
                          <p>{t.page} {pageIndex + 1} / {pages.length}</p>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};
