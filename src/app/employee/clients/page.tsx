"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

type ClientRow = { id: string; name: string; email: string; phone?: string; totalOrders: number; lastOrder: string; status: string };
type ClientDetail = { customer: { id: string; name: string | null; email: string; phone: string | null }; orders: Array<{ id: string; order_number: string; date: string; status: string; total_cents: number; currency: string }>; };
type OrderDetail = { id: string; order_number: string; status: string; created_at: string; subtotal_cents: number; tax_cents: number; total_cents: number; currency: string; customer: { email: string; name: string | null }; items: Array<{ id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number }>; };

function Toast({ msg, type }: { msg: string; type: "success"|"error" }) {
  const cls = type === "success" ? "bg-emerald-600/80" : "bg-red-600/80";
  return <div className={`fixed top-4 right-4 z-[60] px-3 py-2 rounded-md text-sm ${cls}`}>{msg}</div>;
}

export default function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error" } | null>(null);

  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const url = new URL(location.origin + "/api/clients");
      if (q) url.searchParams.set("q", q);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      const res = await fetch(url.toString());
      type ClientsResp = { clients: ClientRow[]; total: number; page: number; pageSize: number };
      if (!res.ok) throw new Error("Failed to load clients");
      const j: ClientsResp = await res.json();
      setRows(j.clients || []);
      setTotal(j.total || 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Error loading clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[page]);

  async function openClient(id: string) {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Failed to load client");
      const j: ClientDetail = await res.json();
      setDetail(j);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(msg || "Failed to open client", "error");
    }
  }

  async function openOrder(id: string) {
    const res = await fetch(`/api/orders?id=${id}`);
    if (!res.ok) return showToast("Could not load order", "error");
    const j: { order: OrderDetail } = await res.json();
    setOrderDetail(j.order);
  }

  async function refundOrder(id: string) {
    const res = await fetch(`/api/orders/${id}/refund`, { method: "POST" });
    if (!res.ok) return showToast("Refund failed", "error");
    showToast("Refund requested");
  }

  async function updateStatus(id: string, status: OrderDetail["status"]) {
    const res = await fetch(`/api/orders?id=${id}`, { method: "PATCH", headers: {"content-type":"application/json"}, body: JSON.stringify({ status }) });
    if (!res.ok) return showToast("Update failed", "error");
    setOrderDetail(prev => prev && prev.id===id ? { ...prev, status } : prev);
    setDetail(prev => prev ? { ...prev, orders: prev.orders.map(o=>o.id===id?{...o, status}:o) } : prev);
    showToast("Status updated");
  }

  function exportClientsCSV() {
    const header = ["name","email","phone","total_orders","last_order","status"];
    const data = rows.map(r=>[
      r.name || "-",
      r.email,
      r.phone || "-",
      String(r.totalOrders),
      r.lastOrder,
      r.status,
    ]);
    const csv = [header, ...data].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `clients-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportClientsXLSX() {
    const XLSX: typeof import("xlsx") = await import("xlsx");
    const data = rows.map(r => ({
      Name: r.name || "-",
      Email: r.email,
      Phone: r.phone || "-",
      Total_Orders: r.totalOrders,
      Last_Order: r.lastOrder,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `clients-${Date.now()}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportClientsPDF() {
    type PdfDocProxy = { download: (filename?: string) => void };
    type PdfMake = { vfs?: Record<string, string>; createPdf: (docDefinition: object) => PdfDocProxy };
    type PdfFonts = { pdfMake: { vfs: Record<string, string> } };

    const pdfMakeMod = await import("pdfmake/build/pdfmake");
    const pdfFontsMod = await import("pdfmake/build/vfs_fonts");
    const pdfMake = (pdfMakeMod as unknown as { default: PdfMake }).default;
    const pdfFonts = pdfFontsMod as unknown as PdfFonts;
    pdfMake.vfs = pdfFonts.pdfMake.vfs;

    const header = ["Name","Email","Phone","Total Orders","Last Order","Status"];
    const body = [
      header,
      ...rows.map(r => [r.name || "-", r.email, r.phone || "-", String(r.totalOrders), r.lastOrder, r.status])
    ];

    const docDefinition = {
      content: [
        { text: "Clients", style: "header" },
        { table: { headerRows: 1, widths: ["*","*","*","auto","auto","auto"], body } }
      ],
      styles: { header: { fontSize: 16, bold: true, margin: [0,0,0,10] } },
      defaultStyle: { fontSize: 10 }
    } as const;

    pdfMake.createPdf(docDefinition).download(`clients-${Date.now()}.pdf`);
  }


  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Clients</h1>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search email, name or phone" className="px-3 py-2 text-sm rounded-md bg-neutral-900 border border-neutral-800 outline-none" />
          <button onClick={()=>{ setPage(1); load(); }} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Search</button>
          <div className="ml-3 flex items-center gap-2">
            <button onClick={exportClientsCSV} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export CSV</button>
            <button onClick={exportClientsXLSX} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export XLSX</button>
            <button onClick={exportClientsPDF} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">Export PDF</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr className="text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Total Orders</th>
              <th className="px-3 py-2">Last Order</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-white/70">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-white/70">No clients</td></tr>
            ) : rows.map((c)=> (
              <tr key={c.id} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                <td className="px-3 py-2">{c.name || "-"}</td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2">{c.phone || "-"}</td>
                <td className="px-3 py-2">{c.totalOrders}</td>
                <td className="px-3 py-2">{c.lastOrder}</td>
                <td className="px-3 py-2"><button onClick={()=>openClient(c.id)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <div className="opacity-80">Page {page} of {pageCount}</div>
        <div className="space-x-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border border-neutral-800 disabled:opacity-50">Prev</button>
          <button disabled={page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} className="px-3 py-1 rounded border border-neutral-800 disabled:opacity-50">Next</button>
        </div>
      </div>

      <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail? (detail.customer.name||detail.customer.email):""}>
        {detail ? (
          <div className="space-y-3">
            <div className="text-sm">Email: <span className="opacity-90">{detail.customer.email}</span></div>
            <div className="text-sm">Phone: <span className="opacity-90">{detail.customer.phone || "-"}</span></div>
            <div className="border-t border-neutral-800 pt-2">
              <div className="text-sm mb-1">Orders</div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left"><th className="py-1">#</th><th className="py-1">Date</th><th className="py-1">Status</th><th className="py-1">Total</th><th className="py-1">Action</th></tr></thead>
                  <tbody>
                    {detail.orders.map(o => (
                      <tr key={o.id} className="odd:bg-neutral-950">
                        <td className="py-1 pr-2 font-mono">{o.order_number}</td>
                        <td className="py-1 pr-2">{new Date(o.date).toLocaleDateString()}</td>
                        <td className="py-1 pr-2">{o.status}</td>
                        <td className="py-1 pr-2">${(o.total_cents/100).toFixed(2)}</td>
                        <td className="py-1 pr-2 space-x-1">
                          <button onClick={()=>openOrder(o.id)} className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700">View</button>
                          {o.status!=="Refunded" && o.status!=="Canceled" && (
                            <button onClick={()=>refundOrder(o.id)} className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700">Refund</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!orderDetail} onClose={()=>setOrderDetail(null)} title={orderDetail?`Order ${orderDetail.order_number}`:""}>
        {orderDetail && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div>Status: <span className="font-medium">{orderDetail.status}</span></div>
              <div className="space-x-2">
                {(["Processing","Ready for Pickup","Fulfilled"] as const).map(s=> (
                  <button key={s} onClick={()=>updateStatus(orderDetail.id, s)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">{s}</button>
                ))}
              </div>
            </div>
            <div className="border-t border-neutral-800 pt-2">
              <div className="text-sm mb-1">Items</div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left"><th className="py-1">SKU</th><th className="py-1">Name</th><th className="py-1">Qty</th><th className="py-1">Unit</th><th className="py-1">Line</th></tr></thead>
                  <tbody>
                    {orderDetail.items.map(it => (
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
          </div>
        )}
      </Modal>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
    </div>
  );
}
