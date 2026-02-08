
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
    const isRestoring = useRef(false);
    const saveTimeoutRef = useRef<any>(null);

    // Tracks the ID of the message that was "last read" when the component mounted
    // Used to render the "New Messages" divider.
    const [initialLastReadId, setInitialLastReadId] = useState<string | null>(null);

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

        const children = Array.from(container.children) as HTMLElement[];
        let bottomMostVisibleId: string | null = null;

        // Find the message at the bottom of the viewport
        for (const child of children) {
            const msgId = child.getAttribute('data-msg-id');
            if (msgId) {
                const childTop = child.offsetTop;
                const childBottom = childTop + child.offsetHeight;

                // Check if this element is visible at the bottom of the scroll view
                // (allowing some buffer)
                if (childBottom >= scrollTop + clientHeight - 50 && childTop <= scrollTop + clientHeight) {
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
            container.scrollTo({ top, behavior: 'auto' });
        };

        if (savedLastReadId) {
            setInitialLastReadId(savedLastReadId);

            // Check if this ID exists in current messages
            const msgIndex = messages.findIndex(m => m.id === savedLastReadId);

            if (msgIndex !== -1) {
                // FOUND: Scroll so this message is at the BOTTOM of the viewport
                let el = messageRefs.current.get(savedLastReadId);
                // Fallback to query selector if ref is missing
                if (!el) el = container.querySelector(`[data-msg-id="${savedLastReadId}"]`) as HTMLDivElement;

                if (el) {
                    // Position element's bottom at viewport's bottom
                    const offset = el.offsetTop + el.offsetHeight - container.clientHeight;
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

    // Reset state when channel changes
    useEffect(() => {
        prevMessagesLengthRef.current = 0;
        messageRefs.current.clear();
        setInitialLastReadId(null);
    }, [channelId]);

    // Handle Scroll Restoration & New Messages
    useLayoutEffect(() => {
        if (!isOpen || !channelId) return;
        const container = scrollRef.current;
        if (!container) return;

        const hasMessages = messages.length > 0;
        const isChannelLoad = prevMessagesLengthRef.current === 0 && hasMessages;

        if (isChannelLoad) {
            isRestoring.current = true;

            // Temporarily force auto behavior
            const originalBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';

            restoreScrollPosition();

            requestAnimationFrame(() => {
                container.style.scrollBehavior = originalBehavior;
                isRestoring.current = false;
            });
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
        initialLastReadId // Expose this for the Divider
    };
};
