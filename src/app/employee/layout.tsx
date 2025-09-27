"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  // Hide portal navigation/header on the login screen to keep it standalone
  const [path, setPath] = useState<string>("/");
  useEffect(() => { setPath(window.location.pathname); }, []);
  const isLogin = path === "/employee/login";

  if (isLogin) {
    return <div className="min-h-screen bg-neutral-950 text-gray-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100">
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="font-semibold" style={{ color: "var(--gold)" }}>Multi Electric Employee Portal</div>
          <form action="/api/employee/logout" method="post">
            <button className="text-sm text-gray-300 hover:text-white">Logout</button>
          </form>
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

