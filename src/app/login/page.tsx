"use client";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState("/cuenta");

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      setNextUrl(u.searchParams.get("next") || "/cuenta");
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j.error || "Error de inicio de sesión");
      window.location.href = nextUrl;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100 grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--gold)" }}>Iniciar sesión</h1>
        <p className="text-sm text-gray-400 mt-1">Ingresa para acceder a Mi Cuenta.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">Correo</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
        </div>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <button disabled={loading} className="mt-5 w-full rounded-md bg-[--gold] text-black font-semibold py-2 hover:brightness-95 disabled:opacity-50">{loading?"Entrando...":"Entrar"}</button>
        <p className="mt-3 text-xs text-gray-500">¿Olvidaste tu contraseña? Pronto podrás restablecerla.</p>
      </form>
    </main>
  );
}

