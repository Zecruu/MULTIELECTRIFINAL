import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureSchema, upsertCustomer } from "@/lib/db";

export const runtime = "nodejs";

type CartItem = {
  productId: string;
  name_en: string;
  name_es: string;
  price: number;
  quantity: number;
  image?: string;
};

type ShippingInfo = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
};

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const { items, shippingInfo, paymentIntentId, totalCents, currency } = await req.json() as {
      items: CartItem[];
      shippingInfo: ShippingInfo;
      paymentIntentId: string;
      totalCents: number;
      currency: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }

    if (!shippingInfo || !shippingInfo.email || !shippingInfo.name) {
      return NextResponse.json({ error: "Missing shipping information" }, { status: 400 });
    }

    // Upsert customer
    const customer = await upsertCustomer(
      shippingInfo.email,
      shippingInfo.name,
      shippingInfo.phone || null,
      shippingInfo.address || null
    );

    // Generate order number
    const orderNumber = `ME-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Create order
    const orderId = crypto.randomUUID();
    await sql.query(
      `INSERT INTO orders (
        id, order_number, customer_id, status, total_cents, currency, 
        payment_method, payment_intent_id, shipping_address, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        orderId,
        orderNumber,
        customer.id,
        "pending",
        totalCents,
        currency || "usd",
        "stripe",
        paymentIntentId,
        JSON.stringify({
          name: shippingInfo.name,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          phone: shippingInfo.phone,
        }),
      ]
    );

    // Create order items
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await sql.query(
        `INSERT INTO order_items (
          id, order_id, product_id, quantity, price_cents, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          itemId,
          orderId,
          item.productId,
          item.quantity,
          Math.round(item.price * 100),
        ]
      );

      // Update product stock
      await sql.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    // Fetch the created order
    const orderRes = await sql.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );

    const order = orderRes.rows[0];

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_cents: order.total_cents,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}

