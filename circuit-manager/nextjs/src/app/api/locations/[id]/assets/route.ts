import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import {
  GET_ASSETS_FOR_LOCATION, GET_ASSET_TYPES, INSERT_ASSET, UPDATE_ASSET, DELETE_ASSET,
  GET_LOCATION_BY_ID, GET_AREAS_FOR_LOCATION
} from '@/lib/queries';
import { type AreaType, AREA_TYPE_PREFIXES } from '@/types';

async function canEdit(locationId: string, userId: string) {
  const data = await adminClient.request<{ locations_by_pk: { owner_id: string; location_access: Array<{ can_edit: boolean }> } | null }>(
    GET_LOCATION_BY_ID, { id: locationId, user_id: userId }
  );
  const loc = data.locations_by_pk;
  if (!loc) return false;
  if (loc.owner_id === userId) return true;
  return loc.location_access[0]?.can_edit ?? false;
}

async function generateSystemId(locationId: string, areaId: string | null, assetTypeName: string): Promise<string> {
  // Get area path
  let areaPath = '';
  if (areaId) {
    const areasData = await adminClient.request<{ areas: Array<{ id: string; short_code: string; parent_id: string | null }> }>(
      GET_AREAS_FOR_LOCATION, { location_id: locationId }
    );

    // Build a flat map
    const areaMap = new Map(areasData.areas.map((a: { id: string; short_code: string; parent_id: string | null }) => [a.id, a]));

    // Walk up tree to build path
    const pathParts: string[] = [];
    let current = areaMap.get(areaId);
    while (current) {
      pathParts.unshift(current.short_code);
      current = current.parent_id ? areaMap.get(current.parent_id) : undefined;
    }
    areaPath = pathParts.join('-');
  }

  // Asset type prefix
  const typePrefix = assetTypeName
    .split(' ')[0]
    .replace(/[^A-Za-z]/g, '')
    .substring(0, 2)
    .toUpperCase() || 'XX';

  // Get next counter for this combo
  const countData = await adminClient.request<{ assets_aggregate: { aggregate: { count: number } } }>(
    `query CountAssets($location_id: uuid!, $prefix: String!) {
      assets_aggregate(where: { location_id: { _eq: $location_id }, system_id: { _like: $prefix } }) {
        aggregate { count }
      }
    }`,
    { location_id: locationId, prefix: `${areaPath ? areaPath + '-' : ''}${typePrefix}%` }
  );

  const num = (countData.assets_aggregate.aggregate.count || 0) + 1;
  return areaPath ? `${areaPath}-${typePrefix}${num}` : `${typePrefix}${num}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const url = new URL(req.url);
  if (url.searchParams.get('types') === 'true') {
    const data = await adminClient.request(GET_ASSET_TYPES);
    return NextResponse.json(data);
  }

  try {
    const data = await adminClient.request(GET_ASSETS_FOR_LOCATION, { location_id: id });
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
    const { area_id, asset_type_name, ...rest } = body;

    const system_id = await generateSystemId(id, area_id || null, asset_type_name || 'Device');

    const data = await adminClient.request(INSERT_ASSET, {
      location_id: id,
      area_id: area_id || null,
      system_id,
      ...rest,
    });
    return NextResponse.json(data, { status: 201 });
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
    const data = await adminClient.request(UPDATE_ASSET, body);
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

  if (!await canEdit(id, session.userId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { asset_id } = await req.json();
    const data = await adminClient.request(DELETE_ASSET, { id: asset_id });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
