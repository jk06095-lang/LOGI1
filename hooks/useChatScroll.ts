
import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
import { ChatMessage } from '../types';

// Global Map to persist scroll positions even when component unmounts (closes)
const globalScrollPositions = new Map<string, { top: number, atBottom: boolean }>();

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

  // Helper: Explicitly save current position
  const saveCurrentScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      
      // Calculate if we are at bottom (within 50px)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      globalScrollPositions.set(channelId, { top: scrollTop, atBottom: isNearBottom });
  }, [channelId]);

  // Helper: Explicitly restore position
  const restoreScrollPosition = useCallback(() => {
      if (!scrollRef.current || !channelId) return;
      
      const saved = globalScrollPositions.get(channelId);
      const currentScrollHeight = scrollRef.current.scrollHeight;

      if (saved) {
          if (saved.atBottom) {
              scrollRef.current.scrollTop = currentScrollHeight;
          } else {
              scrollRef.current.scrollTop = saved.top;
          }
      } else {
          // Default: Scroll to bottom if no history
          scrollRef.current.scrollTop = currentScrollHeight;
      }
  }, [channelId]);

  // Event: Handle Scroll (Auto-Save & Toggle Button)
  const handleScroll = () => {
      if (!isOpen || !scrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      
      // Save scroll position
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (channelId) {
          globalScrollPositions.set(channelId, { top: scrollTop, atBottom: isNearBottom });
      }
      
      // Show "Scroll Down" button if we are more than 150px away from bottom
      const showBtn = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDown(showBtn);
  };

  const scrollToBottom = () => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: 'smooth'
          });
      }
  };

  // Signal that history is being loaded (used by parent to set flag)
  const signalHistoryLoad = () => {
      isHistoryLoadingRef.current = true;
  };

  // Reset tracking when channel changes
  useLayoutEffect(() => {
      prevMessagesLengthRef.current = 0;
      previousScrollHeightRef.current = 0;
      messageRefs.current.clear();
  }, [channelId]);

  // Save on unmount/close
  useEffect(() => {
      return () => {
          if (isOpen) { 
              saveCurrentScrollPosition();
          }
      };
  }, [isOpen, saveCurrentScrollPosition]);

  // Smart Scrolling Logic
  useLayoutEffect(() => {
      if (!isOpen || !scrollRef.current || messages.length === 0 || !channelId) return;
      
      const currentScrollHeight = scrollRef.current.scrollHeight;
      const isInitialLoad = prevMessagesLengthRef.current === 0;

      if (isInitialLoad) {
          const saved = globalScrollPositions.get(channelId);
          
          if (saved) {
              restoreScrollPosition();
          } else {
              // Smart Scroll: Unread or Bottom
              let firstUnreadIndex = -1;
              if (userUid) {
                  firstUnreadIndex = messages.findIndex(m => m.senderId !== userUid && (!m.readBy || !m.readBy.includes(userUid)));
              }

              if (firstUnreadIndex !== -1) {
                  const targetMsg = messages[firstUnreadIndex];
                  const el = messageRefs.current.get(targetMsg.id);
                  if (el) {
                      el.scrollIntoView({ block: 'center', behavior: 'auto' });
                  } else {
                      scrollRef.current.scrollTop = currentScrollHeight;
                  }
              } else {
                  scrollRef.current.scrollTop = currentScrollHeight;
              }
          }
      } else if (isHistoryLoadingRef.current) {
          // Restore position after loading history
          const heightDiff = currentScrollHeight - previousScrollHeightRef.current;
          if (heightDiff > 0) scrollRef.current.scrollTop += heightDiff;
          isHistoryLoadingRef.current = false;
      } else if (messages.length > prevMessagesLengthRef.current) {
          // New message received
          const distanceFromBottom = currentScrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight;
          // Auto-scroll ONLY if user is already near bottom (prevent distraction)
          if (distanceFromBottom < 150) {
              scrollRef.current.scrollTop = currentScrollHeight;
          }
      }
      
      prevMessagesLengthRef.current = messages.length;
      previousScrollHeightRef.current = currentScrollHeight;
  }, [messages, channelId, isOpen, userUid, restoreScrollPosition]);

  return {
      scrollRef,
      handleScroll,
      scrollToBottom,
      showScrollDown,
      messageRefs,
      signalHistoryLoad,
      restoreScrollPosition
  };
};
