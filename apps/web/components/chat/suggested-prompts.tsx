'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface SuggestedPrompt {
  icon: LucideIcon;
  title: string;
  prompt: string;
  category: 'quick' | 'analysis' | 'reports' | 'actions';
  color: string;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  // Quick Actions
  {
    icon: FileText,
    title: 'Show unpaid invoices',
    prompt: 'Show me all unpaid invoices',
    category: 'quick',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950'
  },
  {
    icon: DollarSign,
    title: 'GST liability',
    prompt: 'What\'s my GST liability for this month?',
    category: 'quick',
    color: 'text-green-600 bg-green-50 dark:bg-green-950'
  },
  {
    icon: AlertTriangle,
    title: 'Find duplicates',
    prompt: 'Find duplicate payments and invoices',
    category: 'quick',
    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950'
  },
  {
    icon: CheckCircle2,
    title: 'Reconcile GST',
    prompt: 'Reconcile GST for last month',
    category: 'quick',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950'
  },

  // Analysis
  {
    icon: TrendingUp,
    title: 'Vendor analysis',
    prompt: 'Show vendor aging analysis',
    category: 'analysis',
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950'
  },
  {
    icon: BarChart3,
    title: 'Cash flow',
    prompt: 'Generate cash flow forecast for next quarter',
    category: 'analysis',
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950'
  },
  {
    icon: Users,
    title: 'Top vendors',
    prompt: 'Who are my top 10 vendors by transaction volume?',
    category: 'analysis',
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-950'
  },
  {
    icon: Clock,
    title: 'Payment delays',
    prompt: 'Analyze payment delay patterns',
    category: 'analysis',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950'
  },

  // Reports
  {
    icon: FileSpreadsheet,
    title: 'Monthly report',
    prompt: 'Generate monthly financial report',
    category: 'reports',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950'
  },
  {
    icon: Calendar,
    title: 'Quarter closing',
    prompt: 'Run quarter-end closing checklist',
    category: 'reports',
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950'
  },
];

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  filter?: 'quick' | 'analysis' | 'reports' | 'actions' | 'all';
}

export function SuggestedPrompts({ onSelectPrompt, filter = 'all' }: SuggestedPromptsProps) {
  const filteredPrompts = filter === 'all'
    ? SUGGESTED_PROMPTS
    : SUGGESTED_PROMPTS.filter(p => p.category === filter);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredPrompts.map((prompt, index) => (
        <Card
          key={index}
          className="group relative overflow-hidden border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer animate-in fade-in-0 slide-in-from-bottom-2"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => onSelectPrompt(prompt.prompt)}
        >
          <div className="p-4 flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${prompt.color} transition-transform group-hover:scale-110`}>
              <prompt.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                {prompt.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {prompt.prompt}
              </p>
            </div>
          </div>

          {/* Hover gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </Card>
      ))}
    </div>
  );
}

export function SuggestedPromptsCarousel({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {SUGGESTED_PROMPTS.slice(0, 6).map((prompt, index) => (
        <Button
          key={index}
          variant="outline"
          className="flex-shrink-0 gap-2 hover:border-primary hover:bg-primary/5"
          onClick={() => onSelectPrompt(prompt.prompt)}
        >
          <prompt.icon className="h-4 w-4" />
          {prompt.title}
        </Button>
      ))}
    </div>
  );
}
