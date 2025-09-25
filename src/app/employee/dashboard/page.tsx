export default async function DashboardPage() {
  // In a later pass, fetch KPIs via /api/reports/sales etc.
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Active Orders</div><div className="text-2xl font-bold">12</div></div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Low Stock Alerts</div><div className="text-2xl font-bold">8</div></div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Customers</div><div className="text-2xl font-bold">432</div></div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Revenue (Admin)</div><div className="text-2xl font-bold">$123,456</div></div>
      </div>
      <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4">
        <div className="text-sm text-gray-400 mb-2">Sales Trend (Last 30 days)</div>
        <div className="h-40 grid place-items-center text-gray-500 text-sm">Chart placeholder</div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <a href="/employee/inventory" className="rounded-md bg-[--gold] text-black font-semibold py-2 px-4 text-center hover:brightness-95">Inventory</a>
        <a href="/employee/orders" className="rounded-md bg-[--gold] text-black font-semibold py-2 px-4 text-center hover:brightness-95">Orders</a>
        <a href="/employee/clients" className="rounded-md bg-[--gold] text-black font-semibold py-2 px-4 text-center hover:brightness-95">Clients</a>
      </div>
    </div>
  );
}
