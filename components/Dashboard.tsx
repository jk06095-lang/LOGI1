
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { VesselJob, BLData, Language } from '../types';
import { Ship, Calendar as CalendarIcon, FileText, ChevronLeft, ChevronRight, PieChart, Home, Filter, X, Lock, GripVertical, Check, Waves, CloudRain, Edit2, Printer, Save, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from "framer-motion";

// New Hooks
import { useCalendarLogic } from '../hooks/useCalendarLogic';
import { useBriefingLock } from '../hooks/useBriefingLock';
import { useBriefingData } from '../hooks/useBriefingData';

interface DashboardProps {
  jobs: VesselJob[];
  bls: BLData[];
  onSelectJob: (jobId: string) => void;
  language: Language;
  logoUrl?: string;
  onUpdateBL?: (blId: string, updates: Partial<BLData>) => Promise<void>;
  onUpdateJob?: (jobId: string, updates: Partial<VesselJob>) => void;
  onOpenBriefing: (date: Date) => void;
  onUploadBLs?: (files: File[]) => void;
  onUpdateLogo?: (file: File) => Promise<void>;
}

interface BriefingReportProps {
  jobs: VesselJob[];
  bls: BLData[];
  initialDate: Date;
  language: Language;
  logoUrl?: string;
  reportLogoUrl?: string | null;
  onUpdateBL?: (blId: string, updates: Partial<BLData>) => Promise<void>;
  onUpdateLogo?: (file: File) => Promise<void>;
  onUpdateReportLogo?: (file: File) => Promise<void>;
  onResetReportLogo?: () => Promise<void>;
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
    days: ['일', '월', '화', '수', '목', '금', '토'],
    briefingMode: '보고서 보기',
    print: '인쇄 / PDF 저장',
    briefingTitle: 'CARGO OPERATION REPORT',
    generatedDate: '생성일',
    weekly: '주간',
    monthly: '월간',
    period: '기간',
    totalWeight: '총 중량',
    totalItems: '총 건수 (Docs)',
    ton: '톤',
    noItems: '일정이 없습니다.',
    reportHeaderNo: 'NO',
    reportHeaderEta: 'ETA\n到达日期',
    reportHeaderShipperDesc: 'SHIPPER 托运人\nDESCRIPTION 物品',
    reportHeaderQty: "Q'TY 数量",
    reportHeaderWeight: '重量',
    reportHeaderVolume: '体积',
    reportHeaderBlCont: "B/L NO. 提单号\nCONT' /NO. 集装箱/号",
    reportHeaderDocs: '문서\n현황',
    reportHeaderVessel: '본선명',
    reportHeaderType: 'TYPE',
    reportHeaderTransporter: 'TRANSPORTER',
    reportHeaderWarehouse: '창고',
    reportHeaderRemark: 'REMARK',
    back: '뒤로가기',
    saveChanges: '변경사항 저장',
    saved: '저장됨',
    systemGenerated: '시스템 생성',
    legendIncoming: '입항예정',
    legendWorking: '작업중',
    moreVessels: '+ {count} 더보기',
    lockedTitle: '편집 잠금 (Read Only)',
    lockedDesc: '현재 다른 사용자가 이 보고서를 편집 중입니다. 데이터 충돌 방지를 위해 읽기 전용 모드로 전환됩니다.',
    lockedBy: '편집 중인 사용자: ',
    forceEdit: '편집 권한 가져오기 (주의)',
    today: '오늘',
    editMode: '일정 편집',
    doneMode: '완료',
    dragTip: '드래그하여 날짜를 변경하세요.',
    cancel: '취소',
    page: '페이지',
    filterVessel: '선박 필터',
    allVessels: '모든 선박',
    selectedVessels: '{count}개 선박 선택됨',
  },
  en: {
    title: 'Dashboard',
    subtitle: 'Overview of all vessel operations and cargo schedules.',
    workingJobs: 'Active Vessels',
    incomingJobs: 'Incoming Vessels',
    blCount: 'Total Documents',
    calendarTitle: 'Monthly Cargo Calendar',
    calendarSubtitle: 'Check incoming (ETA) and outgoing (ETD) vessels.',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    briefingMode: 'View Report',
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
    reportHeaderNo: 'NO',
    reportHeaderEta: 'ETA',
    reportHeaderShipperDesc: 'SHIPPER\nDESCRIPTION',
    reportHeaderQty: "Q'TY",
    reportHeaderWeight: 'Weight',
    reportHeaderVolume: 'Volume',
    reportHeaderBlCont: "B/L NO.\nCONT' NO.",
    reportHeaderDocs: 'Docs',
    reportHeaderVessel: 'Vessel',
    reportHeaderType: 'TYPE',
    reportHeaderTransporter: 'TRANSPORTER',
    reportHeaderWarehouse: 'Warehouse',
    reportHeaderRemark: 'REMARK',
    back: 'Back',
    saveChanges: 'Save Changes',
    saved: 'Saved',
    systemGenerated: 'System Generated',
    legendIncoming: 'Incoming',
    legendWorking: 'Working',
    moreVessels: '+ {count} More',
    lockedTitle: 'Locked (Read Only)',
    lockedDesc: 'Another user is currently editing this report. Switched to Read-Only mode to prevent conflicts.',
    lockedBy: 'Edited by: ',
    forceEdit: 'Take Over Edit (Caution)',
    today: 'Today',
    editMode: 'Edit Schedule',
    doneMode: 'Done',
    dragTip: 'Drag items to change date.',
    cancel: 'Cancel',
    page: 'Page',
    filterVessel: 'Filter Vessel',
    allVessels: 'All Vessels',
    selectedVessels: '{count} Vessels Selected',
  },
  cn: {
    title: '工作台',
    subtitle: '全盘掌握船舶动态与货物进出港计划。',
    workingJobs: '作业中船舶',
    incomingJobs: '预计抵港船舶',
    blCount: '文档总数',
    calendarTitle: '每月货物日历',
    calendarSubtitle: '按月查看船舶抵港(ETA)及离港(ETD)计划。',
    days: ['日', '一', '二', '三', '四', '五', '六'],
    briefingMode: '查看报告',
    print: '打印 / 导出 PDF',
    briefingTitle: '货物作业报告',
    generatedDate: '生成日期',
    weekly: '周报',
    monthly: '月报',
    period: '统计周期',
    totalWeight: '总重量',
    totalItems: '总单数',
    ton: '吨',
    noItems: '暂无计划。',
    reportHeaderNo: '序号',
    reportHeaderEta: '预计抵港',
    reportHeaderShipperDesc: '发货人/描述',
    reportHeaderQty: '数量',
    reportHeaderWeight: '重量',
    reportHeaderVolume: '体积',
    reportHeaderBlCont: '提单/箱号',
    reportHeaderDocs: '文档',
    reportHeaderVessel: '船名',
    reportHeaderType: '类型',
    reportHeaderTransporter: '运输公司',
    reportHeaderWarehouse: '仓库',
    reportHeaderRemark: '备注',
    back: '返回',
    saveChanges: '保存更改',
    saved: '已保存',
    systemGenerated: '系统生成时间',
    legendIncoming: '预计抵港',
    legendWorking: '作业中',
    moreVessels: '+ {count} 更多',
    lockedTitle: '编辑锁定 (只读)',
    lockedDesc: '另一位用户正在编辑此报告。为防止冲突，已切换为只读模式。',
    lockedBy: '编辑者：',
    forceEdit: '强制获取编辑权 (慎用)',
    today: '今天',
    editMode: '编辑日程',
    doneMode: '完成',
    dragTip: '拖动项目以更改日期。',
    cancel: '取消',
    page: '页码',
    filterVessel: '筛选船舶',
    allVessels: '所有船舶',
    selectedVessels: '已选择 {count} 艘船舶',
  }
};

