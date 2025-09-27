"use client";
import { useEffect, useState } from "react";

type Product = { id: string; name: string; price: number; imageUrl: string | null; stock: number };
type CartItem = { productId: string; quantity: number };

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await fetch("/api/store/products", { cache: "no-store" }).then((r) => r.json());
      setProducts(j.products || []);
    } catch (e) {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function add(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function remove(id: string) {
    setCart((c) => {
      const qty = (c[id] || 0) - 1;
      const next = { ...c } as Record<string, number>;
      if (qty <= 0) delete next[id]; else next[id] = qty;
      return next;
    });
  }
  function setQty(id: string, qty: number) {
    setCart((c) => {
      const next = { ...c } as Record<string, number>;
      if (qty <= 0) delete next[id]; else next[id] = qty;
      return next;
    });
  }

  const items: CartItem[] = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
  const total = items.reduce((sum, it) => {
    const p = products.find((x) => x.id === it.productId);
    return sum + (p ? p.price * it.quantity : 0);
  }, 0);

  async function checkout() {
    if (items.length === 0) return;
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, customer: email ? { email } : undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Checkout failed");
      if (j.url) window.location.href = j.url as string;
    } catch (e) {
      setError((e as Error).message || "Checkout failed");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Shop</h1>
          <div className="flex items-center gap-2">
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email (optional)"
              className="px-3 py-2 text-sm rounded-md bg-neutral-900 border border-neutral-800 outline-none" />
            <button disabled={items.length===0} onClick={checkout}
              className="rounded-md bg-[--gold] text-black font-semibold py-2 px-3 disabled:opacity-50">Checkout (${total.toFixed(2)})</button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
        {loading ? (
          <div>Loading products…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="h-36 rounded mb-3 flex items-center justify-center bg-neutral-800/60">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="max-h-32 object-contain opacity-90" />
                  ) : (
                    <div className="text-xs text-neutral-400">No image</div>
                  )}
                </div>
                <div className="text-sm font-medium mb-1">{p.name}</div>
                <div className="text-xs text-neutral-300 mb-3">${p.price.toFixed(2)}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => remove(p.id)} className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700">-</button>
                  <input
                    value={cart[p.id] || 0}
                    onChange={(e)=>setQty(p.id, Math.max(0, Number(e.target.value)||0))}
                    className="w-12 text-center text-xs rounded bg-neutral-900 border border-neutral-800 px-2 py-1"
                  />
                  <button onClick={() => add(p.id)} className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

