'use client';

import { useRef, useEffect, useState } from 'react';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';
import { SuggestedPrompts } from './suggested-prompts';
import { ConnectionStatus } from './connection-status';
import { ErrorMessage } from './error-message';
import { useChatStore } from '@/lib/chat-store';
import { Card } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export function ChatWindow() {
  const messages = useChatStore((state) => state.messages);
  const streamingMessage = useChatStore((state) => state.streamingMessage);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<Date>();

  const handleSelectPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    // The input component will pick this up
  };

  // Track when messages change (AI responds)
  useEffect(() => {
    if (streamingMessage) {
      setLastMessageTime(new Date());
      setStreamError(null); // Clear error if AI is responding
    }
  }, [streamingMessage]);

  // Detect timeout
  useEffect(() => {
    if (!isStreaming) {
      setStreamError(null);
      return;
    }

    const timeout = setTimeout(() => {
      if (isStreaming && !streamingMessage) {
        setStreamError('AI is not responding. The connection may be lost or the request timed out.');
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, [isStreaming, streamingMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Force re-render when streaming to ensure UI updates
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        forceUpdate(n => n + 1);
      }, 100); // Update every 100ms while streaming

      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 overflow-hidden">
      {/* Header - Fixed */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">AuditFlow AI Assistant</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Online • Ask about invoices, reconciliation, or upload documents
            </p>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth" style={{ minHeight: 0 }}>
        {messages.length === 0 && !streamingMessage ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-2xl space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">How can I help you today?</h3>
                <p className="text-muted-foreground">
                  I can help with invoices, reconciliation, GST, payments, and more
                </p>
              </div>
              <SuggestedPrompts
                onSelectPrompt={handleSelectPrompt}
                filter="quick"
              />
            </div>
          </div>
        ) : (
          <>
            <ChatMessageList
              messages={messages}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
            />

            {/* Error Message */}
            {streamError && (
              <div className="px-4 py-2">
                <ErrorMessage
                  error={streamError}
                  type="timeout"
                  onRetry={() => {
                    setStreamError(null);
                    window.location.reload();
                  }}
                  onDismiss={() => setStreamError(null)}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Connection Status Indicator */}
      <ConnectionStatus
        isStreaming={isStreaming}
        lastMessageTime={lastMessageTime}
      />

      {/* Input - Fixed */}
      <div className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg px-4 py-4 shadow-lg flex-shrink-0">
        <ChatInput />
      </div>
    </div>
  );
}
