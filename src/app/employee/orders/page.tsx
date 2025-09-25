"use client";
import { useEffect, useState } from "react";

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
  useEffect(() => {
    fetch("/api/orders").then(r=>r.json()).then(j=>setOrders(j.orders||[]));
  }, []);

  async function updateStatus(id: number, status: Order["status"]) {
    const res = await fetch(`/api/orders?id=${id}`, { method: "PATCH", headers: {"content-type":"application/json"}, body: JSON.stringify({ status })});
    if (res.ok) {
      setOrders((prev)=>prev.map(o=>o.id===id?{...o,status}:o));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--gold)" }}>Orders</h1>
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
