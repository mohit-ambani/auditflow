'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';

export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4">
      {/* User message skeleton */}
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] space-y-2">
          <div className="rounded-lg bg-primary px-4 py-2">
            <Skeleton className="h-4 w-64 bg-primary-foreground/20" />
          </div>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>

      {/* Assistant message skeleton */}
      <div className="flex gap-3 justify-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="max-w-[80%] space-y-2">
          <div className="rounded-lg bg-muted px-4 py-2">
            <Skeleton className="h-4 w-80 mb-2" />
            <Skeleton className="h-4 w-64 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatWindowSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="border-b p-4">
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessageSkeleton />
      </div>

      {/* Input skeleton */}
      <div className="border-t p-4 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-20" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidePanelSkeleton() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg p-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
