"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { getCart, updateCartItemQuantity, removeFromCart, getCartTotal, getCartItemCount, type Cart } from "@/lib/cart";

export default function CartPage() {
  const { lang } = useI18n();
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({ items: [], updatedAt: "" });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    loadCart();
    checkAuth();

    const handleCartUpdate = () => loadCart();
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/me");
      setIsAuthenticated(res.ok);
    } catch {
      setIsAuthenticated(false);
    }
  }

  function loadCart() {
    const currentCart = getCart();
    setCart(currentCart);
    setLoading(false);
  }

  function handleQuantityChange(productId: string, newQuantity: number) {
    updateCartItemQuantity(productId, newQuantity);
    loadCart();
  }

  function handleRemove(productId: string) {
    removeFromCart(productId);
    loadCart();
  }

  function handleCheckout() {
    // Check if user is authenticated
    if (isAuthenticated === false) {
      // Redirect to sign in page with return URL
      router.push("/login?next=/checkout");
      return;
    }

    router.push("/checkout");
  }

  const total = getCartTotal(cart);
  const itemCount = getCartItemCount(cart);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center text-gray-400">
            {lang === "en" ? "Loading cart..." : "Cargando carrito..."}
          </div>
        </div>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-semibold mb-8" style={{ color: "var(--gold)" }}>
            {lang === "en" ? "Shopping Cart" : "Carrito de Compras"}
          </h1>
          
          <div className="text-center py-20">
            <svg className="mx-auto h-24 w-24 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="text-xl font-medium text-gray-300 mb-2">
              {lang === "en" ? "Your cart is empty" : "Tu carrito está vacío"}
            </h2>
            <p className="text-gray-400 mb-6">
              {lang === "en" ? "Add some products to get started!" : "¡Agrega algunos productos para comenzar!"}
            </p>
            <Link
              href="/products"
              className="inline-block rounded-md bg-[--gold] text-white px-6 py-3 font-medium hover:brightness-95 transition"
            >
              {lang === "en" ? "Browse Products" : "Ver Productos"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-semibold mb-8" style={{ color: "var(--gold)" }}>
          {lang === "en" ? "Shopping Cart" : "Carrito de Compras"}
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const name = lang === "en" ? item.name_en : item.name_es;
              
              return (
                <div
                  key={item.productId}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 flex gap-4"
                >
                  {/* Product Image */}
                  <div className="h-24 w-24 rounded-md bg-neutral-800/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={item.image} 
                        alt={name} 
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-neutral-400">No image</div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-200 mb-1 truncate">
                      {name}
                    </h3>
                    <div className="text-lg font-semibold mb-3" style={{ color: "var(--gold)" }}>
                      ${item.price.toFixed(2)}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-neutral-700 rounded-md">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          className="px-3 py-1 hover:bg-neutral-800 transition"
                        >
                          −
                        </button>
                        <span className="px-4 py-1 border-x border-neutral-700 min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          className="px-3 py-1 hover:bg-neutral-800 transition"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="text-sm text-red-400 hover:text-red-300 transition"
                      >
                        {lang === "en" ? "Remove" : "Eliminar"}
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <div className="text-lg font-semibold" style={{ color: "var(--gold)" }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 sticky top-20">
              <h2 className="text-xl font-semibold mb-4">
                {lang === "en" ? "Order Summary" : "Resumen del Pedido"}
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {lang === "en" ? "Items" : "Artículos"} ({itemCount})
                  </span>
                  <span className="text-gray-200">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {lang === "en" ? "Shipping" : "Envío"}
                  </span>
                  <span className="text-gray-200">
                    {lang === "en" ? "Calculated at checkout" : "Calculado al pagar"}
                  </span>
                </div>
                <div className="border-t border-neutral-700 pt-3 flex justify-between text-lg font-semibold">
                  <span>{lang === "en" ? "Total" : "Total"}</span>
                  <span style={{ color: "var(--gold)" }}>${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full rounded-md bg-white text-neutral-900 px-6 py-3 font-semibold border-2 border-white hover:border-[--gold] hover:shadow-[0_0_15px_rgba(212,175,55,0.5)] transition-all duration-200"
              >
                {isAuthenticated === false
                  ? (lang === "en" ? "Sign In to Checkout" : "Iniciar Sesión para Pagar")
                  : (lang === "en" ? "Proceed to Checkout" : "Proceder al Pago")
                }
              </button>

              <Link
                href="/products"
                className="block text-center text-sm text-gray-400 hover:text-gray-300 mt-4 transition"
              >
                {lang === "en" ? "← Continue Shopping" : "← Seguir Comprando"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

