import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { TRANSFER_LOCATION_OWNERSHIP, GET_LOCATION_BY_ID, GET_USER_BY_EMAIL } from '@/lib/queries';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const locData = await adminClient.request<{ locations_by_pk: { owner_id: string } | null }>(
    GET_LOCATION_BY_ID, { id, user_id: session.userId }
  );
  if (!locData.locations_by_pk || locData.locations_by_pk.owner_id !== session.userId) {
    return NextResponse.json({ error: 'Only owner can transfer' }, { status: 403 });
  }

  try {
    const { email } = await req.json();
    const userData = await adminClient.request<{ users: Array<{ id: string }> }>(
      GET_USER_BY_EMAIL, { email }
    );
    if (!userData.users.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const newOwnerId = userData.users[0].id;
    const data = await adminClient.request(TRANSFER_LOCATION_OWNERSHIP, { id, new_owner_id: newOwnerId });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 });
  }
}
