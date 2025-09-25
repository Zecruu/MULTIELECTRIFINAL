import { z } from "zod";

const EnvSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
  S3_MAX_UPLOAD_MB: z.coerce.number().optional().default(10),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse({
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
    S3_MAX_UPLOAD_MB: process.env.S3_MAX_UPLOAD_MB,
  });
  if (!parsed.success) {
    // Obscure secrets in error message
    throw new Error("Missing or invalid S3/AWS env vars: " + JSON.stringify(parsed.error.format()));
  }
  cached = parsed.data;
  return cached;
}

