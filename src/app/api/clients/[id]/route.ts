import { NextRequest } from "next/server";
import { verifyToken, type Me } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await context.params).id;
  try {
    await ensureSchema();
    // Basic customer info
    const cRes = await sql<{ id: string; email: string; name: string | null; phone: string | null }>`
      SELECT id, email, name, phone FROM customers WHERE id=${id} LIMIT 1`;
    if (cRes.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

    // Orders summary list for this customer
    const oRes = await sql<{ id: string; order_number: string; created_at: string; status: string; total_cents: number; currency: string }>`
      SELECT id, order_number, created_at, status, total_cents, currency
      FROM orders WHERE customer_id=${id}
      ORDER BY created_at DESC LIMIT 200`;

    const customer = cRes.rows[0];
    const orders = oRes.rows.map(r => ({ id: r.id, order_number: r.order_number, date: r.created_at, status: r.status, total_cents: r.total_cents, currency: r.currency }));

    return Response.json({ customer, orders });
  } catch (err) {
    console.error("clients/[id].GET error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