const AutoResizeTextarea = ({ value, onChange, className, placeholder, readOnly }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, placeholder?: string, readOnly?: boolean }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = (textareaRef.current.scrollHeight) + 'px';
    }
  };
  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const observer = new ResizeObserver(() => {
      adjustHeight();
    });
    observer.observe(textareaRef.current);
    return () => observer.disconnect();
  }, []);

  return <textarea ref={textareaRef} value={value ?? ''} onChange={onChange} className={`${className} overflow-hidden resize-none font-sans`} placeholder={placeholder} rows={1} readOnly={readOnly} />;
};

export const Dashboard: React.FC<DashboardProps> = ({ jobs, bls, onSelectJob, language, onOpenBriefing, onUpdateJob }) => {
  const t = translations[language];
  const {
    currentDate, selectedDateForModal, setSelectedDateForModal, weatherData, isEditing,
    prevMonth, nextMonth, handleDragStart, handleDrag, handleDragEnd,
    handleEnterEditMode, handleSaveEdit, handleCancelEdit, today
  } = useCalendarLogic(jobs, onUpdateJob);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const workingJobs = jobs.filter(j => j.status === 'working');
  const incomingJobs = jobs.filter(j => j.status === 'incoming');

  const getDayJobs = (dateStr: string) => {
    const eta = jobs.filter(j => j.eta === dateStr);
    const etd = jobs.filter(j => j.etd === dateStr);
    return { eta, etd };
  };

  const jiggleVariant = {
    animate: {
      rotate: [-0.5, 0.5],
      transition: { duration: 0.15, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut", delay: Math.random() * 0.1 }
    },
    initial: { rotate: 0 }
  };

  const renderJobItem = (job: VesselJob, type: 'eta' | 'etd') => {
    const blCount = bls.filter(b => b.vesselJobId === job.id).length;
    let statusClasses = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600";
    if (type === 'etd') statusClasses = "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    else if (job.status === 'incoming') statusClasses = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    else if (job.status === 'working') statusClasses = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";

    return (
      <motion.div
        key={`${type}-${job.id}`}
        layoutId={`${type}-${job.id}`}
        drag={isEditing}
        dragSnapToOrigin
        whileDrag={{ scale: 1.05, zIndex: 50, opacity: 0.9, rotate: 0 }}
        variants={isEditing ? jiggleVariant : undefined}
        animate={isEditing ? "animate" : "initial"}
        onDragStart={handleDragStart}
        onDrag={(e, info) => handleDrag(e, info)}
        onDragEnd={(e, info) => handleDragEnd(e, info, job, type)}
        onClick={(e) => {
          if (!isEditing) {
            e.stopPropagation();
            onSelectJob(job.id);
            setSelectedDateForModal(null);
          }
        }}
        className={`block w-full text-left p-1.5 rounded border ${statusClasses} hover:opacity-80 transition-opacity group shadow-sm mb-1.5 cursor-pointer relative touch-none select-none`}
        title={`${type.toUpperCase()}: ${job.vesselName}`}
      >
        <div className="font-bold text-[10px] truncate leading-tight flex items-center gap-1 pointer-events-none">
          <span className="text-[8px] bg-white/50 px-0.5 rounded text-inherit">{type.toUpperCase()}</span>
          {job.vesselName}
        </div>
        <div className="flex justify-between items-center mt-1 text-[9px] opacity-80 font-medium pointer-events-none">
          <span className="truncate max-w-[60%] tracking-tight">{job.voyageNo}</span>
          {type === 'eta' && (
            <span className="font-mono bg-white/50 dark:bg-black/20 px-1 rounded flex items-center gap-0.5">
              <FileText size={8} /> {blCount}
            </span>
          )}
        </div>

        {isEditing && (
          <div className="absolute -top-1.5 -right-1.5 bg-slate-400 text-white rounded-full p-0.5 shadow-sm z-10 animate-bounce">
            <GripVertical size={8} />
          </div>
        )}
      </motion.div>
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
      const allDayJobs = [...eta.map(j => ({ ...j, _type: 'eta' as const })), ...etd.map(j => ({ ...j, _type: 'etd' as const }))];
      const hasJobs = allDayJobs.length > 0;

      const MAX_DISPLAY = 4;
      const displayJobs = allDayJobs.slice(0, MAX_DISPLAY);
      const remainingCount = allDayJobs.length - MAX_DISPLAY;

      const isToday = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth() && today.getDate() === d;
      const w = weatherData[dateStr];

      dayCells.push(
        <div
          key={d}
          data-date={dateStr}
          onClick={() => !isEditing && hasJobs && setSelectedDateForModal(dateStr)}
          className={`min-h-[8rem] border p-2 relative group transition-colors calendar-day-cell ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500 ring-1 ring-inset ring-blue-200 dark:ring-blue-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'} ${hasJobs && !isEditing ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
        >
          <div className="flex justify-between items-start mb-2 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isToday ? 'text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-800 px-2 py-0.5 rounded-full shadow-sm' : (eta.length > 0 || etd.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400')}`}>{d}</span>
              {w && (
                <div className="flex items-center gap-1.5 text-[9px] font-medium bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md" title="Busan">
                  {w.precipitation > 0 && <CloudRain size={10} className="text-slate-500 dark:text-slate-400" />}
                  <span className={`flex items-center gap-0.5 ${w.waveHeight > 1.5 ? 'text-red-500 font-bold' : w.waveHeight > 1.0 ? 'text-amber-500 font-bold' : 'text-blue-500 dark:text-blue-400'}`}><Waves size={10} /> {w.waveHeight}m</span>
                </div>
              )}
            </div>
            {isToday && <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-md shadow-sm">{t.today}</span>}
          </div>
          <div className="mt-1 space-y-1">
            <AnimatePresence>
              {displayJobs.map(j => renderJobItem(j, j._type))}
            </AnimatePresence>
            {remainingCount > 0 && <div className="text-[10px] text-slate-500 font-bold text-center mt-1 bg-slate-100 dark:bg-slate-700 rounded py-1 pointer-events-none">{t.moreVessels.replace('{count}', remainingCount.toString())}</div>}
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Home size={24} className="text-blue-600" />{t.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Ship size={24} /></div>
          <div><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.workingJobs}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{workingJobs.length}</p></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg"><CalendarIcon size={24} /></div>
          <div><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.incomingJobs}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{incomingJobs.length}</p></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><FileText size={24} /></div>
          <div><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.blCount}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{bls.length}</p></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><CalendarIcon size={18} className="text-blue-500" /> {t.calendarTitle}</h3>
            <div className="flex items-center gap-2"><p className="text-sm text-slate-500 dark:text-slate-400">{t.calendarSubtitle}</p>{isEditing && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">{t.dragTip}</span>}</div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span><span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t.legendIncoming}</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t.legendWorking}</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span><span className="text-xs font-bold text-slate-600 dark:text-slate-400">ETD</span></div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            {!isEditing ? (
              <button onClick={handleEnterEditMode} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-sm bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"><Edit2 size={16} />{t.editMode}</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancelEdit} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-sm bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"><X size={16} />{t.cancel}</button>
                <button onClick={handleSaveEdit} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-sm bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300"><Check size={16} />{t.doneMode}</button>
              </div>
            )}
            <button onClick={() => onOpenBriefing(currentDate)} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"><Printer size={16} /> {t.briefingMode}</button>
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-shadow text-slate-500 dark:text-slate-300"><ChevronLeft size={16} /></button>
              <span className="px-4 text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[100px] text-center">{currentDate.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', year: 'numeric' })}</span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-shadow text-slate-500 dark:text-slate-300"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {t.days.map((d: string) => <div key={d} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{d}</div>)}
            {renderCalendar()}
          </div>
        </div>
      </div>

      {selectedDateForModal && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDateForModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><CalendarIcon size={18} className="text-blue-500" /> {selectedDateForModal}</h3>
              <button onClick={() => setSelectedDateForModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {(() => {
                const { eta, etd } = getDayJobs(selectedDateForModal);
                const w = weatherData[selectedDateForModal];
                return (
                  <div className="space-y-4">
                    {w && (
                      <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mb-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Weather Info</h4>
                        <div className="flex items-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                          <span className={`flex items-center gap-1.5 ${w.waveHeight > 1.5 ? 'text-red-500 font-bold' : w.waveHeight > 1.0 ? 'text-amber-500 font-bold' : 'text-blue-500'}`}><Waves size={16} /> Wave: {w.waveHeight}m</span>
                          {w.precipitation > 0 && <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><CloudRain size={16} /> Rain ({w.precipitation}mm)</span>}
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">{t.legendIncoming} / {t.legendWorking}</h4>
                      {eta.length === 0 ? <p className="text-sm text-slate-400 italic">No incoming vessels</p> : <div className="space-y-2">{eta.map(j => renderJobItem(j, 'eta'))}</div>}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">ETD</h4>
                      {etd.length === 0 ? <p className="text-sm text-slate-400 italic">No departing vessels</p> : <div className="space-y-2">{etd.map(j => renderJobItem(j, 'etd'))}</div>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export const BriefingReport: React.FC<BriefingReportProps> = ({ jobs, bls, initialDate, language, logoUrl, reportLogoUrl, onUpdateBL, onUpdateLogo, onUpdateReportLogo, onResetReportLogo }) => {
  const t = translations[language];
  const {
    currentDate, briefingPeriod, setBriefingPeriod, selectedVesselIds, setSelectedVesselIds, modifiedBLs, customOrder,
    briefingJobs, availableJobsForFilter, handlePrev, handleNext, handleCellEdit, handleMoveRow
  } = useBriefingData(jobs, bls, initialDate);
  const { lockData, isReadOnly, handleForceEdit } = useBriefingLock(currentDate, briefingPeriod);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isVesselDropdownOpen, setIsVesselDropdownOpen] = useState(false);
  const vesselDropdownRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = async () => {
    if (!onUpdateBL || isReadOnly) return;
    setIsSaving(true);
    try {
      const updatesMap: Record<string, Partial<BLData>> = {};
      Object.keys(modifiedBLs).forEach(blId => {
        updatesMap[blId] = { ...modifiedBLs[blId] };
      });
      briefingJobs.forEach(job => {
        const currentOrder = customOrder[job.id];
        if (currentOrder) {
          currentOrder.forEach((blId, index) => {
            if (!updatesMap[blId]) updatesMap[blId] = {};
            updatesMap[blId].reportSortOrder = index;
          });
        }
      });
      const promises = Object.keys(updatesMap).map(blId => onUpdateBL(blId, updatesMap[blId]));
      await Promise.all(promises);
      alert(t.saved);
    } catch (e) {
      console.error(e);
      alert("Error saving report data.");
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeAlias = (bl: BLData): string => {
    if (bl.sourceType === 'FISCO') return '직납';
    if (bl.sourceType === 'THIRD_PARTY') return '3RD';
    if (bl.importSubClass === 'SHIPS_STORES') return '선용품';
    if (bl.importSubClass === 'RETURN_EXPORT') return '반송 수출';
    if (bl.cargoClass === 'IMPORT') return 'I';
    return 'T';
  };

  const toggleVesselSelection = (jobId: string) => setSelectedVesselIds(prev => prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]);
  const toggleAllVessels = () => setSelectedVesselIds([]);

  // ... (Summary Item Calculation and Rendering Logic is identical, effectively compressed via hooks)
  // ... (For brevity in this refactor request, reusing the previous logic but inside the clean component structure)
  // Re-implementing the summary generator locally as it depends on `modifiedBLs` state which is now hooked
  const getBriefingSummaries = (filteredJobs: VesselJob[]) => {
    return filteredJobs.flatMap(job => {
      const jobBLs = bls.filter(bl => bl.vesselJobId === job.id);
      jobBLs.sort((a, b) => {
        const orderA = a.reportSortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.reportSortOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.shipper.localeCompare(b.shipper);
      });

      return jobBLs.map(bl => {
        const edits = modifiedBLs[bl.id] || {};
        const items = bl.cargoItems || [];
        let totalQty = 0, totalWeight = 0, totalCbm = 0;

        if (bl.packingList && bl.packingList.totalPackageCount) totalQty = bl.packingList.totalPackageCount;
        else totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

        if (bl.packingList && bl.packingList.totalGrossWeight) totalWeight = bl.packingList.totalGrossWeight;
        else totalWeight = items.reduce((sum, i) => sum + (Number(i.grossWeight) || 0), 0);

        if (bl.packingList && bl.packingList.totalCbm) totalCbm = bl.packingList.totalCbm;
        else totalCbm = items.reduce((sum, i) => sum + (Number(i.measurement) || 0), 0);

        const containerList = items.map(i => i.containerNo ? `${i.containerNo}${i.containerType ? ` (${i.containerType})` : ''}` : '').filter(Boolean).join('\n');

        return {
          blId: bl.id, jobId: job.id, eta: bl.date || bl.arrivalNotice?.eta || job.eta, jobVesselName: job.vesselName, jobVoyage: job.voyageNo,
          blNumber: bl.blNumber, shipper: (edits.shipper || bl.shipper || '').toString(),
          description: (edits.reportDescription || bl.reportDescription || (items.length > 0 ? items[0].description : '') || '').toString(),
          quantity: edits.quantity !== undefined ? edits.quantity : (bl.quantity !== undefined ? bl.quantity : totalQty),
          packageType: edits.packageType || bl.packageType || (items.length > 0 ? items[0].packageType : 'PKGS'),
          grossWeight: edits.grossWeight !== undefined ? edits.grossWeight : (bl.grossWeight !== undefined ? bl.grossWeight : totalWeight),
          volume: edits.volume !== undefined ? edits.volume : (bl.volume !== undefined ? bl.volume : totalCbm),
          containerStr: containerList, hasBL: !!bl.fileUrl, hasINV: !!bl.commercialInvoice?.fileUrl, hasPL: !!bl.packingList?.fileUrl,
          itemVesselName: (edits.note || bl.note || '').toString(), typeAlias: getTypeAlias(bl),
          koreanForwarder: (edits.koreanForwarder || bl.koreanForwarder || '').toString(),
          transporter: (edits.reportTransporter || bl.reportTransporter || bl.transporterName || '').toString(),
          location: (edits.reportStorageLocation || bl.reportStorageLocation || bl.storageLocation || bl.arrivalNotice?.location || '').toString(),
          reportRemark: (edits.reportRemarks || bl.reportRemarks || bl.remarks || '').toString()
        };
      });
    });
  };

  const summaryItems = useMemo(() => getBriefingSummaries(briefingJobs), [briefingJobs, bls, modifiedBLs]);
  const dateLocale = language === 'cn' ? 'zh-CN' : language === 'ko' ? 'ko-KR' : 'en-US';
  const displayLogoUrl = reportLogoUrl || logoUrl;

  // Pagination Logic
  type RenderRow = { type: 'header', job: VesselJob } | { type: 'item', data: any, seqNo: number };
  const pages = useMemo(() => {
    const flatRows: RenderRow[] = [];
    briefingJobs.forEach(job => {
      const jobItems = summaryItems.filter(item => item.jobId === job.id);
      if (jobItems.length === 0) return;
      if (customOrder[job.id]) {
        const order = customOrder[job.id];
        jobItems.sort((a, b) => {
          const idxA = order.indexOf(a.blId); const idxB = order.indexOf(b.blId);
          if (idxA === -1 && idxB === -1) return 0; if (idxA === -1) return 1; if (idxB === -1) return -1;
          return idxA - idxB;
        });
      }
      flatRows.push({ type: 'header', job });
      jobItems.forEach((item, idx) => flatRows.push({ type: 'item', data: item, seqNo: idx + 1 }));
    });

    const _pages: RenderRow[][] = [];
    let currentPage: RenderRow[] = [];
    const ROWS_PER_PAGE = 7;

    for (let i = 0; i < flatRows.length; i++) {
      const row = flatRows[i];
      if (currentPage.length >= ROWS_PER_PAGE) { _pages.push(currentPage); currentPage = []; }
      if (row.type === 'header') {
        if (currentPage.length === ROWS_PER_PAGE - 1) { _pages.push(currentPage); currentPage = []; }
      }
      currentPage.push(row);
    }
    if (currentPage.length > 0) _pages.push(currentPage);
    return _pages;
  }, [briefingJobs, summaryItems, customOrder]);

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 print-container overflow-hidden">
      {isReadOnly && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex justify-between items-center text-amber-900 text-sm font-bold z-30 animate-fade-in no-print">
          <div className="flex items-center gap-2"><Lock size={16} /><span>{t.lockedTitle}: {t.lockedDesc} {lockData && <span className="ml-2 opacity-80 font-normal">({t.lockedBy} {lockData.userEmail})</span>}</span></div>
          <button onClick={handleForceEdit} className="text-xs bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded text-amber-900 border border-amber-300 transition-colors">{t.forceEdit}</button>
        </div>
      )}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-20 no-print">
        <div className="flex items-center gap-4">
          {/* Toolbar Content */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <button onClick={handlePrev} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><ChevronLeft size={16} /></button>
            <div className="px-3 text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums w-32 text-center">{briefingPeriod === 'month' ? currentDate.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' }) : currentDate.toLocaleDateString(dateLocale)}</div>
            <button onClick={handleNext} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><ChevronRight size={16} /></button>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <button onClick={() => setBriefingPeriod('week')} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${briefingPeriod === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>{t.weekly}</button>
            <button onClick={() => setBriefingPeriod('month')} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${briefingPeriod === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>{t.monthly}</button>
          </div>
          {/* Vessel Filter */}
          <div className="ml-4 relative" ref={vesselDropdownRef}>
            <button onClick={() => setIsVesselDropdownOpen(!isVesselDropdownOpen)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border-none text-sm font-medium rounded-lg px-3 py-1.5 hover:bg-slate-200 min-w-[140px] justify-between">
              <div className="flex items-center gap-2 truncate"><Filter size={16} className="text-slate-400 flex-shrink-0" /><span className="truncate">{selectedVesselIds.length === 0 ? t.allVessels : t.selectedVessels.replace('{count}', selectedVesselIds.length.toString())}</span></div><ChevronDown size={14} className="text-slate-400" />
            </button>
            {isVesselDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-fade-in-up">
                <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                  <div onClick={toggleAllVessels} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedVesselIds.length === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>{selectedVesselIds.length === 0 && <Check size={12} strokeWidth={3} />}</div>
                    <span className="text-sm font-bold">{t.allVessels}</span>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {availableJobsForFilter.map(job => (
                    <div key={job.id} onClick={() => toggleVesselSelection(job.id)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedVesselIds.includes(job.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>{selectedVesselIds.includes(job.id) && <Check size={12} strokeWidth={3} />}</div>
                      <span className="text-sm truncate">{job.vesselName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={isSaving || isReadOnly} className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95 text-sm font-bold ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}><Save size={18} /> {isSaving ? '...' : t.saveChanges}</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all active:scale-95 text-sm font-bold"><Printer size={18} /> {t.print}</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-8 bg-slate-100 dark:bg-slate-900 flex flex-col items-center gap-8 print:block print:p-0 print:m-0 print:bg-white print:overflow-visible">
        {pages.length === 0 ? <div className="text-center py-20 text-slate-400 italic">{t.noItems}</div> : pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="break-after-page bg-white shadow-xl relative text-black mx-auto transition-transform origin-top print:shadow-none print:m-0 print:transform-none print:border-none font-sans" style={{ width: '297mm', height: '208mm', padding: '10mm', transform: `scale(${zoomLevel})`, marginBottom: pageIndex === pages.length - 1 ? '0' : '20px' }}>
            {/* Page Header */}
            {pageIndex === 0 ? (
              <div className="flex justify-between items-end border-b-[3px] border-black pb-2 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-black rounded-lg flex items-center justify-center bg-white"><Ship size={28} className="text-black" strokeWidth={2} /></div>
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-black">{t.briefingTitle}</h1>
                    <p className="text-sm font-bold text-slate-600 mt-1">{t.period}: {briefingPeriod === 'month' ? currentDate.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' }) : `Week of ${currentDate.toLocaleDateString(dateLocale)}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-1 cursor-pointer group relative" onClick={() => !isReadOnly && logoInputRef.current?.click()}>
                    {!isReadOnly && <input type="file" className="hidden" ref={logoInputRef} onChange={(e) => { if (e.target.files?.[0] && onUpdateReportLogo) onUpdateReportLogo(e.target.files[0]) }} accept="image/*" />}
                    {!isReadOnly && <div className="absolute inset-0 -left-2 -right-2 bg-slate-100/80 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2 pointer-events-none no-print z-10 backdrop-blur-sm"><div className="flex gap-2 pointer-events-auto"><button className="p-1 bg-blue-100 text-blue-600 rounded"><Edit2 size={14} /></button>{reportLogoUrl && <button onClick={(e) => { e.stopPropagation(); if (onResetReportLogo) onResetReportLogo(); }} className="p-1 bg-red-100 text-red-600 rounded"><RefreshCw size={14} /></button>}</div></div>}
                    {displayLogoUrl ? <img src={displayLogoUrl} alt="Logo" className="h-8 w-auto object-contain max-w-[150px]" /> : <p className="font-black text-xl uppercase tracking-widest text-slate-900 leading-none">LOGI<span className="text-blue-600">1</span></p>}
                  </div>
                  <p className="text-[10px] text-black mt-1 font-mono font-bold text-right">{new Date().toLocaleDateString(dateLocale)}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-end border-b-2 border-slate-300 pb-1 mb-2 print:border-slate-300">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.briefingTitle} (Cont.)</span>
                <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString(dateLocale)}</span>
              </div>
            )}

            <div className="space-y-0">
              <table className="w-full border-collapse border border-black table-fixed text-[10px]">
                <colgroup><col className="w-[3%]" /><col className="w-[7%]" /><col className="w-[18%]" /><col className="w-[9%]" /><col className="w-[5%]" /><col className="w-[13%]" /><col className="w-[4%]" /><col className="w-[10%]" /><col className="w-[4%]" /><col className="w-[10%]" /><col className="w-[7%]" /><col className="w-[10%]" /></colgroup>
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold">{t.reportHeaderNo}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold whitespace-pre-wrap">{t.reportHeaderEta}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold whitespace-pre-wrap">{t.reportHeaderShipperDesc}</th>
                    <th colSpan={2} className="border border-black p-1 text-center align-middle font-bold">{t.reportHeaderQty}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold whitespace-pre-wrap">{t.reportHeaderBlCont}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold whitespace-pre-wrap">{t.reportHeaderDocs}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold">{t.reportHeaderVessel}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold">{t.reportHeaderType}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold">{t.reportHeaderTransporter}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold">{t.reportHeaderWarehouse}</th>
                    <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold">{t.reportHeaderRemark}</th>
                  </tr>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th className="border border-black p-1 text-center align-middle font-bold">重量 (Weight)</th>
                    <th className="border border-black p-1 text-center align-middle font-bold">体积 (Vol)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    if (row.type === 'header') {
                      return <tr key={`header-${row.job.id}`} className="bg-slate-200 print:bg-slate-200"><td colSpan={13} className="border border-black px-2 py-1 align-top"><div className="flex justify-between items-center font-bold text-xs uppercase tracking-wide"><span>{row.job.vesselName} ({row.job.voyageNo.slice(-3)})</span><div className="flex gap-4 font-mono"><span>VOY: {row.job.voyageNo}</span><span>ETA: {row.job.eta}</span></div></div></td></tr>;
                    } else {
                      const item = row.data;
                      return (
                        <tr key={item.blId} className="align-top group/row">
                          <td className="border border-black p-1 text-center align-top font-bold relative group">{row.seqNo}<div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden gap-0.5"><button onClick={(e) => { e.stopPropagation(); handleMoveRow(item.jobId, item.blId, 'up', summaryItems); }} className="h-3 flex items-center justify-center bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-r"><ChevronUp size={8} /></button><button onClick={(e) => { e.stopPropagation(); handleMoveRow(item.jobId, item.blId, 'down', summaryItems); }} className="h-3 flex items-center justify-center bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-r"><ChevronDown size={8} /></button></div></td>
                          <td className="border border-black p-1 text-center align-top whitespace-pre-wrap break-words font-medium leading-tight text-[9px]">{item.eta}</td>
                          <td className="border border-black p-0 relative align-top"><div className="flex flex-col"><AutoResizeTextarea value={item.shipper} onChange={(e) => handleCellEdit(item.blId, 'shipper', e.target.value)} readOnly={isReadOnly} className="w-full bg-transparent border-b border-dashed border-gray-300 p-1 font-bold text-[10px] focus:bg-yellow-50 outline-none" placeholder="Shipper" /><AutoResizeTextarea value={item.description} onChange={(e) => handleCellEdit(item.blId, 'reportDescription', e.target.value)} readOnly={isReadOnly} className="w-full bg-transparent p-1 font-medium text-[9px] focus:bg-yellow-50 outline-none" placeholder="Description" /></div></td>
                          <td className="border border-black p-0 align-top"><div className="flex flex-col"><div className="p-1 border-b border-dashed border-gray-300 flex justify-center items-center"><input className="w-full bg-transparent text-center font-bold outline-none focus:bg-yellow-50 text-[10px]" value={item.quantity} onChange={(e) => handleCellEdit(item.blId, 'quantity', Number(e.target.value))} readOnly={isReadOnly} /></div><div className="p-1 flex justify-center items-center"><input className="w-full bg-transparent text-center outline-none focus:bg-yellow-50 text-[9px]" value={item.grossWeight} onChange={(e) => handleCellEdit(item.blId, 'grossWeight', Number(e.target.value))} readOnly={isReadOnly} /></div></div></td>
                          <td className="border border-black p-0 align-top"><div className="flex flex-col"><div className="p-1 border-b border-dashed border-gray-300 flex justify-center items-center"><input className="w-full bg-transparent text-center outline-none focus:bg-yellow-50 text-[9px]" value={item.packageType} onChange={(e) => handleCellEdit(item.blId, 'packageType', e.target.value)} readOnly={isReadOnly} /></div><div className="p-1 flex justify-center items-center"><input className="w-full bg-transparent text-center outline-none focus:bg-yellow-50 text-[9px]" value={item.volume} onChange={(e) => handleCellEdit(item.blId, 'volume', Number(e.target.value))} readOnly={isReadOnly} /></div></div></td>
                          <td className="border border-black p-1 text-center align-top whitespace-pre-wrap break-all text-[8px] leading-tight font-mono"><span className="font-bold block mb-1">{item.blNumber}</span><span className="text-slate-600 block">{item.containerStr}</span></td>
                          <td className="border border-black p-1 text-center align-top"><div className="flex flex-col gap-1 text-[8px] font-bold"><span className={item.hasBL ? "text-black" : "text-gray-300"}>BL</span><span className={item.hasINV ? "text-black" : "text-gray-300"}>INV</span><span className={item.hasPL ? "text-black" : "text-gray-300"}>PL</span></div></td>
                          <td className="border border-black p-0 align-top"><AutoResizeTextarea value={item.itemVesselName} onChange={(e) => handleCellEdit(item.blId, 'note', e.target.value)} readOnly={isReadOnly} className="w-full bg-transparent p-1 text-center focus:bg-yellow-50 outline-none text-[9px] break-words whitespace-normal" /></td>
                          <td className="border border-black p-0 align-top font-bold text-[9px]"><input className="w-full bg-transparent text-center outline-none border-b border-dashed border-transparent focus:border-blue-500 focus:bg-yellow-50" value={item.typeAlias} readOnly={true} /></td>
                          <td className="border border-black p-0 align-top text-[9px]"><div className="flex flex-col p-1 gap-1"><div className="flex items-center gap-1"><span className="text-[8px] font-bold text-gray-500">FWD:</span><input className="flex-1 bg-transparent border-b border-gray-200 outline-none focus:bg-yellow-50 min-w-0" value={item.koreanForwarder} onChange={(e) => handleCellEdit(item.blId, 'koreanForwarder', e.target.value)} readOnly={isReadOnly} /></div><div className="flex items-center gap-1"><span className="text-[8px] font-bold text-gray-500">TRK:</span><input className="flex-1 bg-transparent outline-none focus:bg-yellow-50 min-w-0" value={item.transporter} onChange={(e) => handleCellEdit(item.blId, 'reportTransporter', e.target.value)} readOnly={isReadOnly} /></div></div></td>
                          <td className="border border-black p-0 align-top"><AutoResizeTextarea value={item.location} onChange={(e) => handleCellEdit(item.blId, 'reportStorageLocation', e.target.value)} readOnly={isReadOnly} className="w-full bg-transparent p-1 text-center focus:bg-yellow-50 outline-none text-[9px] break-words" /></td>
                          <td className="border border-black p-0 align-top"><AutoResizeTextarea value={item.reportRemark} onChange={(e) => handleCellEdit(item.blId, 'reportRemarks', e.target.value)} readOnly={isReadOnly} className="w-full bg-transparent p-1 text-center focus:bg-yellow-50 outline-none text-[9px] break-words" /></td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
            <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[8px] text-gray-500 uppercase tracking-wider font-mono">
              <p>{t.systemGenerated}: {new Date().toISOString()}</p>
              <p>{t.page} {pageIndex + 1} / {pages.length}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
