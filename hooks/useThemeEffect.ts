
import { useEffect } from 'react';
import { AppSettings } from '../types';

export const useThemeEffect = (settings: AppSettings) => {
  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    const fontClass = settings.fontStyle === 'serif' ? 'font-serif' : settings.fontStyle === 'mono' ? 'font-mono' : 'font-sans';
    document.body.className = `${fontClass} text-slate-900 dark:text-slate-100 transition-colors duration-200 antialiased`;
    
    const root = document.documentElement;
    switch(settings.fontSize) {
      case 'small': root.style.fontSize = '14px'; break;
      case 'large': root.style.fontSize = '18px'; break;
      case 'xl': root.style.fontSize = '20px'; break;
      default: root.style.fontSize = '16px'; 
    }
  }, [settings.theme, settings.fontStyle, settings.fontSize]);
};
