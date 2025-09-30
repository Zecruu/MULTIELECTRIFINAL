import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureSchema, upsertCustomer } from "@/lib/db";
import { publishOrderEvent } from "@/lib/sse";

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
    console.log("[Order Create] Starting order creation");
    await ensureSchema();

    const body = await req.json();
    console.log("[Order Create] Request body:", JSON.stringify(body, null, 2));

    const { items, shippingInfo, paymentIntentId, totalCents, currency } = body as {
      items: CartItem[];
      shippingInfo: ShippingInfo;
      paymentIntentId: string;
      totalCents: number;
      currency: string;
    };

    if (!items || items.length === 0) {
      console.log("[Order Create] Error: No items in order");
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }

    if (!shippingInfo || !shippingInfo.email || !shippingInfo.name) {
      console.log("[Order Create] Error: Missing shipping information");
      return NextResponse.json({ error: "Missing shipping information" }, { status: 400 });
    }

    // Upsert customer with address as JSON object
    const addressJson = {
      address: shippingInfo.address,
      city: shippingInfo.city,
      state: shippingInfo.state,
      zipCode: shippingInfo.zipCode,
      phone: shippingInfo.phone,
    };

    console.log("[Order Create] Upserting customer:", shippingInfo.email);
    const customerId = await upsertCustomer(
      shippingInfo.email,
      shippingInfo.name,
      shippingInfo.phone || null,
      addressJson
    );
    console.log("[Order Create] Customer ID:", customerId);

    // Generate order number
    const orderNumber = `ME-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Calculate subtotal and tax (for now, tax is 0, subtotal = total)
    const subtotalCents = totalCents;
    const taxCents = 0;

    // Create order
    const orderId = crypto.randomUUID();
    console.log("[Order Create] Creating order with ID:", orderId);
    await sql.query(
      `INSERT INTO orders (
        id, order_number, customer_id, status, subtotal_cents, tax_cents, total_cents, currency,
        payment_method, payment_intent_id, shipping_address, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [
        orderId,
        orderNumber,
        customerId,
        "pending",
        subtotalCents,
        taxCents,
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
    console.log("[Order Create] Order record created successfully");

    // Validate stock availability before creating order items
    console.log("[Order Create] Validating stock availability");
    const productIds = items.map(item => item.productId);
    const stockCheckRes = await sql.query<{ id: string; stock: number; name: string }>(
      `SELECT id, stock, name FROM products WHERE id = ANY($1)`,
      [productIds]
    );

    const stockMap = new Map(stockCheckRes.rows.map(row => [row.id, row]));
    const outOfStockItems: string[] = [];

    for (const item of items) {
      const product = stockMap.get(item.productId);
      if (!product) {
        console.log(`[Order Create] Product not found: ${item.productId}`);
        outOfStockItems.push(`${item.name_en} (not found)`);
      } else if (product.stock < item.quantity) {
        console.log(`[Order Create] Insufficient stock for ${product.name}: requested ${item.quantity}, available ${product.stock}`);
        outOfStockItems.push(`${item.name_en} (requested: ${item.quantity}, available: ${product.stock})`);
      }
    }

    if (outOfStockItems.length > 0) {
      console.log("[Order Create] Order failed - items out of stock:", outOfStockItems);
      // Delete the order we just created since we can't fulfill it
      await sql.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
      return NextResponse.json({
        error: "Some items are out of stock",
        outOfStockItems,
        message: `The following items are out of stock or have insufficient quantity: ${outOfStockItems.join(", ")}`
      }, { status: 400 });
    }

    // Create order items and update stock
    for (const item of items) {
      const itemId = crypto.randomUUID();
      const unitPriceCents = Math.round(item.price * 100);
      const lineTotalCents = unitPriceCents * item.quantity;

      console.log(`[Order Create] Adding item: ${item.name_en} x${item.quantity}`);
      await sql.query(
        `INSERT INTO order_items (
          id, order_id, product_id, sku, name, qty, unit_price_cents, line_total_cents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          itemId,
          orderId,
          item.productId,
          item.productId, // Using productId as SKU for now
          item.name_en,
          item.quantity,
          unitPriceCents,
          lineTotalCents,
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

    console.log("[Order Create] Order created successfully:", order.id);

    // Publish SSE event for employee notifications
    try {
      publishOrderEvent({
        type: "order-created",
        payload: {
          id: order.id,
          orderNumber: order.order_number,
          customerName: shippingInfo.name,
          order: {
            orderNumber: order.order_number,
            customer: {
              name: shippingInfo.name,
            },
          },
        },
      });
      console.log("[Order Create] SSE event published");
    } catch (sseError) {
      console.error("[Order Create] Failed to publish SSE event:", sseError);
    }

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
    console.error("[Order Create] ERROR:", error);
    console.error("[Order Create] Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}

