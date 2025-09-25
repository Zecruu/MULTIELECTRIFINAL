export const runtime = 'nodejs';

export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
    { headers: { 'content-type': 'application/json' } }
  );
}

