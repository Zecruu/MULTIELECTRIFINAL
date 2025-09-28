import { NextRequest } from "next/server";
import { verifyToken, type Me } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { ensureSchema, logAudit } from "@/lib/db";

export const runtime = "nodejs";


// Row shape from the products table
type DBProductRow = {
  id: string;
  sku: string | null;
  name: string | null;
  name_en: string | null;
  name_es: string | null;
  description: string | null;
  description_en: string | null;
  description_es: string | null;
  category: string | null;
  price_cents: number | null;
  compare_at_cents: number | null;
  stock: number | null;
  low_stock_threshold: number | null;
  status: string | null;
  featured: boolean | null;
  hot: boolean | null;
  visible: boolean | null;
  images: unknown;
  image_url?: string | null;
  slug: string | null;
  updated_at: string | null;
};

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

function mapRow(row: DBProductRow | null | undefined): DBProductRow | null {
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  await ensureSchema();
  const res = await sql.query<DBProductRow>("SELECT * FROM products WHERE id=$1", [id]);
  if (res.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product: mapRow(res.rows[0]) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const beforeRes = await sql.query<DBProductRow>("SELECT * FROM products WHERE id=$1", [id]);
  const before = beforeRes.rows[0] || null;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(body)) {
    sets.push(`${k} = $${++i}`);
    values.push(k === "images" ? JSON.stringify(v) : v);
  }
  values.unshift(id);
  if (sets.length) {
    await sql.query(`UPDATE products SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, values);
  }
  const sel = await sql.query<DBProductRow>("SELECT * FROM products WHERE id=$1", [id]);
  if (sel.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  await logAudit({ actorId: me?.id, action: "product.update", productId: id, before, after: sel.rows[0], ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
  return Response.json({ product: sel.rows[0] });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = params.id;
  const beforeRes = await sql.query<DBProductRow>("SELECT * FROM products WHERE id=$1", [id]);
  await sql`DELETE FROM products WHERE id=${id}`;
  await logAudit({ actorId: me.id, action: "product.delete", productId: id, before: beforeRes.rows[0] || null, ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
  return Response.json({ ok: true });
}

