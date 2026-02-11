'use client';

import { useChatStore } from '@/lib/chat-store';
import { fetchConversationHistory } from '@/lib/chat-api';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ConversationList() {
  const { conversations, activeConversationId, setActiveConversation, setMessages } = useChatStore();

  const handleSelectConversation = async (id: string) => {
    setActiveConversation(id);

    // Load conversation history
    try {
      const { messages } = await fetchConversationHistory(id);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  return (
    <div className="space-y-1 p-2">
      {conversations.length === 0 ? (
        <div className="text-center p-4 text-sm text-muted-foreground">
          No conversations yet
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => handleSelectConversation(conv.id)}
            className={cn(
              "w-full text-left p-3 rounded-lg transition-colors",
              "hover:bg-accent",
              activeConversationId === conv.id && "bg-accent"
            )}
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conv.title || 'New Conversation'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
