"use client";
import { useEffect, useState } from "react";

type ProductRow = { id: string; sku: string; name_en: string; name_es: string; category: string; price: number; stock: number; status: string; updatedAt: string };

export default function InventoryPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  useEffect(()=>{ fetch("/api/products").then(r=>r.json()).then(j=>setRows(j.products||[])); },[]);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Inventory</h1>
        <a href="/admin" className="text-sm text-gray-300 hover:text-white">Open legacy admin form</a>
      </div>
      <div className="overflow-x-auto rounded-md border border-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr className="text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Name (EN)</th>
              <th className="px-3 py-2">Nombre (ES)</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p)=> (
              <tr key={p.id} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                <td className="px-3 py-2">{p.id}</td>
                <td className="px-3 py-2">{p.sku}</td>
                <td className="px-3 py-2">{p.name_en}</td>
                <td className="px-3 py-2">{p.name_es}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="px-3 py-2">${p.price.toFixed(2)}</td>
                <td className="px-3 py-2">{p.stock}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
