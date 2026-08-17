import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import {
  GET_LOCATION_BY_ID, UPDATE_LOCATION, DELETE_LOCATION,
  TRANSFER_LOCATION_OWNERSHIP
} from '@/lib/queries';

async function checkAccess(locationId: string, userId: string, requireEdit = false, requireManage = false) {
  const data = await adminClient.request<{ locations_by_pk: { owner_id: string; location_access: Array<{ can_view: boolean; can_edit: boolean; can_manage_access: boolean }> } | null }>(
    GET_LOCATION_BY_ID, { id: locationId, user_id: userId }
  );
  const loc = data.locations_by_pk;
  if (!loc) return null;

  const isOwner = loc.owner_id === userId;
  const access = loc.location_access[0];

  if (isOwner) return { canView: true, canEdit: true, canManage: true, isOwner: true };
  if (!access?.can_view) return null;
  if (requireManage && !access.can_manage_access) return null;
  if (requireEdit && !access.can_edit) return null;

  return {
    canView: access.can_view,
    canEdit: access.can_edit,
    canManage: access.can_manage_access,
    isOwner: false,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const data = await adminClient.request(GET_LOCATION_BY_ID, { id, user_id: session.userId });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const access = await checkAccess(id, session.userId, true);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  try {
    const body = await req.json();
    const data = await adminClient.request(UPDATE_LOCATION, { id, ...body });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const access = await checkAccess(id, session.userId);
  if (!access?.isOwner) return NextResponse.json({ error: 'Only owner can delete' }, { status: 403 });

  try {
    await adminClient.request(DELETE_LOCATION, { id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
