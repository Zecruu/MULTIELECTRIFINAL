"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReportData = {
  sales: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueByMonth: Array<{ month: string; revenue: number }>;
  };
  inventory: {
    lowStockProducts: Array<{ id: string; name: string; stock: number; min_stock: number }>;
    outOfStockProducts: Array<{ id: string; name: string }>;
    totalProducts: number;
  };
  customers: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    repeatCustomers: number;
    repeatCustomerRate: number;
  };
};

export default function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [me, setMe] = useState<{ role: string } | null>(null);

  // Check if user is admin
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/employee/me");
        if (!res.ok) {
          router.push("/employee/login");
          return;
        }
        const meData = await res.json();
        if (meData.me.role !== "admin") {
          router.push("/employee");
          return;
        }
        setMe(meData.me);
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/employee/login");
      }
    }
    checkAuth();
  }, [router]);

  // Load report data
  useEffect(() => {
    if (!me) return;
    loadReports();
  }, [me, dateRange]);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?days=${dateRange}`);
      if (!res.ok) throw new Error("Failed to load reports");
      const reportData = await res.json();
      setData(reportData);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(format: "csv" | "pdf") {
    try {
      const res = await fetch(`/api/admin/reports/export?format=${format}&days=${dateRange}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report");
    }
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#D4AF37] mb-2">Reports & Analytics</h1>
        <p className="text-gray-400">Business intelligence dashboard</p>
      </div>

      {/* Filters and Export */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Date Range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => exportReport("csv")}
              className="px-4 py-2 bg-neutral-800 text-gray-200 rounded-md hover:bg-neutral-700 transition"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportReport("pdf")}
              className="px-4 py-2 bg-[#D4AF37] text-neutral-950 font-semibold rounded-md hover:bg-[#C4A037] transition"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading reports...</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Sales Overview */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#D4AF37] mb-4">Sales Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-neutral-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-green-400">
                  ${(data.sales.totalRevenue / 100).toFixed(2)}
                </div>
              </div>
              <div className="bg-neutral-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-blue-400">{data.sales.totalOrders}</div>
              </div>
              <div className="bg-neutral-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Average Order Value</div>
                <div className="text-2xl font-bold text-[#D4AF37]">
                  ${(data.sales.averageOrderValue / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#D4AF37] mb-4">Inventory Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Low Stock */}
              <div>
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">
                  Low Stock Alerts ({data.inventory.lowStockProducts.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.inventory.lowStockProducts.map((p) => (
                    <div key={p.id} className="bg-neutral-800/50 p-2 rounded text-sm">
                      <div className="text-gray-200">{p.name}</div>
                      <div className="text-xs text-gray-400">
                        Stock: {p.stock} / Min: {p.min_stock}
                      </div>
                    </div>
                  ))}
                  {data.inventory.lowStockProducts.length === 0 && (
                    <div className="text-sm text-gray-500">No low stock items</div>
                  )}
                </div>
              </div>

              {/* Out of Stock */}
              <div>
                <h3 className="text-sm font-semibold text-red-400 mb-2">
                  Out of Stock ({data.inventory.outOfStockProducts.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.inventory.outOfStockProducts.map((p) => (
                    <div key={p.id} className="bg-neutral-800/50 p-2 rounded text-sm">
                      <div className="text-gray-200">{p.name}</div>
                    </div>
                  ))}
                  {data.inventory.outOfStockProducts.length === 0 && (
                    <div className="text-sm text-gray-500">All products in stock</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Metrics */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#D4AF37] mb-4">Customer Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-neutral-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Total Customers</div>
                <div className="text-2xl font-bold text-gray-200">{data.customers.totalCustomers}</div>
              </div>
              <div className="bg-neutral-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">New This Month</div>
                <div className="text-2xl font-bold text-green-400">
                  {data.customers.newCustomersThisMonth}
                </div>
              </div>
              <div className="bg-neutral-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Repeat Customers</div>
                <div className="text-2xl font-bold text-blue-400">
                  {data.customers.repeatCustomers}
                </div>
              </div>
              <div className="bg-neutral-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Repeat Rate</div>
                <div className="text-2xl font-bold text-[#D4AF37]">
                  {data.customers.repeatCustomerRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">No data available</div>
      )}
    </div>
  );
}
