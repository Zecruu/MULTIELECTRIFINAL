import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { getDb } from "@/lib/mongo";

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
  try {
    console.log("Users API: Starting request");

    const me = await requireAdmin(req);
    console.log("Users API: Auth check complete", me ? "authenticated" : "not authenticated");

    if (!me) {
      console.log("Users API: Unauthorized - no admin user");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Users API: Fetching employees from PostgreSQL");
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
    console.log("Users API: Found", employeesRes.rows.length, "employees");

    // Skip MongoDB customers for now to isolate the issue
    console.log("Users API: Skipping MongoDB customers (temporarily disabled)");

    // Format employees only
    const users = employeesRes.rows.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      role: e.role as "employee" | "admin",
      status: "active" as const,
      created_at: e.created_at,
    }));

    console.log("Users API: Returning", users.length, "users");
    return Response.json({ users });
  } catch (err) {
    console.error("Users API error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error("Users API error details:", { message: errorMessage, stack: errorStack });
    return Response.json({
      error: "Server error",
      message: errorMessage,
      stack: errorStack?.split('\n').slice(0, 5).join('\n')
    }, { status: 500 });
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
    const { id, name, email, role } = body;

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

