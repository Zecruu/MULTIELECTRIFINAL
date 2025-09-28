import { sql } from "@vercel/postgres";

export type DbOrderStatus = "Pending" | "Processing" | "Ready for Pickup" | "Fulfilled" | "Canceled" | "Refunded";

export interface DbProduct { id: string; sku: string; name: string; description?: string; price_cents: number; currency: string; image_url?: string | null; stock: number; }
export interface DbCustomer { id: string; email: string; name?: string | null; phone?: string | null; address_json?: Record<string, unknown> | null; }
export interface DbOrder { id: string; order_number: string; customer_id: string; status: DbOrderStatus; subtotal_cents: number; tax_cents: number; total_cents: number; currency: string; payment_intent_id?: string | null; stripe_session_id?: string | null; created_at: string; }
export interface DbOrderItem { id: string; order_id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number; }

function ensurePostgresEnv() {
  // Help @vercel/postgres find a connection string in varied env setups
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.SUPABASE_DB_URL,
  ].filter(Boolean) as string[];
  if (!process.env.POSTGRES_URL && candidates.length > 0) {
    process.env.POSTGRES_URL = candidates[0];
  }
  if (!process.env.POSTGRES_URL_NON_POOLING && process.env.POSTGRES_URL) {
    process.env.POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL;
  }
}

// Helpers
export async function ensureSchema() {
  // Ensure the DB connection string is wired even if the host uses a different var
  ensurePostgresEnv();

  // Best-effort: ignore if extensions cannot be installed (not required anymore)
  try { await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`; } catch {}
  try { await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`; } catch {}

  // Safe idempotent DDL for local dev; in production use migrations
  await sql`CREATE TABLE IF NOT EXISTS products (id uuid PRIMARY KEY, sku text UNIQUE NOT NULL, name text NOT NULL, description text, price_cents integer NOT NULL, currency text NOT NULL DEFAULT 'usd', image_url text, stock integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());`;
  // Evolve products table for admin inventory features
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS name_es text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS description_es text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[]`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS status text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_cents integer`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold integer`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS taxable boolean`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images jsonb`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS featured boolean`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS hot boolean`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS visible boolean`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title_en text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_desc_en text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title_es text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_desc_es text`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON products(slug)`;

  await sql`CREATE TABLE IF NOT EXISTS customers (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text, phone text, address_json jsonb, created_at timestamptz NOT NULL DEFAULT now());`;
  await sql`CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY, order_number text UNIQUE NOT NULL, customer_id uuid REFERENCES customers(id), status text NOT NULL, subtotal_cents integer NOT NULL, tax_cents integer NOT NULL, total_cents integer NOT NULL, currency text NOT NULL DEFAULT 'usd', payment_intent_id text, stripe_session_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());`;
  await sql`CREATE TABLE IF NOT EXISTS order_items (id uuid PRIMARY KEY, order_id uuid REFERENCES orders(id) ON DELETE CASCADE, product_id uuid REFERENCES products(id), sku text NOT NULL, name text NOT NULL, qty integer NOT NULL, unit_price_cents integer NOT NULL, line_total_cents integer NOT NULL);`;
  await sql`CREATE TABLE IF NOT EXISTS order_sequences (year integer PRIMARY KEY, seq integer NOT NULL);`;
  await sql`CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY, actor_id text, action text NOT NULL, product_id uuid, before jsonb, after jsonb, ip text, user_agent text, ts timestamptz NOT NULL DEFAULT now());`;
}

export async function upsertCustomer(email: string, name?: string | null, phone?: string | null, address_json?: Record<string, unknown> | null) {
  const id = crypto.randomUUID();
  const res = await sql<{ id: string }>`INSERT INTO customers (id, email, name, phone, address_json)
    VALUES (${id}, ${email}, ${name ?? null}, ${phone ?? null}, ${address_json ? JSON.stringify(address_json) : null})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, address_json = EXCLUDED.address_json
    RETURNING id;`;
  return res.rows[0].id;
}

export function formatOrderNumber(year: number, seq: number) {
  return `ME-${year}-${String(seq).padStart(6, "0")}`;
}

export async function nextOrderNumber(): Promise<{ order_number: string; seq: number; year: number }>{
  const year = new Date().getFullYear();
  await sql`INSERT INTO order_sequences (year, seq) VALUES (${year}, 0) ON CONFLICT (year) DO NOTHING;`;
  const res = await sql<{ seq: number }>`UPDATE order_sequences SET seq = seq + 1 WHERE year = ${year} RETURNING seq;`;
  const seq = res.rows[0].seq;
  return { order_number: formatOrderNumber(year, seq), seq, year };
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [] as DbProduct[];
  const res = await sql.query<DbProduct>("SELECT * FROM products WHERE id = ANY($1)", [ids]);
  return res.rows;
}

