'use client';

import { useEffect, useState } from 'react';
import { ChatWindow } from '@/components/chat/chat-window';
import { ChatSidePanel } from '@/components/chat/chat-side-panel';
import { ConversationList } from '@/components/chat/conversation-list';
import { ChatErrorBoundary } from '@/components/chat/chat-error-boundary';
import { ChatWindowSkeleton, ConversationListSkeleton } from '@/components/chat/chat-skeleton';
import { useChatStore } from '@/lib/chat-store';
import { fetchConversations, createConversation } from '@/lib/chat-api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PlusCircle, MessageSquare, Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const [loading, setLoading] = useState(true);
  const [showConversations, setShowConversations] = useState(true);
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);

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

      // Auto-select first conversation if available and none is active
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
      // Reset current state first
      reset();

      // Create new conversation
      const newConv = await createConversation();

      // Add to list and set as active
      addConversation(newConv);

      // Close mobile menu
      setMobileConversationsOpen(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Skeleton for conversations sidebar */}
        <div className="hidden md:flex w-64 border-r bg-muted/30 flex-col flex-shrink-0">
          <div className="p-3 border-b">
            <div className="h-9 w-full bg-muted rounded animate-pulse" />
          </div>
          <ConversationListSkeleton />
        </div>

        {/* Skeleton for main chat */}
        <div className="flex-1 overflow-hidden">
          <ChatWindowSkeleton />
        </div>
      </div>
    );
  }

  return (
    <ChatErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950">
        {/* Mobile: Menu button */}
        <div className="md:hidden absolute top-4 left-4 z-10">
          <Sheet open={mobileConversationsOpen} onOpenChange={setMobileConversationsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="flex flex-col h-full">
                <div className="p-3 border-b">
                  <Button
                    onClick={handleNewConversation}
                    className="w-full justify-start gap-2 rounded-lg"
                    variant="outline"
                  >
                    <PlusCircle className="h-4 w-4" />
                    New chat
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ConversationList />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: Conversations sidebar - Claude-like */}
        {showConversations && (
          <div className="hidden md:flex w-64 border-r bg-white dark:bg-slate-900 flex-col flex-shrink-0 h-screen">
            {/* Header */}
            <div className="p-2 border-b flex items-center justify-between">
              <Button
                onClick={handleNewConversation}
                className="flex-1 justify-start gap-2 rounded-lg h-9"
                variant="ghost"
              >
                <PlusCircle className="h-4 w-4" />
                New chat
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 ml-1"
                onClick={() => setShowConversations(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto p-2">
              <ConversationList />
            </div>
          </div>
        )}

        {/* Toggle sidebar button when hidden */}
        {!showConversations && (
          <div className="hidden md:block absolute top-4 left-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              onClick={() => setShowConversations(true)}
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Main chat area - Claude-like */}
        <div className={cn(
          "flex-1 transition-all flex flex-col h-screen overflow-hidden",
          sidePanelOpen ? "md:w-1/2" : "w-full"
        )}>
          {activeConversationId ? (
            <ChatWindow key={activeConversationId} />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center max-w-md space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-xl">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    How can I help you today?
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Start a new conversation to interact with your accounting data
                  </p>
                </div>
                <Button
                  onClick={handleNewConversation}
                  size="lg"
                  className="gap-2 rounded-xl"
                >
                  <PlusCircle className="h-5 w-5" />
                  Start new chat
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop: Side panel for results */}
        {sidePanelOpen && (
          <div className="hidden md:block md:w-1/2 border-l flex-shrink-0 h-screen overflow-hidden bg-white dark:bg-slate-900">
            <ChatSidePanel />
          </div>
        )}

        {/* Mobile: Bottom sheet for side panel */}
        {sidePanelOpen && (
          <Sheet open={sidePanelOpen} onOpenChange={(open) => !open && useChatStore.getState().setSidePanelData(null)}>
            <SheetContent side="bottom" className="h-[80vh] md:hidden p-0">
              <ChatSidePanel />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </ChatErrorBoundary>
  );
}
