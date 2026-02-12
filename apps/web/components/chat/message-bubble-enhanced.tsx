'use client';

import { memo, useState } from 'react';
import { ChatMessage } from '@/lib/chat-store';
import { cn } from '@/lib/utils';
import { Bot, User, Copy, Check, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { MessageActions } from './message-actions';
import { toast } from 'sonner';

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageBubbleEnhanced = memo(function MessageBubbleEnhanced({
  message,
  isStreaming = false
}: Props) {
  const isUser = message.role === 'USER';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  return (
    <div className={cn(
      "relative flex gap-3 group animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-[80%] md:max-w-[70%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Message Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-sm transition-all",
          isUser
            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-200 dark:shadow-blue-900/50"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-slate-200 dark:shadow-slate-900/50",
          isStreaming && "animate-pulse"
        )}>
          <div className={cn(
            "prose prose-sm max-w-none",
            isUser
              ? "prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white"
              : "prose-slate dark:prose-invert"
          )}>
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const codeId = `code-${message.id}-${Math.random()}`;

                  return !inline && match ? (
                    <div className="relative group/code">
                      <div className="absolute right-2 top-2 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 bg-slate-700/80 hover:bg-slate-700 text-white opacity-0 group-hover/code:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(codeString, codeId)}
                        >
                          {copiedCode === codeId ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="!mt-0 !mb-0 rounded-lg text-sm"
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code
                      className={cn(
                        "px-1.5 py-0.5 rounded text-sm font-mono",
                        isUser
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="my-2 space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="my-2 space-y-1">{children}</ol>;
                },
                li({ children }) {
                  return <li className="ml-4">{children}</li>;
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "underline underline-offset-2 transition-colors",
                        isUser
                          ? "text-white hover:text-blue-100"
                          : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      )}
                    >
                      {children}
                    </a>
                  );
                },
                blockquote({ children }) {
                  return (
                    <blockquote
                      className={cn(
                        "border-l-4 pl-4 py-1 my-2 italic",
                        isUser
                          ? "border-white/40"
                          : "border-slate-300 dark:border-slate-600"
                      )}
                    >
                      {children}
                    </blockquote>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={cn(
          "flex items-center gap-1 mt-1 px-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
          isUser && "flex-row-reverse"
        )}>
          <Clock className="h-3 w-3" />
          <span>{formatTime(message.createdAt)}</span>
        </div>
      </div>

      {/* Message Actions */}
      <MessageActions
        messageId={message.id}
        content={message.content}
        isUser={isUser}
      />

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <User className="h-5 w-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
});
