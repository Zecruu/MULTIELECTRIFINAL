import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/auth-customer";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const c = await cookies();
  const t = c.get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await context.params;
  const oRes = await sql<{ id: string; order_number: string; status: string; created_at: string; subtotal_cents: number; tax_cents: number; total_cents: number; currency: string }>`
    SELECT id, order_number, status, created_at, subtotal_cents, tax_cents, total_cents, currency FROM orders WHERE id=${id} LIMIT 1`;
  if (oRes.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  const iRes = await sql<{ id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number }>`
    SELECT id, product_id, sku, name, qty, unit_price_cents, line_total_cents FROM order_items WHERE order_id=${id} ORDER BY name`;
  return Response.json({ order: oRes.rows[0], items: iRes.rows });
}