export async function createOrder(params: {
  customer: { email: string; name?: string | null; phone?: string | null; address?: Record<string, unknown> | null };
  lineItems: Array<{ product: DbProduct; qty: number }>;
  totals: { subtotal_cents: number; tax_cents: number; total_cents: number; currency: string };
  stripe: { payment_intent_id?: string | null; session_id?: string | null };
}) {
  const customer_id = await upsertCustomer(params.customer.email, params.customer.name ?? null, params.customer.phone ?? null, params.customer.address ?? null);
  const { order_number } = await nextOrderNumber();

  const order_id = crypto.randomUUID();
  await sql`INSERT INTO orders (id, order_number, customer_id, status, subtotal_cents, tax_cents, total_cents, currency, payment_intent_id, stripe_session_id)
    VALUES (${order_id}, ${order_number}, ${customer_id}, ${'Pending'}, ${params.totals.subtotal_cents}, ${params.totals.tax_cents}, ${params.totals.total_cents}, ${params.totals.currency}, ${params.stripe.payment_intent_id ?? null}, ${params.stripe.session_id ?? null});`;

  for (const li of params.lineItems) {
    const p = li.product;
    const item_id = crypto.randomUUID();
    await sql`INSERT INTO order_items (id, order_id, product_id, sku, name, qty, unit_price_cents, line_total_cents)
      VALUES (${item_id}, ${order_id}, ${p.id}, ${p.sku}, ${p.name}, ${li.qty}, ${p.price_cents}, ${p.price_cents * li.qty});`;
    await sql`UPDATE products SET stock = GREATEST(stock - ${li.qty}, 0) WHERE id = ${p.id};`;
  }

  return { id: order_id, order_number };
}

export interface OrderListRow { id: string; order_number: string; status: DbOrderStatus; created_at: string; customer_email: string; customer_name: string | null; total_cents: number; currency: string }

export async function listOrders(opts: { status?: DbOrderStatus | null; q?: string | null } = {}) {
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (opts.status) { params.push(opts.status); where.push(`o.status = $${params.length}`); }
  if (opts.q) {
    const q = `%${opts.q}%`;
    params.push(q, q, q);
    where.push(`(o.order_number ILIKE $${params.length-2} OR c.email ILIKE $${params.length-1} OR COALESCE(c.name,'') ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const query = `SELECT o.id, o.order_number, o.status, o.created_at, o.total_cents, o.currency, c.email as customer_email, c.name as customer_name FROM orders o JOIN customers c ON c.id = o.customer_id ${whereSql} ORDER BY o.created_at DESC LIMIT 200`;
  const res = await sql.query<OrderListRow>(query, params);
  return res.rows;
}

export async function updateOrderStatus(id: string, status: DbOrderStatus) {
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}


export interface OrderDetail {
  id: string; order_number: string; status: DbOrderStatus; created_at: string;
  subtotal_cents: number; tax_cents: number; total_cents: number; currency: string;
  customer: { email: string; name: string | null };
  items: Array<{ id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number }>;
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const oRes = await sql.query<{ id: string; order_number: string; status: DbOrderStatus; created_at: string; subtotal_cents: number; tax_cents: number; total_cents: number; currency: string; customer_email: string; customer_name: string | null }>(`SELECT o.*, c.email as customer_email, c.name as customer_name FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=$1 LIMIT 1`, [id]);
  if (oRes.rows.length === 0) return null;
  const row = oRes.rows[0];
  const iRes = await sql.query<{ id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number }>(`SELECT id, product_id, sku, name, qty, unit_price_cents, line_total_cents FROM order_items WHERE order_id=$1 ORDER BY name`, [id]);
  return {
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    created_at: row.created_at,
    subtotal_cents: row.subtotal_cents,
    tax_cents: row.tax_cents,
    total_cents: row.total_cents,
    currency: row.currency,
    customer: { email: row.customer_email, name: row.customer_name },
    items: iRes.rows,
  };
}

export async function logAudit(params: { actorId?: string | null; action: string; productId?: string | null; before?: unknown; after?: unknown; ip?: string | null; userAgent?: string | null; }) {
  const { actorId, action, productId, before, after, ip, userAgent } = params;
  const id = crypto.randomUUID();
  await sql`INSERT INTO audit_logs (id, actor_id, action, product_id, before, after, ip, user_agent)
    VALUES (${id}, ${actorId ?? null}, ${action}, ${productId ?? null}, ${before ? JSON.stringify(before) : null}, ${after ? JSON.stringify(after) : null}, ${ip ?? null}, ${userAgent ?? null});`;
}

export async function getDashboardSummary() {
  await ensureSchema();
  // Active orders: exclude Canceled and Refunded
  const activeRes = await sql<{ count: number }>`SELECT COUNT(*)::int AS count FROM orders WHERE status NOT IN ('Canceled','Refunded')`;
  // Low stock: stock <= low_stock_threshold when threshold is set (>0)
  const lowStockRes = await sql<{ count: number }>`SELECT COUNT(*)::int AS count FROM products WHERE COALESCE(low_stock_threshold,0) > 0 AND stock <= low_stock_threshold`;
  // Customers total
  const customersRes = await sql<{ count: number }>`SELECT COUNT(*)::int AS count FROM customers`;
  // Revenue last 30 days: sum of total_cents for fulfilled orders
  const revenueRes = await sql<{ sum: number }>`SELECT COALESCE(SUM(total_cents),0)::int AS sum FROM orders WHERE status IN ('Fulfilled','Ready for Pickup') AND created_at >= now() - interval '30 days'`;
  return {
    activeOrders: activeRes.rows[0].count,
    lowStockAlerts: lowStockRes.rows[0].count,
    customers: customersRes.rows[0].count,
    revenueCents30d: revenueRes.rows[0].sum,
  };
}
