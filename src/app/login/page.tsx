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
        <button disabled={loading} className="mt-5 w-full rounded-md bg-[--gold] text-white font-semibold py-2 hover:brightness-95 disabled:opacity-50">{loading?"Entrando...":"Entrar"}</button>
        <button type="button" onClick={onSubmit} disabled={loading} className="mt-3 w-full rounded-md border border-[--gold] text-[--gold] font-semibold py-2 hover:bg-[--gold]/10 disabled:opacity-50">Crear cuenta</button>
        <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-neutral-800" />
          <span>o</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>
        <a href={`/api/auth/google/start?next=${encodeURIComponent(nextUrl)}`} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-neutral-800 border border-neutral-700 text-white font-medium py-2 hover:bg-neutral-750">
          <svg width="18" height="18" viewBox="0 0 48 48" className="inline-block" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.5 32.4 29.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 18.4-7.3 19.8-16.8.2-1.1.3-2.3.3-3.5 0-1.2-.1-2.4-.3-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16.1 19 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 15.5 4 8.2 8.7 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13.1-5l-6-4.9C29.1 36 26.7 37 24 37c-5.1 0-9.5-3.6-10.9-8.4l-6.7 5.2C8.2 39.3 15.5 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.6 5.6-6.7 6.9l6 4.9c-3.4 2.2-7.5 3.5-11.6 3.5-8.5 0-15.8-4.7-19.4-11.6l6.7-5.2C14.5 33.4 18.9 37 24 37c5.1 0 9.5-3.6 10.9-8.4.7-1.9 1.1-3.9 1.1-6.1 0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          <span>Continuar con Google</span>
        </a>
        <p className="mt-3 text-xs text-gray-500">¿Olvidaste tu contraseña? Pronto podrás restablecerla.</p>
      </form>
    </main>
  );
}

