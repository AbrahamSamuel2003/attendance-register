export type AttendanceStatus =
  | 'NOT_STARTED'
  | 'LOGGED_IN'
  | 'ON_BREAK'
  | 'ON_LUNCH'
  | 'LOGGED_OUT'
  | 'MISSED_LOGOUT';

export type AttendanceEventType =
  | 'LOGIN'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'LUNCH_START'
  | 'LUNCH_END'
  | 'LOGOUT'
  | 'AUTO_CLOSE_MIDNIGHT'
  | 'MANUAL_CORRECTION';

export interface Office {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timezone: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  designation: string;
  barcodeValue: string;
  pin: string; // 4-digit security PIN
  deviceToken: string | null; // Bound unique phone token
  deviceModel?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  joinedAt: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface AttendanceSession {
  id: string;
  employeeId: string;
  officeId: string;
  attendanceDate: string; // YYYY-MM-DD in Asia/Kolkata
  status: AttendanceStatus;
  loginAt: string | null;
  logoutAt: string | null;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  totalLunchMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  isMissedLogout: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceEvent {
  id: string;
  sessionId: string;
  employeeId: string;
  eventType: AttendanceEventType;
  eventTime: string; // ISO string
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  deviceToken?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LiveAttendanceRecord {
  employee: Employee;
  department: Department;
  session: AttendanceSession | null;
  lastEvent: AttendanceEvent | null;
  todayEvents: AttendanceEvent[];
}

export interface AttendanceSummaryKPI {
  totalEmployees: number;
  presentCount: number;
  notLoggedInCount: number;
  onBreakCount: number;
  onLunchCount: number;
  loggedOutCount: number;
  missedLogoutCount: number;
  lateArrivalsCount: number;
}
