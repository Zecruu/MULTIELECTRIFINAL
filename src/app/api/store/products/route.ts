
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const res = await sql<{ id: string; name: string; price_cents: number; image_url: string | null; stock: number }>`
      SELECT id, name, price_cents, image_url, stock
      FROM products
      WHERE stock > 0
      ORDER BY name ASC
      LIMIT 500`;
    const products = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price_cents / 100,
      imageUrl: r.image_url || null,
      stock: r.stock,
    }));
    return Response.json({ products });
  } catch (err) {
    console.error("[Store] products query failed:", err);
    // Return 200 with empty list so the UI renders gracefully
    return Response.json({ products: [], error: "Store database unavailable" });
  }
}

