import ExcelJS from 'exceljs';
import { db } from './db';

export async function generateAttendanceExcelReport(filterDate?: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SS40 Attendance System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Daily Attendance', {
    views: [{ showGridLines: true }],
  });

  const selectedDate = filterDate || db.getTodayDateIST();

  // 1. Title Banner
  worksheet.mergeCells('A1:L2');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `SS40 NETWORK — ATTENDANCE & AUDIT REPORT (${selectedDate})`;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };

  // 2. Subtitle / Timestamp
  worksheet.mergeCells('A3:L3');
  const subCell = worksheet.getCell('A3');
  subCell.value = `Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (Asia/Kolkata) | Office: ${db.office.name}`;
  subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Table Column Headers
  const headers = [
    'Emp Code',
    'Employee Name',
    'Department',
    'Designation',
    'Status',
    'Login Time',
    'Logout Time',
    'Work (Hrs)',
    'Break (Mins)',
    'Lunch (Mins)',
    'Late Status',
    'Device Binding',
  ];

  const headerRow = worksheet.getRow(5);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }, // Blue 600
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  headerRow.height = 28;

  // 4. Populate Rows
  const employees = db.employees;
  const departmentsMap = new Map(db.departments.map((d) => [d.id, d]));

  let currentRowIdx = 6;

  employees.forEach((emp, index) => {
    const session = db.sessions.find(
      (s) => s.employeeId === emp.id && s.attendanceDate === selectedDate
    );
    const dept = departmentsMap.get(emp.departmentId);

    const row = worksheet.getRow(currentRowIdx);

    const loginFormatted = session?.loginAt
      ? new Date(session.loginAt).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--';

    const logoutFormatted = session?.logoutAt
      ? new Date(session.logoutAt).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--';

    const workHours = session ? (session.totalWorkMinutes / 60).toFixed(1) + 'h' : '0.0h';
    const breakMins = session ? `${session.totalBreakMinutes}m` : '0m';
    const lunchMins = session ? `${session.totalLunchMinutes}m` : '0m';

    const statusDisplay = session ? session.status.replace('_', ' ') : 'NOT STARTED';
    const lateDisplay = session?.isLate ? `Late (${session.lateMinutes}m)` : 'On Time';
    const deviceDisplay = emp.deviceToken ? 'Bound (Verified)' : 'Pending Binding';

    row.values = [
      emp.employeeCode,
      emp.name,
      dept?.name || 'General',
      emp.designation,
      statusDisplay,
      loginFormatted,
      logoutFormatted,
      workHours,
      breakMins,
      lunchMins,
      lateDisplay,
      deviceDisplay,
    ];

    // Styling Data Row
    const isEven = index % 2 === 0;
    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: c <= 4 ? 'left' : 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    row.height = 22;
    currentRowIdx++;
  });

  // 5. Column Widths
  worksheet.columns = [
    { width: 14 }, // Emp Code
    { width: 22 }, // Name
    { width: 24 }, // Department
    { width: 24 }, // Designation
    { width: 16 }, // Status
    { width: 14 }, // Login
    { width: 14 }, // Logout
    { width: 14 }, // Work Hrs
    { width: 14 }, // Break
    { width: 14 }, // Lunch
    { width: 16 }, // Late
    { width: 20 }, // Device
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
