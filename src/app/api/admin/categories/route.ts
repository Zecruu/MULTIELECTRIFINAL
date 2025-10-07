import { NextRequest } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest) {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try {
    const me = await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change");
    return me;
  } catch {
    return null;
  }
}

// GET - List all categories
export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await sql.query<{ id: string; name: string; created_at: string }>(
      `SELECT id, name, created_at FROM categories ORDER BY name ASC`
    );

    return Response.json({ categories: result.rows });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return Response.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST - Create a new category
export async function POST(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me || me.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Category name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check for duplicate (case-insensitive)
    const existing = await sql.query(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER($1)`,
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      return Response.json({ error: "Category already exists" }, { status: 400 });
    }

    const result = await sql.query<{ id: string; name: string; created_at: string }>(
      `INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at`,
      [trimmedName]
    );

    return Response.json({ category: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return Response.json({ error: "Failed to create category" }, { status: 500 });
  }
}

// DELETE - Remove a category
export async function DELETE(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me || me.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Category ID is required" }, { status: 400 });
    }

    // Check if any products use this category
    const productsUsingCategory = await sql.query(
      `SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = $1)`,
      [id]
    );

    const count = parseInt(productsUsingCategory.rows[0]?.count || "0");
    if (count > 0) {
      return Response.json(
        { error: `Cannot delete category. ${count} product(s) are using this category.` },
        { status: 400 }
      );
    }

    await sql.query(`DELETE FROM categories WHERE id = $1`, [id]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return Response.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

