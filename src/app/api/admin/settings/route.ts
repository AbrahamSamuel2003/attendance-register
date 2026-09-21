import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    success: true,
    office: db.office,
    departments: db.departments,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, latitude, longitude, radiusMeters } = body;

    if (name) db.office.name = name.trim();
    if (address) db.office.address = address.trim();
    if (typeof latitude === 'number') db.office.latitude = latitude;
    if (typeof longitude === 'number') db.office.longitude = longitude;
    if (typeof radiusMeters === 'number') db.office.radiusMeters = radiusMeters;

    db.persist();

    return NextResponse.json({
      success: true,
      message: 'Office settings and Geofence updated successfully!',
      office: db.office,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
