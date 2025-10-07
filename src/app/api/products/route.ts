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
  updated_at: string | Date | null; // Can be string or Date depending on query method
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
  filter_categories: z.array(z.string()).optional(),
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
  // Handle updated_at which can be string or Date object
  let updatedAt: string;
  if (row.updated_at) {
    if (typeof row.updated_at === 'string') {
      updatedAt = row.updated_at.slice(0, 10);
    } else if (row.updated_at instanceof Date) {
      updatedAt = row.updated_at.toISOString().slice(0, 10);
    } else {
      updatedAt = String(row.updated_at).slice(0, 10);
    }
  } else {
    updatedAt = new Date().toISOString().slice(0, 10);
  }

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
    updatedAt,
  };
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function GET(req: NextRequest) {
  try {
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
  } catch (err) {
    console.error("products.GET error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    await ensureSchema();
  } catch (schemaErr) {
    console.error("Schema initialization failed:", schemaErr);
    return Response.json({ error: "Database initialization failed", details: String(schemaErr) }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    console.error("Product validation failed:", parsed.error.flatten());
    return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  }
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
    const id = crypto.randomUUID();
    const ins = await sql.query<{ id: string }>(
      `INSERT INTO products (
        id, sku, name, name_en, name_es, description, description_en, description_es, category, tags, status, price_cents, compare_at_cents, stock, low_stock_threshold, taxable, images, featured, hot, visible, slug, meta_title_en, meta_desc_en, meta_title_es, meta_desc_es, filter_categories
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
      ) RETURNING id`,
      [
        id,
        sku,
        name_en || d.name_es || "",
        name_en || null,
        d.name_es ?? null,
        d.description_en ?? null,
        d.description_en ?? null,
        d.description_es ?? null,
        d.category,
        d.tags ?? null,
        d.status,
        price_cents,
        compare_at_cents,
        d.stock ?? 0,
        d.low_stock_threshold ?? 0,
        d.taxable ?? false,
        imagesNorm ? JSON.stringify(imagesNorm) : null,
        d.featured ?? false,
        d.hot ?? false,
        d.visible ?? true,
        slug ?? null,
        d.meta_title_en ?? null,
        d.meta_desc_en ?? null,
        d.meta_title_es ?? null,
        d.meta_desc_es ?? null,
        d.filter_categories ? JSON.stringify(d.filter_categories) : null,
      ]
    );

    const sel = await sql.query<DBProductRow>("SELECT * FROM products WHERE id = $1", [ins.rows[0].id]);
    const product = mapRowToVM(sel.rows[0]);
    await logAudit({ actorId: me.id, action: "product.create", productId: product.id, after: product, ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") });
    return Response.json({ product });
  } catch (err: unknown) {
    type PgError = { code?: string; originalError?: { code?: string }; message?: string };
    const code = (err as PgError)?.code || (err as PgError)?.originalError?.code;
    const message = (err as PgError)?.message || String(err);

    console.error("create product error:", {
      code,
      message,
      fullError: err,
      stack: err instanceof Error ? err.stack : undefined
    });

    if (code === "23505") {
      // unique violation
      return Response.json({ error: "Conflict", message: "SKU or slug already exists" }, { status: 409 });
    }

    return Response.json({
      error: "Server error",
      message: message.slice(0, 200), // Truncate for safety
      hint: "Check server logs for details"
    }, { status: 500 });
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

  const filter_categories = d.filter_categories ? JSON.stringify(d.filter_categories) : undefined;

  try {
    await sql.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        name_en = COALESCE($2, name_en),
        name_es = COALESCE($3, name_es),
        description = COALESCE($4, description),
        description_en = COALESCE($5, description_en),
        description_es = COALESCE($6, description_es),
        category = COALESCE($7, category),
        tags = COALESCE($8, tags),
        status = COALESCE($9, status),
        price_cents = COALESCE($10, price_cents),
        compare_at_cents = COALESCE($11, compare_at_cents),
        stock = COALESCE($12, stock),
        low_stock_threshold = COALESCE($13, low_stock_threshold),
        taxable = COALESCE($14, taxable),
        images = COALESCE($15, images),
        featured = COALESCE($16, featured),
        hot = COALESCE($17, hot),
        visible = COALESCE($18, visible),
        slug = COALESCE($19, slug),
        meta_title_en = COALESCE($20, meta_title_en),
        meta_desc_en = COALESCE($21, meta_desc_en),
        meta_title_es = COALESCE($22, meta_title_es),
        meta_desc_es = COALESCE($23, meta_desc_es),
        filter_categories = COALESCE($24, filter_categories),
        updated_at = now()
      WHERE id = $25`,
      [
        d.name_en ?? null,
        d.name_en ?? null,
        d.name_es ?? null,
        d.description_en ?? null,
        d.description_en ?? null,
        d.description_es ?? null,
        d.category ?? null,
        d.tags ?? null,
        d.status ?? null,
        price_cents ?? null,
        compare_at_cents ?? null,
        d.stock ?? null,
        d.low_stock_threshold ?? null,
        d.taxable ?? null,
        images ?? null,
        d.featured ?? null,
        d.hot ?? null,
        d.visible ?? null,
        slug ?? null,
        d.meta_title_en ?? null,
        d.meta_desc_en ?? null,
        d.meta_title_es ?? null,
        d.meta_desc_es ?? null,
        filter_categories ?? null,
        id,
      ]
    );

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
  try {
    console.log("DELETE request received");

    const me = await requireAuth(req);
    console.log("Auth result:", me ? "authenticated" : "not authenticated");

    if (!me) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!me.permissions?.canManageInventory) {
      console.log("User lacks canManageInventory permission");
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = new URL(req.url).searchParams.get("id");
    console.log("Product ID to delete:", id);

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    // Check if product exists
    const beforeRes = await sql.query<DBProductRow>("SELECT * FROM products WHERE id=$1", [id]);
    console.log("Product found:", beforeRes.rows.length > 0);

    if (beforeRes.rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product is used in any orders
    const orderItemsRes = await sql.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM order_items WHERE product_id = $1",
      [id]
    );
    const orderItemCount = parseInt(orderItemsRes.rows[0]?.count || "0");
    console.log("Product used in", orderItemCount, "order items");

    if (orderItemCount > 0) {
      console.log("Cannot delete product - it's referenced in orders");
      return Response.json({
        error: "Cannot delete product",
        message: `This product is part of ${orderItemCount} order(s) and cannot be deleted. Consider hiding it instead by setting its status to 'hidden'.`,
        cannotDelete: true,
        orderCount: orderItemCount
      }, { status: 409 }); // 409 Conflict
    }

    // Delete the product
    await sql.query("DELETE FROM products WHERE id=$1", [id]);
    console.log("Product deleted successfully");

    // Try to log audit (non-critical)
    try {
      await logAudit({
        actorId: me.id,
        action: "product.delete",
        productId: id,
        before: beforeRes.rows[0] || null,
        ip: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent")
      });
    } catch (auditErr) {
      console.error("Audit log failed (non-critical):", auditErr);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE product error:", err);

    // Check if it's a foreign key constraint error
    type PgError = { code?: string; detail?: string; constraint?: string };
    const pgErr = err as PgError;

    if (pgErr.code === "23503" && pgErr.constraint === "order_items_product_id_fkey") {
      console.log("Foreign key constraint violation detected");
      return Response.json({
        error: "Cannot delete product",
        message: "This product is part of existing orders and cannot be deleted. Consider hiding it instead by setting its status to 'hidden'.",
        cannotDelete: true
      }, { status: 409 });
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error("Error stack:", errorStack);
    return Response.json({
      error: "Server error",
      message: errorMessage,
      stack: errorStack?.split('\n').slice(0, 3).join('\n')
    }, { status: 500 });
  }
}

