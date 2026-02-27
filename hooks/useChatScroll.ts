
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
    const [isRestoringState, setIsRestoringState] = useState(true); // Expose to UI to hide flash
    const isRestoring = useRef(false);
    const saveTimeoutRef = useRef<any>(null);
    const prevChannelIdRef = useRef<string | null>(null);

    // Tracks the ID of the message that was "last read" when the component mounted per channel.
    // Used to render the "New Messages" divider. Persistent across tab switches.
    const [channelLastReadMap, setChannelLastReadMap] = useState<Record<string, string>>({});

    // Generate storage key
    const getStorageKey = useCallback(() => {
        if (!channelId || !userUid) return null;
        return `last_read_${channelId}`; // CHANGED: Simplified key as per request
    }, [channelId, userUid]);

    // Save Last Read Message ID
    const saveLastReadId = useCallback(() => {
        if (!scrollRef.current || !channelId) return;

        const container = scrollRef.current;
        const { scrollTop, clientHeight } = container;
        const key = getStorageKey();
        if (!key) return;

        const messageElements = Array.from(container.querySelectorAll('[data-msg-id]')) as HTMLElement[];
        let bottomMostVisibleId: string | null = null;

        // Find the message at the bottom of the viewport
        for (const el of messageElements) {
            const msgId = el.getAttribute('data-msg-id');
            if (msgId) {
                const childTop = el.offsetTop;
                const childBottom = childTop + el.offsetHeight;

                // Check if this element is visible at the bottom of the scroll view
                // (allowing some buffer)
                if (childBottom >= scrollTop && childTop <= scrollTop + clientHeight + 50) {
                    bottomMostVisibleId = msgId;
                }
            }
        }

        // If we are at the very bottom, we can safely say the last message is read
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

        const scrollInstant = (top: number) => {
            const originalBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';
            container.scrollTo({ top, behavior: 'auto' });
            requestAnimationFrame(() => {
                container.style.scrollBehavior = originalBehavior;
            });
        };

        if (savedLastReadId) {
            // Only set the initial read ID ONCE per channel per window session to keep the divider visible
            setChannelLastReadMap(prev => {
                if (prev[channelId]) return prev;
                return { ...prev, [channelId]: savedLastReadId };
            });

            // Check if this ID exists in current messages
            const msgIndex = messages.findIndex(m => m.id === savedLastReadId);

            if (msgIndex !== -1) {
                // FOUND: Scroll so this message is at the BOTTOM of the viewport
                let el = messageRefs.current.get(savedLastReadId);
                // Fallback to query selector if ref is missing
                if (!el) el = container.querySelector(`[data-msg-id="${savedLastReadId}"]`) as HTMLDivElement;

                if (el) {
                    // Position element's bottom + extra space at viewport's bottom
                    // This creates a natural scroll position where the "New Messages" divider is slightly visible at the very bottom
                    const offset = el.offsetTop + el.offsetHeight + 60 - container.clientHeight;
                    scrollInstant(Math.max(0, offset));
                    return;
                }
            }
            // If saved ID is not found (too old or invalid), fall through to default
        }

        // DEFAULT: Scroll to Bottom (Latest)
        scrollInstant(container.scrollHeight);

    }, [channelId, messages, getStorageKey]);

    // Handle Scroll & Save
    const handleScroll = useCallback((e?: React.UIEvent) => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);

        // Debounce saving position
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(saveLastReadId, 200);

        // Signal parent if we hit top (for pagination)
        // Passed via prop or exposed function? 
        // For now, logic is mainly external, but we could expose "isAtTop"
    }, [saveLastReadId]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            container.scrollTo({ top: container.scrollHeight, behavior });

            // Robust fallback for mobile/dynamic content
            setTimeout(() => {
                if (scrollRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

                    // If smooth scroll didn't finish or failed, force jump to bottom
                    if (!isAtBottom) {
                        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
                    }
                }
            }, 100);
        }
    }, []);

    // Reset state when channel changes or chat closes
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
            const tryRestore = () => {
                const els = document.querySelectorAll(`[data-msg-id]`);
                if (els.length > 0 || attempts > 5) {
                    restoreScrollPosition();
                    requestAnimationFrame(() => {
                        isRestoring.current = false;
                        setIsRestoringState(false);
                    });
                } else {
                    attempts++;
                    setTimeout(tryRestore, 50);
                }
            };
            tryRestore();
        } else if (!isRestoring.current && isRestoringState) {
            setIsRestoringState(false);
        }
        /* 
           NOTE: When prepending history (pagination), the length increases but we are NOT at the bottom.
           The parent component (ChatWindow) should handle scroll adjustment for prepend.
           We only handle "Auto-scroll for NEW messages at bottom".
        */
        else if (messages.length > prevMessagesLengthRef.current && !isRestoring.current) {
            // Only auto-scroll if the NEW message is at the END (timestamp check or simple append check)
            // If we prepended history, we shouldn't scroll to bottom.

            // Simple check: If the user was already near bottom, stay at bottom.
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = (scrollHeight - scrollTop - clientHeight) < 300;

            // However, strictly speaking, history load adds to START.
            // A naive length check doesn't distinguish head vs tail addition.
            // Assumption: This hook is used where 'messages' is updated.

            if (isNearBottom) {
                // This might be risky if we just loaded 50 old messages and we were at bottom?
                // No, if we loaded old messages, we would be at Top (scrollTop=0).
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }

        prevMessagesLengthRef.current = messages.length;
    }, [messages, channelId, isOpen, restoreScrollPosition]);

    // Continuously correct scroll position during the window's opening animation
    // Framer Motion changes the height dynamically which causes the element to be pushed to the top of the viewport
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || !isOpen || !channelId) return;

        let isOpeningPhase = true;
        const timeoutId = setTimeout(() => {
            isOpeningPhase = false;
        }, 800);

        let lastHeight = container.clientHeight;
        let lastScrollTop = container.scrollTop;

        const observer = new ResizeObserver(() => {
            if (isOpeningPhase) {
                const currentHeight = container.clientHeight;
                if (Math.abs(currentHeight - lastHeight) > 5) {

                    // Crucial addition: if user actually manually scrolls during this 800ms, abort the auto-locking!
                    if (Math.abs(container.scrollTop - lastScrollTop) > 50) {
                        isOpeningPhase = false;
                        return;
                    }

                    restoreScrollPosition();
                    lastHeight = currentHeight;
                    // update our baseline scroll top after restoration
                    setTimeout(() => { lastScrollTop = container.scrollTop; }, 0);
                }
            }
        });

        observer.observe(container);

        return () => {
            clearTimeout(timeoutId);
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
        initialLastReadId: channelId ? (channelLastReadMap[channelId] || null) : null, // Expose per channel
        isRestoring: isRestoringState
    };
};
