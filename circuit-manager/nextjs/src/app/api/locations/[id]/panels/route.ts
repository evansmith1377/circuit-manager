import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import {
  GET_SERVICES_FOR_LOCATION, INSERT_SERVICE, UPDATE_SERVICE,
  INSERT_PANEL, UPDATE_PANEL, DELETE_PANEL, GET_PANEL_DETAIL,
  GET_LOCATION_BY_ID
} from '@/lib/queries';

async function canEdit(locationId: string, userId: string) {
  const data = await adminClient.request<{ locations_by_pk: { owner_id: string; location_access: Array<{ can_edit: boolean }> } | null }>(
    GET_LOCATION_BY_ID, { id: locationId, user_id: userId }
  );
  const loc = data.locations_by_pk;
  if (!loc) return false;
  if (loc.owner_id === userId) return true;
  return loc.location_access[0]?.can_edit ?? false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    const data = await adminClient.request(GET_SERVICES_FOR_LOCATION, { location_id: id });
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

  if (!await canEdit(id, session.userId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { type, panel_type, ...rest } = body;

    if (type === 'service') {
      const data = await adminClient.request(INSERT_SERVICE, { location_id: id, ...rest });
      return NextResponse.json(data, { status: 201 });
    } else if (type === 'panel') {
      const data = await adminClient.request(INSERT_PANEL, { ...rest, type: panel_type || rest.type || 'sub' });
      return NextResponse.json(data, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  if (!await canEdit(id, session.userId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { type, panel_type, ...rest } = body;

    if (type === 'service') {
      const data = await adminClient.request(UPDATE_SERVICE, rest);
      return NextResponse.json(data);
    } else if (type === 'panel') {
      const data = await adminClient.request(UPDATE_PANEL, { ...rest, type: panel_type || rest.type || 'sub' });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  if (!await canEdit(id, session.userId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = await adminClient.request(DELETE_PANEL, { id: body.panel_id });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
