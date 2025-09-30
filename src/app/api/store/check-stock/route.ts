import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

type CartItem = {
  productId: string;
  name_en: string;
  name_es: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as { items: CartItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Get current stock for all products
    const productIds = items.map(item => item.productId);
    const stockRes = await sql.query<{ id: string; stock: number; name: string; status: string }>(
      `SELECT id, stock, name, status FROM products WHERE id = ANY($1)`,
      [productIds]
    );

    const stockMap = new Map(stockRes.rows.map(row => [row.id, row]));
    const issues: Array<{ productId: string; name: string; requested: number; available: number; reason: string }> = [];

    for (const item of items) {
      const product = stockMap.get(item.productId);
      
      if (!product) {
        issues.push({
          productId: item.productId,
          name: item.name_en,
          requested: item.quantity,
          available: 0,
          reason: "Product not found"
        });
      } else if (product.status === "hidden") {
        issues.push({
          productId: item.productId,
          name: item.name_en,
          requested: item.quantity,
          available: 0,
          reason: "Product is no longer available"
        });
      } else if (product.stock < item.quantity) {
        issues.push({
          productId: item.productId,
          name: item.name_en,
          requested: item.quantity,
          available: product.stock,
          reason: product.stock === 0 ? "Out of stock" : "Insufficient stock"
        });
      }
    }

    if (issues.length > 0) {
      return NextResponse.json({
        available: false,
        issues,
        message: `Some items are not available: ${issues.map(i => `${i.name} (${i.reason})`).join(", ")}`
      }, { status: 400 });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error("Stock check error:", error);
    return NextResponse.json(
      { error: "Failed to check stock availability" },
      { status: 500 }
    );
  }
}

