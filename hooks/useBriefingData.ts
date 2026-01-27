
import { useState, useMemo } from 'react';
import { VesselJob, BLData } from '../types';

export const useBriefingData = (jobs: VesselJob[], bls: BLData[], initialDate: Date) => {
  const [currentDate, setCurrentDate] = useState(new Date(initialDate));
  const [briefingPeriod, setBriefingPeriod] = useState<'week' | 'month'>('month');
  const [selectedVesselIds, setSelectedVesselIds] = useState<string[]>([]);
  const [modifiedBLs, setModifiedBLs] = useState<Record<string, Partial<BLData>>>({});
  const [customOrder, setCustomOrder] = useState<Record<string, string[]>>({});

  const handlePrev = () => {
    const d = new Date(currentDate);
    if(briefingPeriod === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
    setModifiedBLs({}); 
  };
  
  const handleNext = () => {
    const d = new Date(currentDate);
    if(briefingPeriod === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
    setModifiedBLs({});
  };

  // Filter jobs based on date and selection
  const briefingJobs = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    let filtered = jobs;
    if (briefingPeriod === 'month') {
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.eta);
        return !isNaN(jobDate.getTime()) && jobDate.getFullYear() === currentYear && jobDate.getMonth() === currentMonth;
      });
    } else {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 7);
      filtered = filtered.filter(job => {
        const d = new Date(job.eta);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
    }
    if (selectedVesselIds.length > 0) {
        filtered = filtered.filter(job => selectedVesselIds.includes(job.id));
    }
    // Sort: ETA Ascending
    return filtered.sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime());
  }, [jobs, currentDate, briefingPeriod, selectedVesselIds]);

  const availableJobsForFilter = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    let filtered = jobs;
    
    if (briefingPeriod === 'month') {
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.eta);
        return !isNaN(jobDate.getTime()) && jobDate.getFullYear() === currentYear && jobDate.getMonth() === currentMonth;
      });
    } else {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 7);
      filtered = filtered.filter(job => {
        const d = new Date(job.eta);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
    }
    
    filtered.sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime());
    return filtered;
  }, [jobs, currentDate, briefingPeriod]);

  const handleCellEdit = (blId: string, field: string, value: any) => {
      setModifiedBLs(prev => ({
          ...prev,
          [blId]: { ...(prev[blId] || {}), [field]: value }
      }));
  };

  const handleMoveRow = (jobId: string, blId: string, direction: 'up' | 'down', currentSummaryItems: any[]) => {
      let jobItems = currentSummaryItems.filter(item => item.jobId === jobId);
      let currentOrder = customOrder[jobId] || jobItems.map(i => i.blId);
      
      const itemIds = jobItems.map(i => i.blId);
      currentOrder = currentOrder.filter(id => itemIds.includes(id));
      const newIds = itemIds.filter(id => !currentOrder.includes(id));
      currentOrder = [...currentOrder, ...newIds];

      const index = currentOrder.indexOf(blId);
      if (index === -1) return;

      if (direction === 'up') {
          if (index === 0) return;
          [currentOrder[index], currentOrder[index - 1]] = [currentOrder[index - 1], currentOrder[index]];
      } else {
          if (index === currentOrder.length - 1) return;
          [currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]];
      }

      setCustomOrder(prev => ({ ...prev, [jobId]: currentOrder }));
  };

  return {
      currentDate, setCurrentDate,
      briefingPeriod, setBriefingPeriod,
      selectedVesselIds, setSelectedVesselIds,
      modifiedBLs, setModifiedBLs,
      customOrder, setCustomOrder,
      briefingJobs, availableJobsForFilter,
      handlePrev, handleNext, handleCellEdit, handleMoveRow
  };
};
