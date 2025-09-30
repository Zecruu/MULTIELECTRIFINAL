"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { getCart, clearCart, getCartTotal, type Cart } from "@/lib/cart";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "@/components/CheckoutForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const { lang } = useI18n();
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({ items: [], updatedAt: "" });
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentCart = getCart();
    setCart(currentCart);

    if (currentCart.items.length === 0) {
      router.push("/cart");
      return;
    }

    // Create payment intent
    createPaymentIntent(currentCart);
  }, [router]);

  async function createPaymentIntent(cart: Cart) {
    setLoading(true);
    setError(null);

    try {
      const total = getCartTotal(cart);
      const res = await fetch("/api/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(total * 100), // Convert to cents
          currency: "usd",
          items: cart.items,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create payment intent");
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error("Payment intent error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize checkout");
    } finally {
      setLoading(false);
    }
  }

  const total = getCartTotal(cart);

  if (loading || !clientSecret) {
    return (
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center py-20">
            {error ? (
              <div>
                <div className="text-red-400 mb-4">{error}</div>
                <button
                  onClick={() => router.push("/cart")}
                  className="text-sm text-gray-400 hover:text-gray-300"
                >
                  {lang === "en" ? "← Back to Cart" : "← Volver al Carrito"}
                </button>
              </div>
            ) : (
              <div className="text-gray-400">
                {lang === "en" ? "Initializing checkout..." : "Inicializando pago..."}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#D4AF37",
      colorBackground: "#171717",
      colorText: "#e5e5e5",
      colorDanger: "#ef4444",
      fontFamily: "system-ui, sans-serif",
      borderRadius: "0.375rem",
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-semibold mb-8" style={{ color: "var(--gold)" }}>
          {lang === "en" ? "Checkout" : "Pagar"}
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm cart={cart} />
            </Elements>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 sticky top-20">
              <h2 className="text-xl font-semibold mb-4">
                {lang === "en" ? "Order Summary" : "Resumen"}
              </h2>

              <div className="space-y-3 mb-4">
                {cart.items.map((item) => {
                  const name = lang === "en" ? item.name_en : item.name_es;
                  return (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-gray-400 truncate mr-2">
                        {item.quantity}x {name}
                      </span>
                      <span className="text-gray-200 flex-shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-neutral-700 pt-3 flex justify-between text-lg font-semibold">
                <span>{lang === "en" ? "Total" : "Total"}</span>
                <span style={{ color: "var(--gold)" }}>${total.toFixed(2)}</span>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                {lang === "en" 
                  ? "Secure payment powered by Stripe" 
                  : "Pago seguro con Stripe"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

