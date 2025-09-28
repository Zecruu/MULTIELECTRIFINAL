import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import type { Me } from "@/lib/auth";
import { z } from "zod";
import { sql } from "@vercel/postgres";
import { ensureSchema, logAudit } from "@/lib/db";

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
  compare_at_price?: number | null;
  stock: number;
  low_stock_threshold?: number;
  status: "draft" | "active" | "hidden" | "out_of_stock";
  featured?: boolean;
  hot?: boolean;
  visible?: boolean;
  images?: Array<{ url: string; alt?: string | null; primary?: boolean }>;
  slug?: string;
  updatedAt: string;
};

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
  images: Array<{ url: string; alt?: string | null; primary?: boolean }> | null;
  image_url?: string | null;
  slug: string | null;
  updated_at: string | null;
};


const BaseSchema = z.object({
  sku: z.string().min(1).optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "hidden"]).default("draft"),
  name_en: z.string().optional(),
  name_es: z.string().optional(),
  description_en: z.string().optional(),
  description_es: z.string().optional(),
  price: z.number().nonnegative().default(0),
  compare_at_price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  low_stock_threshold: z.number().int().nonnegative().optional(),
  taxable: z.boolean().optional(),
  images: z.array(z.union([z.string().url(), z.object({ url: z.string().url(), alt: z.string().optional(), primary: z.boolean().optional() })])).optional(),
  featured: z.boolean().optional(),
  hot: z.boolean().optional(),
  visible: z.boolean().optional(),
  slug: z.string().min(1).optional(),
  meta_title_en: z.string().optional(),
  meta_desc_en: z.string().optional(),
  meta_title_es: z.string().optional(),
  meta_desc_es: z.string().optional(),
});

const CreateSchema = BaseSchema.superRefine((d, ctx) => {
  // Draft minimal requirements
  if (d.status === "draft") {
    if (!d.category) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["category"], message: "Category required" });
    if (d.price < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Price must be >= 0" });
  }
  // Active stricter requirements
  if (d.status === "active") {
    if (!d.name_en) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name_en"], message: "Name (EN) required" });
    if (!d.name_es) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name_es"], message: "Nombre (ES) requerido" });
    if (!d.images || d.images.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["images"], message: "At least 1 image required" });
  }
  if (d.compare_at_price !== undefined && d.compare_at_price < d.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["compare_at_price"], message: "Compare-at must be >= price" });
  }
});

const UpdateSchema = BaseSchema.partial();

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

