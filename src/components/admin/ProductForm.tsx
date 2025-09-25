"use client";

import { useState } from "react";

// Minimal runtime validation without external deps (we can swap to Zod when approved)
type ProductFormValues = {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  price: string; // keep as string for controlled input
  stock: string; // keep as string for controlled input
  category: string;
  featured: boolean;
};

function validate(values: ProductFormValues) {
  const errors: Record<string, string> = {};
  if (!values.name_en?.trim()) errors.name_en = "Required";
  if (!values.name_es?.trim()) errors.name_es = "Requerido";
  if (!values.price || Number.isNaN(Number(values.price))) errors.price = "Invalid price";
  if (!values.stock || Number.isNaN(Number(values.stock))) errors.stock = "Invalid stock";
  return errors;
}

export default function ProductForm() {
  const [values, setValues] = useState<ProductFormValues>({
    name_en: "",
    name_es: "",
    description_en: "",
    description_es: "",
    price: "",
    stock: "",
    category: "",
    featured: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setValues((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setUploading(true);
      const uploaded: string[] = [];
      for (const file of images) {
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        if (!presignRes.ok) throw new Error("Presign failed");
        const { url, fields, publicUrl } = await presignRes.json();

        const formData = new FormData();
        Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
        formData.append("file", file);

        const s3Res = await fetch(url, { method: "POST", body: formData });
        if (!s3Res.ok) throw new Error("S3 upload failed");

        uploaded.push(publicUrl);
      }
      setUploadedUrls(uploaded);
      setSubmitted(`Saved (${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded)`);
    } catch (err) {
      console.error(err);
      setSubmitted("Error saving");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold mb-4">Create Product</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Name (EN)</label>
          <input name="name_en" value={values.name_en} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          {errors.name_en && <p className="text-xs text-red-400 mt-1">{errors.name_en}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Nombre (ES)</label>
          <input name="name_es" value={values.name_es} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          {errors.name_es && <p className="text-xs text-red-400 mt-1">{errors.name_es}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Description (EN)</label>
          <textarea name="description_en" value={values.description_en} onChange={onChange} className="min-h-[90px] w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Descripción (ES)</label>
          <textarea name="description_es" value={values.description_es} onChange={onChange} className="min-h-[90px] w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Price</label>
          <input name="price" value={values.price} onChange={onChange} inputMode="decimal" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Stock</label>
          <input name="stock" value={values.stock} onChange={onChange} inputMode="numeric" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          {errors.stock && <p className="text-xs text-red-400 mt-1">{errors.stock}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Category</label>
          <input name="category" value={values.category} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input id="featured" name="featured" type="checkbox" checked={values.featured} onChange={onChange} className="h-4 w-4" />
          <label htmlFor="featured" className="text-sm">Featured</label>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm mb-2">Images</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files || []))}
          className="block w-full text-sm"
        />
        {images.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">{images.length} file(s) selected</p>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          disabled={uploading}
          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold bg-[--gold] text-black hover:brightness-95 disabled:opacity-60"
        >
          {uploading ? "Saving..." : "Save product"}
        </button>
        {submitted && <span className="text-sm text-gray-400">{submitted}</span>}
      </div>

      {uploadedUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {uploadedUrls.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="uploaded" className="h-24 w-full object-cover rounded" />
            </a>
          ))}
        </div>
      )}
    </form>
  );
}

