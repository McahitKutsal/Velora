import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { listTodos, createTodo, updateTodo, deleteTodo } from '@/lib/repo/todos';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  return NextResponse.json(await listTodos(user.userId));
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const body = await req.json();
  return NextResponse.json(await createTodo(user.userId, body));
}

export async function PUT(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const body = await req.json();
  const { id, ...rest } = body;
  return NextResponse.json(await updateTodo(user.userId, id, rest));
}

export async function DELETE(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const { id } = await req.json();
  return NextResponse.json(await deleteTodo(user.userId, id));
}
