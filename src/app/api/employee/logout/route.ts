export const runtime = "nodejs";

export async function POST() {
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": `employee_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` },
  });
}

