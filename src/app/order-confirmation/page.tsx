"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";

function OrderConfirmationContent() {
  const { lang } = useI18n();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders?id=${orderId}`);
      if (!res.ok) {
        throw new Error("Failed to load order");
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      console.error("Failed to load order:", err);
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center py-20 text-gray-400">
            {lang === "en" ? "Loading order..." : "Cargando pedido..."}
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center py-20">
            <div className="text-red-400 mb-4">
              {error || (lang === "en" ? "Order not found" : "Pedido no encontrado")}
            </div>
            <Link
              href="/products"
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              {lang === "en" ? "← Continue Shopping" : "← Seguir Comprando"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-900/20 border-2 border-green-600 mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold mb-2" style={{ color: "var(--gold)" }}>
            {lang === "en" ? "Order Confirmed!" : "¡Pedido Confirmado!"}
          </h1>
          <p className="text-gray-400">
            {lang === "en" 
              ? "Thank you for your purchase. Your order has been received." 
              : "Gracias por tu compra. Tu pedido ha sido recibido."}
          </p>
        </div>

        {/* Order Details */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {lang === "en" ? "Order Details" : "Detalles del Pedido"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Order Number" : "Número de Pedido"}
              </div>
              <div className="font-medium">{order.order_number}</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Order Date" : "Fecha del Pedido"}
              </div>
              <div className="font-medium">
                {new Date(order.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Status" : "Estado"}
              </div>
              <div className="font-medium capitalize">{order.status}</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Total" : "Total"}
              </div>
              <div className="font-medium text-xl" style={{ color: "var(--gold)" }}>
                ${(order.total_cents / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div>
              <div className="text-sm text-gray-400 mb-2">
                {lang === "en" ? "Shipping Address" : "Dirección de Envío"}
              </div>
              <div className="text-sm text-gray-300">
                {typeof order.shipping_address === 'string' 
                  ? JSON.parse(order.shipping_address).name 
                  : order.shipping_address.name}
                <br />
                {typeof order.shipping_address === 'string' 
                  ? JSON.parse(order.shipping_address).address 
                  : order.shipping_address.address}
                <br />
                {typeof order.shipping_address === 'string' 
                  ? `${JSON.parse(order.shipping_address).city}, ${JSON.parse(order.shipping_address).state} ${JSON.parse(order.shipping_address).zipCode}`
                  : `${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zipCode}`}
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {lang === "en" ? "Items" : "Artículos"}
            </h2>
            <div className="space-y-3">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    {item.quantity}x {item.product_name || `Product ${item.product_id}`}
                  </span>
                  <span className="text-gray-200">
                    ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/customer/orders"
            className="inline-block text-center rounded-md bg-[--gold] text-white px-6 py-3 font-medium hover:brightness-95 transition"
          >
            {lang === "en" ? "View My Orders" : "Ver Mis Pedidos"}
          </Link>
          <Link
            href="/products"
            className="inline-block text-center rounded-md bg-neutral-800 text-gray-300 px-6 py-3 font-medium hover:bg-neutral-700 transition"
          >
            {lang === "en" ? "Continue Shopping" : "Seguir Comprando"}
          </Link>
        </div>

        {/* Email Confirmation Notice */}
        <div className="mt-8 text-center text-sm text-gray-500">
          {lang === "en" 
            ? "A confirmation email has been sent to your email address." 
            : "Se ha enviado un correo de confirmación a tu dirección de correo electrónico."}
        </div>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center py-20 text-gray-400">Loading...</div>
        </div>
      </main>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}

