import { Department, Employee, Office, AttendanceSession, AttendanceEvent } from '@/types';

// In-memory data store (persists across API requests in Node runtime)
export class DatabaseStore {
  private static instance: DatabaseStore;

  public adminPassword: string = '654321';

  public office: Office = {
    id: 'off-ss40-hq',
    name: 'SS40 Network Main Office',
    address: 'SS40 Tech Park, 4th Floor, Innovation Wing',
    // Default coordinates (User can update in Settings or click "Sync Current GPS")
    latitude: 12.9716, // Bangalore / default coordinate
    longitude: 77.5946,
    radiusMeters: 100, // 100 meters geofence radius
    timezone: 'Asia/Kolkata',
    status: 'ACTIVE',
  };

  public departments: Department[] = [
    { id: 'dept-eng', name: 'Software Engineering', code: 'DEV' },
    { id: 'dept-qa', name: 'Quality Assurance', code: 'QA' },
    { id: 'dept-ui', name: 'UI / UX Design', code: 'DES' },
    { id: 'dept-ops', name: 'DevOps & IT Support', code: 'OPS' },
    { id: 'dept-mkt', name: 'Marketing & Sales', code: 'MKT' },
  ];

  public employees: Employee[] = [
    {
      id: 'emp-001',
      employeeCode: 'SS40-001',
      name: 'Abraham Samuel',
      email: 'abraham@ss40.network',
      phone: '+91 98765 43210',
      departmentId: 'dept-eng',
      designation: 'Senior Full Stack Lead',
      barcodeValue: 'SS40-EMP-8F73K2',
      pin: '1234', // default 4-digit PIN
      deviceToken: null, // First device scan binds this
      status: 'ACTIVE',
      joinedAt: '2024-01-15',
      createdAt: '2024-01-15T09:00:00.000Z',
    },
    {
      id: 'emp-002',
      employeeCode: 'SS40-002',
      name: 'David Raj',
      email: 'david.r@ss40.network',
      phone: '+91 98765 43211',
      departmentId: 'dept-eng',
      designation: 'Frontend Engineer',
      barcodeValue: 'SS40-EMP-9X21B4',
      pin: '4321',
      deviceToken: null,
      status: 'ACTIVE',
      joinedAt: '2024-03-01',
      createdAt: '2024-03-01T09:00:00.000Z',
    },
    {
      id: 'emp-003',
      employeeCode: 'SS40-003',
      name: 'Priya Sundaram',
      email: 'priya.s@ss40.network',
      phone: '+91 98765 43212',
      departmentId: 'dept-ui',
      designation: 'Product Designer',
      barcodeValue: 'SS40-EMP-3K99L1',
      pin: '5566',
      deviceToken: null,
      status: 'ACTIVE',
      joinedAt: '2024-02-10',
      createdAt: '2024-02-10T09:00:00.000Z',
    },
    {
      id: 'emp-004',
      employeeCode: 'SS40-004',
      name: 'Kumaravel Murugan',
      email: 'kumar.m@ss40.network',
      phone: '+91 98765 43213',
      departmentId: 'dept-ops',
      designation: 'Cloud Infrastructure Admin',
      barcodeValue: 'SS40-EMP-4V77M9',
      pin: '7788',
      deviceToken: null,
      status: 'ACTIVE',
      joinedAt: '2024-04-05',
      createdAt: '2024-04-05T09:00:00.000Z',
    },
    {
      id: 'emp-005',
      employeeCode: 'SS40-005',
      name: 'Sneha Mohan',
      email: 'sneha.m@ss40.network',
      phone: '+91 98765 43214',
      departmentId: 'dept-mkt',
      designation: 'Growth Strategist',
      barcodeValue: 'SS40-EMP-7R12W8',
      pin: '9900',
      deviceToken: null,
      status: 'ACTIVE',
      joinedAt: '2024-05-20',
      createdAt: '2024-05-20T09:00:00.000Z',
    },
  ];

  public sessions: AttendanceSession[] = [];
  public events: AttendanceEvent[] = [];

  private constructor() {
    this.seedTodaySessions();
    this.loadFromDisk();
  }

  public persist() {
    try {
      if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const dataFile = path.join(dataDir, 'db_store.json');
        const state = {
          adminPassword: this.adminPassword,
          office: this.office,
          departments: this.departments,
          employees: this.employees,
          sessions: this.sessions,
          events: this.events,
        };
        fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('DB persistence warning:', e);
    }
  }

  private loadFromDisk() {
    try {
      if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');
        const dataFile = path.join(process.cwd(), 'data', 'db_store.json');
        if (fs.existsSync(dataFile)) {
          const raw = fs.readFileSync(dataFile, 'utf-8');
          const state = JSON.parse(raw);
          if (state.adminPassword) this.adminPassword = state.adminPassword;
          if (state.office) this.office = state.office;
          if (state.departments?.length) this.departments = state.departments;
          if (state.employees?.length) this.employees = state.employees;
          if (state.sessions) this.sessions = state.sessions;
          if (state.events) this.events = state.events;
        }
      }
    } catch (e) {
      console.warn('DB load from disk warning:', e);
    }
  }

  public static getInstance(): DatabaseStore {
    const globalObj = globalThis as unknown as { __SS40_DB__?: DatabaseStore };
    if (!globalObj.__SS40_DB__) {
      globalObj.__SS40_DB__ = new DatabaseStore();
    }
    return globalObj.__SS40_DB__;
  }

  public getTodayDateIST(): string {
    const now = new Date();
    // Use Asia/Kolkata timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  }

  private seedTodaySessions() {
    const today = this.getTodayDateIST();
    // Seed some initial demo states for demonstration
    const emp1 = this.employees[0]; // Abraham
    const emp2 = this.employees[1]; // David
    const emp3 = this.employees[2]; // Priya

    // David: Logged in at 09:30 AM
    const sess2: AttendanceSession = {
      id: `sess-${emp2.id}-${today}`,
      employeeId: emp2.id,
      officeId: this.office.id,
      attendanceDate: today,
      status: 'LOGGED_IN',
      loginAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      logoutAt: null,
      totalWorkMinutes: 180,
      totalBreakMinutes: 0,
      totalLunchMinutes: 0,
      isLate: false,
      lateMinutes: 0,
      isMissedLogout: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Priya: On Lunch
    const sess3: AttendanceSession = {
      id: `sess-${emp3.id}-${today}`,
      employeeId: emp3.id,
      officeId: this.office.id,
      attendanceDate: today,
      status: 'ON_LUNCH',
      loginAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      logoutAt: null,
      totalWorkMinutes: 200,
      totalBreakMinutes: 15,
      totalLunchMinutes: 25,
      isLate: false,
      lateMinutes: 0,
      isMissedLogout: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.push(sess2, sess3);

    this.events.push(
      {
        id: 'ev-1',
        sessionId: sess2.id,
        employeeId: emp2.id,
        eventType: 'LOGIN',
        eventTime: sess2.loginAt!,
        createdAt: sess2.loginAt!,
      },
      {
        id: 'ev-2',
        sessionId: sess3.id,
        employeeId: emp3.id,
        eventType: 'LOGIN',
        eventTime: sess3.loginAt!,
        createdAt: sess3.loginAt!,
      },
      {
        id: 'ev-3',
        sessionId: sess3.id,
        employeeId: emp3.id,
        eventType: 'LUNCH_START',
        eventTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }
    );
  }
}

export const db = DatabaseStore.getInstance();
