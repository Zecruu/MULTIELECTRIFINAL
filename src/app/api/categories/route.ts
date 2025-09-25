export const runtime = "nodejs";

type Category = { id: string; name: string };
const CATEGORIES: Category[] = [
  { id: "cat-01", name: "Cables" },
  { id: "cat-02", name: "Lighting" },
  { id: "cat-03", name: "Breakers" },
];

export async function GET() {
  return Response.json({ categories: CATEGORIES });
}

