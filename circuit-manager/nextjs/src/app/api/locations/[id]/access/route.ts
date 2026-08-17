import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import {
  GET_LOCATION_ACCESS, UPSERT_LOCATION_ACCESS, DELETE_LOCATION_ACCESS,
  GET_USER_BY_EMAIL, GET_LOCATION_BY_ID
} from '@/lib/queries';

async function getLocationAccess(locationId: string, userId: string) {
  const data = await adminClient.request<{ locations_by_pk: { owner_id: string; location_access: Array<{ can_manage_access: boolean }> } | null }>(
    GET_LOCATION_BY_ID, { id: locationId, user_id: userId }
  );
  const loc = data.locations_by_pk;
  if (!loc) return null;
  const isOwner = loc.owner_id === userId;
  const access = loc.location_access[0];
  const canManage = isOwner || access?.can_manage_access;
  return { isOwner, canManage };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    const data = await adminClient.request(GET_LOCATION_ACCESS, { location_id: id });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const perm = await getLocationAccess(id, session.userId);
  if (!perm?.canManage) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  try {
    const body = await req.json();
    const { email, can_view = true, can_edit = false, can_manage_access = false } = body;

    const userData = await adminClient.request<{ users: Array<{ id: string }> }>(
      GET_USER_BY_EMAIL, { email }
    );
    if (!userData.users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUserId = userData.users[0].id;
    if (targetUserId === session.userId) {
      return NextResponse.json({ error: 'Cannot modify your own access' }, { status: 400 });
    }

    const data = await adminClient.request(UPSERT_LOCATION_ACCESS, {
      location_id: id,
      user_id: targetUserId,
      can_view,
      can_edit,
      can_manage_access,
      granted_by: session.userId,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const perm = await getLocationAccess(id, session.userId);
  if (!perm?.canManage) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  try {
    const body = await req.json();
    const data = await adminClient.request(DELETE_LOCATION_ACCESS, {
      location_id: id,
      user_id: body.user_id,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
