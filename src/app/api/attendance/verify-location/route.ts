import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isWithinGeofence } from '@/lib/geofence';

export async function POST(req: Request) {
  try {
    await db.ensureInitialized();
    const body = await req.json();
    const { latitude, longitude, accuracy } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Valid latitude and longitude coordinates are required.' },
        { status: 400 }
      );
    }

    const { isInside, distanceMeters, effectiveDistanceMeters } = isWithinGeofence(
      latitude,
      longitude,
      db.office.latitude,
      db.office.longitude,
      db.office.radiusMeters,
      typeof accuracy === 'number' ? accuracy : 0
    );

    return NextResponse.json({
      success: true,
      isInside,
      distanceMeters,
      effectiveDistanceMeters,
      allowedRadiusMeters: db.office.radiusMeters,
      accuracyMeters: typeof accuracy === 'number' ? Math.round(accuracy) : null,
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
