"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { addToCart } from "@/lib/cart";
import ProductDetailModal from "@/components/ProductDetailModal";

type Product = {
  id: string;
  sku: string;
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  function handleAddToCart(product: Product, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const primaryImage = product.images.find(img => img.primary) || product.images[0];
    addToCart({
      productId: product.id,
      name_en: product.name_en,
      name_es: product.name_es,
      price: product.price,
      image: primaryImage?.url,
    }, 1);

    showToast(lang === "en" ? "Added to cart!" : "¡Agregado al carrito!");
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function handleShowInfo(product: Product, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProduct(product);
  }

  return (
    <>
      <section id="featured" className="bg-neutral-950 text-gray-100 border-t border-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-end justify-between gap-4 mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold">{dict.featured.title}</h2>
          </div>

          {loading ? (
            <div className="text-center text-gray-400">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-400">No products available</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((product) => {
                const primaryImage = product.images.find(img => img.primary) || product.images[0];
                const name = lang === "en" ? product.name_en : product.name_es;

                return (
                  <div
                    key={product.id}
                    className="group rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 hover:border-[--gold] transition flex flex-col"
                  >
                    {/* Product Image */}
                    <div
                      className="h-36 rounded-md mb-3 flex items-center justify-center bg-neutral-800/60 overflow-hidden cursor-pointer relative"
                      onClick={(e) => handleShowInfo(product, e)}
                    >
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={primaryImage.alt || name}
                          width={144}
                          height={144}
                          className="max-h-full max-w-full object-contain opacity-90 group-hover:opacity-100 transition"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-xs text-neutral-400">No image</div>
                      )}
                      {product.stock === 0 && (
                        <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-red-600 text-white font-semibold">
                          {lang === "en" ? "Out of Stock" : "Agotado"}
                        </span>
                      )}
                      {product.stock > 0 && product.stock <= 5 && (
                        <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-yellow-500 text-black font-semibold">
                          {lang === "en" ? "Low Stock" : "Poco Stock"}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="text-sm font-medium group-hover:text-white text-gray-300 line-clamp-2 mb-2 flex-1">
                      {name}
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                      <div className="text-lg font-semibold" style={{ color: "var(--gold)" }}>
                        ${product.price.toFixed(2)}
                      </div>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <div className="text-xs text-gray-500 line-through">
                          ${product.compare_at_price.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={product.stock === 0}
                        className="group flex-1 rounded-md bg-neutral-800 text-white px-3 py-2 text-sm font-medium hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        title={lang === "en" ? "Add to Cart" : "Agregar al Carrito"}
                      >
                        <svg className="w-4 h-4 group-hover:stroke-[--gold] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <svg className="w-3 h-3 group-hover:stroke-[--gold] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleShowInfo(product, e)}
                        className="rounded-md bg-neutral-800 text-gray-300 px-3 py-2 text-sm font-medium hover:bg-neutral-700 transition"
                        title={lang === "en" ? "More Info" : "Más Info"}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(p) => handleAddToCart(p, {} as React.MouseEvent)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </>
  );
}

