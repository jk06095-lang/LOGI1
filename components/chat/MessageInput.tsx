
import React, { useState, useRef } from 'react';
import { Send, Smile, Reply, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '../../types';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
}

const EMOJIS = ['✅', '❌', '👍', '❤️', '😂', '😮', '😢', '😡'];

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSend, onTyping, onStopTyping, replyingTo, onCancelReply 
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      if (e.target.value.trim()) {
          onTyping();
      } else {
          onStopTyping();
      }
  };

  const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim()) return;
      onSend(inputText.trim());
      setInputText('');
      onStopTyping();
      setShowEmojiPicker(false);
  };

  return (
    <div className="p-3 shrink-0 relative flex flex-col gap-2">
        <AnimatePresence>
            {replyingTo && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm mx-1"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Reply size={14} className="text-blue-500 shrink-0"/>
                        <div className="flex flex-col text-xs">
                            <span className="font-bold text-blue-600 dark:text-blue-400">Replying to {replyingTo.senderName}</span>
                            <span className="truncate text-slate-500 max-w-[200px]">{replyingTo.text}</span>
                        </div>
                    </div>
                    <button onClick={onCancelReply} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                        <X size={14} className="text-slate-500"/>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex gap-2 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-white/20 rounded-3xl p-1.5 shadow-lg relative z-20">
            <div className="relative">
                <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 transition-colors rounded-full hover:bg-white/50 ${showEmojiPicker ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}
                >
                    <Smile size={18} />
                </button>
                <AnimatePresence>
                    {showEmojiPicker && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute bottom-12 left-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl grid grid-cols-4 gap-1 z-30 min-w-[160px]"
                        >
                            {EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                        setInputText(prev => prev + emoji);
                                        inputRef.current?.focus();
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/30 rounded-lg transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <input 
                ref={inputRef}
                type="text" 
                value={inputText}
                onChange={handleInputChange}
                onFocus={onTyping} // Initial focus triggers typing
                placeholder="Message..."
                className="flex-1 bg-transparent border-none text-sm focus:ring-0 outline-none text-slate-800 dark:text-white placeholder-slate-500/70 min-w-0"
            />
            <button 
                type="submit" 
                disabled={!inputText.trim()} 
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-90"
            >
                <Send size={16} className={inputText.trim() ? "ml-0.5" : ""} />
            </button>
        </form>
    </div>
  );
};
