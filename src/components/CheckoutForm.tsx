"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useI18n } from "@/lib/i18n";
import { clearCart, type Cart } from "@/lib/cart";

type Props = {
  cart: Cart;
};

export default function CheckoutForm({ cart }: Props) {
  const { lang } = useI18n();
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  // Load customer data on mount
  useEffect(() => {
    async function loadCustomerData() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          const me = data.me;

          setShippingInfo(prev => ({
            ...prev,
            name: me.name || prev.name,
            email: me.email || prev.email,
            phone: me.phone || prev.phone,
          }));
        }
      } catch (err) {
        console.error("Failed to load customer data:", err);
      }
    }

    loadCustomerData();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate shipping info
    if (!shippingInfo.name || !shippingInfo.email || !shippingInfo.address || !shippingInfo.city) {
      setError(lang === "en" ? "Please fill in all required fields" : "Por favor complete todos los campos requeridos");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
          receipt_email: shippingInfo.email,
          payment_method_data: {
            billing_details: {
              name: shippingInfo.name,
              email: shippingInfo.email,
              phone: shippingInfo.phone || undefined,
              address: {
                line1: shippingInfo.address,
                city: shippingInfo.city,
                state: shippingInfo.state || undefined,
                postal_code: shippingInfo.zipCode || undefined,
                country: 'US',
              },
            },
          },
        },
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Create order in database
        const orderRes = await fetch("/api/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.items,
            shippingInfo,
            paymentIntentId: paymentIntent.id,
            totalCents: paymentIntent.amount,
            currency: paymentIntent.currency,
          }),
        });

        if (!orderRes.ok) {
          throw new Error("Failed to create order");
        }

        const orderData = await orderRes.json();

        // Clear cart
        clearCart();

        // Redirect to confirmation page
        router.push(`/order-confirmation?order_id=${orderData.order.id}`);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setProcessing(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping Information */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {lang === "en" ? "Shipping Information" : "Información de Envío"}
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {lang === "en" ? "Full Name" : "Nombre Completo"} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={shippingInfo.name}
              onChange={handleInputChange}
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-gray-100 focus:border-[--gold] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {lang === "en" ? "Email" : "Correo Electrónico"} <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={shippingInfo.email}
              onChange={handleInputChange}
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-gray-100 focus:border-[--gold] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {lang === "en" ? "Phone" : "Teléfono"}
            </label>
            <input
              type="tel"
              name="phone"
              value={shippingInfo.phone}
              onChange={handleInputChange}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-gray-100 focus:border-[--gold] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {lang === "en" ? "Address" : "Dirección"} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="address"
              value={shippingInfo.address}
              onChange={handleInputChange}
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-gray-100 focus:border-[--gold] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {lang === "en" ? "City" : "Ciudad"} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={shippingInfo.city}
              onChange={handleInputChange}
              required
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-gray-100 focus:border-[--gold] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {lang === "en" ? "State" : "Estado"}
            </label>
            <input
              type="text"
              name="state"
              value={shippingInfo.state}
              onChange={handleInputChange}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-gray-100 focus:border-[--gold] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {lang === "en" ? "ZIP Code" : "Código Postal"}
            </label>
            <input
              type="text"
              name="zipCode"
              value={shippingInfo.zipCode}
              onChange={handleInputChange}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-gray-100 focus:border-[--gold] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {lang === "en" ? "Payment Information" : "Información de Pago"}
        </h2>

        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            fields: {
              billingDetails: 'never'
            },
            terms: {
              card: 'never'
            },
            wallets: {
              applePay: 'never',
              googlePay: 'never'
            },
            paymentMethodOrder: ['card']
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-800 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-md bg-[--gold] text-white px-6 py-3 font-semibold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing 
          ? (lang === "en" ? "Processing..." : "Procesando...") 
          : (lang === "en" ? "Pay Now" : "Pagar Ahora")
        }
      </button>

      <div className="text-center text-xs text-gray-500">
        {lang === "en" 
          ? "Your payment information is secure and encrypted" 
          : "Tu información de pago es segura y encriptada"}
      </div>
    </form>
  );
}

