import { getDashboardSummary } from "@/lib/db";
export const dynamic = "force-dynamic";


function fmtCurrency(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);
}

export default async function DashboardPage() {
  const { activeOrders, lowStockAlerts, customers, revenueCents30d } = await getDashboardSummary();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Active Orders</div><div className="text-2xl font-bold">{activeOrders}</div></div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Low Stock Alerts</div><div className="text-2xl font-bold">{lowStockAlerts}</div></div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Customers</div><div className="text-2xl font-bold">{customers}</div></div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4"><div className="text-sm text-gray-400">Revenue (30d)</div><div className="text-2xl font-bold">{fmtCurrency(revenueCents30d)}</div></div>
      </div>
      <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4">
        <div className="text-sm text-gray-400 mb-2">Sales Trend (Last 30 days)</div>
        <div className="h-40 grid place-items-center text-gray-500 text-sm">Chart placeholder</div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <a href="/employee/inventory" className="rounded-md border border-[--gold]/60 bg-neutral-900/60 text-[--gold] font-semibold py-2 px-4 text-center hover:brightness-110">Inventory</a>
        <a href="/employee/orders" className="rounded-md border border-[--gold]/60 bg-neutral-900/60 text-[--gold] font-semibold py-2 px-4 text-center hover:brightness-110">Orders</a>
        <a href="/employee/clients" className="rounded-md border border-[--gold]/60 bg-neutral-900/60 text-[--gold] font-semibold py-2 px-4 text-center hover:brightness-110">Clients</a>
      </div>
    </div>
  );
}
