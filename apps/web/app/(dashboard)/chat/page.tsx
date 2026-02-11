'use client';

import { useEffect, useState } from 'react';
import { ChatWindow } from '@/components/chat/chat-window';
import { ChatSidePanel } from '@/components/chat/chat-side-panel';
import { ConversationList } from '@/components/chat/conversation-list';
import { useChatStore } from '@/lib/chat-store';
import { fetchConversations, createConversation } from '@/lib/chat-api';
import { Button } from '@/components/ui/button';
import { PlusCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const [loading, setLoading] = useState(true);
  const [showConversations, setShowConversations] = useState(true);

  const {
    conversations,
    activeConversationId,
    sidePanelOpen,
    setConversations,
    setActiveConversation,
    addConversation,
    reset
  } = useChatStore();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await fetchConversations();
      setConversations(convs);

      // Auto-select first conversation if available
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversation(convs[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation();
      addConversation(newConv);
      reset();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversations sidebar */}
      {showConversations && (
        <div className="w-64 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <Button
              onClick={handleNewConversation}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList />
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className={cn(
        "flex-1 transition-all",
        sidePanelOpen ? "w-1/2" : "w-full"
      )}>
        {activeConversationId ? (
          <ChatWindow />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md">
              <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Welcome to AuditFlow AI</h2>
              <p className="text-muted-foreground mb-6">
                Start a new conversation to interact with your accounting data,
                upload documents, and automate reconciliations.
              </p>
              <Button onClick={handleNewConversation} size="lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Side panel for results */}
      {sidePanelOpen && (
        <div className="w-1/2 border-l">
          <ChatSidePanel />
        </div>
      )}
    </div>
  );
}
