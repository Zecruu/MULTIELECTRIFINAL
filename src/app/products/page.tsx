"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function ProductsPageContent() {
  const { lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Load URL parameters on mount
  useEffect(() => {
    const filters = searchParams.get("categories");
    if (filters) {
      setSelectedCategories(filters.split(","));
    }
  }, [searchParams]);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function toggleCategoryFilter(category: string) {
    const newFilters = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(newFilters);

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.length > 0) {
      params.set("categories", newFilters.join(","));
    } else {
      params.delete("categories");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function clearCategoryFilters() {
    setSelectedCategories([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("categories");
    router.push(`?${params.toString()}`, { scroll: false });
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

  // Apply filters
  const filteredProducts = products.filter(p => {
    // Main category filter (from category buttons)
    if (categoryFilter !== "all" && p.category !== categoryFilter) {
      return false;
    }

    // Additional category filters (from filter modal)
    if (selectedCategories.length > 0) {
      // Product must match one of the selected categories
      if (!selectedCategories.includes(p.category)) {
        return false;
      }
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold" style={{ color: "var(--gold)" }}>
            {lang === "en" ? "Products" : "Productos"}
          </h1>

          {/* Filter Icon with Badge */}
          {categories.length > 1 && (
            <button
              onClick={() => setShowFilterModal(!showFilterModal)}
              className="relative p-2 rounded-md bg-neutral-800 hover:bg-neutral-700 transition"
              aria-label="Filter products"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-300"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {selectedCategories.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[--gold] text-neutral-950 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {selectedCategories.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Filter Modal/Dropdown */}
        {showFilterModal && categories.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setShowFilterModal(false)}
            />

            {/* Modal Content */}
            <div className="relative bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[--gold]">
                  {lang === "en" ? "Filter Products" : "Filtrar Productos"}
                </h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {categories.map((category) => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <label
                      key={category}
                      className="flex items-center gap-3 p-3 rounded-md bg-neutral-800/50 hover:bg-neutral-800 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCategoryFilter(category)}
                        className="h-4 w-4 rounded border-neutral-600 bg-neutral-700 text-[--gold] focus:ring-[--gold] focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-200">{category}</span>
                    </label>
                  );
                })}
              </div>

              {selectedCategories.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => {
                      clearCategoryFilters();
                      setShowFilterModal(false);
                    }}
                    className="w-full px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm text-[--gold] transition"
                  >
                    {lang === "en" ? "Clear All Filters" : "Limpiar Todos los Filtros"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            {lang === "en" ? "Category" : "Categoría"}
          </h3>
          <div className="flex gap-2 flex-wrap">
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
                    className="h-48 rounded-md mb-4 flex items-center justify-center bg-neutral-800/60 overflow-hidden cursor-pointer relative"
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
                      className="group flex-1 rounded-md bg-neutral-800 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      title={lang === "en" ? "Add to Cart" : "Agregar al Carrito"}
                    >
                      <svg className="w-5 h-5 group-hover:stroke-[--gold] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <svg className="w-4 h-4 group-hover:stroke-[--gold] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="rounded-md bg-neutral-800 text-gray-300 px-4 py-2 text-sm font-medium hover:bg-neutral-700 transition flex items-center justify-center"
                      title={lang === "en" ? "More Info" : "Más Info"}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-neutral-950 text-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </main>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}

