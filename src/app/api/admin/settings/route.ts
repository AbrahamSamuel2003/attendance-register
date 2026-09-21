import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  await db.ensureInitialized();
  return NextResponse.json({
    success: true,
    office: db.office,
    departments: db.departments,
  });
}

export async function POST(req: Request) {
  try {
    await db.ensureInitialized();
    const body = await req.json();
    const { name, address, latitude, longitude, radiusMeters } = body;

    const updatedOffice = {
      ...db.office,
      name: name ? name.trim() : db.office.name,
      address: address ? address.trim() : db.office.address,
      latitude: typeof latitude === 'number' ? latitude : db.office.latitude,
      longitude: typeof longitude === 'number' ? longitude : db.office.longitude,
      radiusMeters: typeof radiusMeters === 'number' ? radiusMeters : db.office.radiusMeters,
    };

    const saved = await db.saveOffice(updatedOffice);

    return NextResponse.json({
      success: true,
      message: 'Office settings and Geofence updated successfully!',
      office: db.office,
      syncedToSupabase: saved,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
