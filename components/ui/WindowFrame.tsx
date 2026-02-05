import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants, useDragControls } from 'framer-motion';
import { X, Minus } from 'lucide-react';
import { TriggerRect } from '../../types';

interface WindowFrameProps {
    id: string;
    isOpen: boolean;
    isMinimized: boolean;
    onClose: () => void;
    onMinimize: () => void;
    onFocus?: () => void;
    title?: string;
    triggerRect?: TriggerRect;
    zIndex: number;
    initialWidth?: number;
    initialHeight?: number;
    minWidth?: number;
    minHeight?: number;
    children?: React.ReactNode;
    headerContent?: React.ReactNode;
    className?: string;
    sidebarWidth?: number;
    align?: 'left' | 'center' | 'right';
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
    id,
    isOpen,
    isMinimized,
    onClose,
    onMinimize,
    onFocus,
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
    sidebarWidth = 64,
    align = 'left'
}) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const dragControls = useDragControls();

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
        const maxWidth = Math.min(windowSize.width * 0.9, 1400); // 90% width, max 1400px
        const maxHeight = Math.min(windowSize.height * 0.9, 900); // 90% height, max 900px
        return {
            width: maxWidth,
            height: maxHeight
        };
    }, [windowSize]);

    const currentDimensions = useMemo(() => {
        if (isMaximized) return maxDimensions;
        return { width: initialWidth, height: initialHeight };
    }, [isMaximized, maxDimensions, initialWidth, initialHeight]);

    const variants: Variants = useMemo(() => {
        // Center calculation for maximized state
        const maxLeft = (windowSize.width - maxDimensions.width) / 2;
        const maxTop = (windowSize.height - maxDimensions.height) / 2;

        // Normal state position
        // Left: next to sidebar
        const normalLeft = sidebarWidth + 20;
        // Right: right side of screen - width - padding
        const rightLeft = windowSize.width - initialWidth - 40;

        const targetLeft = align === 'right' ? rightLeft : normalLeft;
        const normalTop = 50;

        // Fallback if no trigger rect (fade in center)
        if (!triggerRect) {
            return {
                initial: { opacity: 0, scale: 0.9, x: '-50%', y: '-50%', left: '50%', top: '50%' },
                animate: {
                    opacity: isMinimized ? 0 : 1,
                    scale: isMinimized ? 0.9 : 1,

                    // Maximized vs Normal logic
                    left: isMaximized ? maxLeft : (align === 'center' ? '50%' : targetLeft),
                    top: isMaximized ? maxTop : (align === 'center' ? '50%' : normalTop),
                    x: isMaximized ? 0 : (align === 'center' ? '-50%' : 0),
                    y: isMaximized ? 0 : (align === 'center' ? '-50%' : 0),

                    width: currentDimensions.width,
                    height: currentDimensions.height,
                    borderRadius: "1.5rem",
                    transition: { type: "spring", stiffness: 300, damping: 25 }
                },
                exit: { opacity: 0, scale: 0.9 }
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
                borderRadius: "100px",
                x: 0, y: 0 // Reset transform
            },
            animate: {
                position: "fixed",
                // Logic: If maximized, center on screen.
                // If normal, place based on align
                top: isMaximized ? maxTop : normalTop,
                left: isMaximized ? maxLeft : targetLeft,

                width: currentDimensions.width,
                height: currentDimensions.height,
                opacity: isMinimized ? 0 : 1,
                scale: isMinimized ? 0 : 1,
                borderRadius: "1.5rem",
                transition: { type: "spring", stiffness: 260, damping: 24 } // Apple-ish spring
            },
            exit: {
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
                borderRadius: "100px",
                transition: { type: "spring", stiffness: 300, damping: 28 }
            }
        };
    }, [triggerRect, isMinimized, isMaximized, currentDimensions, sidebarWidth, windowSize, maxDimensions, align, initialWidth]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key={id}
                    drag
                    dragListener={false}
                    dragControls={dragControls}
                    dragMomentum={false}
                    dragElastic={0.1}
                    // Use custom variant logic to handle minimization state specifically
                    initial="initial"
                    animate={isMinimized ? "minimize" : "animate"}
                    exit="exit"
                    variants={variants}
                    className={`flex flex-col bg-white/15 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150 rounded-3xl shadow-2xl border border-white/20 overflow-hidden ${className}`}
                    style={{
                        zIndex,
                        position: 'fixed', // Force fixed to prevent layout shift
                        pointerEvents: isMinimized ? 'none' : 'auto', // Prevent interaction when minimized
                        // If no triggerRect and not maximized, align center or custom
                        ...((!triggerRect && !isMaximized && align === 'center') ? {
                            left: '50%',
                            top: '50%',
                            x: '-50%',
                            y: '-50%'
                        } : {})
                    }}
                    onPointerDownCapture={(e) => {
                        // Focus window on click (Use capture to ensure it fires before children stop propagation)
                        if (onFocus) onFocus();
                    }}
                >
                    {/* Standard Mac-style Header */}
                    <div
                        className="h-10 bg-gradient-to-b from-white/10 to-transparent flex items-center px-4 justify-between shrink-0 border-b border-white/10 cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => dragControls.start(e)}
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
                    <div
                        className="flex-1 overflow-hidden relative flex flex-col cursor-auto"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
