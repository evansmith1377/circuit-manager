import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { GET_USER_BY_ID } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const data = await adminClient.request<{ users_by_pk: { id: string; first_name: string; last_name: string; email: string; display_name: string; is_admin: boolean } | null }>(
      GET_USER_BY_ID, { id: session.userId }
    );

    if (!data.users_by_pk) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: data.users_by_pk });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('circuit_token', '', { maxAge: 0, path: '/' });
  return response;
}
