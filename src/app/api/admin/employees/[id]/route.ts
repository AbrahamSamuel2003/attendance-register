import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const employee = db.employees.find((e) => e.id === id);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    if (body.action === 'RESET_DEVICE') {
      employee.deviceToken = null;
      employee.deviceModel = null;
      return NextResponse.json({
        success: true,
        message: `Device binding cleared for ${employee.name}. They can now bind a new device.`,
        employee,
      });
    }

    if (body.action === 'REGENERATE_BARCODE') {
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      employee.barcodeValue = `SS40-EMP-${randomHex}`;
      return NextResponse.json({
        success: true,
        message: `New barcode generated: ${employee.barcodeValue}`,
        employee,
      });
    }

    if (body.pin) {
      employee.pin = body.pin.trim();
    }
    if (body.name) employee.name = body.name.trim();
    if (body.email) employee.email = body.email.trim();
    if (body.phone) employee.phone = body.phone.trim();
    if (body.designation) employee.designation = body.designation.trim();
    if (body.departmentId) employee.departmentId = body.departmentId;
    if (body.status) employee.status = body.status;

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully.',
      employee,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = db.employees.findIndex((e) => e.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const removed = db.employees.splice(index, 1)[0];
    
    // Clean up sessions and events for the deleted employee
    db.sessions = db.sessions.filter((s) => s.employeeId !== id);
    db.events = db.events.filter((ev) => ev.employeeId !== id);
    db.persist();

    // Delete from Supabase Cloud
    import('@/lib/supabase').then(({ deleteEmployeeFromSupabase }) => {
      deleteEmployeeFromSupabase(id);
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Employee ${removed.name} deleted permanently.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
