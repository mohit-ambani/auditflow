'use client';

import { memo, useMemo, useCallback } from 'react';
import { ChatMessage, useChatStore } from '@/lib/chat-store';
import { cn } from '@/lib/utils';
import { MessageBubbleEnhanced } from './message-bubble-enhanced';
import { TypingIndicator } from './typing-indicator';
import {
  FileUploadCard,
  ExtractedDataCard,
  ConfirmationCard,
  ReconciliationResultCard,
  DataTableCard,
  ProcessingStatusCard
} from './rich-message-cards';
import { DashboardWidget } from './dashboard-widget';
import { sendConfirmationResponse } from '@/lib/chat-api';
import { toast } from 'sonner';

interface Props {
  messages: ChatMessage[];
  streamingMessage: string;
  isStreaming: boolean;
}

export const ChatMessageList = memo(function ChatMessageList({ messages, streamingMessage, isStreaming }: Props) {
  const memoizedMessages = useMemo(() => {
    return messages.map((message) => (
      <MessageBubble key={message.id} message={message} />
    ));
  }, [messages]);

  return (
    <div className="space-y-6">
      {memoizedMessages}

      {/* Streaming message */}
      {isStreaming && streamingMessage && (
        <MessageBubbleEnhanced
          message={{
            id: 'streaming',
            role: 'ASSISTANT',
            content: streamingMessage,
            createdAt: new Date()
          }}
          isStreaming
        />
      )}

      {/* Typing indicator when streaming starts but no content yet */}
      {isStreaming && !streamingMessage && (
        <TypingIndicator />
      )}
    </div>
  );
});

const MessageBubble = memo(function MessageBubble({
  message
}: {
  message: ChatMessage;
}) {
  const isUser = message.role === 'USER';
  const { activeConversationId, fileStatuses, pendingConfirmations, resolveConfirmation } = useChatStore();

  // Detect rich card types from toolResults
  const renderRichCards = () => {
    if (!message.toolResults || message.toolResults.length === 0) {
      return null;
    }

    return message.toolResults.map((result: any, index: number) => {
      // File processing result
      if (result.tool_name === 'classify_and_process_file' && result.data) {
        const { file_id, classification, extracted_data, arithmetic_verified, needs_manual_review } = result.data;

        return (
          <ExtractedDataCard
            key={`extracted-${index}`}
            documentType={classification?.documentType || 'UNKNOWN'}
            extractedData={extracted_data}
            confidence={classification?.confidence || 0}
            arithmeticVerified={arithmetic_verified}
            onSave={async () => {
              // Will be handled by AI through confirmation
              toast.success('Saving...');
            }}
            onEdit={() => {
              toast.info('Edit functionality coming soon');
            }}
            onReject={() => {
              toast.info('Rejected');
            }}
          />
        );
      }

      // Reconciliation result
      if (result.tool_name === 'auto_reconcile_after_save' && result.data) {
        return (
          <ReconciliationResultCard
            key={`recon-${index}`}
            matchType={result.data.match_type}
            matches={result.data.matches || []}
            onAccept={async (matchId: string) => {
              toast.success('Match accepted');
            }}
            onReject={async (matchId: string) => {
              toast.success('Match rejected');
            }}
          />
        );
      }

      // Data table result
      if (result.tool_name === 'present_data_table' && result.data) {
        return (
          <DataTableCard
            key={`table-${index}`}
            title={result.data.title}
            columns={result.data.columns}
            rows={result.data.rows}
          />
        );
      }

      // Dashboard widget result
      if (result.tool_name === 'show_dashboard_widget' && result.data) {
        return (
          <DashboardWidget
            key={`widget-${index}`}
            widgetType={result.data.widget_type}
            data={result.data.data}
            period={result.data.period}
          />
        );
      }

      return null;
    });
  };

  // Render file upload status cards
  const renderFileStatusCards = () => {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    return message.attachments.map((fileId: string) => {
      const status = fileStatuses[fileId];
      if (!status) return null;

      return (
        <FileUploadCard
          key={fileId}
          fileName={status.fileName}
          fileSize={status.fileSize}
          uploadProgress={status.uploadProgress}
          processingStage={status.processingStage}
          documentType={status.documentType}
          confidence={status.confidence}
          error={status.error}
        />
      );
    });
  };

  // Render confirmation cards
  const renderConfirmationCards = useCallback(() => {
    const messageConfirmations = pendingConfirmations.filter(
      (c) => !c.resolved && message.content.includes(c.message)
    );

    if (messageConfirmations.length === 0) return null;

    return messageConfirmations.map((confirmation) => (
      <ConfirmationCard
        key={confirmation.id}
        message={confirmation.message}
        data={confirmation.data}
        onConfirm={async () => {
          resolveConfirmation(confirmation.id, true);
          toast.success('Confirmed - Please send "yes" or confirm in your next message');
        }}
        onReject={async () => {
          resolveConfirmation(confirmation.id, false);
          toast.info('Rejected - Please send "no" or reject in your next message');
        }}
      />
    ));
  }, [pendingConfirmations, message.content, resolveConfirmation]);

  return (
    <div className="space-y-4">
      {/* Use enhanced bubble for text */}
      <MessageBubbleEnhanced message={message} />

      {/* Rich cards below message */}
      {!isUser && (
        <div className="ml-12 space-y-3">
          {renderFileStatusCards()}
          {renderRichCards()}
          {renderConfirmationCards()}
        </div>
      )}
    </div>
  );
});
