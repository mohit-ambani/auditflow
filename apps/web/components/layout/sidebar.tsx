'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'AI Chat',
    href: '/chat',
    icon: MessageSquare,
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
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
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

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN'
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/40">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
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
          <span>AuditFlow AI</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>All Modules: Complete ✓</p>
          <p className="mt-1">13 Reconciliation Modules Active</p>
        </div>
      </div>
    </aside>
  );
}
