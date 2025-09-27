"use client";
import { useEffect, useState } from "react";

type Me = {
  id?: string; name?: string; email: string; emailVerified?: boolean; phone?: string;
  language?: "es" | "en";
  notifications?: { orderPlaced?: boolean; readyForPickup?: boolean; statusChange?: boolean; marketing?: boolean };
  paymentMethods?: Array<{ id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault?: boolean }>;
  sessions?: Array<{ id: string; device?: string; browser?: string; ip?: string; lastSeen?: string }>;
};

type OrderRow = { id: string; order_number: string; date: string; total: number; currency: string; status: string };

export default function CuentaClient() {
  const [tab, setTab] = useState<"orders"|"profile"|"settings">("orders");
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMe() {
    setLoadingMe(true);
    try { const j = await fetch("/api/me", { cache: "no-store" }).then(r=>r.json()); setMe(j.me); }
    catch { setError("No se pudo cargar el perfil"); }
    finally { setLoadingMe(false); }
  }

  async function loadOrders() {
    setLoadingOrders(true);
    try { const j = await fetch("/api/orders/my", { cache: "no-store" }).then(r=>r.json()); setOrders(j.orders||[]); }
    catch { /* ignore */ }
    finally { setLoadingOrders(false); }
  }

  useEffect(()=>{ loadMe(); loadOrders(); const t=setInterval(loadOrders, 45000); return ()=>clearInterval(t); },[]);

  async function saveProfile() {
    if (!me) return;
    setSavingProfile(true); setError(null);
    try {
      const csrf = getCookie("csrf");
      const res = await fetch("/api/me/profile", { method: "PATCH", headers: { "content-type":"application/json", "x-csrf": csrf||"" }, body: JSON.stringify({ name: me.name, phone: me.phone }) });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) { setError("No se pudo guardar el perfil"); }
    finally { setSavingProfile(false); }
  }

  function getCookie(n:string){ return (document.cookie.split("; ").find(x=>x.startsWith(n+"="))||"").split("=")[1]; }

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="w-full max-w-none px-3 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-4" style={{ color: "var(--gold)" }}>Mi Cuenta</h1>
        {/* Tabs */}
        <div className="sticky top-[56px] z-10 bg-neutral-950/90 backdrop-blur border-b border-neutral-900">
          <div className="flex gap-2 py-2">
            {([
              {k:"orders", label:"Mis Ordenes"},
              {k:"profile", label:"Perfil"},
              {k:"settings", label:"Configuracion"}
            ] as const).map(t => (
              <button key={t.k} onClick={()=>setTab(t.k)}
                className={`px-3 py-1.5 text-sm rounded-full border ${tab===t.k?"border-[--gold] text-white":"border-neutral-800 text-white/80 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        {/* Content */}
        <div className="mt-6 space-y-6">
          {tab==="orders" && (
            <section>
              {loadingOrders ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({length:6}).map((_,i)=> (
                    <div key={i} className="h-28 rounded-lg border border-neutral-900 bg-neutral-900/40 animate-pulse" />
                  ))}
                </div>
              ) : orders.length===0 ? (
                <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-6 text-sm text-neutral-300">
                  Aun no tienes pedidos. <a href="/shop" className="underline">Ver productos</a>.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map(o => (
                    <div key={o.id} className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4">
                      <div className="text-sm font-semibold">{o.order_number}</div>
                      <div className="text-xs text-neutral-400">{o.date}</div>
                      <div className="mt-2 text-sm">{o.currency.toUpperCase()} {(o.total/100).toFixed(2)}</div>
                      <div className="mt-2"><span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/30 border border-blue-600/50">{o.status}</span></div>
                      <a href={`/api/orders/${o.id}`} className="block mt-3 text-xs underline">Ver detalle</a>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab==="profile" && (
            <section className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
                <div className="text-sm text-neutral-300 mb-3">Datos personales</div>
                {loadingMe ? (
                  <div className="h-32 rounded bg-neutral-900/50 animate-pulse" />
                ) : me && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1">Nombre</label>
                      <input value={me.name||""} onChange={(e)=>setMe({...me, name: e.target.value})}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Email</label>
                      <input value={me.email} readOnly className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-neutral-400" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Telefono</label>
                      <input value={me.phone||""} onChange={(e)=>setMe({...me, phone: e.target.value})}
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2" />
                    </div>
                    <button onClick={saveProfile} disabled={savingProfile}
                      className="mt-2 rounded-md bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50">Guardar</button>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
                <div className="text-sm text-neutral-300 mb-3">Estado de email</div>
                {me?.emailVerified ? (
                  <div className="text-sm text-green-400">Verificado</div>
                ) : (
                  <button className="text-sm rounded bg-neutral-800 px-3 py-2">Reenviar verificacion</button>
                )}
              </div>
            </section>
          )}

          {tab==="settings" && (
            <section className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
                <div className="text-sm text-neutral-300 mb-3">Preferencias</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Idioma</span><span className="text-neutral-400">ES/EN</span></div>
                  <div className="flex items-center justify-between"><span>Notificaciones</span><span className="text-neutral-400">Email</span></div>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-5">
                <div className="text-sm text-neutral-300 mb-3">Seguridad</div>
                <button className="text-sm rounded bg-neutral-800 px-3 py-2">Cambiar contrasena</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

