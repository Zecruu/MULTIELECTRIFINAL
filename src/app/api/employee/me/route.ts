import { cookies } from "next/headers";
import { verifyToken, type Me } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const token = (await cookies()).get("employee_token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const secret = process.env.JWT_SECRET || "dev-secret-change";
  const me: Me = await verifyToken(token, secret);
  return Response.json({ me });
}

