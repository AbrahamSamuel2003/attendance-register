import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getNextStatus, isValidTransition, recalculateSessionDurations } from '@/lib/state-machine';
import { AttendanceEventType, AttendanceSession, AttendanceEvent } from '@/types';

export async function POST(req: Request) {
  try {
    await db.ensureInitialized();
    const body = await req.json();
    const { employeeId, action, pin, latitude, longitude, deviceToken, notes } = body;

    if (!employeeId || !action) {
      return NextResponse.json({ error: 'Employee ID and action are required.' }, { status: 400 });
    }

    const employee = db.employees.find((e) => e.id === employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const today = db.getTodayDateIST();
    let session = db.sessions.find(
      (s) => s.employeeId === employee.id && s.attendanceDate === today
    );

    const currentStatus = session ? session.status : 'NOT_STARTED';

    // 1. Verify State Machine Rule
    if (!isValidTransition(currentStatus, action as AttendanceEventType)) {
      return NextResponse.json(
        {
          error: `Invalid action '${action}' for current status '${currentStatus}'.`,
        },
        { status: 400 }
      );
    }

    // 2. If action is LOGIN, verify PIN
    if (action === 'LOGIN') {
      if (!pin) {
        return NextResponse.json(
          { error: 'Security PIN is required to log in for the day.' },
          { status: 400 }
        );
      }
      if (employee.pin !== pin.trim()) {
        return NextResponse.json(
          { error: 'Incorrect 4-Digit Security PIN. Please try again.' },
          { status: 401 }
        );
      }
    }

    const nowISO = new Date().toISOString();
    const nextStatus = getNextStatus(currentStatus, action as AttendanceEventType);

    // 3. Create Session if NOT_STARTED
    if (!session) {
      // Check if late (e.g. login after 09:45 AM IST)
      const nowInIST = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const hours = nowInIST.getHours();
      const mins = nowInIST.getMinutes();
      const totalMinutesFromMidnight = hours * 60 + mins;
      const standardStartTime = 9 * 60 + 30; // 09:30 AM
      const isLate = totalMinutesFromMidnight > standardStartTime + 15; // 15 min grace
      const lateMinutes = isLate ? totalMinutesFromMidnight - standardStartTime : 0;

      session = {
        id: `sess-${employee.id}-${today}-${Date.now().toString(36)}`,
        employeeId: employee.id,
        officeId: db.office.id,
        attendanceDate: today,
        status: nextStatus,
        loginAt: nowISO,
        logoutAt: null,
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        totalLunchMinutes: 0,
        isLate,
        lateMinutes,
        isMissedLogout: false,
        createdAt: nowISO,
        updatedAt: nowISO,
      };
    } else {
      session.status = nextStatus;
      session.updatedAt = nowISO;
      if (action === 'LOGOUT') {
        session.logoutAt = nowISO;
      }
    }

    // 4. Create Attendance Event
    const newEvent: AttendanceEvent = {
      id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.id,
      employeeId: employee.id,
      eventType: action as AttendanceEventType,
      eventTime: nowISO,
      latitude,
      longitude,
      deviceToken,
      notes,
      createdAt: nowISO,
    };

    // 5. Recalculate working and break durations
    const sessionEvents = [...db.events.filter((ev) => ev.sessionId === session.id), newEvent];
    const durations = recalculateSessionDurations(sessionEvents);
    session.totalWorkMinutes = durations.totalWorkMinutes;
    session.totalBreakMinutes = durations.totalBreakMinutes;
    session.totalLunchMinutes = durations.totalLunchMinutes;

    await db.saveSession(session);
    await db.saveEvent(newEvent);

    return NextResponse.json({
      success: true,
      message: `Action '${action}' recorded successfully!`,
      status: nextStatus,
      session,
      event: newEvent,
      durations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
