import { NextRequest } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyToken } from "@/lib/auth";
import type { Me } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try {
    const me = await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change");
    return me;
  } catch {
    return null;
  }
}

// GET - List all filter categories
export async function GET(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
    
    await ensureSchema();
    
    const res = await sql.query<{ id: string; name: string; created_at: string }>(
      `SELECT id, name, created_at FROM filter_categories ORDER BY name ASC`
    );
    
    return Response.json({ categories: res.rows });
  } catch (err) {
    console.error("filter-categories.GET error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Create a new filter category
export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    
    await ensureSchema();
    
    const body = await req.json();
    const { name } = body;
    
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    
    const trimmedName = name.trim();
    
    // Check if category already exists
    const existing = await sql.query<{ id: string }>(
      `SELECT id FROM filter_categories WHERE LOWER(name) = LOWER($1)`,
      [trimmedName]
    );
    
    if (existing.rows.length > 0) {
      return Response.json({ error: "Category already exists" }, { status: 400 });
    }
    
    const id = crypto.randomUUID();
    await sql.query(
      `INSERT INTO filter_categories (id, name) VALUES ($1, $2)`,
      [id, trimmedName]
    );
    
    const created = await sql.query<{ id: string; name: string; created_at: string }>(
      `SELECT id, name, created_at FROM filter_categories WHERE id = $1`,
      [id]
    );
    
    return Response.json({ category: created.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("filter-categories.POST error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE - Delete a filter category
export async function DELETE(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    
    await ensureSchema();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return Response.json({ error: "ID is required" }, { status: 400 });
    }
    
    // Remove this category from all products that have it
    await sql.query(
      `UPDATE products 
       SET filter_categories = (
         SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(COALESCE(filter_categories, '[]'::jsonb)) elem
         WHERE elem::text != $1::text
       )
       WHERE filter_categories @> $1::jsonb`,
      [JSON.stringify(id)]
    );
    
    // Delete the category
    const result = await sql.query(
      `DELETE FROM filter_categories WHERE id = $1`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }
    
    return Response.json({ success: true });
  } catch (err) {
    console.error("filter-categories.DELETE error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

