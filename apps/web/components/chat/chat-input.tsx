'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, X, Loader2, Upload, IndianRupee, FileText, LayoutDashboard } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import { sendChatMessage, uploadAndProcessFile } from '@/lib/chat-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { activeConversationId, isStreaming, quickActions, setFileStatus } = useChatStore();

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the dropzone entirely
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
      // Auto-generate message if empty
      if (!input.trim()) {
        setInput(`Process ${files.length === 1 ? 'this file' : 'these files'}`);
      }
    }
  };

  // Paste handler for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      imageItems.forEach(item => {
        const file = item.getAsFile();
        if (file) {
          setAttachments(prev => [...prev, file]);
        }
      });

      if (!input.trim()) {
        setInput('Process this image');
      }
    }
  };

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
      // Upload and process files first
      const fileIds: string[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        for (const file of attachments) {
          // Initialize file status
          const tempId = `temp-${Date.now()}-${Math.random()}`;
          setFileStatus(tempId, {
            fileId: tempId,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            uploadProgress: 0,
            processingStage: 'uploading'
          });

          // Upload with progress tracking
          const result = await uploadAndProcessFile(file, (progress) => {
            setFileStatus(tempId, {
              fileId: tempId,
              uploadProgress: progress,
              processingStage: progress === 100 ? 'parsing' : 'uploading'
            });
          });

          fileIds.push(result.file_id);

          // Update with real file ID and classification
          setFileStatus(result.file_id, {
            fileId: result.file_id,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            uploadProgress: 100,
            processingStage: 'ready',
            documentType: result.document_type,
            confidence: result.confidence
          });
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

  const handleQuickAction = (prompt: string) => {
    if (prompt) {
      setInput(prompt);
      textareaRef.current?.focus();
    } else {
      // Upload action - trigger file picker
      fileInputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag and drop overlay (desktop only) */}
      {isDragOver && (
        <div className="hidden md:flex absolute inset-0 z-50 items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-dashed border-primary bg-card p-12 text-center">
            <Upload className="mx-auto h-16 w-16 text-primary mb-4" />
            <p className="text-xl font-semibold">Drop files to upload</p>
            <p className="text-sm text-muted-foreground mt-2">PDF, Excel, Images supported</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {quickActions.map((action) => {
          const IconComponent = action.icon === 'Upload' ? Upload :
                               action.icon === 'IndianRupee' ? IndianRupee :
                               action.icon === 'FileText' ? FileText :
                               action.icon === 'LayoutDashboard' ? LayoutDashboard : Upload;

          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isStreaming || uploading}
              className="text-xs whitespace-nowrap flex-shrink-0"
            >
              <IconComponent className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.icon === 'Upload' ? 'Upload' : action.label.split(' ')[0]}</span>
            </Button>
          );
        })}
      </div>

      {/* Attachments with progress */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file) => {
            const fileSizeKB = (file.size / 1024).toFixed(1);
            return (
              <Badge
                key={`${file.name}-${file.size}`}
                variant="secondary"
                className="flex items-center gap-2 py-1.5 px-3"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[150px] truncate text-xs">{file.name}</span>
                <span className="text-xs text-muted-foreground">({fileSizeKB} KB)</span>
                {!uploading && (
                  <button
                    onClick={() => removeAttachment(file.name)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div
        className={cn(
          "relative flex gap-2 rounded-2xl border-2 p-1 transition-all duration-200",
          isDragOver
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask about invoices, reconciliation, or drag files here..."
          className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60 p-3"
          disabled={isStreaming || uploading}
        />

        <div className="flex flex-col gap-2 self-end pb-1 pr-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={isStreaming || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
          />

          <Button
            onClick={handleSend}
            disabled={isStreaming || uploading || (!input.trim() && attachments.length === 0)}
            size="icon"
            className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 transition-all disabled:opacity-50"
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
