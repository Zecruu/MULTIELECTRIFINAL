import { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  void _req;
  const presence = {
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: !!process.env.AWS_REGION,
    S3_BUCKET: !!(process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME),
    S3_PUBLIC_BASE_URL: !!process.env.S3_PUBLIC_BASE_URL,
  } as const;
  try {
    const env = getEnv();
    return Response.json({ ok: true, presence, parsed: { ...env, AWS_ACCESS_KEY_ID: Boolean(env.AWS_ACCESS_KEY_ID), AWS_SECRET_ACCESS_KEY: Boolean(env.AWS_SECRET_ACCESS_KEY) } });
  } catch (err: unknown) {
    return Response.json({ ok: false, presence, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

