'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/lib/chat-store';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Landmark,
  FileText,
  Package,
  Users,
  UserCircle,
  RefreshCw,
  BarChart3,
  Settings,
  Upload,
  Percent,
  CheckSquare,
  Mail,
  Bell,
  PackageCheck,
  FilePlus,
  MessageSquare,
  Pin,
  PinOff,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'AI Chat',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Uploads',
    href: '/uploads',
    icon: Upload,
  },
  {
    title: 'Purchases',
    href: '/purchases',
    icon: ShoppingCart,
  },
  {
    title: 'Sales',
    href: '/sales',
    icon: Receipt,
  },
  {
    title: 'Bank',
    href: '/bank',
    icon: Landmark,
  },
  {
    title: 'GST',
    href: '/gst',
    icon: FileText,
  },
  {
    title: 'SKUs',
    href: '/skus',
    icon: Package,
  },
  {
    title: 'Vendors',
    href: '/vendors',
    icon: Users,
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: UserCircle,
  },
  {
    title: 'Discount Terms',
    href: '/discount-terms',
    icon: Percent,
  },
  {
    title: 'Discount Audits',
    href: '/discount-audits',
    icon: CheckSquare,
  },
  {
    title: 'Vendor Ledger',
    href: '/vendor-ledger',
    icon: Mail,
  },
  {
    title: 'Payment Reminders',
    href: '/payment-reminders',
    icon: Bell,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: PackageCheck,
  },
  {
    title: 'Credit/Debit Notes',
    href: '/credit-debit-notes',
    icon: FilePlus,
  },
  {
    title: 'Reconciliation',
    href: '/reconciliation',
    icon: RefreshCw,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    adminOnly: true,
  },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isStreaming } = useChatStore();

  const isExpanded = isPinned || isHovered;

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN'
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'group flex h-screen flex-col border-r bg-muted/40 transition-all duration-300',
          isExpanded ? 'w-64' : 'w-14'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header with logo and pin button */}
        <div className="flex h-16 items-center justify-between border-b px-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            {isExpanded && (
              <span className="overflow-hidden whitespace-nowrap">
                AuditFlow AI
              </span>
            )}
          </Link>

          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setIsPinned(!isPinned)}
            >
              {isPinned ? (
                <Pin className="h-4 w-4" />
              ) : (
                <PinOff className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* AI Processing indicator */}
        {isStreaming && (
          <div className={cn(
            'border-b bg-primary/10 px-3 py-2 text-xs font-medium text-primary',
            isExpanded ? 'flex items-center gap-2' : 'flex justify-center'
          )}>
            <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />
            {isExpanded && <span>AI Processing...</span>}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              const navItem = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isExpanded ? 'justify-start' : 'justify-center',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {isExpanded && (
                    <span className="overflow-hidden whitespace-nowrap">
                      {item.title}
                    </span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {!isExpanded ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {navItem}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navItem
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {isExpanded && (
          <div className="border-t p-3">
            <div className="text-xs text-muted-foreground">
              <p>All Modules: Complete ✓</p>
              <p className="mt-1">13 Reconciliation Modules Active</p>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
