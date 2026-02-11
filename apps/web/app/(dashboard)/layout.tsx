export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar will be added in Module 2 */}
      <aside className="w-64 border-r bg-muted/40 p-4">
        <div className="mb-4 text-lg font-bold">AuditFlow AI</div>
        <nav className="space-y-2 text-sm">
          <div>Navigation will be added in Module 2</div>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}
