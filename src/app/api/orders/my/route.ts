import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/auth-customer";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function GET() {
  const c = await cookies();
  const t = c.get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload; try { payload = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    // list orders for this customer email
    const rows = await sql<{ id: string; order_number: string; created_at: string; total_cents: number; currency: string; status: string }>`
      SELECT o.id, o.order_number, o.created_at, o.total_cents, o.currency, o.status
      FROM orders o JOIN customers c ON c.id=o.customer_id
      WHERE c.email=${payload.email}
      ORDER BY o.created_at DESC
      LIMIT 50`;

    const orders = rows.rows.map(r => ({ id: r.id, order_number: r.order_number, date: r.created_at, total: r.total_cents, currency: r.currency, status: r.status }));
    return Response.json({ orders });
  } catch (err) {
    console.error("[Orders] my orders query failed:", err);
    // Return 200 with empty list so the UI renders gracefully
    return Response.json({ orders: [], error: "Orders database unavailable" });
  }
}

