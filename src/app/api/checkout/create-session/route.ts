import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartItem = { productId: string; quantity: number };
interface MinimalProductRow { id: string; sku: string; name: string; price_cents: number; currency: string }
interface CustomerLite { email?: string }

// Create a Stripe Checkout Session from cart items
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items: CartItem[]; customer?: CustomerLite };
    const { items, customer } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "No items" }, { status: 400 });
    }

    // Lookup products for authoritative price/sku
    const ids: string[] = items.map((i) => String(i.productId));
    const res = await sql.query<MinimalProductRow>(
      "SELECT id, sku, name, price_cents, currency FROM products WHERE id = ANY($1)",
      [ids]
    );
    const products = new Map(res.rows.map((r) => [r.id, r]));

    const line_items = items.map((i) => {
      const p = products.get(i.productId);
      if (!p) throw new Error("Product not found");
      return {
        quantity: i.quantity || 1,
        price_data: {
          currency: p.currency || "usd",
          product_data: { name: p.name, metadata: { sku: p.sku, product_id: p.id } },
          unit_amount: Number(p.price_cents),
        },
      } as const;
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: customer?.email,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    });

    return Response.json({ id: session.id, url: session.url });
  } catch (err) {
    const e = err as Error;
    console.error("create-session error", e);
    return Response.json({ error: e.message || "Failed to create session" }, { status: 500 });
  }
}

