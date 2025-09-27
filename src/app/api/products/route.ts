import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import type { Me } from "@/lib/auth";
import { z } from "zod";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

type ProductVM = {
  id: string;
  sku: string;
  name_en: string;
  name_es: string;
  description_en?: string;
  description_es?: string;
  category: string;
  price: number; // dollars
  stock: number;
  status: "Active" | "Out of Stock";
  featured?: boolean;
  images?: string[];
  updatedAt: string;
};

const CreateSchema = z.object({
  name_en: z.string().min(1),
  name_es: z.string().min(1),
  description_en: z.string().optional(),
  description_es: z.string().optional(),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  featured: z.boolean().optional(),
  images: z.array(z.string().url()).optional(),
});

const UpdateSchema = CreateSchema.partial();

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

function mapRowToVM(row: { id: string; sku: string; name: string; description: string | null; price_cents: number; image_url: string | null; stock: number; updated_at: string }): ProductVM {
  return {
    id: row.id,
    sku: row.sku,
    name_en: row.name,
    name_es: row.name,
    description_en: row.description ?? undefined,
    description_es: row.description ?? undefined,
    category: "General",
    price: row.price_cents / 100,
    stock: row.stock,
    status: row.stock > 0 ? "Active" : "Out of Stock",
    images: row.image_url ? [row.image_url] : [],
    updatedAt: row.updated_at?.slice(0,10) ?? new Date().toISOString().slice(0,10),
  };
}

export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const res = await sql<{ id: string; sku: string; name: string; description: string | null; price_cents: number; image_url: string | null; stock: number; updated_at: string }>`SELECT id, sku, name, description, price_cents, image_url, stock, updated_at FROM products ORDER BY updated_at DESC LIMIT 500`;
  const products = res.rows.map(mapRowToVM);
  return Response.json({ products });
}

export async function POST(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const sku = `SKU-${Date.now()}`;
  const price_cents = Math.round(d.price * 100);
  const image_url = d.images?.[0] ?? null;
  const ins = await sql<{ id: string }>`INSERT INTO products (sku, name, description, price_cents, image_url, stock)
    VALUES (${sku}, ${d.name_en}, ${d.description_en ?? null}, ${price_cents}, ${image_url}, ${d.stock}) RETURNING id`;
  const sel = await sql<{ id: string; sku: string; name: string; description: string | null; price_cents: number; image_url: string | null; stock: number; updated_at: string }>`SELECT id, sku, name, description, price_cents, image_url, stock, updated_at FROM products WHERE id=${ins.rows[0].id}`;
  const product = mapRowToVM(sel.rows[0]);
  console.log("AUDIT", { action: "PRODUCT_CREATE", by: me.id, id: product.id });
  return Response.json({ product });
}

export async function PATCH(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const price_cents = d.price !== undefined ? Math.round(d.price * 100) : undefined;
  const image_url = d.images ? (d.images[0] ?? null) : undefined;
  await sql`UPDATE products SET
      name = COALESCE(${d.name_en ?? null}, name),
      description = COALESCE(${d.description_en ?? null}, description),
      price_cents = COALESCE(${price_cents ?? null}, price_cents),
      image_url = COALESCE(${image_url ?? null}, image_url),
      stock = COALESCE(${d.stock ?? null}, stock),
      updated_at = now()
    WHERE id = ${id}`;
  const sel = await sql<{ id: string; sku: string; name: string; description: string | null; price_cents: number; image_url: string | null; stock: number; updated_at: string }>`SELECT id, sku, name, description, price_cents, image_url, stock, updated_at FROM products WHERE id=${id}`;
  if (sel.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  const product = mapRowToVM(sel.rows[0]);
  console.log("AUDIT", { action: "PRODUCT_UPDATE", by: me.id, id });
  return Response.json({ product });
}

export async function DELETE(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const del = await sql`DELETE FROM products WHERE id=${id}`;
  const ok = (del.rowCount ?? 0) > 0;
  console.log("AUDIT", { action: "PRODUCT_DELETE", by: me.id, id });
  return Response.json({ ok });
}

