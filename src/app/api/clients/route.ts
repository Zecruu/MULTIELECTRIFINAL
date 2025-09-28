import { NextRequest } from "next/server";
import { verifyToken, type Me } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

const QuerySchema = z.object({
  q: z.string().optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ q: url.searchParams.get("q") ?? "", page: url.searchParams.get("page"), pageSize: url.searchParams.get("pageSize") });
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });
  const { q, page, pageSize } = parsed.data;

  try {
    await ensureSchema();
    const like = `%${q}%`;
    const where = q ? "WHERE (c.email ILIKE $1 OR c.name ILIKE $1 OR c.phone ILIKE $1)" : "";
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const countQuery = `SELECT COUNT(*)::int AS count FROM customers c ${where}`;
    const listQuery = `
      SELECT c.id, c.name, c.email, c.phone,
             COALESCE(COUNT(o.id),0)::int AS total_orders,
             MAX(o.created_at) AS last_order
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      ${where}
      GROUP BY c.id
      ORDER BY last_order DESC NULLS LAST, c.name ASC
      LIMIT $2 OFFSET $3`;

    const params: Array<string | number> = q ? [like, limit, offset] : [limit, offset];

    const countRes = q ? await sql.query<{ count: number }>(countQuery, [like]) : await sql.query<{ count: number }>(countQuery);

    const listRes = q
      ? await sql.query<{ id: string; name: string | null; email: string; phone: string | null; total_orders: number; last_order: string | null }>(listQuery, params)
      : await sql.query<{ id: string; name: string | null; email: string; phone: string | null; total_orders: number; last_order: string | null }>(
          listQuery.replace("WHERE (c.email ILIKE $1 OR c.name ILIKE $1 OR c.phone ILIKE $1)", ""),
          [limit, offset]
        );

    const clients = listRes.rows.map(r => ({
      id: r.id,
      name: r.name || "",
      email: r.email,
      phone: r.phone || "",
      totalOrders: r.total_orders,
      lastOrder: r.last_order ? new Date(r.last_order).toISOString().slice(0,10) : "-",
      status: r.total_orders > 0 ? "Active" : "Inactive",
    }));

    return Response.json({ clients, page, pageSize, total: countRes.rows[0].count });
  } catch (err) {
    console.error("clients.GET error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
