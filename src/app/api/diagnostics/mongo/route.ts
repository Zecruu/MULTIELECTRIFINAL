import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const rawMongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? "";
  const normalized = rawMongoUri.trim().replace(/^['"]|['"]$/g, "");
  const usedVar = process.env.MONGODB_URI ? "MONGODB_URI" : (process.env.MONGO_URI ? "MONGO_URI" : null);
  const startsWithMongo = normalized.startsWith("mongodb://") || normalized.startsWith("mongodb+srv://");
  const dbNameEnv = process.env.MONGODB_DB || process.env.MONGO_DB || null;

  return Response.json({
    usedVar,
    hasValue: Boolean(rawMongoUri),
    length: normalized ? normalized.length : 0,
    startsWithMongo,
    hasSurroundingQuotes: /^['"].*['"]$/.test(rawMongoUri || ""),
    dbNameEnv,
    nodeEnv: process.env.NODE_ENV || null,
    vercelEnv: process.env.VERCEL_ENV || null,
  });
}

