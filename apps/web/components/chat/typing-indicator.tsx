'use client';

import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
          <Bot className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Typing Animation */}
      <div className="flex flex-col items-start">
        <div className="rounded-2xl px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1 px-1">
          AI is thinking...
        </div>
      </div>
    </div>
  );
}
