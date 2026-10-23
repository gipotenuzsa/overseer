import { database } from '@/lib/server';
export async function POST(request: Request) {
  const db = database();
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return Response.json({ error: 'Sign in first' }, { status: 401 });
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object' || !('score' in body) || typeof body.score !== 'number') {
    return Response.json({ error: 'Score is required' }, { status: 400 });
  }
  const { error } = await db.from('results').insert({ owner_id: user.id, score: body.score });
  return Response.json({ saved: !error }, { status: error ? 400 : 200 });
}
