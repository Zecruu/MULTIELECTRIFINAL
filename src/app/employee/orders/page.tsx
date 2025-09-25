"use client";
import { useEffect, useRef, useState } from "react";

type Order = {
  id: number;
  number: string;
  clientName: string;
  email: string;
  total: number;
  status: "Pending" | "Ready for Pickup" | "Fulfilled" | "Canceled";
  date: string;
  assigned: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const esRef = useRef<EventSource | null>(null);

  async function load() {
    const j = await fetch("/api/orders").then(r=>r.json());
    setOrders(j.orders||[]);
  }
  useEffect(() => {
    load();
    const es = new EventSource("/api/orders/stream");
    es.onmessage = () => load();
    es.onerror = () => { es.close(); };
    esRef.current = es;
    return () => { es.close(); };
  }, []);

  async function updateStatus(id: number, status: Order["status"]) {
    const res = await fetch(`/api/orders?id=${id}`, { method: "PATCH", headers: {"content-type":"application/json"}, body: JSON.stringify({ status })});
    if (res.ok) {
      setOrders((prev)=>prev.map(o=>o.id===id?{...o,status}:o));
    }
  }

  function exportCSV() {
    const header = ["number","client","email","total","status","date","assigned"];
    const rows = orders.map(o=>[o.number,o.clientName,o.email,o.total.toFixed(2),o.status,o.date,o.assigned]);
    const csv = [header, ...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Orders</h1>
        <button onClick={exportCSV} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export CSV</button>
      </div>
      <div className="overflow-x-auto rounded-md border border-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr className="text-left">
              <th className="px-3 py-2">Order #</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o)=> (
              <tr key={o.id} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                <td className="px-3 py-2 font-mono">{o.number}</td>
                <td className="px-3 py-2">{o.clientName}</td>
                <td className="px-3 py-2">{o.email}</td>
                <td className="px-3 py-2">${o.total.toFixed(2)}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{o.date}</td>
                <td className="px-3 py-2">{o.assigned}</td>
                <td className="px-3 py-2 space-x-2">
                  <button onClick={()=>updateStatus(o.id, "Ready for Pickup")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Mark Ready</button>
                  <button onClick={()=>updateStatus(o.id, "Fulfilled")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Fulfill</button>
                  <button onClick={()=>updateStatus(o.id, "Canceled")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
