'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConnectionStatusProps {
  isStreaming: boolean;
  lastMessageTime?: Date;
}

export function ConnectionStatus({ isStreaming, lastMessageTime }: ConnectionStatusProps) {
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!isStreaming) {
      setTimeoutWarning(false);
      setStuck(false);
      return;
    }

    // Warn after 15 seconds of no response
    const warningTimer = setTimeout(() => {
      setTimeoutWarning(true);
      toast.warning('AI is taking longer than usual...', {
        description: 'Still processing your request'
      });
    }, 15000);

    // Mark as stuck after 30 seconds
    const stuckTimer = setTimeout(() => {
      setStuck(true);
      toast.error('AI appears to be stuck', {
        description: 'Try refreshing the page',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      });
    }, 30000);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(stuckTimer);
    };
  }, [isStreaming, lastMessageTime]);

  if (!isStreaming) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-4",
      "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg",
      stuck
        ? "bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800"
        : timeoutWarning
        ? "bg-yellow-100 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-800"
        : "bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800"
    )}>
      {stuck ? (
        <>
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            AI appears stuck
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </>
      ) : timeoutWarning ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            Taking longer than usual...
          </span>
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            AI is thinking...
          </span>
        </>
      )}
    </div>
  );
}

export function ConnectionIndicator({ connected = true }: { connected: boolean }) {
  if (connected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-destructive">
      <WifiOff className="h-3 w-3" />
      <span>Disconnected</span>
    </div>
  );
}
