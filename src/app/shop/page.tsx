"use client";
import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; price: number; imageUrl: string | null; stock: number };
type CartItem = { productId: string; quantity: number };

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);

  // Load products
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

  // Restore persisted cart/email
  useEffect(() => {
    load();
    try {
      const saved = localStorage.getItem("meshop_cart");
      const savedEmail = localStorage.getItem("meshop_email");
      if (saved) setCart(JSON.parse(saved));
      if (savedEmail) setEmail(savedEmail);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("meshop_cart", JSON.stringify(cart)); } catch {}
  }, [cart]);
  useEffect(() => {
    try { localStorage.setItem("meshop_email", email); } catch {}
  }, [email]);

  function add(id: string) {
    const p = products.find(x=>x.id===id);
    setCart((c) => {
      const nextQty = (c[id] || 0) + 1;
      const maxQty = Math.max(0, p?.stock ?? 0);
      return { ...c, [id]: Math.min(nextQty, maxQty) };
    });
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
    const p = products.find(x=>x.id===id);
    setCart((c) => {
      const next = { ...c } as Record<string, number>;
      const clamped = Math.max(0, Math.min(qty, Math.max(0, p?.stock ?? 0)));
      if (clamped <= 0) delete next[id]; else next[id] = clamped;
      return next;
    });
  }

  const items: CartItem[] = useMemo(() => Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })), [cart]);
  const total = useMemo(() => items.reduce((sum, it) => {
    const p = products.find((x) => x.id === it.productId);
    return sum + (p ? p.price * it.quantity : 0);
  }, 0), [items, products]);
  const count = useMemo(() => items.reduce((n, it) => n + it.quantity, 0), [items]);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--gold)" }}>Shop</h1>
          <div className="flex items-center gap-2">
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email (optional)"
              className="px-3 py-2 text-sm rounded-md bg-neutral-900 border border-neutral-800 outline-none" />
            <button onClick={()=>setShowCart(true)} className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-3 py-2">
              View Cart ({count})
            </button>
            <button disabled={items.length===0} onClick={checkout}
              className="rounded-md bg-[--gold] text-black font-semibold py-2 px-3 disabled:opacity-50">Checkout (${total.toFixed(2)})</button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({length:8}).map((_,i)=> (
              <div key={i} className="rounded-lg border border-neutral-900 bg-neutral-900/40 p-4 animate-pulse">
                <div className="h-36 rounded mb-3 bg-neutral-800/60" />
                <div className="h-4 w-3/4 bg-neutral-800 rounded mb-2" />
                <div className="h-3 w-1/3 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p) => {
              const inCart = cart[p.id] || 0;
              const low = p.stock > 0 && p.stock <= 5;
              const out = p.stock === 0;
              return (
                <div key={p.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                  <div className="h-36 rounded mb-3 flex items-center justify-center bg-neutral-800/60 relative">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="max-h-32 object-contain opacity-90" />
                    ) : (
                      <div className="text-xs text-neutral-400">No image</div>
                    )}
                    {out && <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-red-600">Out of stock</span>}
                    {low && !out && <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-yellow-500 text-black">Low stock</span>}
                  </div>
                  <div className="text-sm font-medium mb-1 truncate" title={p.name}>{p.name}</div>
                  <div className="text-xs text-neutral-300 mb-3">${p.price.toFixed(2)}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => remove(p.id)} disabled={inCart===0}
                      className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40">-</button>
                    <input
                      value={inCart}
                      onChange={(e)=>setQty(p.id, Math.max(0, Number(e.target.value)||0))}
                      className="w-12 text-center text-xs rounded bg-neutral-900 border border-neutral-800 px-2 py-1"
                    />
                    <button onClick={() => add(p.id)} disabled={out || inCart>=p.stock}
                      className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40">+</button>
                    <button onClick={()=>{ add(p.id); setShowCart(true); }} disabled={out}
                      className="ml-auto text-xs px-3 py-1 rounded bg-[--gold] text-black font-semibold disabled:opacity-40">Add</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setShowCart(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-neutral-950 border-l border-neutral-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold" style={{ color: "var(--gold)" }}>Your Cart</div>
              <button onClick={()=>setShowCart(false)} className="px-2 py-1 text-sm rounded bg-neutral-800 hover:bg-neutral-700">Close</button>
            </div>
            {items.length===0 ? (
              <div className="text-sm text-neutral-300">Your cart is empty.</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                {items.map(it => {
                  const p = products.find(x=>x.id===it.productId);
                  if (!p) return null;
                  const line = p.price * it.quantity;
                  return (
                    <div key={it.productId} className="flex items-center gap-3 border border-neutral-900 rounded p-3">
                      <div className="w-12 h-12 bg-neutral-800 rounded flex items-center justify-center">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="max-h-10 object-contain opacity-90" />
                        ) : <span className="text-[10px] text-neutral-400">No image</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate" title={p.name}>{p.name}</div>
                        <div className="text-[11px] text-neutral-400">${p.price.toFixed(2)} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>remove(p.id)} className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700">-</button>
                        <input
                          value={it.quantity}
                          onChange={(e)=>setQty(p.id, Math.max(0, Number(e.target.value)||0))}
                          className="w-12 text-center text-xs rounded bg-neutral-900 border border-neutral-800 px-2 py-1"
                        />
                        <button onClick={()=>add(p.id)} disabled={it.quantity>=p.stock}
                          className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40">+</button>
                      </div>
                      <div className="w-16 text-right text-sm">${line.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 border-t border-neutral-900 pt-4">
              <div className="flex items-center justify-between text-sm mb-3">
                <span>Items</span>
                <span>{count}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold mb-4">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button onClick={checkout} disabled={items.length===0}
                className="w-full rounded-md bg-[--gold] text-black font-semibold py-2 disabled:opacity-50">Checkout</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

