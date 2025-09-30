"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

export type ProductInput = {
  id?: string;
  sku?: string;
  name_en: string;
  name_es: string;
  description_en?: string;
  description_es?: string;
  category: string;
  price: string; // string for input control
  compare_at_price?: string;
  stock: string; // string for input control
  low_stock_threshold?: string;
  status?: "draft" | "active" | "hidden";
  featured?: boolean;
  hot?: boolean;
  visible?: boolean;
  images?: string[];
};

export default function ProductModal({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial?: Partial<ProductInput>; onSaved: () => void; }) {
  const [v, setV] = useState<ProductInput>({ name_en:"", name_es:"", description_en:"", description_es:"", category:"", price:"0", stock:"0", featured:false, visible:true, status:"draft", images:[] });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setV(prev => ({ ...prev, ...(initial ?? {}) } as ProductInput));
      setFiles([]);
      setErr(null);
      fetch("/api/categories").then(r=>r.json()).then(j=>{
        const list = Array.isArray(j.categories) ? j.categories.map((c: {name:string})=>c.name) : [];
        setCategories(list);
      }).catch(()=>setCategories([]));
    }
  }, [open, initial]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    type FieldName = keyof ProductInput;
    const name = target.name as FieldName;
    const val = target instanceof HTMLInputElement && target.type === "checkbox" ? (target.checked as unknown as ProductInput[FieldName]) : (target.value as unknown as ProductInput[FieldName]);
    setV(p => ({ ...p, [name]: val }));
  }

  async function upload(file: File) {
    const presign = await fetch("/api/uploads/sign", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ filename: file.name, contentType: file.type }) });
    if (!presign.ok) {
      const j = await presign.json().catch(()=>({}));
      const msg = (j?.message || j?.error || "presign failed");
      throw new Error(msg);
    }
    const { url, fields, publicUrl } = await presign.json();
    const fd = new FormData();
    Object.entries(fields).forEach(([k, val]) => fd.append(k, val as string));
    fd.append("file", file);
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) throw new Error("upload failed");
    return publicUrl as string;
  }

  async function save(desiredStatus: "draft" | "active") {
    setSaving(true); setErr(null);
    try {
      // Client-side validation
      const reasons: string[] = [];
      if (!v.category?.trim()) reasons.push("Category");

      if (desiredStatus === "active") {
        if (!v.name_en?.trim()) reasons.push("Name (EN)");
        if (!v.name_es?.trim()) reasons.push("Nombre (ES)");
        const totalImages = (v.images?.length || 0) + (files.length || 0);
        if (totalImages < 1) reasons.push("At least 1 image");
      }

      if (reasons.length) throw new Error("Missing required fields: " + reasons.join(", "));

      const uploaded: string[] = [];
      for (const f of files) uploaded.push(await upload(f));

      const payload = {
        ...v,
        status: desiredStatus,
        price: Number(v.price || 0),
        compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : undefined,
        stock: Number(v.stock || 0),
        low_stock_threshold: v.low_stock_threshold ? Number(v.low_stock_threshold) : undefined,
        images: [...(v.images || []), ...uploaded],
      };

      const method = v.id ? "PATCH" : "POST";
      const url = "/api/products" + (v.id ? `?id=${v.id}` : "");
      const res = await fetch(url, { method, headers: {"content-type":"application/json"}, body: JSON.stringify(payload) });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        console.error("Product save error:", res.status, j);
        // Extract detailed validation errors if available
        if (j?.details?.fieldErrors) {
          const fieldErrs = Object.entries(j.details.fieldErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join("; ");
          throw new Error(fieldErrs || j?.message || j?.error || "Validation failed");
        }
        throw new Error(j?.message || j?.error || `Save failed (${res.status})`);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={v.id ? "Edit Product" : "Add Product"}>
      <form onSubmit={(e)=>{ e.preventDefault(); save("draft"); }} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-400">Status: <span className="uppercase">{v.status || "draft"}</span></div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>save("draft")} disabled={saving} className="rounded-md px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60">Save Draft</button>
            <button type="button" onClick={()=>save("active")} disabled={saving} className="btn-gold text-white text-sm disabled:opacity-60">{saving?"Saving...":"Publish"}</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Name (EN)</label>
            <input name="name_en" value={v.name_en} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Nombre (ES)</label>
            <input name="name_es" value={v.name_es} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Description (EN)</label>
            <textarea name="description_en" value={v.description_en} onChange={onChange} className="min-h-[70px] w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Descripcion (ES)</label>
            <textarea name="description_es" value={v.description_es} onChange={onChange} className="min-h-[70px] w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Category <span className="text-red-400">*</span></label>
            <input
              list="categoryOptions"
              name="category"
              value={v.category}
              onChange={onChange}
              placeholder="e.g., Electrical, Lighting, Tools"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2"
            />
            <datalist id="categoryOptions">
              {categories.map((c)=> <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Price</label>
            <input name="price" value={v.price} onChange={onChange} inputMode="decimal" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Compare-at price</label>
            <input name="compare_at_price" value={v.compare_at_price||""} onChange={onChange} inputMode="decimal" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input name="stock" value={v.stock} onChange={onChange} inputMode="numeric" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Low-stock threshold</label>
            <input name="low_stock_threshold" value={v.low_stock_threshold||""} onChange={onChange} inputMode="numeric" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div className="flex items-center gap-3 mt-6">
            <label className="inline-flex items-center gap-2 text-sm"><input id="featured" name="featured" type="checkbox" checked={!!v.featured} onChange={onChange} className="h-4 w-4" /> Featured</label>
            <label className="inline-flex items-center gap-2 text-sm"><input id="hot" name="hot" type="checkbox" checked={!!v.hot} onChange={onChange} className="h-4 w-4" /> Hot</label>
            <label className="inline-flex items-center gap-2 text-sm"><input id="visible" name="visible" type="checkbox" checked={v.visible!==false} onChange={onChange} className="h-4 w-4" /> Visible</label>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2">Images</label>
          <input type="file" accept="image/*" multiple onChange={(e)=>setFiles(Array.from(e.target.files||[]))} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
      </form>
    </Modal>
  );
}

