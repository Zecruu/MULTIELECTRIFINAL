"use client";
import { useEffect, useState } from "react";
import ProductModal, { ProductInput } from "@/components/admin/ProductModal";
import type { Me } from "@/lib/auth";

type ProductRow = { id: string; sku: string; name_en: string; name_es: string; category: string; price: number; stock: number; status: string; updatedAt: string };

export default function InventoryPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  async function load() {
    const meRes = await fetch("/api/employee/me").then(r=>r.json());
    setMe(meRes.me as Me);
    const j = await fetch("/api/products").then(r=>r.json());
    setRows(j.products || []);
  }
  useEffect(()=>{ load(); },[]);

  async function onDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const canManage = !!me?.permissions?.canManageInventory;
  const initial: ProductInput | undefined = editId ? (() => {
    const r = rows.find(x=>x.id===editId);
    if (!r) return undefined;
    return { id: r.id, name_en: r.name_en, name_es: r.name_es, category: r.category, price: String(r.price), stock: String(r.stock) } as ProductInput;
  })() : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Inventory</h1>
        <div className="flex items-center gap-3">
          {canManage && (
            <button onClick={()=>{ setEditId(null); setOpen(true); }} className="rounded-md bg-[--gold] text-black font-semibold py-2 px-3 hover:brightness-95">Add Product</button>
          )}
        </div>
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
              {canManage && <th className="px-3 py-2">Actions</th>}
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
                <td className="px-3 py-2">
                  <span className={`${p.stock<1?"text-red-400":p.stock<10?"text-yellow-300":""}`}>{p.stock}</span>
                </td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.updatedAt}</td>
                {canManage && (
                  <td className="px-3 py-2 space-x-2">
                    <button onClick={()=>{ setEditId(p.id); setOpen(true); }} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Edit</button>
                    <button onClick={()=>onDelete(p.id)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ProductModal open={open} onClose={()=>setOpen(false)} initial={initial} onSaved={load} />
    </div>
  );
}
