import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { RichEditor } from './RichEditor';

interface MobileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string, type: string) => Promise<void>;
    initialContent?: string;
    title?: string;
}

export const MobileEditorModal: React.FC<MobileEditorModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialContent = '',
    title = 'New Memo'
}) => {
    const [content, setContent] = useState(initialContent);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle virtual keyboard on mobile
    useEffect(() => {
        if (!isOpen) return;

        const handleResize = () => {
            // Detect keyboard by checking if visual viewport is smaller than window
            if (window.visualViewport) {
                const heightDiff = window.innerHeight - window.visualViewport.height;
                setKeyboardHeight(Math.max(0, heightDiff));
            }
        };

        // Listen to visual viewport changes (keyboard show/hide)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
        };
    }, [isOpen]);

    // Reset content when modal opens with new initialContent
    useEffect(() => {
        if (isOpen) {
            setContent(initialContent);
        }
    }, [isOpen, initialContent]);

    const handleSubmit = async () => {
        if (!content.replace(/<[^>]*>/g, '').trim() && !content.includes('<img')) return;

        setIsSubmitting(true);
        await onSubmit(content, 'post');
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            ref={containerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[2000] bg-white dark:bg-black flex flex-col"
            style={{
                height: `calc(100dvh - ${keyboardHeight}px)`,
                maxHeight: '100dvh',
                touchAction: 'manipulation'
            }}
        >
            {/* iOS-style Navigation Bar */}
            <div className="flex items-center justify-between px-2 py-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-10">
                <button
                    onClick={onClose}
                    className="flex items-center text-amber-500 px-2 py-2 hover:opacity-70"
                >
                    <ChevronLeft size={26} />
                    <span className="text-[17px] font-medium -ml-1">Back</span>
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-amber-500 font-semibold text-[17px] disabled:opacity-50"
                >
                    {isSubmitting ? '...' : 'Done'}
                </button>
            </div>

            {/* Editor Content - Flexible height that adapts to keyboard */}
            <div
                className="flex-1 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <RichEditor
                    initialContent={initialContent}
                    onChange={setContent}
                    placeholder="Start writing..."
                    isMobile={true}
                />
            </div>
        </motion.div>
    );
};
