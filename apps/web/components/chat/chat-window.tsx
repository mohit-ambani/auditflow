'use client';

import { useRef, useEffect } from 'react';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';
import { useChatStore } from '@/lib/chat-store';
import { Card } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export function ChatWindow() {
  const { messages, streamingMessage, isStreaming } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">AuditFlow AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Ask about invoices, reconciliation, or upload documents
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !streamingMessage ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md space-y-4">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="font-semibold">How can I help you today?</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Try asking:</p>
                  <ul className="list-disc list-inside text-left">
                    <li>"Show me all unpaid invoices"</li>
                    <li>"What's my GST liability for January?"</li>
                    <li>"Find duplicate payments"</li>
                    <li>Upload an invoice to extract data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ChatMessageList
              messages={messages}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
            />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background">
        <ChatInput />
      </div>
    </div>
  );
}