function mapRowToVM(row: DBProductRow): ProductVM {
  return {
    id: row.id,
    sku: row.sku ?? "",
    name_en: row.name_en ?? row.name ?? "",
    name_es: row.name_es ?? row.name ?? "",
    description_en: row.description_en ?? row.description ?? undefined,
    description_es: row.description_es ?? row.description ?? undefined,
    category: row.category ?? "General",
    price: (row.price_cents ?? 0) / 100,
    compare_at_price: row.compare_at_cents ? row.compare_at_cents / 100 : null,
    stock: row.stock ?? 0,
    low_stock_threshold: row.low_stock_threshold ?? 0,
    status: (row.status as ProductVM["status"]) || ((row.stock ?? 0) > 0 ? "active" : "out_of_stock"),
    featured: row.featured ?? false,
    hot: row.hot ?? false,
    visible: row.visible ?? true,
    images: Array.isArray(row.images) ? row.images : (row.image_url ? [{ url: row.image_url, primary: true }] : []),
    slug: row.slug ?? undefined,
    updatedAt: row.updated_at?.slice(0,10) ?? new Date().toISOString().slice(0,10),
  };
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const q = searchParams.get("query");
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (category) { params.push(category); where.push(`category = $${params.length}`); }
  if (q) {
    const like = `%${q}%`;
    params.push(like, like, like);
    where.push(`(sku ILIKE $${params.length-2} OR COALESCE(name_en,name) ILIKE $${params.length-1} OR COALESCE(name_es,name) ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const query = `SELECT * FROM products ${whereSql} ORDER BY updated_at DESC LIMIT 500`;
  const res = await sql.query<DBProductRow>(query, params);
  const products = res.rows.map(mapRowToVM);
  return Response.json({ products });
}

export async function POST(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data as z.infer<typeof CreateSchema>;

  const sku = d.sku?.trim() || `SKU-${Date.now()}`;
  const price_cents = Math.round((d.price ?? 0) * 100);
  const compare_at_cents = d.compare_at_price !== undefined ? Math.round(d.compare_at_price * 100) : null;
  const imagesNorm = (d.images && d.images.length)
    ? d.images.map((x: string | { url: string; alt?: string; primary?: boolean }, idx: number) => typeof x === "string" ? ({ url: x, primary: idx === 0 }) : ({ url: x.url, alt: x.alt, primary: x.primary ?? idx === 0 }))
    : undefined;
  const name_en = d.name_en ?? "";
  const slug = (d.slug?.trim() || (name_en ? slugify(name_en) : null));

  try {
    const ins = await sql<{ id: string }>`INSERT INTO products (
      sku, name, name_en, name_es, description, description_en, description_es, category, tags, status, price_cents, compare_at_cents, stock, low_stock_threshold, taxable, images, featured, hot, visible, slug, meta_title_en, meta_desc_en, meta_title_es, meta_desc_es
    ) VALUES (
      ${sku}, ${name_en || d.name_es || ""}, ${name_en || null}, ${d.name_es ?? null}, ${d.description_en ?? null}, ${d.description_en ?? null}, ${d.description_es ?? null}, ${d.category}, ${d.tags ?? null}, ${d.status}, ${price_cents}, ${compare_at_cents}, ${d.stock ?? 0}, ${d.low_stock_threshold ?? 0}, ${d.taxable ?? false}, ${imagesNorm ? JSON.stringify(imagesNorm) : null}, ${d.featured ?? false}, ${d.hot ?? false}, ${d.visible ?? true}, ${slug ?? null}, ${d.meta_title_en ?? null}, ${d.meta_desc_en ?? null}, ${d.meta_title_es ?? null}, ${d.meta_desc_es ?? null}
    ) RETURNING id`;

    const sel = await sql.query<DBProductRow>("SELECT * FROM products WHERE id = $1", [ins.rows[0].id]);
    const product = mapRowToVM(sel.rows[0]);
    await logAudit({ actorId: me.id, action: "product.create", productId: product.id, after: product, ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
    return Response.json({ product });
  } catch (err: unknown) {
    type PgError = { code?: string; originalError?: { code?: string } };
    const code = (err as PgError)?.code || (err as PgError)?.originalError?.code;
    if (code === "23505") {
      // unique violation
      return Response.json({ error: "Conflict", message: "SKU or slug already exists" }, { status: 409 });
    }
    console.error("create product error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
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

  // Load before for audit
  const beforeRes = await sql.query<DBProductRow>("SELECT * FROM products WHERE id=$1", [id]);
  const before = beforeRes.rows[0] || null;

  const price_cents = d.price !== undefined ? Math.round(d.price * 100) : undefined;
  const compare_at_cents = d.compare_at_price !== undefined ? Math.round((d.compare_at_price || 0) * 100) : undefined;
  const images = d.images ? JSON.stringify(d.images) : undefined;
  const slug = d.slug ? d.slug : undefined;

  try {
    await sql`UPDATE products SET
      name = COALESCE(${d.name_en ?? null}, name),
      name_en = COALESCE(${d.name_en ?? null}, name_en),
      name_es = COALESCE(${d.name_es ?? null}, name_es),
      description = COALESCE(${d.description_en ?? null}, description),
      description_en = COALESCE(${d.description_en ?? null}, description_en),
      description_es = COALESCE(${d.description_es ?? null}, description_es),
      category = COALESCE(${d.category ?? null}, category),
      tags = COALESCE(${d.tags ?? null}, tags),
      status = COALESCE(${d.status ?? null}, status),
      price_cents = COALESCE(${price_cents ?? null}, price_cents),
      compare_at_cents = COALESCE(${compare_at_cents ?? null}, compare_at_cents),
      stock = COALESCE(${d.stock ?? null}, stock),
      low_stock_threshold = COALESCE(${d.low_stock_threshold ?? null}, low_stock_threshold),
      taxable = COALESCE(${d.taxable ?? null}, taxable),
      images = COALESCE(${images ?? null}, images),
      featured = COALESCE(${d.featured ?? null}, featured),
      hot = COALESCE(${d.hot ?? null}, hot),
      visible = COALESCE(${d.visible ?? null}, visible),
      slug = COALESCE(${slug ?? null}, slug),
      meta_title_en = COALESCE(${d.meta_title_en ?? null}, meta_title_en),
      meta_desc_en = COALESCE(${d.meta_desc_en ?? null}, meta_desc_en),
      meta_title_es = COALESCE(${d.meta_title_es ?? null}, meta_title_es),
      meta_desc_es = COALESCE(${d.meta_desc_es ?? null}, meta_desc_es),
      updated_at = now()
    WHERE id = ${id}`;

    const sel = await sql.query<DBProductRow>("SELECT * FROM products WHERE id = $1", [id]);
    if (sel.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
    const product = mapRowToVM(sel.rows[0]);
    await logAudit({ actorId: me.id, action: "product.update", productId: id, before, after: product, ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
    return Response.json({ product });
  } catch (err: unknown) {
    type PgError = { code?: string; originalError?: { code?: string } };
    const code = (err as PgError)?.code || (err as PgError)?.originalError?.code;
    if (code === "23505") {
      return Response.json({ error: "Conflict", message: "SKU or slug already exists" }, { status: 409 });
    }
    console.error("update product error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const beforeRes = await sql.query<DBProductRow>("SELECT * FROM products WHERE id=$1", [id]);
  await sql`DELETE FROM products WHERE id=${id}`;
  await logAudit({ actorId: me.id, action: "product.delete", productId: id, before: beforeRes.rows[0] || null, ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
  return Response.json({ ok: true });
}

