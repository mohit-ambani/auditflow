'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { UserNav } from '@/components/layout/user-nav';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ProtectedRoute>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Global keyboard shortcut (Cmd+K or Ctrl+K) to navigate to chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/chat');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const isOnChatPage = pathname === '/chat' || pathname.startsWith('/chat/');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Welcome back, {user?.name}!</h2>

            {/* Quick access to AI Chat */}
            {!isOnChatPage && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => router.push('/chat')}
              >
                <Sparkles className="h-4 w-4" />
                Ask AI
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            )}
          </div>
          <UserNav />
        </header>
        <main className={cn(
          "flex-1 overflow-hidden bg-muted/40",
          isOnChatPage ? "p-0" : "p-6 overflow-auto"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
