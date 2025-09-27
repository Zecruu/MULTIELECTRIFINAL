import { sql } from "@vercel/postgres";

export type DbOrderStatus = "Pending" | "Processing" | "Ready for Pickup" | "Fulfilled" | "Canceled";

export interface DbProduct { id: string; sku: string; name: string; description?: string; price_cents: number; currency: string; image_url?: string | null; stock: number; }
export interface DbCustomer { id: string; email: string; name?: string | null; phone?: string | null; address_json?: Record<string, unknown> | null; }
export interface DbOrder { id: string; order_number: string; customer_id: string; status: DbOrderStatus; subtotal_cents: number; tax_cents: number; total_cents: number; currency: string; payment_intent_id?: string | null; stripe_session_id?: string | null; created_at: string; }
export interface DbOrderItem { id: string; order_id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number; }

// Helpers
export async function ensureSchema() {
  // Safe idempotent DDL for local dev; in production use migrations
  await sql`CREATE TABLE IF NOT EXISTS products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text UNIQUE NOT NULL, name text NOT NULL, description text, price_cents integer NOT NULL, currency text NOT NULL DEFAULT 'usd', image_url text, stock integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());`;
  await sql`CREATE TABLE IF NOT EXISTS customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, name text, phone text, address_json jsonb, created_at timestamptz NOT NULL DEFAULT now());`;
  await sql`CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number text UNIQUE NOT NULL, customer_id uuid REFERENCES customers(id), status text NOT NULL, subtotal_cents integer NOT NULL, tax_cents integer NOT NULL, total_cents integer NOT NULL, currency text NOT NULL DEFAULT 'usd', payment_intent_id text, stripe_session_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());`;
  await sql`CREATE TABLE IF NOT EXISTS order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid REFERENCES orders(id) ON DELETE CASCADE, product_id uuid REFERENCES products(id), sku text NOT NULL, name text NOT NULL, qty integer NOT NULL, unit_price_cents integer NOT NULL, line_total_cents integer NOT NULL);`;
  await sql`CREATE TABLE IF NOT EXISTS order_sequences (year integer PRIMARY KEY, seq integer NOT NULL);`;
}

export async function upsertCustomer(email: string, name?: string | null, phone?: string | null, address_json?: Record<string, unknown> | null) {
  const res = await sql<{ id: string }>`INSERT INTO customers (email, name, phone, address_json)
    VALUES (${email}, ${name ?? null}, ${phone ?? null}, ${address_json ? JSON.stringify(address_json) : null})
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

  const orderRes = await sql<{ id: string }>`INSERT INTO orders (order_number, customer_id, status, subtotal_cents, tax_cents, total_cents, currency, payment_intent_id, stripe_session_id)
    VALUES (${order_number}, ${customer_id}, ${'Pending'}, ${params.totals.subtotal_cents}, ${params.totals.tax_cents}, ${params.totals.total_cents}, ${params.totals.currency}, ${params.stripe.payment_intent_id ?? null}, ${params.stripe.session_id ?? null})
    RETURNING id;`;
  const order_id = orderRes.rows[0].id;

  for (const li of params.lineItems) {
    const p = li.product;
    await sql`INSERT INTO order_items (order_id, product_id, sku, name, qty, unit_price_cents, line_total_cents)
      VALUES (${order_id}, ${p.id}, ${p.sku}, ${p.name}, ${li.qty}, ${p.price_cents}, ${p.price_cents * li.qty});`;
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

