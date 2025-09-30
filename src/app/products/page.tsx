"use client";

import { useEffect, useState } from "react";
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

export default function ProductsPage() {
  const { lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/store/products");
      const data = await res.json();
      setProducts(data.products || []);
      
      // Extract unique categories
      const cats = Array.from(new Set((data.products || []).map((p: Product) => p.category)));
      setCategories(cats as string[]);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }



  function handleAddToCart(product: Product) {
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

  const filteredProducts = categoryFilter === "all" 
    ? products 
    : products.filter(p => p.category === categoryFilter);

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold" style={{ color: "var(--gold)" }}>
            {lang === "en" ? "Products" : "Productos"}
          </h1>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-4 py-2 rounded-md text-sm transition ${
              categoryFilter === "all"
                ? "bg-[--gold] text-white"
                : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
            }`}
          >
            {lang === "en" ? "All" : "Todos"}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-md text-sm transition ${
                categoryFilter === cat
                  ? "bg-[--gold] text-white"
                  : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            {lang === "en" ? "Loading products..." : "Cargando productos..."}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            {lang === "en" ? "No products available" : "No hay productos disponibles"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const primaryImage = product.images.find(img => img.primary) || product.images[0];
              const name = lang === "en" ? product.name_en : product.name_es;
              const description = lang === "en" ? product.description_en : product.description_es;
              
              return (
                <div
                  key={product.id}
                  className="group rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 hover:border-[--gold] transition flex flex-col"
                >
                  {/* Product Image */}
                  <div 
                    className="h-48 rounded-md mb-4 flex items-center justify-center bg-neutral-800/60 overflow-hidden cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
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

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-gray-200 line-clamp-2 mb-2">
                      {name}
                    </h3>
                    {description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {description}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <div className="text-xl font-semibold" style={{ color: "var(--gold)" }}>
                      ${product.price.toFixed(2)}
                    </div>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <div className="text-sm text-gray-500 line-through">
                        ${product.compare_at_price.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="text-xs text-gray-400 mb-3">
                    {product.stock > 10 
                      ? (lang === "en" ? "In Stock" : "En Stock")
                      : product.stock > 0
                      ? (lang === "en" ? `Only ${product.stock} left` : `Solo ${product.stock} disponibles`)
                      : (lang === "en" ? "Out of Stock" : "Agotado")
                    }
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 rounded-md bg-[--gold] text-white px-4 py-2 text-sm font-medium hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {lang === "en" ? "Add to Cart" : "Agregar"}
                    </button>
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="rounded-md bg-neutral-800 text-gray-300 px-4 py-2 text-sm font-medium hover:bg-neutral-700 transition"
                    >
                      {lang === "en" ? "Info" : "Info"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-md shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </main>
  );
}

