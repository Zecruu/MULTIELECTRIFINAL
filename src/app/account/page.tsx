"use client";
import { useState, useEffect } from "react";

export default function AccountPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Simple gate for now: look for a mock customer_token cookie
    try {
      const has = document.cookie.split("; ").some((x) => x.startsWith("customer_token="));
      setAuthed(has);
    } catch { setAuthed(false); }
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return (
      <main className="min-h-screen bg-neutral-950 text-gray-100 grid place-items-center">
        <div className="w-full max-w-lg text-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-8">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Mi Cuenta</h1>
          <p className="mt-2 text-gray-400">Please sign in to view your account.</p>
          <div className="mt-5">
            <a href="/login" className="inline-flex items-center rounded-md bg-[--gold] text-black font-semibold px-4 py-2 hover:brightness-95">Sign in</a>
          </div>
        </div>
      </main>
    );
  }

  // Mock data for now
  const orders = [
    { number: "ME-2025-000101", date: "2025-06-05", total: 189.75, status: "Shipped" },
    { number: "ME-2025-000076", date: "2025-05-22", total: 59.99, status: "Delivered" },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: "var(--gold)" }}>Mi Cuenta / My Account</h1>
        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          {/* Profile */}
          <section className="lg:col-span-1 rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
            <div className="text-sm text-gray-400 mb-2">Profile</div>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Name:</span> Jane Contractor</div>
              <div><span className="text-gray-500">Email:</span> jane@example.com</div>
              <div><span className="text-gray-500">Phone:</span> (305) 555-1212</div>
            </div>
            <button className="mt-4 w-full rounded-md bg-[--gold] text-black font-semibold py-2 hover:brightness-95 text-sm">Edit Profile</button>
          </section>

          {/* Orders */}
          <section className="lg:col-span-2 rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Order History</div>
              <button className="text-xs rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-1">Export CSV</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-900/50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Order #</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o)=> (
                    <tr key={o.number} className="odd:bg-neutral-950 even:bg-neutral-900/20">
                      <td className="px-3 py-2 font-mono">{o.number}</td>
                      <td className="px-3 py-2">{o.date}</td>
                      <td className="px-3 py-2">${o.total.toFixed(2)}</td>
                      <td className="px-3 py-2">{o.status}</td>
                      <td className="px-3 py-2"><button className="text-xs rounded bg-neutral-800 hover:bg-neutral-700 px-2 py-1">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

