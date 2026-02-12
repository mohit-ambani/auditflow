'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreVertical,
  Check,
  BookmarkPlus,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  messageId: string;
  content: string;
  isUser: boolean;
  onRegenerate?: () => void;
}

export function MessageActions({
  messageId,
  content,
  isUser,
  onRegenerate
}: MessageActionsProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    toast.success(type === 'up' ? 'Thanks for the feedback!' : 'Feedback recorded');
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    toast.success(bookmarked ? 'Bookmark removed' : 'Bookmarked!');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    toast.info('Share functionality coming soon');
  };

  const handleFlag = () => {
    toast.info('Message flagged for review');
  };

  return (
    <div className={cn(
      "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
      "absolute -bottom-6",
      isUser ? "right-12" : "left-12"
    )}>
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-1 shadow-lg">
        {/* Copy */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 rounded-full p-0"
          onClick={copyMessage}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Feedback (AI messages only) */}
        {!isUser && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 rounded-full p-0",
                feedback === 'up' && "text-green-600"
              )}
              onClick={() => handleFeedback('up')}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 rounded-full p-0",
                feedback === 'down' && "text-red-600"
              )}
              onClick={() => handleFeedback('down')}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </>
        )}

        {/* Bookmark */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 rounded-full p-0",
            bookmarked && "text-yellow-600"
          )}
          onClick={handleBookmark}
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
        </Button>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-full p-0"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isUser ? "end" : "start"}>
            {!isUser && onRegenerate && (
              <DropdownMenuItem onClick={onRegenerate}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Regenerate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFlag}>
              <Flag className="h-4 w-4 mr-2" />
              Report Issue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
