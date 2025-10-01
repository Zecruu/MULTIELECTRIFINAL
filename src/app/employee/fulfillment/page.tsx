"use client";
import { useEffect, useRef, useState } from "react";

type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const esRef = useRef<EventSource | null>(null);
  async function load() {
    const j = await fetch("/api/orders?status=Ready%20for%20Pickup").then(r=>r.json());
    setOrders(j.orders||[]);
  }
  useEffect(()=>{
    load();
    const es = new EventSource("/api/orders/stream");
    es.onmessage = () => load();
    es.onerror = () => es.close();
    esRef.current = es;
    return ()=> es.close();
  },[]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/orders?id=${id}`, { method: "PATCH", headers:{"content-type":"application/json"}, body: JSON.stringify({ status }) });
    load(); // Reload after update
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--gold)" }}>Fulfillment</h1>
      {orders.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          No orders ready for pickup
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o)=> {
            const total = (o.total_cents / 100).toFixed(2);
            const date = new Date(o.created_at).toLocaleDateString();
            const customerName = o.customer_name || o.customer_email;

            return (
              <li key={o.id} className="rounded border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-mono text-sm font-semibold text-[#D4AF37] mb-1">
                      {o.order_number}
                    </div>
                    <div className="text-sm text-gray-300 mb-1">
                      <span className="font-medium">Customer:</span> {customerName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-[#D4AF37]">
                      ${total}
                    </div>
                    <div className="text-xs text-gray-400">
                      {o.currency.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-neutral-800">
                  <button
                    onClick={()=>updateStatus(o.id, "Pending")}
                    className="flex-1 text-sm px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white transition"
                  >
                    Mark as Picked Up
                  </button>
                  <button
                    onClick={()=>updateStatus(o.id, "Fulfilled")}
                    className="flex-1 text-sm px-3 py-2 rounded bg-green-800 hover:bg-green-700 text-white transition"
                  >
                    Mark as Fulfilled
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

