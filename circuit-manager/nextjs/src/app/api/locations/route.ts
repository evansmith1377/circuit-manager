import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminClient } from '@/lib/graphql-client';
import { GET_LOCATIONS_FOR_USER, INSERT_LOCATION, INSERT_SERVICE, INSERT_PANEL } from '@/lib/queries';
import { z } from 'zod';

const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await adminClient.request<{ locations: unknown[] }>(
      GET_LOCATIONS_FOR_USER, { user_id: session.userId }
    );
    return NextResponse.json({ locations: data.locations });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, address, icon, description } = parsed.data;

    // Create location
    const locData = await adminClient.request<{ insert_locations_one: { id: string; name: string; owner_id: string } }>(
      INSERT_LOCATION, { name, address, owner_id: session.userId, icon: icon || 'building-2', description }
    );

    const locationId = locData.insert_locations_one.id;

    // Create default main service
    const serviceData = await adminClient.request<{ insert_services_one: { id: string } }>(
      INSERT_SERVICE, {
        location_id: locationId,
        name: 'Main Service',
        voltage: 240,
        amperage: 200,
        description: 'Main electrical service',
        icon: 'zap',
      }
    );

    const serviceId = serviceData.insert_services_one.id;

    // Create default main panel
    await adminClient.request(INSERT_PANEL, {
      service_id: serviceId,
      parent_id: null,
      area_id: null,
      name: 'Main Panel',
      type: 'main',
      amperage: 200,
      voltage: 240,
      has_main_disconnect: true,
      main_disconnect_label: 'MAIN',
      slots: 20,
      manufacturer: null,
      model: null,
      icon: 'cpu',
      description: 'Main electrical panel',
    });

    return NextResponse.json({ location: locData.insert_locations_one }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
