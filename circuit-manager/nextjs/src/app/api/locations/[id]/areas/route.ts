import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { GET_AREAS_FOR_LOCATION, INSERT_AREA, UPDATE_AREA, DELETE_AREA, GET_LOCATION_BY_ID } from '@/lib/queries';
import { AREA_TYPE_PREFIXES, type AreaType } from '@/types';

async function canEdit(locationId: string, userId: string): Promise<boolean> {
  try {
    const data = await adminClient.request<{
      locations_by_pk: { owner_id: string; location_access: Array<{ can_edit: boolean }> } | null
    }>(GET_LOCATION_BY_ID, { id: locationId, user_id: userId });
    const loc = data.locations_by_pk;
    if (!loc) return false;
    if (loc.owner_id === userId) return true;
    return loc.location_access[0]?.can_edit ?? false;
  } catch { return false; }
}

async function getNextSequenceNum(locationId: string, prefix: string): Promise<number> {
  try {
    const data = await adminClient.request<{ areas: Array<{ sequence_num: number }> }>(
      `query GetMaxSeq($location_id: uuid!, $prefix: String!) {
        areas(where:{location_id:{_eq:$location_id},short_code:{_like:$prefix}}order_by:{sequence_num:desc}limit:1){sequence_num}
      }`,
      { location_id: locationId, prefix: `${prefix}%` }
    );
    return (data.areas[0]?.sequence_num ?? 0) + 1;
  } catch { return 1; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const data = await adminClient.request(GET_AREAS_FOR_LOCATION, { location_id: id });
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
  if (!await canEdit(id, session.userId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  try {
    const body = await req.json();
    const { name, types, icon, description, parent_id } = body;
    if (!types?.length) return NextResponse.json({ error: 'At least one type required' }, { status: 400 });
    const prefix = AREA_TYPE_PREFIXES[types[0] as AreaType];
    const seqNum = await getNextSequenceNum(id, prefix);
    const data = await adminClient.request(INSERT_AREA, {
      location_id: id, parent_id: parent_id || null, name, types,
      icon: icon || null, description: description || null,
      short_code: `${prefix}${seqNum}`, sequence_num: seqNum,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create area' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!await canEdit(id, session.userId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  try {
    const body = await req.json();
    const { id: areaId, name, types, icon, description, parent_id } = body;
    const data = await adminClient.request(UPDATE_AREA, {
      id: areaId, name, types, icon: icon || null, description: description || null, parent_id: parent_id || null,
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
  if (!await canEdit(id, session.userId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  try {
    const { area_id } = await req.json();
    const data = await adminClient.request(DELETE_AREA, { id: area_id });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
