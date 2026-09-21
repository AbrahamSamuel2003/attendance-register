import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { STATE_MACHINE_RULES } from '@/lib/state-machine';
import { AttendanceStatus } from '@/types';

export async function POST(req: Request) {
  try {
    await db.ensureInitialized();
    const body = await req.json();
    const { barcodeValue, deviceToken, deviceModel } = body;

    if (!barcodeValue) {
      return NextResponse.json({ error: 'Barcode value is required' }, { status: 400 });
    }

    // 1. Find employee by barcode
    const employee = db.employees.find(
      (e) => e.barcodeValue.trim().toUpperCase() === barcodeValue.trim().toUpperCase()
    );

    if (!employee) {
      return NextResponse.json(
        { error: 'Invalid ID Card / Barcode. Employee record not found.' },
        { status: 404 }
      );
    }

    if (employee.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Employee account is inactive. Please contact HR.' },
        { status: 403 }
      );
    }

    // 2. Device Binding Security
    // Check if device is bound to someone else
    if (deviceToken) {
      const boundToOther = db.employees.find(
        (e) => e.id !== employee.id && e.deviceToken === deviceToken
      );
      if (boundToOther) {
        return NextResponse.json(
          {
            error: `Device Conflict: This phone is already bound to another employee (${boundToOther.name}). Buddy punching is strictly prohibited.`,
          },
          { status: 403 }
        );
      }

      // Check if employee is already bound to a different device
      if (employee.deviceToken && employee.deviceToken !== deviceToken) {
        return NextResponse.json(
          {
            error: `Unauthorized Device: Your ID is bound to a different registered phone. Contact Admin to reset device binding if you changed your phone.`,
          },
          { status: 403 }
        );
      }

      // First time binding
      if (!employee.deviceToken) {
        employee.deviceToken = deviceToken;
        if (deviceModel) employee.deviceModel = deviceModel;
        await db.addEmployee(employee);
      }
    }

    // 3. Retrieve or initiate Today's Session
    const today = db.getTodayDateIST();
    let session = db.sessions.find(
      (s) => s.employeeId === employee.id && s.attendanceDate === today
    );

    const currentStatus: AttendanceStatus = session ? session.status : 'NOT_STARTED';
    const allowedActions = STATE_MACHINE_RULES[currentStatus] || [];
    const department = db.departments.find((d) => d.id === employee.departmentId);

    // Get today's events
    const todayEvents = session
      ? db.events.filter((ev) => ev.sessionId === session.id)
      : [];

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        department: department?.name || 'General',
        designation: employee.designation,
        barcodeValue: employee.barcodeValue,
        deviceBound: !!employee.deviceToken,
      },
      session,
      currentStatus,
      allowedActions,
      todayEvents,
      requiresPin: currentStatus === 'NOT_STARTED',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
