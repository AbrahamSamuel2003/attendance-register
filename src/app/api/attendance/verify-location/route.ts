import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isWithinGeofence } from '@/lib/geofence';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Valid latitude and longitude coordinates are required.' },
        { status: 400 }
      );
    }

    const { isInside, distanceMeters } = isWithinGeofence(
      latitude,
      longitude,
      db.office.latitude,
      db.office.longitude,
      db.office.radiusMeters
    );

    return NextResponse.json({
      success: true,
      isInside,
      distanceMeters,
      allowedRadiusMeters: db.office.radiusMeters,
      office: {
        name: db.office.name,
        address: db.office.address,
        latitude: db.office.latitude,
        longitude: db.office.longitude,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
