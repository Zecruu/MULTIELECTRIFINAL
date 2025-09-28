import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // Check common envs used by @vercel/postgres
  const envs = {
    POSTGRES_URL: process.env.POSTGRES_URL ? true : false,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? true : false,
    POSTGRES_HOST: process.env.POSTGRES_HOST ? true : false,
    POSTGRES_USER: process.env.POSTGRES_USER ? true : false,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? true : false,
    POSTGRES_DATABASE: process.env.POSTGRES_DATABASE ? true : false,
    DATABASE_URL: process.env.DATABASE_URL ? true : false,
  };
  return Response.json({ envs, nodeEnv: process.env.NODE_ENV || null, vercelEnv: process.env.VERCEL_ENV || null });
}

