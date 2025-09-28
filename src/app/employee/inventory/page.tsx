"use client";
import { useEffect, useState } from "react";
import ProductModal, { ProductInput } from "@/components/admin/ProductModal";
import type { Me } from "@/lib/auth";

type ProductRow = { id: string; sku: string; name_en: string; name_es: string; category: string; price: number; stock: number; status: string; updatedAt: string };

export default function InventoryPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [initialForModal, setInitialForModal] = useState<ProductInput | undefined>(undefined);
  const [me, setMe] = useState<Me | null>(null);

  async function load() {
    const meRes = await fetch("/api/employee/me").then(r=>r.json()).catch(()=>({ me: null }));
    setMe(meRes.me as Me);
    const res = await fetch("/api/products");
    if (!res.ok) { console.error("/api/products error", res.status); setRows([]); return; }
    const j: { products: ProductRow[] } = await res.json();
    setRows(j.products || []);
  }


  useEffect(()=>{ load(); },[]);

  function exportCSV() {
    const header = ["id","sku","name_en","name_es","category","price","stock","status","updatedAt"];
    const data = rows.map(p=>[p.id,p.sku,p.name_en,p.name_es,p.category,p.price.toFixed(2),p.stock,p.status,p.updatedAt]);
    const csv = [header, ...data].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `inventory-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX() {
    const XLSX: typeof import("xlsx") = await import("xlsx");
    const data = rows.map(p => ({
      ID: p.id,
      SKU: p.sku,
      Name_EN: p.name_en,
      Name_ES: p.name_es,
      Category: p.category,
      Price: p.price,
      Stock: p.stock,
      Status: p.status,
      Updated: p.updatedAt,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `inventory-${Date.now()}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    type PdfDocProxy = { download: (filename?: string) => void };
    type PdfMake = { vfs?: Record<string, string>; createPdf: (docDefinition: object) => PdfDocProxy };
    type PdfFonts = { pdfMake: { vfs: Record<string, string> } };
    const pdfMakeMod = await import("pdfmake/build/pdfmake");
    const pdfFontsMod = await import("pdfmake/build/vfs_fonts");
    const pdfMake = (pdfMakeMod as unknown as { default: PdfMake }).default;
    const pdfFonts = pdfFontsMod as unknown as PdfFonts;
    pdfMake.vfs = pdfFonts.pdfMake.vfs;

    const header = ["ID","SKU","Name (EN)","Name (ES)","Category","Price","Stock","Status","Updated"];
    const body = [
      header.map(h => ({ text: h, bold: true, fillColor: "#111827", color: "#E5E7EB" })),
      ...rows.map(p => [p.id, p.sku, p.name_en, p.name_es, p.category, p.price.toFixed(2), p.stock, p.status, p.updatedAt])
    ];

    const docDefinition = {
      content: [
        { text: "Inventory", style: "header" },
        { table: { headerRows: 1, widths: ["auto","auto","*","*","*","auto","auto","auto","auto"], body }, layout: "lightHorizontalLines" }
      ],
      styles: { header: { fontSize: 16, bold: true, color: "#D4AF37", margin: [0,0,0,10] } },
      defaultStyle: { fontSize: 9 }
    } as const;

    pdfMake.createPdf(docDefinition).download(`inventory-${Date.now()}.pdf`);
  }


  async function onDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const canManage = !!me?.permissions?.canManageInventory;
  const initial: ProductInput | undefined = initialForModal ?? (editId ? (() => {
    const r = rows.find(x=>x.id===editId);
    if (!r) return undefined;
    return { id: r.id, name_en: r.name_en, name_es: r.name_es, category: r.category, price: String(r.price), stock: String(r.stock) } as ProductInput;
  })() : undefined);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Inventory</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export CSV</button>
            <button onClick={exportXLSX} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export XLSX</button>
            <button onClick={exportPDF} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export PDF</button>
            {canManage && (
              <button onClick={()=>{ setInitialForModal(undefined); setEditId(null); setOpen(true); }} className="btn-gold text-sm">Add Product</button>
            )}
          </div>
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
                    <button onClick={()=>{ setInitialForModal(undefined); setEditId(p.id); setOpen(true); }} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Edit</button>
                    <button onClick={()=>{ const r = rows.find(x=>x.id===p.id); if (r) { setInitialForModal({ name_en: r.name_en, name_es: r.name_es, category: r.category, price: String(r.price), stock: String(r.stock) }); } setEditId(null); setOpen(true); }} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Duplicate</button>
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
