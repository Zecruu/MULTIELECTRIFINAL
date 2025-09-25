import { NextRequest } from "next/server";
import { Me, permsForRole, signToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({ email: "", password: "" }));
  if (!email || !password) return Response.json({ error: "Missing credentials" }, { status: 400 });

  // Temporary: simple role assignment for scaffold
  // - admin@multielectric.com -> admin
  // - otherwise -> employee
  const role = email.startsWith("admin@") ? "admin" : "employee";
  const me: Me = {
    id: "u-" + Math.random().toString(36).slice(2),
    name: email.split("@")[0],
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

