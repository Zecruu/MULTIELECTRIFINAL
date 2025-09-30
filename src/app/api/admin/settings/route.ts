import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try {
    const me = await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change");
    if (me.role !== "admin") return null;
    return me;
  } catch {
    return null;
  }
}

// Ensure settings table exists
async function ensureSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSettingsTable();

    // Get all settings
    const settingsRes = await sql.query<{ key: string; value: unknown }>(
      `SELECT key, value FROM settings`
    );

    const settingsMap: Record<string, unknown> = {};
    settingsRes.rows.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    // Default settings if not found
    const settings = {
      store: settingsMap.store || {
        name: "Multi Electric Supply",
        address: "123 Main St, San Juan, PR 00901",
        email: "info@multielectric.com",
        phone: "(787) 123-4567",
        logo_url: "",
      },
      integrations: settingsMap.integrations || {
        stripe_public_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
        stripe_secret_key: "••••••••",
        aws_s3_bucket: process.env.AWS_S3_BUCKET || "",
        aws_access_key: "••••••••",
      },
      security: settingsMap.security || {
        password_min_length: 8,
        require_2fa: false,
      },
    };

    return Response.json({ settings });
  } catch (err) {
    console.error("Settings GET error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSettingsTable();

    const body = await req.json();
    const { store, integrations, security } = body;

    // Update each setting
    if (store) {
      await sql.query(
        `INSERT INTO settings (key, value, updated_at)
        VALUES ('store', $1, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(store)]
      );
    }

    if (integrations) {
      // Don't save actual secrets, just placeholders
      const safeIntegrations = {
        ...integrations,
        stripe_secret_key: integrations.stripe_secret_key === "••••••••" 
          ? undefined 
          : integrations.stripe_secret_key,
        aws_access_key: integrations.aws_access_key === "••••••••" 
          ? undefined 
          : integrations.aws_access_key,
      };

      await sql.query(
        `INSERT INTO settings (key, value, updated_at)
        VALUES ('integrations', $1, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(safeIntegrations)]
      );
    }

    if (security) {
      await sql.query(
        `INSERT INTO settings (key, value, updated_at)
        VALUES ('security', $1, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(security)]
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Settings PATCH error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

