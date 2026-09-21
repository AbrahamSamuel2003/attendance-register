import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Employee, Office, AttendanceSession, AttendanceEvent } from '@/types';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sbynjtylqwsccszvsnpy.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_uGP_d_E5mCxAZeg-1fTsrg_cfxsKBsS';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Fetch Office Settings from Supabase
 */
export async function getOfficeSettingsFromSupabase(): Promise<Office | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('office_settings')
      .select('*')
      .eq('id', 'off-ss40-hq')
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      address: data.address || '',
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radius_meters,
      timezone: data.timezone || 'Asia/Kolkata',
      status: data.status || 'ACTIVE',
    };
  } catch (err) {
    console.warn('Supabase fetch office error:', err);
    return null;
  }
}

/**
 * Save Office Settings to Supabase
 */
export async function saveOfficeSettingsToSupabase(office: Office): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('office_settings').upsert(
      {
        id: office.id || 'off-ss40-hq',
        name: office.name,
        address: office.address,
        latitude: office.latitude,
        longitude: office.longitude,
        radius_meters: office.radiusMeters,
        timezone: office.timezone,
        status: office.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (err) {
    console.warn('Supabase save office error:', err);
    return false;
  }
}

/**
 * Fetch All Employees from Supabase
 */
export async function getEmployeesFromSupabase(): Promise<Employee[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return null;

    return data.map((d: any) => ({
      id: d.id,
      employeeCode: d.employee_code,
      name: d.name,
      email: d.email,
      phone: d.phone || '',
      departmentId: d.department_id,
      designation: d.designation,
      barcodeValue: d.barcode_value,
      pin: d.pin || '1234',
      deviceToken: d.device_token || null,
      deviceModel: d.device_model || null,
      status: d.status || 'ACTIVE',
      joinedAt: d.joined_at,
      createdAt: d.created_at,
    }));
  } catch (err) {
    console.warn('Supabase fetch employees error:', err);
    return null;
  }
}

/**
 * Save / Upsert Employee to Supabase
 */
export async function saveEmployeeToSupabase(employee: Employee): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('employees').upsert(
      {
        id: employee.id,
        employee_code: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department_id: employee.departmentId,
        designation: employee.designation,
        barcode_value: employee.barcodeValue,
        pin: employee.pin,
        device_token: employee.deviceToken,
        device_model: employee.deviceModel,
        status: employee.status,
        joined_at: employee.joinedAt,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (err) {
    console.warn('Supabase save employee error:', err);
    return false;
  }
}

/**
 * Delete Employee from Supabase
 */
export async function deleteEmployeeFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.warn('Supabase delete employee error:', err);
    return false;
  }
}

/**
 * Save Attendance Session to Supabase
 */
export async function saveSessionToSupabase(session: AttendanceSession): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('attendance_sessions').upsert(
      {
        id: session.id,
        employee_id: session.employeeId,
        office_id: session.officeId,
        attendance_date: session.attendanceDate,
        status: session.status,
        login_at: session.loginAt,
        logout_at: session.logoutAt,
        total_work_minutes: session.totalWorkMinutes,
        total_break_minutes: session.totalBreakMinutes,
        total_lunch_minutes: session.totalLunchMinutes,
        is_late: session.isLate,
        late_minutes: session.lateMinutes,
        is_missed_logout: session.isMissedLogout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (err) {
    console.warn('Supabase save session error:', err);
    return false;
  }
}

/**
 * Save Attendance Event to Supabase
 */
export async function saveEventToSupabase(event: AttendanceEvent): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('attendance_events').upsert(
      {
        id: event.id,
        session_id: event.sessionId,
        employee_id: event.employeeId,
        event_type: event.eventType,
        event_time: event.eventTime,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (err) {
    console.warn('Supabase save event error:', err);
    return false;
  }
}
