import { AttendanceEventType, AttendanceStatus } from '@/types';

export interface StateTransitionRule {
  allowedEvents: AttendanceEventType[];
  nextState: (event: AttendanceEventType) => AttendanceStatus;
}

export const STATE_MACHINE_RULES: Record<AttendanceStatus, AttendanceEventType[]> = {
  NOT_STARTED: ['LOGIN'],
  LOGGED_IN: ['BREAK_START', 'LUNCH_START', 'LOGOUT'],
  ON_BREAK: ['BREAK_END'],
  ON_LUNCH: ['LUNCH_END'],
  LOGGED_OUT: [], // Terminal for the day
  MISSED_LOGOUT: [], // Closed by system
};

export function isValidTransition(
  currentStatus: AttendanceStatus,
  action: AttendanceEventType
): boolean {
  const allowed = STATE_MACHINE_RULES[currentStatus] || [];
  return allowed.includes(action);
}

export function getNextStatus(
  currentStatus: AttendanceStatus,
  action: AttendanceEventType
): AttendanceStatus {
  switch (action) {
    case 'LOGIN':
      return 'LOGGED_IN';
    case 'BREAK_START':
      return 'ON_BREAK';
    case 'BREAK_END':
      return 'LOGGED_IN';
    case 'LUNCH_START':
      return 'ON_LUNCH';
    case 'LUNCH_END':
      return 'LOGGED_IN';
    case 'LOGOUT':
      return 'LOGGED_OUT';
    case 'AUTO_CLOSE_MIDNIGHT':
      return 'MISSED_LOGOUT';
    default:
      return currentStatus;
  }
}

/**
 * Calculates work, break, and lunch durations in minutes from sequential events.
 */
export function recalculateSessionDurations(events: { eventType: AttendanceEventType; eventTime: string }[]): {
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  totalLunchMinutes: number;
} {
  let totalBreak = 0;
  let totalLunch = 0;
  let workStartTime: Date | null = null;
  let workEndTime: Date | null = null;
  let breakStartTime: Date | null = null;
  let lunchStartTime: Date | null = null;

  // Sort chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
  );

  for (const ev of sorted) {
    const time = new Date(ev.eventTime);

    switch (ev.eventType) {
      case 'LOGIN':
        if (!workStartTime) workStartTime = time;
        break;

      case 'BREAK_START':
        breakStartTime = time;
        break;

      case 'BREAK_END':
        if (breakStartTime) {
          totalBreak += Math.max(0, Math.round((time.getTime() - breakStartTime.getTime()) / 60000));
          breakStartTime = null;
        }
        break;

      case 'LUNCH_START':
        lunchStartTime = time;
        break;

      case 'LUNCH_END':
        if (lunchStartTime) {
          totalLunch += Math.max(0, Math.round((time.getTime() - lunchStartTime.getTime()) / 60000));
          lunchStartTime = null;
        }
        break;

      case 'LOGOUT':
      case 'AUTO_CLOSE_MIDNIGHT':
        workEndTime = time;
        break;
    }
  }

  // Handle open break/lunch if session is still in progress
  const now = new Date();
  if (breakStartTime && !workEndTime) {
    totalBreak += Math.max(0, Math.round((now.getTime() - breakStartTime.getTime()) / 60000));
  }
  if (lunchStartTime && !workEndTime) {
    totalLunch += Math.max(0, Math.round((now.getTime() - lunchStartTime.getTime()) / 60000));
  }

  let totalWork = 0;
  if (workStartTime) {
    const end = workEndTime || now;
    const grossMinutes = Math.max(0, Math.round((end.getTime() - workStartTime.getTime()) / 60000));
    totalWork = Math.max(0, grossMinutes - (totalBreak + totalLunch));
  }

  return {
    totalWorkMinutes: totalWork,
    totalBreakMinutes: totalBreak,
    totalLunchMinutes: totalLunch,
  };
}
