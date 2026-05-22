import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { toggleTodo } from '@/lib/repo/todos';

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await req.json();
    return NextResponse.json(await toggleTodo(user.userId, id));
  } catch (e) {
    console.error('todos-toggle API error:', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
