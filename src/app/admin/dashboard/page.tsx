'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Coffee,
  Utensils,
  LogOut,
  UserX,
  RefreshCw,
  Search,
  Smartphone,
  QrCode,
  Printer,
} from 'lucide-react';
import { AttendanceSummaryKPI, LiveAttendanceRecord, Department } from '@/types';

export default function AdminDashboardPage() {
  const [kpi, setKpi] = useState<AttendanceSummaryKPI>({
    totalEmployees: 0,
    presentCount: 0,
    notLoggedInCount: 0,
    onBreakCount: 0,
    onLunchCount: 0,
    loggedOutCount: 0,
    missedLogoutCount: 0,
    lateArrivalsCount: 0,
  });
  const [records, setRecords] = useState<LiveAttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [eventHistoryModal, setEventHistoryModal] = useState<LiveAttendanceRecord | null>(null);

  const fetchLiveData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const res = await fetch('/api/attendance/live');
      const data = await res.json();
      if (data.success) {
        setKpi(data.kpi);
        setRecords(data.records);
      }

      const settingsRes = await fetch('/api/admin/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setDepartments(settingsData.departments);
      }

      setLastSyncedTime(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err) {
      console.error('Failed to fetch live attendance:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(() => {
      fetchLiveData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.employee.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.employee.designation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'ALL' || rec.employee.departmentId === selectedDept;
    const currentStatus = rec.session ? rec.session.status : 'NOT_STARTED';
    const matchesStatus = selectedStatus === 'ALL' || currentStatus === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* KPI Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">Attendance Dashboard</h1>
          <p className="text-xs text-slate-500">Real-time daily shift tracking & workforce analytics</p>
        </div>

        <button
          onClick={() => fetchLiveData(true)}
          disabled={isRefreshing}
          className="self-start sm:self-auto py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* KPI Counter Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpi.totalEmployees}</div>
          <span className="text-[10px] text-slate-500">Registered employees</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium">Logged In</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{kpi.presentCount}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Active at desk</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">On Break</span>
            <Coffee className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{kpi.onBreakCount}</div>
          <span className="text-[10px] text-amber-600 font-medium">Tea / Coffee</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-orange-200 shadow-xs">
          <div className="flex items-center justify-between text-orange-700 mb-1">
            <span className="text-xs font-medium">On Lunch</span>
            <Utensils className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{kpi.onLunchCount}</div>
          <span className="text-[10px] text-orange-600 font-medium">Lunch hour</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-medium">Logged Out</span>
            <LogOut className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700">{kpi.loggedOutCount}</div>
          <span className="text-[10px] text-slate-500">Shift completed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-medium">Not Logged In</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{kpi.notLoggedInCount}</div>
          <span className="text-[10px] text-rose-600 font-medium">Pending check-in</span>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, code, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl light-input text-xs"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:space-x-3 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl light-input text-xs w-full sm:w-auto truncate"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl light-input text-xs w-full sm:w-auto truncate"
          >
            <option value="ALL">All Statuses</option>
            <option value="LOGGED_IN">Logged In</option>
            <option value="ON_BREAK">On Break</option>
            <option value="ON_LUNCH">On Lunch</option>
            <option value="LOGGED_OUT">Logged Out</option>
            <option value="NOT_STARTED">Not Logged In</option>
            <option value="MISSED_LOGOUT">Missed Logout</option>
          </select>
        </div>
      </div>

      {/* 1. Mobile Card Grid View (Visible on < 768px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            No employees match the selected criteria.
          </div>
        ) : (
          filteredRecords.map((rec) => {
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
              <div
                key={rec.employee.id}
                onClick={() => setEventHistoryModal(rec)}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all space-y-3 min-w-0 cursor-pointer group"
              >
                {/* Header: Avatar, Name, Status Pill */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      {rec.employee.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 text-xs block truncate group-hover:text-blue-600 transition-colors">
                        {rec.employee.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        {rec.employee.employeeCode} • {rec.employee.designation}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      status === 'LOGGED_IN'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : status === 'ON_BREAK'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : status === 'ON_LUNCH'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : status === 'LOGGED_OUT'
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : status === 'MISSED_LOGOUT'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </span>
                </div>

                {/* Shift Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                    <span className="text-[10px] text-slate-500 block">Login / Logout</span>
                    <span className="font-mono font-bold text-slate-800 truncate block text-[11px]">
                      {loginTime} {session?.logoutAt ? `→ ${logoutTime}` : ''}
                    </span>
                    {session?.isLate && (
                      <span className="text-[9px] text-amber-600 font-sans block truncate">
                        Late Arrival ({session.lateMinutes}m)
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                    <span className="text-[10px] text-slate-500 block">Work Time</span>
                    <span className="font-bold text-slate-900 truncate block text-[11px]">
                      {session ? `${(session.totalWorkMinutes / 60).toFixed(1)}h` : '--'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-normal block truncate">
                      Break: {session?.totalBreakMinutes || 0}m | Lunch: {session?.totalLunchMinutes || 0}m
                    </span>
                  </div>
                </div>

                {/* Footer: Department, Device & View Details */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-[10px] font-semibold text-slate-600 block truncate">
                      {rec.department.name}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1 truncate">
                      <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{rec.employee.deviceToken ? 'Device Bound' : 'Pending Scan'}</span>
                    </span>
                  </div>

                  <span className="text-[11px] text-blue-600 font-semibold group-hover:underline shrink-0">
                    View Details →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View (Hidden on < 768px) */}
      <div className="hidden md:block rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Login Time</th>
                <th className="py-3 px-4">Work / Break / Lunch</th>
                <th className="py-3 px-4">Device Binding</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No employees match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const session = rec.session;
                  const status = session ? session.status : 'NOT_STARTED';

                  const loginTime = session?.loginAt
                    ? new Date(session.loginAt).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--';

                  return (
                    <tr
                      key={rec.employee.id}
                      onClick={() => setEventHistoryModal(rec)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      {/* Employee */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {rec.employee.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate hover:text-blue-600">
                              {rec.employee.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 truncate block">
                              {rec.employee.employeeCode} • {rec.employee.designation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {rec.department.name}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            status === 'LOGGED_IN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'ON_BREAK'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : status === 'ON_LUNCH'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : status === 'LOGGED_OUT'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : status === 'MISSED_LOGOUT'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Login Time */}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {loginTime}
                        {session?.isLate && (
                          <span className="text-[10px] text-amber-600 block font-sans">
                            Late ({session.lateMinutes}m)
                          </span>
                        )}
                      </td>

                      {/* Work / Break / Lunch */}
                      <td className="py-3.5 px-4 text-slate-700">
                        {session ? (
                          <div className="space-y-0.5 text-[11px]">
                            <span className="font-semibold text-slate-900 block">
                              {(session.totalWorkMinutes / 60).toFixed(1)}h work
                            </span>
                            <span className="text-slate-500 block text-[10px]">
                              Break: {session.totalBreakMinutes}m | Lunch: {session.totalLunchMinutes}m
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Device Binding */}
                      <td className="py-3.5 px-4">
                        {rec.employee.deviceToken ? (
                          <span className="text-emerald-700 font-medium text-[11px] flex items-center space-x-1">
                            <Smartphone className="w-3 h-3" />
                            <span>Bound & Verified</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending 1st Scan</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventHistoryModal(rec);
                          }}
                          className="py-1 px-3 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-semibold transition-colors"
                        >
                          Audit Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: COMPREHENSIVE EMPLOYEE SHIFT & AUDIT DETAIL OVERLAY */}
      {eventHistoryModal && (
        <div
          onClick={() => setEventHistoryModal(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#fdfcf9] border border-[#e8dfd2] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-start justify-between gap-3 border-b border-[#ebe1d3] pb-4 shrink-0">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                  {eventHistoryModal.employee.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {eventHistoryModal.employee.name}
                  </h3>
                  <p className="text-xs text-[#786b59] truncate">
                    {eventHistoryModal.employee.designation} • {eventHistoryModal.department.name}
                  </p>
                  <span className="text-[10px] font-mono text-blue-600 font-bold">
                    ID: {eventHistoryModal.employee.employeeCode}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEventHistoryModal(null)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] hover:bg-[#eae3d5] text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body (Single Smooth Scrollbar) */}
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 py-4 pr-1">
              {/* Current Shift Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#f4f7fc] border border-[#d6e2f5] text-center min-w-0 shadow-2xs">
                  <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">
                    Net Work
                  </span>
                  <span className="text-lg font-extrabold text-blue-900 block font-mono">
                    {eventHistoryModal.session
                      ? `${(eventHistoryModal.session.totalWorkMinutes / 60).toFixed(1)}h`
                      : '--'}
                  </span>
                  <span className="text-[10px] text-blue-600/80">
                    {eventHistoryModal.session?.totalWorkMinutes || 0} mins
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#fbf7f0] border border-[#ebe1d3] text-center min-w-0 shadow-2xs">
                  <span className="text-[10px] text-[#8a7b68] font-bold block uppercase tracking-wider">
                    Break Time
                  </span>
                  <span className="text-lg font-extrabold text-[#4a3f31] block font-mono">
                    {eventHistoryModal.session?.totalBreakMinutes || 0}m
                  </span>
                  <span className="text-[10px] text-[#8a7b68]">Short Break</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#f0f9f4] border border-[#d1ebd9] text-center min-w-0 shadow-2xs">
                  <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">
                    Lunch Time
                  </span>
                  <span className="text-lg font-extrabold text-emerald-900 block font-mono">
                    {eventHistoryModal.session?.totalLunchMinutes || 0}m
                  </span>
                  <span className="text-[10px] text-emerald-700/80">Lunch Hour</span>
                </div>
              </div>

              {/* Shift Status & Timing Overview */}
              <div className="p-3.5 rounded-2xl bg-[#fbf8f2] border border-[#ebe1d3] space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-[#786b59]">Current Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      (eventHistoryModal.session?.status || 'NOT_STARTED') === 'LOGGED_IN'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : (eventHistoryModal.session?.status || 'NOT_STARTED') === 'ON_BREAK'
                        ? 'bg-[#fbf7f0] text-[#786b59] border-[#ebe1d3]'
                        : (eventHistoryModal.session?.status || 'NOT_STARTED') === 'ON_LUNCH'
                        ? 'bg-[#f0f9f4] text-emerald-800 border-[#d1ebd9]'
                        : (eventHistoryModal.session?.status || 'NOT_STARTED') === 'LOGGED_OUT'
                        ? 'bg-[#f4efe6] text-slate-800 border-[#ded5c6]'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {(eventHistoryModal.session?.status || 'NOT_STARTED').replace('_', ' ')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-[#786b59]">Login Time:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {eventHistoryModal.session?.loginAt
                      ? new Date(eventHistoryModal.session.loginAt).toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '--:--:--'}
                    {eventHistoryModal.session?.isLate && (
                      <span className="text-amber-700 ml-1 font-sans text-[11px]">
                        (Late by {eventHistoryModal.session.lateMinutes}m)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-[#786b59]">Logout Time:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {eventHistoryModal.session?.logoutAt
                      ? new Date(eventHistoryModal.session.logoutAt).toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '--:--:-- (In Progress)'}
                  </span>
                </div>
              </div>

              {/* Sequential Shift Events Timeline */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Shift Event Timeline ({eventHistoryModal.todayEvents.length})</span>
                  <span className="text-[10px] text-[#8a7b68] normal-case font-normal">
                    Ordered chronologically
                  </span>
                </h4>

                <div className="space-y-2">
                  {eventHistoryModal.todayEvents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#fbf8f2] text-center text-xs text-[#8a7b68] border border-[#ebe1d3]">
                      No attendance events recorded today yet.
                    </div>
                  ) : (
                    eventHistoryModal.todayEvents.map((ev, idx) => {
                      const eventConfig: Record<string, { label: string; color: string }> = {
                        LOGIN: { label: 'Day Check-In / Shift Start', color: 'bg-emerald-600 text-white' },
                        BREAK_START: { label: 'Started Short Break', color: 'bg-blue-600 text-white' },
                        BREAK_END: { label: 'Ended Short Break', color: 'bg-emerald-600 text-white' },
                        LUNCH_START: { label: 'Started Lunch Break', color: 'bg-blue-600 text-white' },
                        LUNCH_END: { label: 'Ended Lunch Break', color: 'bg-emerald-600 text-white' },
                        LOGOUT: { label: 'Shift Completed / Logged Out', color: 'bg-slate-700 text-white' },
                        AUTO_CLOSE_MIDNIGHT: {
                          label: 'Auto-Closed at Midnight',
                          color: 'bg-slate-600 text-white',
                        },
                      };

                      const cfg = eventConfig[ev.eventType] || {
                        label: ev.eventType,
                        color: 'bg-blue-600 text-white',
                      };

                      return (
                        <div
                          key={ev.id || idx}
                          className="p-3 rounded-2xl bg-white border border-[#ebe1d3] hover:border-blue-300 transition-colors flex items-center justify-between text-xs gap-2 shadow-2xs"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <div
                              className={`w-6 h-6 rounded-lg ${cfg.color} flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs`}
                            >
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 block truncate">
                                {cfg.label}
                              </span>
                              <span className="text-[10px] text-[#786b59] truncate block">
                                {ev.notes || 'Biometric / Geofence verified'}
                              </span>
                            </div>
                          </div>

                          <span className="font-mono text-blue-600 font-bold text-xs shrink-0">
                            {new Date(ev.eventTime).toLocaleTimeString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer (Fixed at bottom) */}
            <div className="pt-3 border-t border-[#ebe1d3] shrink-0">
              <button
                onClick={() => setEventHistoryModal(null)}
                className="w-full py-2.5 rounded-xl bg-[#f4efe6] hover:bg-blue-600 hover:text-white text-slate-800 font-semibold text-xs border border-[#ded5c6] transition-all shadow-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
