export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to AuditFlow AI
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Payables</p>
          <p className="text-2xl font-bold">₹0.00</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Receivables</p>
          <p className="text-2xl font-bold">₹0.00</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Unmatched Invoices</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Recon Health</p>
          <p className="text-2xl font-bold">100%</p>
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">
          Dashboard components will be built in Phase 6 (Module 14)
        </p>
      </div>
    </div>
  );
}
