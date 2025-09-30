import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { connectMongo } from "@/lib/mongo";

export const runtime = "nodejs";

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try {
    const me = await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change");
    if (me.role !== "admin") return null;
    return me;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get employees from PostgreSQL
    const employeesRes = await sql.query<{
      id: string;
      name: string;
      email: string;
      role: string;
      created_at: string;
    }>(
      `SELECT id, name, email, role, created_at FROM employees ORDER BY created_at DESC`
    );

    // Get customers from MongoDB
    const { db } = await connectMongo();
    const customersCollection = db.collection("customers");
    const customers = await customersCollection
      .find({})
      .project({ _id: 0, email: 1, name: 1, createdAt: 1 })
      .toArray();

    // Combine and format
    const users = [
      ...employeesRes.rows.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role as "employee" | "admin",
        status: "active" as const,
        created_at: e.created_at,
      })),
      ...customers.map((c) => ({
        id: c.email, // Use email as ID for customers
        name: c.name || null,
        email: c.email,
        role: "customer" as const,
        status: "active" as const,
        created_at: c.createdAt || new Date().toISOString(),
      })),
    ];

    return Response.json({ users });
  } catch (err) {
    console.error("Users API error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, email, role, password } = body;

    if (!name || !email || !role || !password) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Only allow creating employees/admins, not customers
    if (role !== "employee" && role !== "admin") {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    // Hash password (simplified - in production use bcrypt)
    const hashedPassword = password; // TODO: Implement proper password hashing

    // Insert into employees table
    const result = await sql.query(
      `INSERT INTO employees (id, name, email, role, password, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      RETURNING id, name, email, role, created_at`,
      [name, email, role, hashedPassword]
    );

    return Response.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Create user error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, name, email, role, status } = body;

    if (!id) {
      return Response.json({ error: "Missing user ID" }, { status: 400 });
    }

    // Update employee
    await sql.query(
      `UPDATE employees
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          role = COALESCE($3, role)
      WHERE id = $4`,
      [name, email, role, id]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("Update user error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing user ID" }, { status: 400 });
    }

    // Delete employee
    await sql.query(`DELETE FROM employees WHERE id = $1`, [id]);

    return Response.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

