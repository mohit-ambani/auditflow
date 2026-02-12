'use client';

import { useEffect, useState } from 'react';
import { ChatWindow } from '@/components/chat/chat-window';
import { ChatSidePanel } from '@/components/chat/chat-side-panel';
import { ConversationList } from '@/components/chat/conversation-list';
import { WorkflowTemplateSelector } from '@/components/chat/workflow-template-selector';
import { ChatErrorBoundary } from '@/components/chat/chat-error-boundary';
import { ChatWindowSkeleton, ConversationListSkeleton } from '@/components/chat/chat-skeleton';
import { useChatStore } from '@/lib/chat-store';
import { fetchConversations, createConversation } from '@/lib/chat-api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PlusCircle, MessageSquare, Menu, X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowTemplate } from '@/lib/workflow-templates';

export default function ChatPage() {
  const [loading, setLoading] = useState(true);
  const [showConversations, setShowConversations] = useState(true);
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);
  const [showWorkflowTemplates, setShowWorkflowTemplates] = useState(false);

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
      setShowWorkflowTemplates(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectWorkflowTemplate = async (template: WorkflowTemplate) => {
    try {
      // Create new conversation if needed
      if (!activeConversationId) {
        await handleNewConversation();
      }

      // The prompt will be set in the chat input
      // For now, just close the templates view
      setShowWorkflowTemplates(false);

      // Send the template prompt to the chat
      // This will be handled by the chat window component
      setTimeout(() => {
        const chatInput = document.querySelector('textarea') as HTMLTextAreaElement;
        if (chatInput) {
          chatInput.value = template.prompt;
          chatInput.focus();
          // Trigger input event to update React state
          const event = new Event('input', { bubbles: true });
          chatInput.dispatchEvent(event);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to select template:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full">
        {/* Skeleton for conversations sidebar */}
        <div className="hidden md:flex w-64 border-r bg-muted/30 flex-col">
          <div className="p-4 border-b">
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          <ConversationListSkeleton />
        </div>

        {/* Skeleton for main chat */}
        <div className="flex-1">
          <ChatWindowSkeleton />
        </div>
      </div>
    );
  }

  return (
    <ChatErrorBoundary>
    <div className="flex h-screen overflow-hidden relative">
      {/* Mobile: Menu button */}
      <div className="md:hidden absolute top-4 left-4 z-10">
        <Sheet open={mobileConversationsOpen} onOpenChange={setMobileConversationsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <Button
                  onClick={() => {
                    handleNewConversation();
                    setMobileConversationsOpen(false);
                  }}
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
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Conversations sidebar */}
      {showConversations && (
        <div className="hidden md:flex w-64 border-r bg-muted/30 flex-col flex-shrink-0 h-screen">
          <div className="p-4 border-b flex-shrink-0">
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
        "flex-1 transition-all flex flex-col h-screen overflow-hidden",
        sidePanelOpen ? "md:w-1/2" : "w-full"
      )}>
        {activeConversationId ? (
          <ChatWindow />
        ) : showWorkflowTemplates ? (
          <div className="flex h-full items-center justify-center p-4 overflow-y-auto">
            <WorkflowTemplateSelector
              onSelectTemplate={handleSelectWorkflowTemplate}
              onClose={() => setShowWorkflowTemplates(false)}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center max-w-md">
              <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Welcome to AuditFlow AI</h2>
              <p className="text-muted-foreground mb-6">
                Start a new conversation to interact with your accounting data,
                upload documents, and automate reconciliations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleNewConversation} size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Start New Chat
                </Button>
                <Button onClick={() => setShowWorkflowTemplates(true)} size="lg" variant="outline">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Browse Templates
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Side panel for results */}
      {sidePanelOpen && (
        <div className="hidden md:block md:w-1/2 border-l flex-shrink-0 h-screen overflow-hidden">
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
