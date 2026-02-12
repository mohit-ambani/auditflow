'use client';

import { useChatStore } from '@/lib/chat-store';
import { fetchConversationHistory } from '@/lib/chat-api';
import { cn } from '@/lib/utils';
import { MessageSquare, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { deleteConversation as deleteConversationAPI } from '@/lib/chat-api';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function ConversationList() {
  const { conversations, activeConversationId, setActiveConversation, setMessages, deleteConversation, reset } = useChatStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSelectConversation = async (id: string) => {
    if (id === activeConversationId) return;

    // Clear current state
    reset();

    // Set as active
    setActiveConversation(id);

    // Load conversation history
    try {
      const { messages } = await fetchConversationHistory(id);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this conversation?')) return;

    try {
      setDeleting(id);
      await deleteConversationAPI(id);
      deleteConversation(id);

      // If deleted conversation was active, clear state
      if (id === activeConversationId) {
        reset();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeleting(null);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No conversations yet
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Start a new chat to begin
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {conversations.map((conv) => {
        const isActive = activeConversationId === conv.id;
        const isHovered = hoveredId === conv.id;
        const isDeleting = deleting === conv.id;

        return (
          <div
            key={conv.id}
            onMouseEnter={() => setHoveredId(conv.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="relative group"
          >
            <button
              onClick={() => handleSelectConversation(conv.id)}
              disabled={isDeleting}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                "focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                isActive && "bg-slate-100 dark:bg-slate-800",
                isDeleting && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-start gap-2 pr-6">
                <MessageSquare className={cn(
                  "h-4 w-4 mt-0.5 flex-shrink-0",
                  isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-600"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm truncate leading-tight",
                    isActive
                      ? "font-medium text-slate-900 dark:text-slate-100"
                      : "text-slate-700 dark:text-slate-300"
                  )}>
                    {conv.title || 'New Conversation'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                    {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </button>

            {/* Delete button - shows on hover */}
            {isHovered && !isDeleting && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
