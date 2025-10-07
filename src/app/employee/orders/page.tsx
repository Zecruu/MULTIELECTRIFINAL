"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";

function Toast({ msg, type }: { msg: string; type: "success"|"error" }) {
  const cls = type === "success" ? "bg-emerald-600/80" : "bg-red-600/80";
  return <div className={`fixed top-4 right-4 z-[60] px-3 py-2 rounded-md text-sm ${cls}`}>{msg}</div>;
}


type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string;
  total_cents: number;
  currency: string;
  status: "Pending" | "Processing" | "Ready for Pickup" | "Fulfilled" | "Canceled" | "Refunded";
  created_at: string;
};

type OrderDetail = {
  id: string;
  order_number: string;
  status: OrderRow["status"];
  created_at: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  customer: { email: string; name: string | null; phone?: string | null };
  shipping_address?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  items: Array<{ id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number }>;
};


export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const esRef = useRef<EventSource | null>(null);

  async function load() {
    const url = new URL(location.origin + "/api/orders");
    if (q) url.searchParams.set("q", q);
    if (status) url.searchParams.set("status", status);
    const res = await fetch(url.toString());




    type OrdersResp = { orders: OrderRow[] };
    if (!res.ok) { console.error("/api/orders error", res.status); setOrders([]); return; }
    const j: OrdersResp = await res.json();
    setOrders(j.orders || []);
  }
  useEffect(() => { load(); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [toast, setToast] = useState<{ msg: string; type: "success"|"error" } | null>(null);
  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    const es = new EventSource("/api/orders/stream");
    es.onmessage = () => load();
    es.onerror = () => { es.close(); };
    esRef.current = es;
    return () => { es.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  async function updateStatus(id: string, newStatus: OrderRow["status"]) {
    const res = await fetch(`/api/orders?id=${id}`, { method: "PATCH", headers: {"content-type":"application/json"}, body: JSON.stringify({ status: newStatus })});
    if (res.ok) {
      setOrders((prev)=>prev.map(o=>o.id===id?{...o,status:newStatus}:o));
      if (selected?.id === id) setSelected({ ...selected, status: newStatus });
    } else {
      console.error("orders PATCH error", res.status);
    }
  }

  async function openDetail(id: string) {


    const res = await fetch(`/api/orders?id=${id}`);
    if (!res.ok) return console.error("/api/orders?id= error", res.status);
    const j: { order: OrderDetail } = await res.json();
    setSelected(j.order);
  }

  function exportCSV() {
    const header = ["number","client","email","total","status","date"];
    const rows = orders.map(o=>[o.order_number,o.customer_name||"",o.customer_email,(o.total_cents/100).toFixed(2),o.status,new Date(o.created_at).toISOString().slice(0,10)]);
    const csv = [header, ...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function refundOrder(id: string) {
    const res = await fetch(`/api/orders/${id}/refund`, { method: "POST" });
    if (!res.ok) return showToast("Refund failed", "error");
    showToast("Refund issued");
    setOrders(prev => prev.map(o=>o.id===id?{...o, status: "Refunded"}:o));
    if (selected?.id === id) setSelected({ ...selected, status: "Refunded" });
  }


  async function exportXLSX() {
    const XLSX: typeof import("xlsx") = await import("xlsx");
    const data = orders.map(o => ({
      Number: o.order_number,
      Customer: o.customer_name || "",
      Email: o.customer_email,
      Total: (o.total_cents/100).toFixed(2),
      Status: o.status,
      Date: new Date(o.created_at).toISOString().slice(0,10),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.xlsx`; a.click();
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

    const header = ["Order #","Customer","Email","Total","Status","Date"];
    const body = [
      header.map(h => ({ text: h, bold: true, fillColor: "#111827", color: "#E5E7EB" })),
      ...orders.map(o => [
        o.order_number,
        o.customer_name || "",
        o.customer_email,
        (o.total_cents/100).toFixed(2),
        o.status,
        new Date(o.created_at).toLocaleDateString(),
      ])
    ];

    const docDefinition = {
      content: [
        { text: "Orders", style: "header" },
        { table: { headerRows: 1, widths: ["auto","*","*","auto","auto","auto"], body }, layout: "lightHorizontalLines" }
      ],
      styles: { header: { fontSize: 16, bold: true, color: "#D4AF37", margin: [0,0,0,10] } },
      defaultStyle: { fontSize: 10 }
    } as const;

    pdfMake.createPdf(docDefinition).download(`orders-${Date.now()}.pdf`);
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Orders</h1>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by number, name, email" className="px-3 py-2 text-sm rounded-md bg-neutral-900 border border-neutral-800 outline-none" />
          <select value={status} onChange={e=>setStatus(e.target.value)} className="px-2 py-2 text-sm rounded-md bg-neutral-900 border border-neutral-800">
            <option value="">All</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Ready for Pickup</option>
            <option>Fulfilled</option>
            <option>Canceled</option>
            <option>Refunded</option>
          </select>
          <button onClick={load} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Search</button>
          <div className="ml-2 flex items-center gap-2">
            <button onClick={exportCSV} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export CSV</button>
            <button onClick={exportXLSX} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export XLSX</button>
            <button onClick={exportPDF} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export PDF</button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr className="text-left">
              <th className="px-3 py-2">Order #</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o)=> (
              <tr key={o.id} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                <td className="px-3 py-2 font-mono">{o.order_number}</td>
                <td className="px-3 py-2">{o.customer_name || ""}</td>
                <td className="px-3 py-2">{o.customer_email}</td>
                <td className="px-3 py-2">${(o.total_cents/100).toFixed(2)}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 space-x-2">
                  <button onClick={()=>openDetail(o.id)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">View</button>
                  <button onClick={()=>updateStatus(o.id, "Ready for Pickup")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Mark Ready</button>
                  <button onClick={()=>updateStatus(o.id, "Fulfilled")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Fulfill</button>
                  <button onClick={()=>updateStatus(o.id, "Canceled")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Cancel</button>
                  {o.status!=="Refunded" && o.status!=="Canceled" && (
                    <button onClick={()=>refundOrder(o.id)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected?`Order ${selected.order_number}`:""}>
        {selected && (
          <div className="space-y-3">
            {/* Customer Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Customer Information</div>
                <div className="text-sm font-medium">{selected.customer.name || "N/A"}</div>
                <div className="text-xs text-gray-400">{selected.customer.email}</div>
                {selected.customer.phone && (
                  <div className="text-xs text-gray-400">{selected.customer.phone}</div>
                )}
              </div>

              {/* Shipping Address */}
              {selected.shipping_address && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Shipping Address</div>
                  <div className="text-sm">
                    {selected.shipping_address.name && (
                      <div className="font-medium">{selected.shipping_address.name}</div>
                    )}
                    {selected.shipping_address.address && (
                      <div className="text-xs">{selected.shipping_address.address}</div>
                    )}
                    {(selected.shipping_address.city || selected.shipping_address.state || selected.shipping_address.zipCode) && (
                      <div className="text-xs">
                        {selected.shipping_address.city && `${selected.shipping_address.city}, `}
                        {selected.shipping_address.state && `${selected.shipping_address.state} `}
                        {selected.shipping_address.zipCode}
                      </div>
                    )}
                    {selected.shipping_address.phone && (
                      <div className="text-xs text-gray-400 mt-1">Phone: {selected.shipping_address.phone}</div>
                    )}
                    {selected.shipping_address.email && (
                      <div className="text-xs text-gray-400">Email: {selected.shipping_address.email}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-800 pt-2">
              <div className="text-sm mb-1">Items</div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left"><th className="py-1">SKU</th><th className="py-1">Name</th><th className="py-1">Qty</th><th className="py-1">Unit</th><th className="py-1">Line</th></tr>
                  </thead>
                  <tbody>
                    {selected.items.map(it => (
                      <tr key={it.id} className="odd:bg-neutral-950">
                        <td className="py-1 pr-2 font-mono">{it.sku}</td>
                        <td className="py-1 pr-2">{it.name}</td>
                        <td className="py-1 pr-2">{it.qty}</td>
                        <td className="py-1 pr-2">${(it.unit_price_cents/100).toFixed(2)}</td>
                        <td className="py-1 pr-2">${(it.line_total_cents/100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-800 pt-2 text-sm">
              <div>Status: <span className="font-medium">{selected.status}</span></div>
              <div className="space-x-2">
                <button onClick={()=>updateStatus(selected.id, "Processing")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Processing</button>
                <button onClick={()=>updateStatus(selected.id, "Ready for Pickup")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Ready</button>
                <button onClick={()=>updateStatus(selected.id, "Fulfilled")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Fulfill</button>
                <button onClick={()=>updateStatus(selected.id, "Canceled")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Cancel</button>
                {selected.status!=="Refunded" && selected.status!=="Canceled" && (
                  <>
                    <button onClick={()=>updateStatus(selected.id, "Refunded")} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Mark Refunded</button>
                    <button onClick={()=>refundOrder(selected.id)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Refund</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
