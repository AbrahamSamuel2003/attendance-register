import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AttendanceSummaryKPI, LiveAttendanceRecord } from '@/types';

export async function GET() {
  try {
    await db.ensureInitialized();
    const today = db.getTodayDateIST();
    const employees = db.employees;
    const departmentsMap = new Map(db.departments.map((d) => [d.id, d]));

    const liveRecords: LiveAttendanceRecord[] = employees.map((emp) => {
      const session =
        db.sessions.find((s) => s.employeeId === emp.id && s.attendanceDate === today) || null;

      const todayEvents = session
        ? db.events.filter((ev) => ev.sessionId === session.id)
        : [];

      const lastEvent = todayEvents.length > 0 ? todayEvents[todayEvents.length - 1] : null;

      return {
        employee: emp,
        department: departmentsMap.get(emp.departmentId) || {
          id: 'dept-gen',
          name: 'General',
          code: 'GEN',
        },
        session,
        lastEvent,
        todayEvents,
      };
    });

    // Compute live summary KPIs
    let presentCount = 0;
    let notLoggedInCount = 0;
    let onBreakCount = 0;
    let onLunchCount = 0;
    let loggedOutCount = 0;
    let missedLogoutCount = 0;
    let lateArrivalsCount = 0;

    liveRecords.forEach((rec) => {
      const status = rec.session ? rec.session.status : 'NOT_STARTED';

      if (rec.session?.isLate) lateArrivalsCount++;

      switch (status) {
        case 'LOGGED_IN':
          presentCount++;
          break;
        case 'ON_BREAK':
          onBreakCount++;
          break;
        case 'ON_LUNCH':
          onLunchCount++;
          break;
        case 'LOGGED_OUT':
          loggedOutCount++;
          break;
        case 'MISSED_LOGOUT':
          missedLogoutCount++;
          break;
        case 'NOT_STARTED':
        default:
          notLoggedInCount++;
          break;
      }
    });

    const kpi: AttendanceSummaryKPI = {
      totalEmployees: employees.length,
      presentCount,
      notLoggedInCount,
      onBreakCount,
      onLunchCount,
      loggedOutCount,
      missedLogoutCount,
      lateArrivalsCount,
    };

    return NextResponse.json({
      success: true,
      today,
      office: db.office,
      kpi,
      records: liveRecords,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
