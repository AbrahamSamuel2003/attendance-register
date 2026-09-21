'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Download, Calendar, Users, Clock, Coffee, AlertTriangle } from 'lucide-react';
import { LiveAttendanceRecord } from '@/types';

export default function AdminReportsPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [records, setRecords] = useState<LiveAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Default to today's date in IST
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    setSelectedDate(todayStr);
  }, []);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/attendance/live');
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchReportData();
    }
  }, [selectedDate, fetchReportData]);

  // Aggregate stats
  let totalWorkMins = 0;
  let totalBreakMins = 0;
  let totalLunchMins = 0;
  let lateCount = 0;
  let presentCount = 0;

  records.forEach((r) => {
    if (r.session) {
      totalWorkMins += r.session.totalWorkMinutes || 0;
      totalBreakMins += r.session.totalBreakMinutes || 0;
      totalLunchMins += r.session.totalLunchMinutes || 0;
      if (r.session.isLate) lateCount++;
      if (r.session.status === 'LOGGED_IN' || r.session.status === 'LOGGED_OUT') presentCount++;
    }
  });

  const totalWorkHours = (totalWorkMins / 60).toFixed(1);
  const avgWorkHours = presentCount > 0 ? (totalWorkMins / presentCount / 60).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header & Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">Attendance Reports & Export</h1>
          <p className="text-xs text-slate-500">
            Generate and export calculated daily shift logs, break summaries, and audit records.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs text-slate-800 bg-transparent outline-none font-medium w-full"
            />
          </div>

          <a
            href={`/api/reports/export-excel?date=${selectedDate}`}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">Download Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium truncate">Total Work Hours</span>
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalWorkHours}h</div>
          <span className="text-[10px] text-slate-500 truncate block">Gross employee hours</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium truncate">Avg Work / Person</span>
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{avgWorkHours}h</div>
          <span className="text-[10px] text-slate-500 truncate block">Per present staff</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium truncate">Total Break Time</span>
            <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalBreakMins + totalLunchMins}m</div>
          <span className="text-[10px] text-slate-500 truncate block">Break + Lunch mins</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium truncate">Late Arrivals</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{lateCount}</div>
          <span className="text-[10px] text-rose-600 font-medium truncate block">After 09:45 AM</span>
        </div>
      </div>

      {/* MOBILE CARD GRID: Hidden on desktop (md:hidden) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
        {records.map((rec) => {
          const session = rec.session;
          const status = session ? session.status : 'NOT_STARTED';

          const loginTime = session?.loginAt
            ? new Date(session.loginAt).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '--:--';

          const logoutTime = session?.logoutAt
            ? new Date(session.logoutAt).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '--:--';

          const statusColors: Record<string, string> = {
            LOGGED_IN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            ON_BREAK: 'bg-amber-50 text-amber-800 border-amber-200',
            ON_LUNCH: 'bg-orange-50 text-orange-800 border-orange-200',
            LOGGED_OUT: 'bg-slate-100 text-slate-700 border-slate-200',
            MISSED_LOGOUT: 'bg-rose-50 text-rose-700 border-rose-200',
            NOT_STARTED: 'bg-slate-50 text-slate-500 border-slate-200',
          };

          return (
            <div
              key={rec.employee.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {rec.employee.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{rec.employee.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{rec.department.name}</p>
                    <span className="text-[10px] font-mono text-blue-600 font-semibold block truncate">
                      {rec.employee.employeeCode}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                    statusColors[status] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {status.replace('_', ' ')}
                </span>
              </div>

              {/* Time Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Login / Logout</span>
                  <span className="font-mono font-semibold text-slate-800 text-[11px]">
                    {loginTime} → {logoutTime}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Work Time</span>
                  <span className="font-bold text-slate-900 text-[11px]">
                    {session ? (session.totalWorkMinutes / 60).toFixed(1) + 'h' : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Short Break</span>
                  <span className="font-semibold text-amber-700 text-[11px]">
                    {session ? `${session.totalBreakMinutes}m` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Lunch Time</span>
                  <span className="font-semibold text-orange-700 text-[11px]">
                    {session ? `${session.totalLunchMinutes}m` : '--'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP DETAILED TABLE: Hidden on mobile (hidden md:block) */}
      <div className="hidden md:block rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Login</th>
                <th className="py-3 px-4">Logout</th>
                <th className="py-3 px-4">Work Time</th>
                <th className="py-3 px-4">Break Time</th>
                <th className="py-3 px-4">Lunch Time</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => {
                const session = rec.session;
                const status = session ? session.status : 'NOT_STARTED';

                const loginTime = session?.loginAt
                  ? new Date(session.loginAt).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--';

                const logoutTime = session?.logoutAt
                  ? new Date(session.logoutAt).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--';

                return (
                  <tr key={rec.employee.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 font-medium">
                      {rec.employee.employeeCode}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{rec.employee.name}</td>
                    <td className="py-3.5 px-4 text-slate-700">{rec.department.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{loginTime}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{logoutTime}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {session ? (session.totalWorkMinutes / 60).toFixed(1) + 'h' : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-amber-700">
                      {session ? `${session.totalBreakMinutes}m` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-orange-700">
                      {session ? `${session.totalLunchMinutes}m` : '--'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
