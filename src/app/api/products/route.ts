import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const PRODUCTS = Array.from({ length: 12 }).map((_, i) => ({
  id: `P${1000 + i}`,
  sku: `SKU-${1000 + i}`,
  name_en: `Product ${i + 1}`,
  name_es: `Producto ${i + 1}`,
  category: i % 2 === 0 ? "Cables" : "Lighting",
  price: 10 + i * 1.5,
  stock: 50 - i * 2,
  status: i % 5 === 0 ? "Out of Stock" : "Active",
  updatedAt: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
}));

import type { Me } from "@/lib/auth";
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

