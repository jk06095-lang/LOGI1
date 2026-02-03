
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
  // Store refs to message elements by their ID for precise scrolling
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const prevMessagesLengthRef = useRef(0);
  const isRestoring = useRef(false);
  const saveTimeoutRef = useRef<any>(null);

  const getStorageKey = useCallback(() => {
      if (!channelId) return null;
      // Key format as requested
      return `chat_scroll_${channelId}`;
  }, [channelId]);

  const saveScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId || isRestoring.current) return;
      
      const container = scrollRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const key = getStorageKey();
      if (!key) return;

      // 1. Check if at bottom
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      if (isAtBottom) {
          localStorage.setItem(key, JSON.stringify({ atBottom: true }));
          return;
      }

      // 2. Find the first visible message at the top
      const children = Array.from(container.children) as HTMLElement[];
      let topMsgId: string | null = null;
      let offset = 0;

      for (const child of children) {
          const msgId = child.getAttribute('data-msg-id');
          if (msgId) {
              const childTop = child.offsetTop;
              const childBottom = childTop + child.offsetHeight;

              // If the element's bottom is below the scroll line, it's the first visible one
              if (childBottom > scrollTop) {
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

  const restoreScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId) return;
      const key = getStorageKey();
      if (!key) return;

      const saved = localStorage.getItem(key);
      if (!saved) {
          // Default: Scroll to bottom for new/empty history
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          return;
      }

      try {
          const { atBottom, messageId, offset } = JSON.parse(saved);
          
          if (atBottom) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          } else if (messageId) {
              // Try to find element in ref map first
              let element = messageRefs.current.get(messageId);
              
              // Fallback to DOM query if ref is missing
              if (!element && scrollRef.current) {
                  element = scrollRef.current.querySelector(`[data-msg-id="${messageId}"]`) as HTMLDivElement;
              }

              if (element) {
                  // Instant jump to exact position
                  scrollRef.current.scrollTop = element.offsetTop + (offset || 0);
              } else {
                  // Message ID not found in current DOM (old history?), default to bottom
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
          }
      } catch (e) {
          console.error("Failed to restore scroll position", e);
      }
  }, [channelId, getStorageKey]);

  const handleScroll = useCallback(() => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);

      // Debounce saving to localStorage
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(saveScrollPosition, 150);
  }, [saveScrollPosition]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
      }
  }, []);

  // Save on unmount
  useEffect(() => {
      return () => {
          if (isOpen) saveScrollPosition();
      };
  }, [isOpen, saveScrollPosition]);

  // Main Logic: Initial Load & Updates
  useLayoutEffect(() => {
      if (!isOpen || !channelId) return;
      
      const container = scrollRef.current;
      if (!container) return;

      const hasMessages = messages.length > 0;
      const isInitialLoad = prevMessagesLengthRef.current === 0 && hasMessages;
      const newMessagesAdded = messages.length > prevMessagesLengthRef.current;

      if (isInitialLoad) {
          isRestoring.current = true;
          
          // Disable smooth scrolling temporarily for instant restoration
          const originalBehavior = container.style.scrollBehavior;
          container.style.scrollBehavior = 'auto';
          
          restoreScrollPosition();
          
          // Re-enable smooth scrolling in next frame
          requestAnimationFrame(() => {
              container.style.scrollBehavior = originalBehavior;
              isRestoring.current = false;
          });
      } else if (newMessagesAdded) {
          // Auto-scroll if user was near bottom
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
          
          if (isNearBottom) {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }
      }
      
      prevMessagesLengthRef.current = messages.length;
  }, [messages, channelId, isOpen, restoreScrollPosition]);

  const signalHistoryLoad = () => {
      // With ID-based restoration, specific "history load" signaling is less critical 
      // but can be used to prevent auto-scroll-to-bottom if needed.
      // Current implementation handles it via ID matching naturally.
  };

  return { scrollRef, handleScroll, scrollToBottom, showScrollDown, messageRefs, signalHistoryLoad, restoreScrollPosition };
};
