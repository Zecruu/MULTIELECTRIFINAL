import { NextRequest } from "next/server";
import { STRIPE_WEBHOOK_SECRET, stripe } from "@/lib/stripe";
import { createOrder, getProductsByIds } from "@/lib/db";
import { publishOrderEvent } from "@/lib/sse";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;
  try {
    const text = await req.text();
    if (!sig || !secret) {
      // Allow local/dev without signature (but warn)
      console.warn("Stripe webhook signature or secret missing; skipping verification in dev");
      event = JSON.parse(text) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(text, sig, secret);
    }
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Bad Request", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email || session.customer_email || "unknown@example.com";
        const name = session.customer_details?.name || null;
        const phone = session.customer_details?.phone || null;
        const address = session.customer_details?.address || null;

        // Build line items by retrieving the session line items
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
        const productIds: string[] = [];
        for (const item of lineItems.data) {
          const meta = (item.price?.metadata || {}) as Record<string, string>;
          const metaPid = meta.product_id;
          if (metaPid) productIds.push(String(metaPid));
        }

        const products = await getProductsByIds(productIds);
        const map = new Map(products.map((p) => [p.id, p]));

        const items: Array<{ product: import("@/lib/db").DbProduct; qty: number }> = [];
        for (const li of lineItems.data) {
          const pid = ((li.price?.metadata || {}) as Record<string, string>).product_id;
          const p = pid ? map.get(pid) : undefined;
          if (p) items.push({ product: p, qty: li.quantity || 1 });
        }

        const amount_total = session.amount_total ?? 0;
        const currency = session.currency ?? "usd";
        const subtotal_cents = amount_total; // taxes/fees handling can be extended later

        const addressJson = address ? { ...address } as Record<string, unknown> : null;
        const order = await createOrder({
          customer: { email, name, phone, address: addressJson },
          lineItems: items,
          totals: { subtotal_cents, tax_cents: 0, total_cents: subtotal_cents, currency },
          stripe: { payment_intent_id: (session.payment_intent as string) || null, session_id: session.id },
        });

        publishOrderEvent({ type: "order-created", payload: { id: order.id, orderNumber: order.order_number, customerName: name || email } });
        break;
      }
      default:
        break;
    }

    return new Response("ok");
  } catch (err) {
    console.error("Webhook handling error", err);
    return new Response("Internal Error", { status: 500 });
  }
}

