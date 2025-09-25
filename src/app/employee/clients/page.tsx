"use client";
import { useEffect, useState } from "react";

type Client = { id: string; name: string; email: string; totalOrders: number; lastOrder: string; status: string };

export default function ClientsPage() {
  const [rows, setRows] = useState<Client[]>([]);
  useEffect(()=>{ fetch("/api/clients").then(r=>r.json()).then(j=>setRows(j.clients||[])); },[]);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--gold)" }}>Clients</h1>
      <div className="overflow-x-auto rounded-md border border-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr className="text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Total Orders</th>
              <th className="px-3 py-2">Last Order</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c)=> (
              <tr key={c.id} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                <td className="px-3 py-2">{c.id}</td>
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2">{c.totalOrders}</td>
                <td className="px-3 py-2">{c.lastOrder}</td>
                <td className="px-3 py-2">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
