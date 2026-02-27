
import React, { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
import { ChatMessage } from '../types';

export const useChatScroll = (
    messages: ChatMessage[],
    channelId: string | null,
    userUid: string | undefined,
    isOpen: boolean
) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const prevMessagesLengthRef = useRef(0);
    const [isRestoringState, setIsRestoringState] = useState(true);
    const isRestoring = useRef(false);
    const saveTimeoutRef = useRef<any>(null);
    const prevChannelIdRef = useRef<string | null>(null);
    const resizeDebounceRef = useRef<any>(null);

    // Tracks the ID of the message that was "last read" when the component mounted per channel.
    const [channelLastReadMap, setChannelLastReadMap] = useState<Record<string, string>>({});

    // Generate storage key
    const getStorageKey = useCallback(() => {
        if (!channelId || !userUid) return null;
        return `last_read_${channelId}`;
    }, [channelId, userUid]);

    // Force-scroll without any smooth behavior interference
    const scrollInstant = useCallback((container: HTMLDivElement, top: number) => {
        // Override any CSS scroll-behavior by setting inline style
        container.style.scrollBehavior = 'auto';
        container.scrollTop = top;
        // Keep the override for a brief moment to prevent CSS from interfering
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                container.style.scrollBehavior = '';
            });
        });
    }, []);

    // Save Last Read Message ID
    const saveLastReadId = useCallback(() => {
        if (!scrollRef.current || !channelId) return;

        const container = scrollRef.current;
        const { scrollTop, clientHeight } = container;
        const key = getStorageKey();
        if (!key) return;

        const messageElements = Array.from(container.querySelectorAll('[data-msg-id]')) as HTMLElement[];
        let bottomMostVisibleId: string | null = null;

        for (const el of messageElements) {
            const msgId = el.getAttribute('data-msg-id');
            if (msgId) {
                const childTop = el.offsetTop;
                const childBottom = childTop + el.offsetHeight;
                if (childBottom >= scrollTop && childTop <= scrollTop + clientHeight + 50) {
                    bottomMostVisibleId = msgId;
                }
            }
        }

        const isAtBottom = container.scrollHeight - scrollTop - clientHeight < 50;
        if (isAtBottom && messages.length > 0) {
            bottomMostVisibleId = messages[messages.length - 1].id;
        }

        if (bottomMostVisibleId) {
            localStorage.setItem(key, bottomMostVisibleId);
        }
    }, [channelId, getStorageKey, messages]);

    // Restore Scroll Position
    const restoreScrollPosition = useCallback(() => {
        if (!scrollRef.current || !channelId || messages.length === 0) return;

        const container = scrollRef.current;
        const key = getStorageKey();
        const savedLastReadId = key ? localStorage.getItem(key) : null;

        if (savedLastReadId) {
            setChannelLastReadMap(prev => {
                if (prev[channelId]) return prev;
                return { ...prev, [channelId]: savedLastReadId };
            });

            const msgIndex = messages.findIndex(m => m.id === savedLastReadId);

            if (msgIndex !== -1) {
                let el = messageRefs.current.get(savedLastReadId);
                if (!el) el = container.querySelector(`[data-msg-id="${savedLastReadId}"]`) as HTMLDivElement;

                if (el) {
                    const offset = el.offsetTop + el.offsetHeight + 60 - container.clientHeight;
                    scrollInstant(container, Math.max(0, offset));
                    return;
                }
            }
        }

        // DEFAULT: Scroll to very bottom (latest message)
        scrollInstant(container, container.scrollHeight);

    }, [channelId, messages, getStorageKey, scrollInstant]);

    // Handle Scroll & Save
    const handleScroll = useCallback((e?: React.UIEvent) => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(saveLastReadId, 200);
    }, [saveLastReadId]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            container.scrollTo({ top: container.scrollHeight, behavior });

            setTimeout(() => {
                if (scrollRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
                    if (!isAtBottom) {
                        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
                    }
                }
            }, 100);
        }
    }, []);

    // Reset state when chat closes
    useEffect(() => {
        if (!isOpen) {
            prevMessagesLengthRef.current = 0;
        }
    }, [isOpen]);

    // Handle Scroll Restoration & New Messages
    useLayoutEffect(() => {
        if (!isOpen || !channelId) return;
        const container = scrollRef.current;
        if (!container) return;

        const hasMessages = messages.length > 0;
        let isChannelLoad = false;

        if (channelId !== prevChannelIdRef.current) {
            prevMessagesLengthRef.current = 0;
            messageRefs.current.clear();
            prevChannelIdRef.current = channelId;
            setIsRestoringState(true);
        }

        if (prevMessagesLengthRef.current === 0 && hasMessages) {
            isChannelLoad = true;
        }

        if (isChannelLoad) {
            isRestoring.current = true;
            setIsRestoringState(true);

            let attempts = 0;
            const maxAttempts = 20;
            const tryRestore = () => {
                const els = container.querySelectorAll('[data-msg-id]');
                // Wait until DOM elements are rendered, or we've exhausted attempts
                if (els.length >= Math.min(messages.length, 5) || attempts >= maxAttempts) {
                    restoreScrollPosition();
                    // Double-check after a frame to ensure layout is settled
                    requestAnimationFrame(() => {
                        restoreScrollPosition();
                        isRestoring.current = false;
                        setIsRestoringState(false);
                    });
                } else {
                    attempts++;
                    setTimeout(tryRestore, 30);
                }
            };
            tryRestore();
        } else if (!isRestoring.current && isRestoringState) {
            setIsRestoringState(false);
        }
        // Auto-scroll for NEW messages at bottom
        else if (messages.length > prevMessagesLengthRef.current && !isRestoring.current) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = (scrollHeight - scrollTop - clientHeight) < 300;

            if (isNearBottom) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }

        prevMessagesLengthRef.current = messages.length;
    }, [messages, channelId, isOpen, restoreScrollPosition]);

    // Continuously correct scroll position during Framer Motion opening animation
    // The animation changes container height dynamically, pushing scroll to top
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || !isOpen || !channelId) return;

        let isOpeningPhase = true;
        const timeoutId = setTimeout(() => {
            isOpeningPhase = false;
        }, 1000); // Extended to 1s to cover slower animations

        let lastHeight = container.clientHeight;
        let lastScrollTop = container.scrollTop;

        const observer = new ResizeObserver(() => {
            if (!isOpeningPhase) return;

            const currentHeight = container.clientHeight;
            if (Math.abs(currentHeight - lastHeight) > 5) {
                // If user manually scrolled during animation, abort auto-locking
                if (Math.abs(container.scrollTop - lastScrollTop) > 50) {
                    isOpeningPhase = false;
                    return;
                }

                // Debounce: only fire final restore after resize settles
                if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
                resizeDebounceRef.current = setTimeout(() => {
                    restoreScrollPosition();
                    lastHeight = container.clientHeight;
                    lastScrollTop = container.scrollTop;
                }, 16); // ~1 frame
            }
        });

        observer.observe(container);

        return () => {
            clearTimeout(timeoutId);
            if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
            observer.disconnect();
        };
    }, [isOpen, channelId, restoreScrollPosition]);

    const signalHistoryLoad = () => {
        // Placeholder
    };

    return {
        scrollRef,
        handleScroll,
        scrollToBottom,
        showScrollDown,
        messageRefs,
        signalHistoryLoad,
        restoreScrollPosition,
        initialLastReadId: channelId ? (channelLastReadMap[channelId] || null) : null,
        isRestoring: isRestoringState
    };
};

