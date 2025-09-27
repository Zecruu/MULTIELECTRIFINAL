import { clearAuthCookies } from "@/lib/auth-customer";

export const runtime = "nodejs";

export async function POST() {
  await clearAuthCookies();
  return Response.json({ ok: true });
}

