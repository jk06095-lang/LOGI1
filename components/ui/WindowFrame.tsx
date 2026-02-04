
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { X, Minus } from 'lucide-react';
import { TriggerRect } from '../../types';

interface WindowFrameProps {
    id: string;
    isOpen: boolean;
    isMinimized: boolean;
    onClose: () => void;
    onMinimize: () => void;
    title?: React.ReactNode;
    triggerRect?: TriggerRect;
    zIndex: number;
    initialWidth?: number;
    initialHeight?: number;
    minWidth?: number;
    minHeight?: number;
    children: React.ReactNode;
    headerContent?: React.ReactNode;
    className?: string;
    sidebarWidth?: number;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
    id,
    isOpen,
    isMinimized,
    onClose,
    onMinimize,
    title,
    triggerRect,
    zIndex,
    initialWidth = 380,
    initialHeight = 600,
    minWidth = 300,
    minHeight = 400,
    children,
    headerContent,
    className = "",
    sidebarWidth = 64
}) => {
    const [isMaximized, setIsMaximized] = useState(false);

    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const maxDimensions = useMemo(() => {
        return {
            width: windowSize.width - 40,
            height: windowSize.height - 40
        };
    }, [windowSize]);

    const currentDimensions = useMemo(() => {
        if (isMaximized) return maxDimensions;
        return { width: initialWidth, height: initialHeight };
    }, [isMaximized, maxDimensions, initialWidth, initialHeight]);

    const variants: Variants = useMemo(() => {
        // Fallback if no trigger rect (fade in center)
        if (!triggerRect) {
            return {
                initial: { opacity: 0, scale: 0.9, y: 20, x: 0 },
                animate: {
                    opacity: isMinimized ? 0 : 1,
                    scale: isMinimized ? 0.9 : 1,
                    y: 0,
                    x: 0, // Ensure it's centered or positioned correctly
                    width: currentDimensions.width,
                    height: currentDimensions.height,
                    borderRadius: "1.5rem",
                    transition: { type: "spring", stiffness: 300, damping: 25 }
                },
                exit: { opacity: 0, scale: 0.9, y: 20 }
            };
        }

        // GENIE EFFECT
        return {
            initial: {
                position: "fixed",
                top: triggerRect.y,
                left: triggerRect.x,
                width: triggerRect.width,
                height: triggerRect.height,
                opacity: 0,
                scale: 0,
                borderRadius: "100px",
            },
            animate: {
                position: "fixed",
                top: isMaximized ? 20 : "auto", // Center vertically if max, or let drag handle it? 
                // Logic tweak: For maximize to work nicely with drag, we usually want centered or specific coords.
                // For now, let's fix it to bottom-left/center area or rely on layout.
                // Simple approach: position fixed at a default location if not maximized.
                left: isMaximized ? (window.innerWidth - currentDimensions.width) / 2 : (sidebarWidth + 20),
                bottom: isMaximized ? 20 : 20, // Reset bottom

                width: currentDimensions.width,
                height: currentDimensions.height,
                opacity: isMinimized ? 0 : 1,
                scale: isMinimized ? 0 : 1,
                borderRadius: "1.5rem",
                transition: { type: "spring", stiffness: 260, damping: 24 } // Apple-ish spring
            },
            exit: {
                // Disappear animation (scales down slightly and fades)
                opacity: 0,
                scale: 0.95,
                transition: { duration: 0.2 }
            },
            minimize: {
                // Sucks back into genie lamp
                top: triggerRect.y,
                left: triggerRect.x,
                width: triggerRect.width,
                height: triggerRect.height,
                opacity: 0,
                scale: 0,
                borderRadius: "100px",
                transition: { type: "spring", stiffness: 300, damping: 28 }
            }
        };
    }, [triggerRect, isMinimized, isMaximized, currentDimensions, sidebarWidth]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key={id}
                    drag={!isMaximized} // Disable drag when maximized
                    dragMomentum={false}
                    dragElastic={0.1}
                    // Use custom variant logic to handle minimization state specifically
                    initial="initial"
                    animate={isMinimized ? "minimize" : "animate"}
                    exit="exit"
                    variants={variants}
                    style={{ zIndex }}
                    className={`flex flex-col bg-white/15 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150 rounded-3xl shadow-2xl border border-white/20 overflow-hidden ${className}`}
                    onPointerDown={(e) => {
                        // Focus window on click
                    }}
                >
                    {/* Standard Mac-style Header */}
                    <div
                        className="h-10 bg-gradient-to-b from-white/10 to-transparent flex items-center px-4 justify-between shrink-0 border-b border-white/10 cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => !isMaximized && e.stopPropagation()} // Allow drag only on header if preferred, but usually drag whole window is ok. Here we put drag on parent.
                    >
                        {/* Traffic Lights */}
                        <div className="flex items-center gap-2 group" onPointerDown={(e) => e.stopPropagation()}>
                            {/* Close (Red) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                            >
                                <X size={8} className="text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={3} />
                            </button>
                            {/* Minimize (Yellow) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onMinimize(); }}
                                className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                            >
                                <Minus size={8} className="text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={4} />
                            </button>
                            {/* Maximize (Green) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
                                className="w-3.5 h-3.5 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                            >
                                {/* Simple toggle icon */}
                                <div className="w-1.5 h-1.5 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full" />
                            </button>
                        </div>

                        {/* Title */}
                        <div className="flex-1 text-center mx-4 truncate font-semibold text-slate-700 dark:text-slate-200 text-sm select-none">
                            {title}
                        </div>

                        {/* Extra Header Content (Buttons etc) */}
                        <div className="flex items-center gap-2">
                            {headerContent}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative flex flex-col">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
