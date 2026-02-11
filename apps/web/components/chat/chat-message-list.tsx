'use client';

import { ChatMessage } from '@/lib/chat-store';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  messages: ChatMessage[];
  streamingMessage: string;
  isStreaming: boolean;
}

export function ChatMessageList({ messages, streamingMessage, isStreaming }: Props) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Streaming message */}
      {isStreaming && streamingMessage && (
        <MessageBubble
          message={{
            id: 'streaming',
            role: 'ASSISTANT',
            content: streamingMessage,
            createdAt: new Date()
          }}
          isStreaming
        />
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'USER';

  return (
    <div className={cn(
      "flex gap-3",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Message content */}
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-muted"
      )}>
        <div className={cn(
          "prose prose-sm max-w-none",
          isUser && "prose-invert"
        )}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {isStreaming && (
          <Loader2 className="h-3 w-3 animate-spin mt-2" />
        )}
      </div>

      {/* Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
