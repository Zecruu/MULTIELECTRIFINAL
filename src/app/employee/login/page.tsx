"use client";
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
    <main className="min-h-screen bg-neutral-950 text-gray-100 grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--gold)" }}>Employee Login</h1>
        <p className="text-sm text-gray-400 mt-1">Use your company credentials.</p>
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
      </form>
    </main>
  );
}

