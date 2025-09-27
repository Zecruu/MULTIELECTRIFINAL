import { NextRequest } from "next/server";
import { getCollection, type CustomerDoc } from "@/lib/mongo";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return Response.json({ error: "Missing token" }, { status: 400 });
  const col = await getCollection<CustomerDoc>("customers");
  const nowIso = new Date().toISOString();
  const u = await col.findOne({ "emailVerification.token": token });
  if (!u || !u.emailVerification || u.emailVerification.expiresAt < nowIso) {
    return Response.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  await col.updateOne({ _id: u._id }, { $set: { emailVerified: true, updatedAt: nowIso }, $unset: { emailVerification: "" } });
  return Response.json({ ok: true });
}

