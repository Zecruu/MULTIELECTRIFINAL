import { MetadataRoute } from "next";
import { sql } from "@vercel/postgres";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://multielectric.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrls: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Fetch all active products
  try {
    const productsRes = await sql.query<{ slug: string; updated_at: string }>(
      `SELECT slug, updated_at FROM products WHERE status = 'active' AND slug IS NOT NULL ORDER BY updated_at DESC`
    );

    const productUrls: MetadataRoute.Sitemap = productsRes.rows.map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...baseUrls, ...productUrls];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return baseUrls;
  }
}

