import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { SEARCH_ALL, GLOBAL_SEARCH } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '';
  const locationId = url.searchParams.get('location_id');

  if (!query || query.length < 1) {
    return NextResponse.json({ assets: [], breakers: [], areas: [], panels: [] });
  }

  try {
    const searchQuery = `%${query}%`;

    if (locationId) {
      const data = await adminClient.request(SEARCH_ALL, {
        query: searchQuery,
        location_id: locationId,
      });
      return NextResponse.json(data);
    } else {
      const data = await adminClient.request(GLOBAL_SEARCH, {
        query: searchQuery,
        user_id: session.userId,
      });
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
