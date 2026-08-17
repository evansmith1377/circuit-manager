import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { GET_BREAKERS_FOR_LOCATION } from '@/lib/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    const data = await adminClient.request(GET_BREAKERS_FOR_LOCATION, { location_id: id });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
