import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import type { Me } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

type Product = {
  id: string;
  sku: string;
  name_en: string;
  name_es: string;
  description_en?: string;
  description_es?: string;
  category: string;
  price: number;
  stock: number;
  status: "Active" | "Out of Stock";
  featured?: boolean;
  images?: string[];
  updatedAt: string;
};

let PRODUCTS: Product[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `P${1000 + i}`,
  sku: `SKU-${1000 + i}`,
  name_en: `Product ${i + 1}`,
  name_es: `Producto ${i + 1}`,
  description_en: "",
  description_es: "",
  category: i % 2 === 0 ? "Cables" : "Lighting",
  price: 10 + i * 1.5,
  stock: 50 - i * 2,
  status: i % 5 === 0 ? "Out of Stock" : "Active",
  featured: false,
  images: [],
  updatedAt: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
}));

const CreateSchema = z.object({
  name_en: z.string().min(1),
  name_es: z.string().min(1),
  description_en: z.string().optional(),
  description_es: z.string().optional(),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  featured: z.boolean().optional(),
  images: z.array(z.string().url()).optional(),
});

const UpdateSchema = CreateSchema.partial();

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ products: PRODUCTS });
}

export async function POST(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const id = "P" + (1000 + PRODUCTS.length + 1);
  const sku = "SKU-" + (1000 + PRODUCTS.length + 1);
  const now = new Date().toISOString().slice(0, 10);
  const prod: Product = { id, sku, ...parsed.data, status: parsed.data.stock === 0 ? "Out of Stock" : "Active", updatedAt: now };
  PRODUCTS.push(prod);
  console.log("AUDIT", { action: "PRODUCT_CREATE", by: me.id, id });
  return Response.json({ product: prod });
}

export async function PATCH(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const idx = PRODUCTS.findIndex(p => p.id === id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
  const updated: Product = { ...PRODUCTS[idx], ...parsed.data, status: (parsed.data.stock ?? PRODUCTS[idx].stock) === 0 ? "Out of Stock" : "Active", updatedAt: new Date().toISOString().slice(0, 10) };
  PRODUCTS[idx] = updated;
  console.log("AUDIT", { action: "PRODUCT_UPDATE", by: me.id, id });
  return Response.json({ product: updated });
}

export async function DELETE(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me?.permissions.canManageInventory) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const before = PRODUCTS.length;
  PRODUCTS = PRODUCTS.filter(p => p.id !== id);
  const deleted = before !== PRODUCTS.length;
  console.log("AUDIT", { action: "PRODUCT_DELETE", by: me.id, id });
  return Response.json({ ok: deleted });
}

