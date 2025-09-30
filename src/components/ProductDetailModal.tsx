"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import Modal from "@/components/ui/Modal";

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

type Props = {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
};

export default function ProductDetailModal({ product, onClose, onAddToCart }: Props) {
  const { lang } = useI18n();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const name = lang === "en" ? product.name_en : product.name_es;
  const description = lang === "en" ? product.description_en : product.description_es;
  const currentImage = product.images[selectedImageIndex];

  return (
    <Modal open={true} onClose={onClose} title={name}>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Images Section */}
        <div>
          {/* Main Image */}
          <div className="h-80 rounded-lg bg-neutral-800/60 flex items-center justify-center mb-4 overflow-hidden">
            {currentImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={currentImage.url} 
                alt={currentImage.alt || name} 
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-neutral-400">No image</div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-20 rounded-md bg-neutral-800/60 flex items-center justify-center overflow-hidden border-2 transition ${
                    idx === selectedImageIndex 
                      ? "border-[--gold]" 
                      : "border-transparent hover:border-neutral-600"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={img.url} 
                    alt={img.alt || `${name} ${idx + 1}`} 
                    className="max-h-full max-w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Section */}
        <div className="flex flex-col">
          {/* SKU */}
          <div className="text-xs text-gray-500 mb-2">SKU: {product.sku}</div>

          {/* Category */}
          <div className="text-sm text-gray-400 mb-4">
            {lang === "en" ? "Category" : "Categoría"}: {product.category}
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="text-3xl font-semibold" style={{ color: "var(--gold)" }}>
              ${product.price.toFixed(2)}
            </div>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <div className="text-lg text-gray-500 line-through">
                ${product.compare_at_price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {product.stock > 10 ? (
              <div className="text-green-500 text-sm font-medium">
                ✓ {lang === "en" ? "In Stock" : "En Stock"}
              </div>
            ) : product.stock > 0 ? (
              <div className="text-yellow-500 text-sm font-medium">
                ⚠ {lang === "en" ? `Only ${product.stock} left` : `Solo ${product.stock} disponibles`}
              </div>
            ) : (
              <div className="text-red-500 text-sm font-medium">
                ✗ {lang === "en" ? "Out of Stock" : "Agotado"}
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                {lang === "en" ? "Description" : "Descripción"}
              </h3>
              <p className="text-sm text-gray-400 whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}

          {/* Badges */}
          <div className="flex gap-2 mb-6">
            {product.featured && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[--gold] text-white">
                {lang === "en" ? "Featured" : "Destacado"}
              </span>
            )}
            {product.hot && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                {lang === "en" ? "Hot" : "Popular"}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
            disabled={product.stock === 0}
            className="w-full rounded-md bg-[--gold] text-white px-6 py-3 text-base font-semibold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {product.stock === 0 
              ? (lang === "en" ? "Out of Stock" : "Agotado")
              : (lang === "en" ? "Add to Cart" : "Agregar al Carrito")
            }
          </button>
        </div>
      </div>
    </Modal>
  );
}

