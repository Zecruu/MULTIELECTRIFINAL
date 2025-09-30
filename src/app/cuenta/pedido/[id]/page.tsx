"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type OrderItem = {
  id: string;
  product_id: string;
  name: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  image_url?: string;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_address?: string | { name: string; address: string; city: string; state: string; zipCode: string; phone: string };
  items: OrderItem[];
};

export default function OrderDetailPage() {
  const { lang } = useI18n();
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
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

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
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
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center py-20">
            <div className="text-red-400 mb-4">
              {error || (lang === "en" ? "Order not found" : "Pedido no encontrado")}
            </div>
            <Link
              href="/cuenta"
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              {lang === "en" ? "← Back to My Account" : "← Volver a Mi Cuenta"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const shippingAddress = typeof order.shipping_address === "string" 
    ? JSON.parse(order.shipping_address) 
    : order.shipping_address;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-600/30 border-yellow-600/50 text-yellow-200",
    processing: "bg-blue-600/30 border-blue-600/50 text-blue-200",
    shipped: "bg-purple-600/30 border-purple-600/50 text-purple-200",
    delivered: "bg-green-600/30 border-green-600/50 text-green-200",
    cancelled: "bg-red-600/30 border-red-600/50 text-red-200",
  };

  const statusLabels: Record<string, { en: string; es: string }> = {
    pending: { en: "Pending", es: "Pendiente" },
    processing: { en: "Processing", es: "Procesando" },
    shipped: { en: "Shipped", es: "Enviado" },
    delivered: { en: "Delivered", es: "Entregado" },
    cancelled: { en: "Cancelled", es: "Cancelado" },
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/cuenta"
            className="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-block"
          >
            {lang === "en" ? "← Back to My Account" : "← Volver a Mi Cuenta"}
          </Link>
          <h1 className="text-3xl font-bold text-[#D4AF37]">
            {lang === "en" ? "Order Details" : "Detalles del Pedido"}
          </h1>
        </div>

        {/* Order Info */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Order Number" : "Número de Pedido"}
              </div>
              <div className="text-lg font-semibold">{order.order_number}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Order Date" : "Fecha del Pedido"}
              </div>
              <div className="text-lg">
                {new Date(order.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Status" : "Estado"}
              </div>
              <span className={`inline-block px-3 py-1 rounded text-sm ${statusColors[order.status] || statusColors.pending}`}>
                {statusLabels[order.status]?.[lang] || order.status}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">
                {lang === "en" ? "Total" : "Total"}
              </div>
              <div className="text-lg font-semibold text-[#D4AF37]">
                ${(order.total_cents / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        {shippingAddress && (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {lang === "en" ? "Shipping Address" : "Dirección de Envío"}
            </h2>
            <div className="text-gray-300">
              <div>{shippingAddress.name}</div>
              <div>{shippingAddress.address}</div>
              <div>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</div>
              <div className="mt-2 text-sm text-gray-400">{shippingAddress.phone}</div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {lang === "en" ? "Items" : "Artículos"}
          </h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 items-center border-b border-neutral-800 pb-4 last:border-0 last:pb-0">
                {/* Product Image */}
                {item.image_url && (
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-neutral-800">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1">
                  <div className="text-gray-200 font-medium">{item.name}</div>
                  <div className="text-sm text-gray-400">
                    {lang === "en" ? "Quantity" : "Cantidad"}: {item.qty}
                  </div>
                  <div className="text-sm text-gray-400">
                    {lang === "en" ? "Unit Price" : "Precio Unitario"}: ${(item.unit_price_cents / 100).toFixed(2)}
                  </div>
                </div>

                {/* Line Total */}
                <div className="text-gray-200 font-medium">
                  ${(item.line_total_cents / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{lang === "en" ? "Subtotal" : "Subtotal"}</span>
                <span className="text-gray-200">${(order.subtotal_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{lang === "en" ? "Tax" : "Impuesto"}</span>
                <span className="text-gray-200">${(order.tax_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-neutral-800">
                <span>{lang === "en" ? "Total" : "Total"}</span>
                <span className="text-[#D4AF37]">${(order.total_cents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

