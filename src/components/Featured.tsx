"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Product = {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  featured: boolean;
  hot: boolean;
  images: Array<{ url: string; alt?: string | null; primary?: boolean }>;
  slug: string | null;
};

export default function Featured() {
  const { dict, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/store/products");
        const data = await res.json();
        // Show featured products first, limit to 8
        const featured = (data.products || []).filter((p: Product) => p.featured).slice(0, 8);
        const nonFeatured = (data.products || []).filter((p: Product) => !p.featured).slice(0, 8 - featured.length);
        setProducts([...featured, ...nonFeatured].slice(0, 8));
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section id="featured" className="bg-neutral-950 text-gray-100 border-t border-neutral-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl font-semibold">{dict.featured.title}</h2>
          <Link href="/products" className="text-sm font-medium text-gray-300 hover:text-white">
            {dict.featured.viewAll}
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 text-center text-gray-400">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="mt-8 text-center text-gray-400">No products available</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => {
              const primaryImage = product.images.find(img => img.primary) || product.images[0];
              const name = lang === "en" ? product.name_en : product.name_es;
              
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug || product.id}`}
                  className="group rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 hover:border-[--gold] transition cursor-pointer"
                >
                  <div className="h-36 rounded-md mb-3 flex items-center justify-center bg-neutral-800/60 overflow-hidden">
                    {primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={primaryImage.url} 
                        alt={primaryImage.alt || name} 
                        className="max-h-full max-w-full object-contain opacity-90 group-hover:opacity-100 transition"
                      />
                    ) : (
                      <div className="text-xs text-neutral-400">No image</div>
                    )}
                  </div>
                  <div className="text-sm font-medium group-hover:text-white text-gray-300 line-clamp-2 mb-2">
                    {name}
                  </div>
                  <div className="text-lg font-semibold" style={{ color: "var(--gold)" }}>
                    ${product.price.toFixed(2)}
                  </div>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <div className="text-xs text-gray-500 line-through">
                      ${product.compare_at_price.toFixed(2)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

