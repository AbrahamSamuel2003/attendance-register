import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    if (currentPassword.trim() !== db.adminPassword.trim()) {
      return NextResponse.json(
        { error: 'Incorrect current password. Please enter your existing password correctly.' },
        { status: 401 }
      );
    }

    if (newPassword.trim().length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters.' },
        { status: 400 }
      );
    }

    db.adminPassword = newPassword.trim();

    return NextResponse.json({
      success: true,
      message: 'Admin password has been changed successfully!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
