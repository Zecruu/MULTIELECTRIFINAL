"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type OrderNotification = { id: string; orderNumber: string; customerName: string; ts: number; read?: boolean };

function NavLink({ href, label }: { href: string; label: string }) {
  const [path, setPath] = useState("/");
  useEffect(() => { setPath(window.location.pathname); }, []);
  const active = path === href;
  return (
    <Link href={href} className={`block rounded-md px-3 py-2 text-sm ${active ? "bg-[--gold] text-black" : "hover:bg-neutral-800"}`}>
      {label}
    </Link>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderNotification[]>([]);
  const count = useMemo(() => items.filter(i => !i.read).length, [items]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to existing SSE stream for order events
    const es = new EventSource("/api/orders/stream");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === "order-created") {
          const n: OrderNotification = {
            id: data.id || crypto.randomUUID(),
            orderNumber: data.order?.orderNumber || data.orderNumber || "ME-NEW",
            customerName: data.order?.customer?.name || data.customerName || "Customer",
            ts: Date.now(),
          };
          setItems((prev) => [n, ...prev].slice(0, 20));
        }
      } catch {}
    };
    es.onerror = () => { /* keep alive */ };
    esRef.current = es;
    return () => { es.close(); };
  }, []);

  const markAllRead = () => setItems(prev => prev.map(i => ({...i, read: true})));

  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => setOpen(v => !v)} className="relative h-9 w-9 inline-flex items-center justify-center rounded-md border border-neutral-800 hover:bg-neutral-900">
        {/* bell icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {count > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[--gold] text-black text-[10px] flex items-center justify-center">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-md border border-neutral-800 bg-neutral-950 shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
            <div className="font-medium" style={{color: "var(--gold)"}}>Notifications</div>
            <button onClick={markAllRead} className="text-xs text-white/80 hover:text-white">Mark all as read</button>
          </div>
          <div className="max-h-64 overflow-auto">
            {items.length === 0 ? (
              <div className="px-3 py-4 text-sm text-white/80">No new orders</div>
            ) : items.map((n) => (
              <div key={n.id} className={`px-3 py-2 text-sm border-b border-neutral-900 ${n.read ? "opacity-70" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.orderNumber}</div>
                  <div className="text-xs">{new Date(n.ts).toLocaleTimeString()}</div>
                </div>
                <div className="text-xs">{n.customerName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  // Hide portal navigation/header on the login screen to keep it standalone
  const [path, setPath] = useState<string>("/");
  useEffect(() => { setPath(window.location.pathname); }, []);
  const isLogin = path === "/employee/login";

  if (isLogin) {
    return <div className="min-h-screen bg-neutral-950 text-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="font-semibold" style={{ color: "var(--gold)" }}>Multi Electric Employee Portal</div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <form action="/api/employee/logout" method="post">
              <button className="text-sm hover:text-white">Logout</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-6">
        <aside className="md:sticky md:top-4 h-max rounded-lg border border-neutral-900 bg-neutral-900/40 p-2">
          <nav className="space-y-1">
            <NavLink href="/employee/dashboard" label="Dashboard" />
            <NavLink href="/employee/orders" label="Orders" />
            <NavLink href="/employee/fulfillment" label="Fulfillment" />
            <NavLink href="/employee/clients" label="Clients" />
            <NavLink href="/employee/inventory" label="Inventory" />
            <div className="border-t border-neutral-800 my-2" />
            <NavLink href="/employee/users" label="Users (Admin)" />
            <NavLink href="/employee/reports" label="Reports (Admin)" />
            <NavLink href="/employee/settings" label="Settings (Admin)" />
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

