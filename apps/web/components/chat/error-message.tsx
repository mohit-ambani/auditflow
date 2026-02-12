'use client';

import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'timeout';
}

export function ErrorMessage({
  error,
  onRetry,
  onDismiss,
  type = 'error'
}: ErrorMessageProps) {
  const getIcon = () => {
    switch (type) {
      case 'timeout':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      default:
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'timeout':
        return 'Request Timed Out';
      case 'warning':
        return 'Warning';
      default:
        return 'Error';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'timeout':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'warning':
        return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
    }
  };

  return (
    <Card className={`p-4 border-2 ${getBgColor()} animate-in slide-in-from-bottom-4`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-semibold text-sm">{getTitle()}</h4>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>

          {type === 'timeout' && (
            <p className="text-xs text-muted-foreground">
              The AI took too long to respond. This might be due to:
              <ul className="list-disc list-inside mt-1 ml-2">
                <li>Network connection issues</li>
                <li>Server overload</li>
                <li>Complex processing taking longer than expected</li>
              </ul>
            </p>
          )}

          <div className="flex items-center gap-2">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
