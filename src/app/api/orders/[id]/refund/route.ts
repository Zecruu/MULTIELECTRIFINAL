import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { verifyToken, type Me } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { stripe } from "@/lib/stripe";
import { ensureSchema, logAudit } from "@/lib/db";
import { publishOrderEvent } from "@/lib/sse";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    await ensureSchema();
    const oRes = await sql<{ status: string; payment_intent_id: string | null; total_cents: number; currency: string }>`
      SELECT status, payment_intent_id, total_cents, currency FROM orders WHERE id=${id} LIMIT 1`;
    if (oRes.rows.length === 0) return Response.json({ error: "Order not found" }, { status: 404 });
    const order = oRes.rows[0];
    if (order.status === 'Refunded' || order.status === 'Canceled') {
      return Response.json({ error: `Order not eligible for refund (status: ${order.status})` }, { status: 400 });
    }
    if (!order.payment_intent_id) return Response.json({ error: "Order not eligible for refund (no payment intent)" }, { status: 400 });
    if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Stripe not configured" }, { status: 400 });

    const refund = await stripe.refunds.create({ payment_intent: order.payment_intent_id });
    const refundId = (refund as Stripe.Response<Stripe.Refund>).id;

    await sql`UPDATE orders SET status = ${'Refunded'} WHERE id = ${id}`;
    publishOrderEvent({ type: "order-updated", payload: { id, status: 'Refunded' } });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || null;
    const userAgent = req.headers.get("user-agent") || null;
    await logAudit({
      actorId: me.id,
      action: "order.refund",
      productId: null,
      before: { id, status: order.status },
      after: { id, status: 'Refunded', refund_id: refundId },
      ip,
      userAgent,
    });

    return Response.json({ ok: true, refund });
  } catch (err) {
    console.error("refund.POST error", err);
    return Response.json({ error: "Refund failed" }, { status: 500 });
  }
}

