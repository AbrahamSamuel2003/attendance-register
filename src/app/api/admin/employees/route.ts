import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Employee } from '@/types';

export async function GET() {
  await db.ensureInitialized();
  return NextResponse.json({
    success: true,
    employees: db.employees,
    departments: db.departments,
  });
}

export async function POST(req: Request) {
  try {
    await db.ensureInitialized();
    const body = await req.json();
    const { name, email, phone, departmentId, designation, pin, barcodeValue } = body;

    if (!name || !email || !departmentId || !designation) {
      return NextResponse.json(
        { error: 'Name, email, department, and designation are required.' },
        { status: 400 }
      );
    }

    if (!pin || pin.trim().length !== 4) {
      return NextResponse.json(
        { error: 'A valid 4-digit security PIN is required for the employee.' },
        { status: 400 }
      );
    }

    // Determine Barcode Value (Admin Scanned / Input or Auto-Generated)
    let finalBarcode = barcodeValue ? barcodeValue.trim().toUpperCase() : '';
    if (!finalBarcode) {
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      finalBarcode = `SS40-EMP-${randomHex}`;
    }

    // Check barcode uniqueness
    const barcodeExists = db.employees.some(
      (e) => e.barcodeValue.trim().toUpperCase() === finalBarcode
    );
    if (barcodeExists) {
      return NextResponse.json(
        {
          error: `Barcode '${finalBarcode}' is already assigned to another employee. Please scan or enter a unique ID card barcode.`,
        },
        { status: 400 }
      );
    }

    // Auto-generate employee code
    const empCount = db.employees.length + 1;
    const empCode = `SS40-${empCount.toString().padStart(3, '0')}`;

    const newEmp: Employee = {
      id: `emp-${Date.now().toString(36)}`,
      employeeCode: empCode,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      departmentId,
      designation: designation.trim(),
      barcodeValue: finalBarcode,
      pin: pin.trim(),
      deviceToken: null,
      status: 'ACTIVE',
      joinedAt: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    await db.addEmployee(newEmp);

    return NextResponse.json({
      success: true,
      message: `Employee ${newEmp.name} registered successfully with Barcode ${newEmp.barcodeValue}!`,
      employee: newEmp,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
