
import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
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

    // Generate storage key
    const getStorageKey = useCallback(() => {
        if (!channelId || !userUid) return null;
        return `chat_scroll_${userUid}_${channelId}`;
    }, [channelId, userUid]);

    // Save Scroll Position (Message ID + Offset)
    const saveScrollPosition = useCallback(() => {
        if (!scrollRef.current || !channelId || isRestoring.current) return;

        const container = scrollRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const key = getStorageKey();
        if (!key) return;

        // 1. Check if user is at the bottom
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        if (isAtBottom) {
            localStorage.setItem(key, JSON.stringify({ atBottom: true }));
            return;
        }

        // 2. Identify the top-most visible message
        const children = Array.from(container.children) as HTMLElement[];
        let topMsgId: string | null = null;
        let offset = 0;

        for (const child of children) {
            const msgId = child.getAttribute('data-msg-id');
            if (msgId) {
                const childTop = child.offsetTop;
                const childBottom = childTop + child.offsetHeight;

                // If element is visible within the viewport (top part)
                if (childBottom > scrollTop + 10) {
                    topMsgId = msgId;
                    offset = scrollTop - childTop;
                    break;
                }
            }
        }

        if (topMsgId) {
            localStorage.setItem(key, JSON.stringify({ messageId: topMsgId, offset, atBottom: false }));
        }
    }, [channelId, getStorageKey]);

    // Restore Scroll Position
    const restoreScrollPosition = useCallback(() => {
        if (!scrollRef.current || !channelId || messages.length === 0) return;

        const container = scrollRef.current;
        const key = getStorageKey();
        const savedState = key ? localStorage.getItem(key) : null;

        const scrollInstant = (top: number) => {
            container.scrollTo({ top, behavior: 'auto' });
        };

        // Priority 1: Resume Session from LocalStorage (DISABLED per user request)
        // We want to always show the latest messages or unread ones.
        /*
        if (savedState) {
            try {
                const { atBottom, messageId, offset } = JSON.parse(savedState);
                
                if (atBottom) {
                    scrollInstant(container.scrollHeight);
                    return;
                } 
                
                if (messageId) {
                    let el = messageRefs.current.get(messageId);
                    // Fallback to DOM if ref missing
                    if (!el) el = container.querySelector(`[data-msg-id="${messageId}"]`) as HTMLDivElement;
  
                    if (el) {
                        // Clamp offset to ensure valid scroll
                        const safeOffset = Math.min(offset || 0, el.offsetHeight);
                        scrollInstant(el.offsetTop + safeOffset);
                        return;
                    }
                }
            } catch (e) {
                console.error("Scroll restore error", e);
            }
        }
        */

        // Priority 2: Jump to First Unread Message
        if (userUid) {
            const firstUnread = messages.find(m => m.senderId !== userUid && (!m.readBy || !m.readBy.includes(userUid)));
            if (firstUnread) {
                let el = messageRefs.current.get(firstUnread.id);
                if (!el) el = container.querySelector(`[data-msg-id="${firstUnread.id}"]`) as HTMLDivElement;

                if (el) {
                    // Scroll to unread message with context (50px above)
                    scrollInstant(Math.max(0, el.offsetTop - 50));
                    return;
                }
            }
        }

        // Priority 3: Default to Bottom
        scrollInstant(container.scrollHeight);

    }, [channelId, messages, userUid, getStorageKey]);

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);

        // Debounce saving position
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(saveScrollPosition, 200);
    }, [saveScrollPosition]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
        }
    }, []);

    // Reset state when channel changes
    useEffect(() => {
        prevMessagesLengthRef.current = 0;
        messageRefs.current.clear();
    }, [channelId]);

    // Save on unmount
    useEffect(() => {
        return () => {
            if (isOpen && channelId) saveScrollPosition();
        };
    }, [isOpen, channelId, saveScrollPosition]);

    // Handle Scroll Restoration & New Messages
    useLayoutEffect(() => {
        if (!isOpen || !channelId) return;
        const container = scrollRef.current;
        if (!container) return;

        const hasMessages = messages.length > 0;
        const isChannelLoad = prevMessagesLengthRef.current === 0 && hasMessages;

        if (isChannelLoad) {
            isRestoring.current = true;
            // Temporarily force auto behavior for instant jump
            const originalBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';

            restoreScrollPosition();

            requestAnimationFrame(() => {
                container.style.scrollBehavior = originalBehavior;
                isRestoring.current = false;
            });
        } else if (messages.length > prevMessagesLengthRef.current && !isRestoring.current) {
            // Auto-scroll for new messages if user is near bottom
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;

            if (isNearBottom) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }

        prevMessagesLengthRef.current = messages.length;
    }, [messages, channelId, isOpen, restoreScrollPosition]);

    const signalHistoryLoad = () => {
        // Placeholder for infinite scroll history loading logic
    };

    return { scrollRef, handleScroll, scrollToBottom, showScrollDown, messageRefs, signalHistoryLoad, restoreScrollPosition };
};
