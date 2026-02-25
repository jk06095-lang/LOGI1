
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { VesselJob, Language, JobStatus, BLData, ShipRegistry } from '../types';
import { Folder, Plus, Ship, MoreVertical, FileText, Calendar, Trash2, Edit, PackageCheck, Truck, Anchor, Search, ArrowUpDown, ArrowRightCircle, CheckCircle, X } from 'lucide-react';

interface VesselListProps {
  jobs: VesselJob[];
  // We need access to all BLs to calculate detailed counts
  allBLs: BLData[];
  shipRegistries: ShipRegistry[];
  onSelectJob: (jobId: string) => void;
  onCreateJob: (job: Omit<VesselJob, 'id'>) => void;
  onUpdateJob: (jobId: string, updates: Partial<VesselJob>) => void;
  onDeleteJob: (jobId: string) => void;
  getBLCount: (jobId: string) => number; // Legacy, kept for compatibility
  getTotalWeight: (jobId: string) => number;
  language: Language;
}

const translations = {
  ko: {
    title: '선박 목록',
    subtitle: '진행 중인 선박 업무 및 화물(환적/피스코/타업체) 일정을 관리합니다.',
    working: '작업 중',
    incoming: '입항 예정',
    completed: '완료됨',
    newVessel: '새 선박 추가',
    eta: 'ETA',
    etd: 'ETD',
    modalTitle: '새 선박 등록',
    editTitle: '선박 정보 수정',
    vesselName: '선박명',
    voyage: '항차 (Voyage)',
    etaLabel: '입항예정일 (ETA)',
    etdLabel: '출항예정일 (ETD)',
    statusLabel: '상태',
    cancel: '취소',
    submit: '등록하기',
    save: '저장하기',
    placeholderName: 'e.g. ZHONG TAI NO.3',
    placeholderVoyage: 'e.g. V.123W',
    deleteConfirm: '정말 삭제하시겠습니까? 연결된 데이터는 미배정 상태가 됩니다.',
    transit: '환적',
    fisco: '피스코',
    other: '타업체',
    docs: '건 (Docs)',
    ton: '톤',
    edit: '수정 (Edit)',
    delete: '삭제 (Delete)',
    totalDocs: '전체 문서',
    searchPlaceholder: '선박명 또는 항차 검색...',
    sortCreatedDesc: '최신 등록순',
    sortEtaAsc: '입항일 빠른순',
    sortEtaDesc: '입항일 늦은순',
    sortNameAsc: '이름순 (A-Z)'
  },
  en: {
    title: 'Vessel Management',
    subtitle: 'Manage active vessel jobs and cargo schedules (Transit/Fisco/3rd Party).',
    working: 'Working',
    incoming: 'Incoming',
    completed: 'Completed',
    newVessel: 'New Vessel',
    eta: 'ETA',
    etd: 'ETD',
    modalTitle: 'Register New Vessel',
    editTitle: 'Edit Vessel Info',
    vesselName: 'Vessel Name',
    voyage: 'Voyage No.',
    etaLabel: 'ETA Date',
    etdLabel: 'ETD Date',
    statusLabel: 'Status',
    cancel: 'Cancel',
    submit: 'Register',
    save: 'Save Changes',
    placeholderName: 'e.g. ZHONG TAI NO.3',
    placeholderVoyage: 'e.g. V.123W',
    deleteConfirm: 'Are you sure you want to delete this job?',
    transit: 'Transit',
    fisco: 'FISCO',
    other: '3rd Party',
    docs: 'Docs',
    ton: 'ton',
    edit: 'Edit',
    delete: 'Delete',
    totalDocs: 'Total Docs',
    searchPlaceholder: 'Search Vessel or Voyage...',
    sortCreatedDesc: 'Newest Created',
    sortEtaAsc: 'ETA (Earliest)',
    sortEtaDesc: 'ETA (Latest)',
    sortNameAsc: 'Name (A-Z)'
  },
  cn: {
    title: '船舶管理',
    subtitle: '管理当前船舶任务和货物计划（中转/自营/第三方）。',
    working: '作业中',
    incoming: '预计抵港',
    completed: '已完成',
    newVessel: '添加新船舶',
    eta: '预计抵港',
    etd: '预计离港',
    modalTitle: '注册新船舶',
    editTitle: '修改船舶信息',
    vesselName: '船名',
    voyage: '航次',
    etaLabel: '预计抵港日期',
    etdLabel: '预计离港日期',
    statusLabel: '状态',
    cancel: '取消',
    submit: '确认注册',
    save: '保存更改',
    placeholderName: '例如 ZHONG TAI NO.3',
    placeholderVoyage: '例如 V.123W',
    deleteConfirm: '确定要删除吗？相关数据将变为未分配状态。',
    transit: '中转',
    fisco: '自营',
    other: '第三方',
    docs: '份',
    ton: '吨',
    edit: '编辑',
    delete: '删除',
    totalDocs: '总文档',
    searchPlaceholder: '搜索船名或航次...',
    sortCreatedDesc: '最新创建',
    sortEtaAsc: '抵港日期 (最早)',
    sortEtaDesc: '抵港日期 (最晚)',
    sortNameAsc: '名称 (A-Z)'
  }
};

