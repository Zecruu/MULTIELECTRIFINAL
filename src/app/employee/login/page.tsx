"use client";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/employee/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next") || "/employee/dashboard";
      window.location.href = next;
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Login failed");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100 grid">
      <div className="grid md:grid-cols-2 min-h-screen">
        {/* Left: Sign-in form */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
            <div className="flex items-center gap-2">
              <Image src="/img/MULTI ELECTRCI LOGO_LE_upscale_balanced_x4.jpg" alt="Multi Electric" width={28} height={28} className="rounded" />
              <h1 className="text-xl font-semibold" style={{ color: "var(--gold)" }}>Employee Sign In</h1>
            </div>
            <p className="text-sm text-gray-400 mt-1">Access the Multi Electric Employee Portal</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-1">Password</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
              </div>
            </div>
            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            <button className="mt-5 w-full rounded-md bg-[--gold] text-black font-semibold py-2 hover:brightness-95">Sign in</button>
            <p className="mt-3 text-xs text-gray-500">By signing in you agree to Multi Electric’s acceptable use and security policies.</p>
          </form>
        </div>
        {/* Right: Company statement */}
        <aside className="relative hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black" />
          <div className="relative h-full w-full flex items-center justify-center p-10">
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-block h-9 w-9 rounded-md bg-[--gold]" />
                <div className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Multi Electric Supply Inc.</div>
              </div>
              <p className="text-gray-300">
                Trusted electrical supply partner serving contractors and businesses across South Florida.
                Premium brands, wholesale pricing, and the service you deserve.
              </p>
              <ul className="mt-6 space-y-2 text-gray-300">
                <li>• Same‑day pickup and fast delivery</li>
                <li>• Dedicated account support</li>
                <li>• Thousands of SKUs in stock</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

