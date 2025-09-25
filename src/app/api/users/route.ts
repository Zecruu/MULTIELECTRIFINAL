import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import type { Me } from "@/lib/auth";

export const runtime = "nodejs";

type User = { id: string; name: string; email: string; role: "admin" | "employee"; status: "Active" | "Inactive"; lastLogin?: string };

const CreateSchema = z.object({ name: z.string().min(1), email: z.string().email(), role: z.enum(["admin","employee"]).default("employee"), status: z.enum(["Active","Inactive"]).default("Active") });
const UpdateSchema = z.object({ id: z.string().min(1), name: z.string().min(1).optional(), email: z.string().email().optional(), role: z.enum(["admin","employee"]).optional(), status: z.enum(["Active","Inactive"]).optional() });

let USERS: User[] = [
  { id: "U1001", name: "Admin", email: "admin@multielectric.com", role: "admin", status: "Active", lastLogin: new Date().toISOString() },
  { id: "U1002", name: "Employee A", email: "employee@multielectric.com", role: "employee", status: "Active", lastLogin: new Date().toISOString() },
];

async function auth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const me = await auth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ users: USERS });
}

export async function POST(req: NextRequest) {
  const me = await auth(req);
  if (!me?.permissions.canManageUsers) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const id = "U" + (1000 + USERS.length + 1);
  const user: User = { id, ...parsed.data };
  USERS.push(user);
  console.log("AUDIT", { action: "USER_CREATE", by: me.id, user });
  return Response.json({ user });
}

export async function PATCH(req: NextRequest) {
  const me = await auth(req);
  if (!me?.permissions.canManageUsers) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const idx = USERS.findIndex(u => u.id === parsed.data.id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
  USERS[idx] = { ...USERS[idx], ...parsed.data };
  console.log("AUDIT", { action: "USER_UPDATE", by: me.id, id: parsed.data.id });
  return Response.json({ user: USERS[idx] });
}

export async function DELETE(req: NextRequest) {
  const me = await auth(req);
  if (!me?.permissions.canManageUsers) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const before = USERS.length;
  USERS = USERS.filter(u => u.id !== id);
  const deleted = USERS.length !== before;
  console.log("AUDIT", { action: "USER_DELETE", by: me.id, id });
  return Response.json({ ok: deleted });
}

