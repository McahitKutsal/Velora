import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { toggleTodo } from '@/lib/repo/todos';

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  return NextResponse.json(await toggleTodo(user.userId, id));
}
