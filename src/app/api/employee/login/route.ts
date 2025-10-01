import { NextRequest } from "next/server";
import { Me, permsForRole, signToken } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({ email: "", password: "" }));
  if (!email || !password) return Response.json({ error: "Missing credentials" }, { status: 400 });

  // Ensure schema exists
  await ensureSchema();

  // Default admin user (overridable by env vars)
  const adminEmail = process.env.EMPLOYEE_DEFAULT_ADMIN_EMAIL || "admin@multielectric.com";
  const adminPassword = process.env.EMPLOYEE_DEFAULT_ADMIN_PASSWORD || "Admin123!";

  let role: "admin" | "employee" = "employee";
  let userId: string;
  let userName: string;

  if (email === adminEmail && password === adminPassword) {
    role = "admin";
    userName = "Admin";

    // Check if admin exists in database, if not create it
    const existingAdmin = await sql.query(
      `SELECT id FROM employees WHERE email = $1`,
      [email]
    );

    if (existingAdmin.rows.length === 0) {
      // Create admin user in database
      const result = await sql.query(
        `INSERT INTO employees (id, name, email, role, password, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
        RETURNING id`,
        [userName, email, role, password] // In production, hash the password
      );
      userId = result.rows[0].id;
      console.log("[Login] Created admin user in database:", userId);
    } else {
      userId = existingAdmin.rows[0].id;
    }
  } else {
    // Check if employee exists in database
    const employeeRes = await sql.query<{ id: string; name: string; role: string; password: string }>(
      `SELECT id, name, role, password FROM employees WHERE email = $1`,
      [email]
    );

    if (employeeRes.rows.length === 0) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const employee = employeeRes.rows[0];

    // Simple password check (in production, use bcrypt)
    if (employee.password !== password) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    userId = employee.id;
    userName = employee.name;
    role = employee.role as "admin" | "employee";
  }

  const me: Me = {
    id: userId,
    name: userName,
    email,
    role,
    permissions: permsForRole(role),
  } as const;

  const secret = process.env.JWT_SECRET || "dev-secret-change";
  const token = await signToken(me, secret);

  return new Response(JSON.stringify({ me }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": `employee_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 8}`,
    },
  });
}

