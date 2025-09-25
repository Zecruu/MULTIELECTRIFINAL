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
  stock: string; // string for input control
  status?: string;
  featured?: boolean;
  images?: string[];
};

export default function ProductModal({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial?: Partial<ProductInput>; onSaved: () => void; }) {
  const [v, setV] = useState<ProductInput>({ name_en:"", name_es:"", description_en:"", description_es:"", category:"", price:"", stock:"", featured:false, images:[] });
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

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    type FieldName = keyof ProductInput;
    const name = target.name as FieldName;
    const val = target instanceof HTMLInputElement && target.type === "checkbox" ? (target.checked as unknown as ProductInput[FieldName]) : (target.value as unknown as ProductInput[FieldName]);
    setV(p => ({ ...p, [name]: val }));
  }

  async function upload(file: File) {
    const presign = await fetch("/api/uploads/presign", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ filename: file.name, contentType: file.type }) });
    if (!presign.ok) throw new Error("presign failed");
    const { url, fields, publicUrl } = await presign.json();
    const fd = new FormData();
    Object.entries(fields).forEach(([k, val]) => fd.append(k, val as string));
    fd.append("file", file);
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) throw new Error("upload failed");
    return publicUrl as string;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const uploaded: string[] = [];
      for (const f of files) uploaded.push(await upload(f));
      const payload = {
        ...v,
        price: Number(v.price || 0),
        stock: Number(v.stock || 0),
        images: [...(v.images || []), ...uploaded],
      };
      const method = v.id ? "PATCH" : "POST";
      const res = await fetch("/api/products" + (v.id ? `?id=${v.id}` : ""), { method, headers: {"content-type":"application/json"}, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("save failed");
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
      <form onSubmit={onSubmit} className="space-y-3">
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
            <label className="block text-sm mb-1">Category</label>
            <input list="categoryOptions" name="category" value={v.category} onChange={onChange} className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
            <datalist id="categoryOptions">
              {categories.map((c)=> <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Price</label>
            <input name="price" value={v.price} onChange={onChange} inputMode="decimal" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input name="stock" value={v.stock} onChange={onChange} inputMode="numeric" className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2" />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input id="featured" name="featured" type="checkbox" checked={!!v.featured} onChange={onChange} className="h-4 w-4" />
            <label htmlFor="featured" className="text-sm">Featured</label>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-2">Images</label>
          <input type="file" accept="image/*" multiple onChange={(e)=>setFiles(Array.from(e.target.files||[]))} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700">Cancel</button>
          <button disabled={saving} className="rounded-md px-3 py-2 text-sm font-semibold bg-[--gold] text-black hover:brightness-95 disabled:opacity-60">{saving?"Saving...":"Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

