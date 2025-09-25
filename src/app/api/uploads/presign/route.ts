import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Stub endpoint for now to keep build green. I'll replace with AWS S3 presign once deps are approved.
  return new Response(
    JSON.stringify({ error: "Not Implemented", hint: "Enable AWS S3 presign: install @aws-sdk/s3-presigned-post and set env vars" }),
    { status: 501, headers: { "content-type": "application/json" } }
  );
}

