import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateSessionDurations } from '@/lib/state-machine';

export async function POST(req: Request) {
  try {
    const today = db.getTodayDateIST();
    const activeSessions = db.sessions.filter(
      (s) =>
        s.attendanceDate === today &&
        ['LOGGED_IN', 'ON_BREAK', 'ON_LUNCH'].includes(s.status)
    );

    let reconciledCount = 0;
    const nowISO = new Date().toISOString();

    for (const session of activeSessions) {
      session.status = 'MISSED_LOGOUT';
      session.isMissedLogout = true;
      session.logoutAt = nowISO;
      session.updatedAt = nowISO;

      // Add auto-close event
      db.events.push({
        id: `ev-auto-${session.id}-${Date.now().toString(36)}`,
        sessionId: session.id,
        employeeId: session.employeeId,
        eventType: 'AUTO_CLOSE_MIDNIGHT',
        eventTime: nowISO,
        notes: 'Session auto-closed at midnight due to missing employee logout.',
        createdAt: nowISO,
      });

      // Recalculate durations
      const sessionEvents = db.events.filter((ev) => ev.sessionId === session.id);
      const durations = recalculateSessionDurations(sessionEvents);
      session.totalWorkMinutes = durations.totalWorkMinutes;
      session.totalBreakMinutes = durations.totalBreakMinutes;
      session.totalLunchMinutes = durations.totalLunchMinutes;

      reconciledCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Midnight reconciliation complete. ${reconciledCount} open sessions marked as MISSED_LOGOUT.`,
      reconciledCount,
      timestamp: nowISO,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
