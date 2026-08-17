import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { GET_PANEL_DETAIL, INSERT_BREAKER, UPDATE_BREAKER, DELETE_BREAKER, UPDATE_BREAKER_POSITIONS } from '@/lib/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { panelId } = await params;

  try {
    const data = await adminClient.request(GET_PANEL_DETAIL, { id: panelId });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { panelId } = await params;

  try {
    const body = await req.json();
    const { action, ...rest } = body;

    if (action === 'add_breaker') {
      const data = await adminClient.request(INSERT_BREAKER, {
        panel_id: panelId,
        ...rest,
        is_spare: rest.is_spare ?? false,
        is_vacant: rest.is_vacant ?? false,
      });
      return NextResponse.json(data, { status: 201 });
    }

    if (action === 'reorder_breakers') {
      const { positions } = rest; // [{id, position}]
      const updates = positions.map((p: { id: string; position: number }) => ({
        where: { id: { _eq: p.id } },
        _set: { position: p.position },
      }));
      const data = await adminClient.request(UPDATE_BREAKER_POSITIONS, { updates });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = await adminClient.request(UPDATE_BREAKER, body);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { breaker_id } = await req.json();
    const data = await adminClient.request(DELETE_BREAKER, { id: breaker_id });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
