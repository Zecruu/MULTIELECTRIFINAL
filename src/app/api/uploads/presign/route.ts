import type { NextRequest } from "next/server";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";

const BodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  maxSizeMB: z.coerce.number().optional(),
});

export async function POST(_req: NextRequest) {
  try {
    const env = getEnv();

    const body = await _req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid body", details: parsed.error.flatten() }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
    const { filename, contentType, maxSizeMB } = parsed.data;

    // Basic mime guard: only images for now
    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Only image uploads are allowed" }),
        { status: 415, headers: { "content-type": "application/json" } }
      );
    }

    const client = new S3Client({ region: env.AWS_REGION, credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    }});

    const maxBytes = Math.round(1024 * 1024 * (maxSizeMB ?? env.S3_MAX_UPLOAD_MB));
    const key = `products/${crypto.randomUUID()}/${filename}`;

    const { url, fields } = await createPresignedPost(client, {
      Bucket: env.S3_BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 0, maxBytes],
        { acl: "public-read" },
        ["starts-with", "$Content-Type", contentType.split("/")[0] + "/"],
      ],
      Fields: {
        acl: "public-read",
        "Content-Type": contentType,
      },
      Expires: 60, // seconds
    });
    const typedFields: Record<string, string> = fields as Record<string, string>;

    const publicUrl = env.S3_PUBLIC_BASE_URL
      ? `${env.S3_PUBLIC_BASE_URL}/${key}`
      : `${url}${url.endsWith("/") ? "" : "/"}${key}`;

    return new Response(
      JSON.stringify({ url, fields: typedFields, key, publicUrl, maxBytes }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("presign error", err);
    return new Response(
      JSON.stringify({ error: "Presign failed", message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

