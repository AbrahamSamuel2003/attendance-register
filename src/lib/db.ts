import { Department, Employee, Office, AttendanceSession, AttendanceEvent } from '@/types';
import {
  getOfficeSettingsFromSupabase,
  saveOfficeSettingsToSupabase,
  getEmployeesFromSupabase,
  saveEmployeeToSupabase,
  deleteEmployeeFromSupabase,
  saveSessionToSupabase,
  saveEventToSupabase,
} from './supabase';

// In-memory data store (persists across API requests in Node runtime)
export class DatabaseStore {
  private static instance: DatabaseStore;

  public adminPassword: string = '654321';

  public office: Office = {
    id: 'off-ss40-hq',
    name: 'SS40 Network Main Office',
    address: 'SS40 Tech Park, 4th Floor, Innovation Wing',
    latitude: 12.9716, // Default coordinate
    longitude: 77.5946,
    radiusMeters: 100, // Default 100 meters
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
      pin: '1234',
      deviceToken: null,
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
  ];

  public sessions: AttendanceSession[] = [];
  public events: AttendanceEvent[] = [];
  private initializedPromise: Promise<void> | null = null;

  private constructor() {
    this.seedTodaySessions();
    this.loadFromDisk();
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.initializedPromise) {
      this.initializedPromise = this.syncWithSupabase();
    }
    await this.initializedPromise;
  }

  public async syncWithSupabase(): Promise<void> {
    try {
      const office = await getOfficeSettingsFromSupabase();
      if (office) {
        this.office = office;
      } else {
        await saveOfficeSettingsToSupabase(this.office);
      }

      const emps = await getEmployeesFromSupabase();
      if (emps && emps.length > 0) {
        this.employees = emps;
      }
    } catch (err) {
      console.warn('Supabase sync warning:', err);
    }
  }

  public async saveOffice(office: Office): Promise<boolean> {
    this.office = { ...office };
    this.persistToDisk();
    try {
      return await saveOfficeSettingsToSupabase(this.office);
    } catch (err) {
      console.warn('Supabase save office error:', err);
      return false;
    }
  }

  public async upsertEmployee(emp: Employee): Promise<boolean> {
    const idx = this.employees.findIndex((e) => e.id === emp.id);
    if (idx >= 0) {
      this.employees[idx] = { ...emp };
    } else {
      this.employees.push({ ...emp });
    }
    this.persistToDisk();
    try {
      return await saveEmployeeToSupabase(emp);
    } catch (err) {
      console.warn('Supabase save employee error:', err);
      return false;
    }
  }

  // Alias for backward compatibility
  public async addEmployee(emp: Employee): Promise<boolean> {
    return this.upsertEmployee(emp);
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    this.employees = this.employees.filter((e) => e.id !== id);
    this.sessions = this.sessions.filter((s) => s.employeeId !== id);
    this.events = this.events.filter((ev) => ev.employeeId !== id);
    this.persistToDisk();
    try {
      return await deleteEmployeeFromSupabase(id);
    } catch (err) {
      console.warn('Supabase delete employee error:', err);
      return false;
    }
  }

  public async saveSession(session: AttendanceSession): Promise<boolean> {
    const idx = this.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      this.sessions[idx] = { ...session };
    } else {
      this.sessions.push({ ...session });
    }
    this.persistToDisk();
    try {
      return await saveSessionToSupabase(session);
    } catch (err) {
      console.warn('Supabase save session error:', err);
      return false;
    }
  }

  public async saveEvent(event: AttendanceEvent): Promise<boolean> {
    const idx = this.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      this.events[idx] = { ...event };
    } else {
      this.events.push({ ...event });
    }
    this.persistToDisk();
    try {
      return await saveEventToSupabase(event);
    } catch (err) {
      console.warn('Supabase save event error:', err);
      return false;
    }
  }

  public persistToDisk() {
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

  public persist() {
    this.persistToDisk();
    // Fire and forget background sync
    this.saveOffice(this.office).catch(() => {});
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
    if (!this.employees || this.employees.length < 2) return;

    const emp2 = this.employees[1];
    if (!emp2) return;

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

    this.sessions.push(sess2);

    this.events.push({
      id: 'ev-1',
      sessionId: sess2.id,
      employeeId: emp2.id,
      eventType: 'LOGIN',
      eventTime: sess2.loginAt!,
      createdAt: sess2.loginAt!,
    });
  }
}

export const db = DatabaseStore.getInstance();
