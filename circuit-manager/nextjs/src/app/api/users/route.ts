import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { GET_ALL_USERS, SET_USER_ADMIN, UPDATE_USER } from '@/lib/queries';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const data = await adminClient.request(GET_ALL_USERS);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const body = await req.json();
    const { action, id, ...rest } = body;

    if (action === 'set_admin') {
      const data = await adminClient.request(SET_USER_ADMIN, { id, is_admin: rest.is_admin });
      return NextResponse.json(data);
    }

    if (action === 'update') {
      const data = await adminClient.request(UPDATE_USER, { id, ...rest });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
