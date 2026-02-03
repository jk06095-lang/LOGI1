
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
  const prevMessagesLengthRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const isHistoryLoadingRef = useRef(false);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const saveTimeoutRef = useRef<any>(null);

  const getStorageKey = useCallback(() => {
      if (!channelId) return null;
      return `LOGI1_chat_pos_${channelId}`;
  }, [channelId]);

  const saveCurrentScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId) return;
      const container = scrollRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const key = getStorageKey();
      if (!key) return;

      // Generous threshold to consider "at bottom"
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
          localStorage.setItem(key, JSON.stringify({ atBottom: true }));
          return;
      }

      // Find top visible message
      const children = Array.from(container.children) as HTMLElement[];
      for (const child of children) {
          // child.offsetTop is relative to the scroll container's top content edge.
          // If the bottom of the child is below the current scroll line, 
          // it means this child is the first one visible (at least partially) at the top.
          if (child.offsetTop + child.offsetHeight > scrollTop) {
              const msgId = child.getAttribute('data-msg-id');
              if (msgId) {
                  // Calculate offset: how far scrolled *into* this element we are
                  const offset = scrollTop - child.offsetTop;
                  localStorage.setItem(key, JSON.stringify({ 
                      messageId: msgId, 
                      offset, 
                      atBottom: false 
                  }));
                  return;
              }
          }
      }
  }, [channelId, getStorageKey]);

  const restoreScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId) return;
      const key = getStorageKey();
      if (!key) return;

      const savedJson = localStorage.getItem(key);
      if (!savedJson) {
          // Default to bottom if no saved state
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          return;
      }

      try {
          const saved = JSON.parse(savedJson);
          if (saved.atBottom) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          } else if (saved.messageId) {
              const el = messageRefs.current.get(saved.messageId);
              if (el) {
                  scrollRef.current.scrollTop = el.offsetTop + (saved.offset || 0);
              } else {
                  // Fallback: If the saved message isn't loaded (e.g., extremely old history), scroll to bottom.
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
          }
      } catch (e) {
          console.error("Failed to restore scroll", e);
      }
  }, [channelId, getStorageKey]);

  const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollDown(distanceFromBottom > 250);

      // Debounced save to localStorage
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(saveCurrentScrollPosition, 200);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      if (scrollRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          const distance = scrollHeight - scrollTop - clientHeight;
          // Instant jump if distance is too large
          if (distance > 1000) behavior = 'auto';
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
      }
  };

  const signalHistoryLoad = () => { isHistoryLoadingRef.current = true; };

  // Save on unmount/close
  useEffect(() => {
      return () => {
          if (isOpen) saveCurrentScrollPosition();
      };
  }, [isOpen, saveCurrentScrollPosition]);

  // Handle Updates & Restoration
  useLayoutEffect(() => {
      if (!isOpen || !scrollRef.current || !channelId) return;
      
      const currentScrollHeight = scrollRef.current.scrollHeight;
      const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;

      if (isInitialLoad) {
          restoreScrollPosition();
      } else if (isHistoryLoadingRef.current) {
          // Restore relative position when loading older messages at top
          const heightDiff = currentScrollHeight - previousScrollHeightRef.current;
          if (heightDiff > 0) scrollRef.current.scrollTop += heightDiff;
          isHistoryLoadingRef.current = false;
      } else if (messages.length > prevMessagesLengthRef.current) {
          // New message received
          const { scrollTop, clientHeight } = scrollRef.current;
          const distanceFromBottom = previousScrollHeightRef.current - scrollTop - clientHeight;
          
          // Auto-scroll if user was already near bottom
          if (distanceFromBottom < 100) {
              scrollRef.current.scrollTop = currentScrollHeight;
          }
      }
      
      prevMessagesLengthRef.current = messages.length;
      previousScrollHeightRef.current = currentScrollHeight;
  }, [messages, channelId, isOpen, restoreScrollPosition]);

  return { scrollRef, handleScroll, scrollToBottom, showScrollDown, messageRefs, signalHistoryLoad, restoreScrollPosition };
};
