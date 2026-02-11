'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import { sendChatMessage, uploadChatFile } from '@/lib/chat-api';
import { toast } from 'sonner';

export function ChatInput() {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { activeConversationId, isStreaming } = useChatStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeAttachment = (fileName: string) => {
    setAttachments(prev => prev.filter(f => f.name !== fileName));
  };

  const handleSend = async () => {
    if (!activeConversationId) {
      toast.error('No active conversation');
      return;
    }

    if (!input.trim() && attachments.length === 0) {
      return;
    }

    try {
      // Upload files first
      const fileIds: string[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        for (const file of attachments) {
          const fileId = await uploadChatFile(file);
          fileIds.push(fileId);
        }
        setUploading(false);
      }

      // Send message
      await sendChatMessage(activeConversationId, input, fileIds);

      // Clear input
      setInput('');
      setAttachments([]);
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send message');
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm">
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[200px] truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(file.name)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about invoices, reconciliation, or drag files here..."
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={isStreaming || uploading}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="file-upload">
            <Button
              variant="outline"
              size="icon"
              disabled={isStreaming || uploading}
              asChild
            >
              <span>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </span>
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
            />
          </label>

          <Button
            onClick={handleSend}
            disabled={isStreaming || uploading || (!input.trim() && attachments.length === 0)}
            size="icon"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
