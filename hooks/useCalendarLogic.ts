
import { useState, useRef, useMemo, useEffect } from 'react';
import { VesselJob } from '../types';
import { fetchBusanWeather, WeatherData } from '../services/weatherService';

export const useCalendarLogic = (jobs: VesselJob[], onUpdateJob?: (id: string, updates: Partial<VesselJob>) => void) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [isEditing, setIsEditing] = useState(false);
  
  const dragHighlightRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<VesselJob[]>([]);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const loadWeather = async () => {
        const data = await fetchBusanWeather(currentDate.getFullYear(), currentDate.getMonth());
        setWeatherData(data);
    };
    loadWeather();
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDragStart = () => {};

  const handleDrag = (event: any, info: any) => {
      const elements = document.elementsFromPoint(info.point.x, info.point.y);
      const cell = elements.find(el => el.hasAttribute('data-date')) as HTMLDivElement | undefined;
      
      if (dragHighlightRef.current && dragHighlightRef.current !== cell) {
          dragHighlightRef.current.classList.remove('bg-blue-100', 'dark:bg-blue-800/50', 'ring-2', 'ring-blue-400');
          dragHighlightRef.current = null;
      }

      if (cell) {
          cell.classList.add('bg-blue-100', 'dark:bg-blue-800/50', 'ring-2', 'ring-blue-400');
          dragHighlightRef.current = cell;
      }
  };

  const handleDragEnd = (event: any, info: any, job: VesselJob, type: 'eta' | 'etd') => {
      if (dragHighlightRef.current) {
          dragHighlightRef.current.classList.remove('bg-blue-100', 'dark:bg-blue-800/50', 'ring-2', 'ring-blue-400');
          dragHighlightRef.current = null;
      }

      const elements = document.elementsFromPoint(info.point.x, info.point.y);
      const cell = elements.find(el => el.hasAttribute('data-date')) as HTMLDivElement | undefined;

      if (cell) {
          const newDate = cell.getAttribute('data-date');
          if (newDate && onUpdateJob) {
              const updates: Partial<VesselJob> = {};
              if (type === 'eta' && job.eta !== newDate) {
                  updates.eta = newDate;
              } else if (type === 'etd' && job.etd !== newDate) {
                  updates.etd = newDate;
              }

              if (Object.keys(updates).length > 0) {
                  onUpdateJob(job.id, updates);
              }
          }
      }
  };

  const handleEnterEditMode = () => {
      snapshotRef.current = JSON.parse(JSON.stringify(jobs));
      setIsEditing(true);
  };

  const handleSaveEdit = () => {
      setIsEditing(false);
      snapshotRef.current = [];
  };

  const handleCancelEdit = () => {
      if (onUpdateJob && snapshotRef.current.length > 0) {
          jobs.forEach(currentJob => {
              const original = snapshotRef.current.find(j => j.id === currentJob.id);
              if (original) {
                  const updates: Partial<VesselJob> = {};
                  let needsRevert = false;

                  if (original.eta !== currentJob.eta) {
                      updates.eta = original.eta;
                      needsRevert = true;
                  }
                  if (original.etd !== currentJob.etd) {
                      updates.etd = original.etd;
                      needsRevert = true;
                  }

                  if (needsRevert) {
                      onUpdateJob(currentJob.id, updates);
                  }
              }
          });
      }
      setIsEditing(false);
      snapshotRef.current = [];
  };

  return {
    currentDate,
    selectedDateForModal, setSelectedDateForModal,
    weatherData,
    isEditing,
    prevMonth, nextMonth,
    handleDragStart, handleDrag, handleDragEnd,
    handleEnterEditMode, handleSaveEdit, handleCancelEdit,
    today
  };
};
