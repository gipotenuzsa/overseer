import { database } from '@/lib/server';
export async function POST(request: Request) {
  const db = database();
  const body: unknown = await request.json();
  await db.from('results').insert(body);
  return Response.json({ saved: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}