type SortOption = 'created_desc' | 'eta_asc' | 'eta_desc' | 'name_asc';

export const VesselList: React.FC<VesselListProps> = ({
  jobs, allBLs, shipRegistries, onSelectJob, onCreateJob, onUpdateJob, onDeleteJob, getBLCount, getTotalWeight, language
}) => {
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<VesselJob | null>(null);

  const [newJobForm, setNewJobForm] = useState({ name: '', voyage: '', eta: '', etd: '' });

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('created_desc');

  // Dropdown State
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // Helper to get detailed counts
  const getJobStats = (jobId: string) => {
    const jobBLs = allBLs.filter(bl => bl.vesselJobId === jobId);
    return {
      transit: jobBLs.filter(bl => bl.sourceType === 'TRANSIT').length,
      pisco: jobBLs.filter(bl => bl.sourceType === 'FISCO').length,
      thirdParty: jobBLs.filter(bl => bl.sourceType === 'THIRD_PARTY').length,
      totalWeight: jobBLs.reduce((sum, bl) => sum + bl.cargoItems.reduce((cSum, i) => cSum + (i.grossWeight || 0), 0), 0)
    };
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: Omit<VesselJob, 'id'> = {
      vesselName: newJobForm.name,
      voyageNo: newJobForm.voyage,
      eta: newJobForm.eta,
      etd: newJobForm.etd,
      status: 'incoming',
      notes: '',
      createdAt: new Date().toISOString()
    };
    onCreateJob(newJob);
    setShowNewJobModal(false);
    setNewJobForm({ name: '', voyage: '', eta: '', etd: '' });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    onUpdateJob(editingJob.id, editingJob);
    setShowEditJobModal(false);
    setEditingJob(null);
  };

  const handleDeleteClick = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t.deleteConfirm)) {
      onDeleteJob(jobId);
      setOpenDropdownId(null);
    }
  };

  const handleEditClick = (job: VesselJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingJob(job);
    setShowEditJobModal(true);
    setOpenDropdownId(null);
  };

  const toggleDropdown = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === jobId ? null : jobId);
  };

  // Filter and Sort Jobs
  const filteredAndSortedJobs = useMemo(() => {
    let result = jobs;

    // Filter
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(j => {
        if (j.vesselName.toLowerCase().includes(lowerTerm) || j.voyageNo.toLowerCase().includes(lowerTerm)) return true;

        // Search in ShipRegistry
        const reg = shipRegistries.find(r => r.vesselName.toLowerCase() === j.vesselName.toLowerCase());
        if (reg) {
          if (reg.callSign?.toLowerCase().includes(lowerTerm)) return true;
          if (reg.imoNumber?.toLowerCase().includes(lowerTerm)) return true;
        }
        return false;
      });
    }

    // Sort
    return [...result].sort((a, b) => {
      switch (sortOrder) {
        case 'eta_asc':
          return new Date(a.eta).getTime() - new Date(b.eta).getTime();
        case 'eta_desc':
          return new Date(b.eta).getTime() - new Date(a.eta).getTime();
        case 'name_asc':
          return a.vesselName.localeCompare(b.vesselName);
        case 'created_desc':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  }, [jobs, searchTerm, sortOrder]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 animate-fade-in space-y-6 dark:text-slate-200">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Ship size={24} className="text-blue-600" />
          {t.title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Toolbar: Search and Sort */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
          />
        </div>

        <div className="flex gap-4">
          <div className="relative min-w-[180px]">
            <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOption)}
              className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
            >
              <option value="created_desc">{t.sortCreatedDesc}</option>
              <option value="eta_asc">{t.sortEtaAsc}</option>
              <option value="eta_desc">{t.sortEtaDesc}</option>
              <option value="name_asc">{t.sortNameAsc}</option>
            </select>
          </div>

          <button
            onClick={() => setShowNewJobModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} />
            {t.newVessel}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedJobs.map((job) => {
          const stats = getJobStats(job.id);
          return (
            <div
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col min-h-[16rem] relative overflow-visible z-10 hover:z-20"
            >
              <div className="p-5 flex-1 relative">
                {/* Decorative Icon */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity dark:opacity-10 dark:text-white pointer-events-none">
                  <Ship size={80} />
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide
                        ${job.status === 'working' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                      job.status === 'completed' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'}`}>
                    {job.status === 'working' ? t.working : job.status === 'incoming' ? t.incoming : t.completed}
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => toggleDropdown(job.id, e)}
                      className={`p-1.5 rounded-full transition-colors ${openDropdownId === job.id ? 'bg-slate-100 text-slate-600 dark:bg-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openDropdownId === job.id && (
                      <div ref={dropdownRef} className="absolute right-0 top-8 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-fade-in origin-top-right">
                        <div className="py-1">
                          <button
                            onClick={(e) => handleEditClick(job, e)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                          >
                            <Edit size={14} className="text-slate-500" />
                            {t.edit}
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(job.id, e)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors font-medium"
                          >
                            <Trash2 size={14} />
                            {t.delete}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 truncate pr-8" title={job.vesselName}>
                  {job.vesselName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">Voy. {job.voyageNo}</p>

                <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-700/30 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-blue-400" /> {t.eta}</span>
                    <span className="font-bold">{job.eta || '-'}</span>
                  </div>
                  {job.etd && (
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-600 pt-1 mt-1">
                      <span className="flex items-center gap-1"><ArrowRightCircle size={12} className="text-amber-500" /> {t.etd}</span>
                      <span className="font-bold">{job.etd}</span>
                    </div>
                  )}
                </div>

                {/* Detailed Counts */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center border border-slate-100 dark:border-slate-700">
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase truncate">{t.transit}</span>
                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">{stats.transit}</span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center border border-blue-100 dark:border-blue-800">
                    <span className="block text-[10px] text-blue-400 font-semibold uppercase truncate">{t.fisco}</span>
                    <span className="block text-sm font-bold text-blue-700 dark:text-blue-300">{stats.pisco}</span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center border border-amber-100 dark:border-amber-800">
                    <span className="block text-[10px] text-amber-500 font-semibold uppercase truncate">{t.other}</span>
                    <span className="block text-sm font-bold text-amber-700 dark:text-amber-300">{stats.thirdParty}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-b-xl">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <PackageCheck size={14} />
                  <span>{stats.transit + stats.pisco + stats.thirdParty} {t.docs}</span>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Anchor size={12} />
                  {Math.round(stats.totalWeight / 1000).toLocaleString()} {t.ton}
                </div>
              </div>
            </div>
          );
        })}

        {!searchTerm && (
          <button
            onClick={() => setShowNewJobModal(true)}
            className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all min-h-[16rem] gap-3 group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-800 flex items-center justify-center transition-colors">
              <Plus size={24} />
            </div>
            <span className="font-medium">{t.newVessel}</span>
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showNewJobModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-700">

            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 flex justify-between items-start text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Ship size={120} className="transform rotate-12 -translate-y-4" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5 backdrop-blur-md shadow-inner border border-white/20">
                  <Ship size={28} className="text-white" />
                </div>
                <h3 className="font-black text-3xl tracking-tight mb-2">{t.modalTitle}</h3>
                <p className="text-blue-100/90 text-sm font-medium leading-relaxed max-w-[80%]">새로운 선박 업무를 등록하고 화물을 관리하세요. 기존에 등록된 선박은 제원 데이터가 자동 연동됩니다.</p>
              </div>
              <button onClick={() => setShowNewJobModal(false)} className="relative z-10 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 p-2.5 rounded-full transition-all hover:scale-105 active:scale-95">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-8 space-y-6 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.vesselName}</label>
                <input
                  required
                  type="text"
                  value={newJobForm.name}
                  onChange={e => setNewJobForm({ ...newJobForm, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-semibold text-lg dark:text-white"
                  placeholder={t.placeholderName}
                />
              </div>

              {/* Conditional Match Display with Premium Look */}
              {(() => {
                const reg = shipRegistries.find(r => r.vesselName.toLowerCase() === newJobForm.name.trim().toLowerCase());
                if (reg && newJobForm.name.trim() !== '') {
                  return (
                    <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 dark:from-emerald-900/40 dark:to-emerald-800/20 dark:border-emerald-700/50 rounded-xl p-4 flex gap-4 animate-fade-in shadow-inner">
                      <div className="w-10 h-10 bg-emerald-500 shadow-md shadow-emerald-500/30 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <CheckCircle size={20} className="drop-shadow" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm tracking-tight mb-0.5">등록된 제원 데이터 무결성 연동</p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 font-medium">국적증서 및 국제톤수증서 데이터가 현재 업무와 자동으로 연결됩니다.</p>

                        {(reg.callSign || reg.imoNumber || reg.grossTonnage) && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {reg.callSign && <span className="px-2 py-1 bg-white/60 dark:bg-slate-900/50 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Call Sign: {reg.callSign}</span>}
                            {reg.imoNumber && <span className="px-2 py-1 bg-white/60 dark:bg-slate-900/50 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">IMO: {reg.imoNumber}</span>}
                            {reg.grossTonnage && <span className="px-2 py-1 bg-white/60 dark:bg-slate-900/50 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Gross Tonnage: {reg.grossTonnage}t</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.voyage}</label>
                  <input
                    required
                    type="text"
                    value={newJobForm.voyage}
                    onChange={e => setNewJobForm({ ...newJobForm, voyage: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium text-slate-900 dark:text-white"
                    placeholder={t.placeholderVoyage}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.etaLabel}</label>
                  <input
                    required
                    type="date"
                    value={newJobForm.eta}
                    onChange={e => setNewJobForm({ ...newJobForm, eta: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium text-slate-900 dark:text-white dark:scheme-dark"
                  />
                </div>
              </div>
              {/* ETD Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.etdLabel}</label>
                <input
                  type="date"
                  value={newJobForm.etd}
                  onChange={e => setNewJobForm({ ...newJobForm, etd: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium text-slate-900 dark:text-white dark:scheme-dark"
                />
              </div>

              <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-200 dark:border-slate-700/50">
                <button type="button" onClick={() => setShowNewJobModal(false)} className="px-5 py-3.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all text-sm">
                  {t.cancel}
                </button>
                <button type="submit" className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm active:scale-95 flex items-center gap-2">
                  <CheckCircle size={18} /> {t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditJobModal && editingJob && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-700">

            {/* Premium Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 flex justify-between items-start text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Edit size={120} className="transform rotate-12 -translate-y-4" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5 backdrop-blur-md shadow-inner border border-white/20">
                  <Edit size={28} className="text-white" />
                </div>
                <h3 className="font-black text-3xl tracking-tight mb-2">{t.editTitle}</h3>
                <p className="text-indigo-100/90 text-sm font-medium leading-relaxed max-w-[80%]">업무 정보를 수정합니다. 선명 수정 시 제원 데이터가 다시 매칭될 수 있습니다.</p>
              </div>
              <button onClick={() => setShowEditJobModal(false)} className="relative z-10 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 p-2.5 rounded-full transition-all hover:scale-105 active:scale-95">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-8 space-y-6 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.vesselName}</label>
                <input
                  required
                  type="text"
                  value={editingJob.vesselName}
                  onChange={e => setEditingJob({ ...editingJob, vesselName: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-semibold text-lg dark:text-white"
                />
              </div>

              {/* Conditional Match Display with Premium Look */}
              {(() => {
                if (editingJob && editingJob.vesselName.trim() !== '') {
                  const reg = shipRegistries.find(r => r.vesselName.toLowerCase() === editingJob.vesselName.trim().toLowerCase());
                  if (reg) {
                    return (
                      <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 dark:from-emerald-900/40 dark:to-emerald-800/20 dark:border-emerald-700/50 rounded-xl p-4 flex gap-4 animate-fade-in shadow-inner">
                        <div className="w-10 h-10 bg-emerald-500 shadow-md shadow-emerald-500/30 rounded-full flex items-center justify-center text-white flex-shrink-0">
                          <CheckCircle size={20} className="drop-shadow" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm tracking-tight mb-0.5">등록된 제원 데이터 무결성 연동</p>
                          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 font-medium">국적증서 및 국제톤수증서 데이터가 현재 업무와 자동으로 연결됩니다.</p>

                          {(reg.callSign || reg.imoNumber || reg.grossTonnage) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {reg.callSign && <span className="px-2 py-1 bg-white/60 dark:bg-slate-900/50 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Call Sign: {reg.callSign}</span>}
                              {reg.imoNumber && <span className="px-2 py-1 bg-white/60 dark:bg-slate-900/50 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">IMO: {reg.imoNumber}</span>}
                              {reg.grossTonnage && <span className="px-2 py-1 bg-white/60 dark:bg-slate-900/50 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Gross Tonnage: {reg.grossTonnage}t</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.voyage}</label>
                  <input
                    required
                    type="text"
                    value={editingJob.voyageNo}
                    onChange={e => setEditingJob({ ...editingJob, voyageNo: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.etaLabel}</label>
                  <input
                    required
                    type="date"
                    value={editingJob.eta}
                    onChange={e => setEditingJob({ ...editingJob, eta: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium text-slate-900 dark:text-white dark:scheme-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.etdLabel}</label>
                <input
                  type="date"
                  value={editingJob.etd || ''}
                  onChange={e => setEditingJob({ ...editingJob, etd: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium text-slate-900 dark:text-white dark:scheme-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{t.statusLabel}</label>
                <select
                  value={editingJob.status}
                  onChange={e => setEditingJob({ ...editingJob, status: e.target.value as JobStatus })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="incoming">{t.incoming}</option>
                  <option value="working">{t.working}</option>
                  <option value="completed">{t.completed}</option>
                </select>
              </div>

              <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-200 dark:border-slate-700/50">
                <button type="button" onClick={() => setShowEditJobModal(false)} className="px-5 py-3.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all text-sm">
                  {t.cancel}
                </button>
                <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all text-sm active:scale-95 flex items-center gap-2">
                  <CheckCircle size={18} /> {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
