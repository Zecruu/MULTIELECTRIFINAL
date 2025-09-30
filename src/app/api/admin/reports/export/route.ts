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

export async function GET(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "csv";
    const days = parseInt(url.searchParams.get("days") || "30");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get orders data
    const ordersRes = await sql.query<{
      order_number: string;
      created_at: string;
      total_cents: number;
      status: string;
      customer_email: string;
    }>(
      `SELECT o.order_number, o.created_at, o.total_cents, o.status, c.email as customer_email
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.created_at >= $1
      ORDER BY o.created_at DESC`,
      [startDate.toISOString()]
    );

    if (format === "csv") {
      // Generate CSV
      const headers = ["Order Number", "Date", "Customer Email", "Total", "Status"];
      const rows = ordersRes.rows.map((o) => [
        o.order_number,
        new Date(o.created_at).toLocaleDateString(),
        o.customer_email,
        `$${(o.total_cents / 100).toFixed(2)}`,
        o.status,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else if (format === "pdf") {
      // For PDF, we'll return a simple text response for now
      // In production, you'd use a library like pdfkit or puppeteer
      const text = `
Multi Electric Supply - Sales Report
Generated: ${new Date().toLocaleDateString()}
Period: Last ${days} days

Total Orders: ${ordersRes.rows.length}
Total Revenue: $${(ordersRes.rows.reduce((sum, o) => sum + o.total_cents, 0) / 100).toFixed(2)}

Orders:
${ordersRes.rows.map((o) => `${o.order_number} - ${new Date(o.created_at).toLocaleDateString()} - $${(o.total_cents / 100).toFixed(2)} - ${o.status}`).join("\n")}
      `.trim();

      return new Response(text, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${new Date().toISOString().split("T")[0]}.pdf"`,
        },
      });
    }

    return Response.json({ error: "Invalid format" }, { status: 400 });
  } catch (err) {
    console.error("Export API error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

