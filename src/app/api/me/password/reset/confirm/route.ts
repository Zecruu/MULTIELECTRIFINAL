import { NextRequest } from "next/server";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { token, password, confirm } = await req.json().catch(()=>({}));
  if (!token || !password || password !== confirm || String(password).length < 8) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const col = await getCollection<CustomerDoc>("customers");
  const nowIso = new Date().toISOString();
  const u = await col.findOne({ "passwordReset.token": token });
  if (!u || !u.passwordReset || u.passwordReset.expiresAt < nowIso) {
    return Response.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await col.updateOne({ _id: u._id }, { $set: { passwordHash, lastPasswordChangeAt: nowIso }, $unset: { passwordReset: "" } });
  return Response.json({ ok: true });
}

