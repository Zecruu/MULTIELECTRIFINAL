import { NextRequest } from "next/server";
import { verifyToken, type Me } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { ensureSchema, logAudit } from "@/lib/db";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

function mapRow(row: any) {
  return row ? row : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  await ensureSchema();
  const res = await sql.query<any>("SELECT * FROM products WHERE id=$1", [id]);
  if (res.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product: mapRow(res.rows[0]) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const beforeRes = await sql.query<any>("SELECT * FROM products WHERE id=$1", [id]);
  const before = beforeRes.rows[0] || null;

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(body)) {
    sets.push(`${k} = $${++i}`);
    values.push(k === "images" ? JSON.stringify(v) : v);
  }
  values.unshift(id);
  if (sets.length) {
    await sql.query(`UPDATE products SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, values);
  }
  const sel = await sql.query<any>("SELECT * FROM products WHERE id=$1", [id]);
  if (sel.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  await logAudit({ actorId: me?.id, action: "product.update", productId: id, before, after: sel.rows[0], ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
  return Response.json({ product: sel.rows[0] });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = params.id;
  const beforeRes = await sql.query<any>("SELECT * FROM products WHERE id=$1", [id]);
  await sql`DELETE FROM products WHERE id=${id}`;
  await logAudit({ actorId: me.id, action: "product.delete", productId: id, before: beforeRes.rows[0] || null, ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
  return Response.json({ ok: true });
}

