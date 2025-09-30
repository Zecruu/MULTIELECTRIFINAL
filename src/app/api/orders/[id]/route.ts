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
  const oRes = await sql<{ id: string; order_number: string; status: string; created_at: string; subtotal_cents: number; tax_cents: number; total_cents: number; currency: string; shipping_address: string }>`
    SELECT id, order_number, status, created_at, subtotal_cents, tax_cents, total_cents, currency, shipping_address FROM orders WHERE id=${id} LIMIT 1`;
  if (oRes.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  const iRes = await sql<{ id: string; product_id: string; sku: string; name: string; qty: number; unit_price_cents: number; line_total_cents: number }>`
    SELECT id, product_id, sku, name, qty, unit_price_cents, line_total_cents FROM order_items WHERE order_id=${id} ORDER BY name`;

  // Fetch product details including images
  const productIds = iRes.rows.map(i => i.product_id);
  const products: Map<string, { image_url: string | null; images: unknown }> = new Map();

  if (productIds.length > 0) {
    const pRes = await sql.query<{ id: string; image_url: string | null; images: unknown }>(
      `SELECT id, image_url, images FROM products WHERE id = ANY($1)`,
      [productIds]
    );
    pRes.rows.forEach(p => products.set(p.id, p));
  }

  const order = oRes.rows[0];
  return Response.json({
    order: {
      ...order,
      items: iRes.rows.map(i => {
        const product = products.get(i.product_id);
        const images = product?.images ? (Array.isArray(product.images) ? product.images : []) : [];
        const imageUrl = images.length > 0 ? images[0] : product?.image_url;

        return {
          product_id: i.product_id,
          product_name: i.name,
          quantity: i.qty,
          price_cents: i.unit_price_cents,
          image_url: imageUrl,
        };
      }),
    },
  });
}

