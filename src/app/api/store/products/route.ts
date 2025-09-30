import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DBProductRow = {
  id: string;
  sku: string | null;
  name_en: string | null;
  name_es: string | null;
  description_en: string | null;
  description_es: string | null;
  category: string | null;
  price_cents: number | null;
  compare_at_cents: number | null;
  stock: number | null;
  status: string | null;
  featured: boolean | null;
  hot: boolean | null;
  visible: boolean | null;
  images: Array<{ url: string; alt?: string | null; primary?: boolean }> | null;
  slug: string | null;
};

export async function GET() {
  try {
    await ensureSchema();
    const res = await sql.query<DBProductRow>(`
      SELECT id, sku, name_en, name_es, description_en, description_es, category,
             price_cents, compare_at_cents, stock, status, featured, hot, visible, images, slug
      FROM products
      WHERE status = 'active' AND visible = true AND stock > 0
      ORDER BY featured DESC, name_en ASC
      LIMIT 500
    `);

    const products = res.rows.map((r) => ({
      id: r.id,
      sku: r.sku || "",
      name_en: r.name_en || "",
      name_es: r.name_es || "",
      description_en: r.description_en || "",
      description_es: r.description_es || "",
      category: r.category || "General",
      price: (r.price_cents || 0) / 100,
      compare_at_price: r.compare_at_cents ? r.compare_at_cents / 100 : null,
      stock: r.stock || 0,
      featured: r.featured || false,
      hot: r.hot || false,
      images: Array.isArray(r.images) ? r.images : [],
      slug: r.slug || null,
    }));

    return Response.json({ products });
  } catch (err) {
    console.error("[Store] products query failed:", err);
    // Return 200 with empty list so the UI renders gracefully
    return Response.json({ products: [], error: "Store database unavailable" });
  }
}
