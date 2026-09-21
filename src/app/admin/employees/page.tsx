'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  QrCode,
  Smartphone,
  Printer,
  Camera,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
} from 'lucide-react';
import { Employee, Department } from '@/types';
import { generateCode128SVG, getBadgeQRCodeUrl } from '@/lib/barcode';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Employee Form State
  const [addEmpModalOpen, setAddEmpModalOpen] = useState(false);
  const [newEmpData, setNewEmpData] = useState({
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    designation: '',
    pin: '1234',
    barcodeValue: '',
  });

  // Admin Live Barcode Scanner State
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [addEmpSuccessMsg, setAddEmpSuccessMsg] = useState<string | null>(null);
  const [addEmpErrorMsg, setAddEmpErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Badge Print Modal
  const [idCardModalEmp, setIdCardModalEmp] = useState<{
    employee: Employee;
    departmentName: string;
  } | null>(null);

  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees);
        setDepartments(data.departments);
        if (!newEmpData.departmentId && data.departments.length > 0) {
          setNewEmpData((prev) => ({ ...prev, departmentId: data.departments[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [newEmpData.departmentId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Start Camera for Admin ID Badge Scanner (Supports 1D Barcodes + QR codes)
  const startAdminBarcodeScanner = async () => {
    setIsScannerActive(true);
    setScannerError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ];

      const scanner = new Html5Qrcode('admin-qr-reader', {
        formatsToSupport,
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 160 }, // Rectangular guide for optimal 1D barcode & QR alignment
          aspectRatio: 1.777778,
        },
        (decodedText: string) => {
          stopAdminBarcodeScanner();
          setNewEmpData((prev) => ({ ...prev, barcodeValue: decodedText.trim().toUpperCase() }));
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('Admin scanner error:', err);
      setScannerError(
        'Camera is unavailable or permission denied. You can also enter the barcode manually in the field below.'
      );
    }
  };

  const stopAdminBarcodeScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping admin scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScannerActive(false);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddEmpErrorMsg(null);
    setAddEmpSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmpData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register employee');

      setAddEmpSuccessMsg(data.message);
      setNewEmpData({
        name: '',
        email: '',
        phone: '',
        departmentId: departments[0]?.id || '',
        designation: '',
        pin: '1234',
        barcodeValue: '',
      });
      fetchEmployees();
      setTimeout(() => {
        setAddEmpModalOpen(false);
        setAddEmpSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setAddEmpErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDeviceBinding = async (empId: string, empName: string) => {
    if (
      !confirm(
        `Reset device binding for ${empName}? They will be able to bind a new device on their next scan.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/employees/${empId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DEVICE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const departmentsMap = new Map(departments.map((d) => [d.id, d.name]));

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.barcodeValue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Employee Directory & Security</h1>
          <p className="text-xs text-slate-500">
            Register employees by scanning physical ID barcodes, assign PINs, and manage device locks.
          </p>
        </div>

        <button
          onClick={() => {
            setAddEmpModalOpen(true);
            setAddEmpErrorMsg(null);
            setAddEmpSuccessMsg(null);
          }}
          className="self-start sm:self-auto py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Employee</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, employee code, barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl light-input text-xs"
        />
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="rounded-2xl p-5 bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                  <p className="text-xs text-slate-500">{emp.designation}</p>
                  <span className="text-[10px] font-mono text-blue-600 font-semibold">
                    {emp.employeeCode} • {departmentsMap.get(emp.departmentId) || 'General'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Tokens */}
            <div className="p-3 rounded-xl bg-slate-50 space-y-2 text-xs border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Scanned Barcode:</span>
                <span className="font-mono text-slate-900 font-semibold">{emp.barcodeValue}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Security PIN:</span>
                <span className="font-mono text-emerald-700 font-bold">•••• (PIN: {emp.pin})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Device Binding:</span>
                <span
                  className={`font-semibold ${
                    emp.deviceToken ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {emp.deviceToken ? '1 Device Bound' : 'No Device Bound'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() =>
                  setIdCardModalEmp({
                    employee: emp,
                    departmentName: departmentsMap.get(emp.departmentId) || 'General',
                  })
                }
                className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Print Badge</span>
              </button>

              <button
                onClick={() => handleResetDeviceBinding(emp.id, emp.name)}
                className="py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center justify-center space-x-1 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Reset Device</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: REGISTER EMPLOYEE WITH LIVE BARCODE SCANNER */}
      {addEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-bold text-slate-900">Register New Employee</h3>
              <p className="text-xs text-slate-500">
                Enter employee details, scan their physical ID badge barcode, and set a security PIN.
              </p>
            </div>

            {addEmpSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{addEmpSuccessMsg}</span>
              </div>
            )}

            {addEmpErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{addEmpErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newEmpData.name}
                    onChange={(e) => setNewEmpData({ ...newEmpData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-xl light-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newEmpData.email}
                    onChange={(e) => setNewEmpData({ ...newEmpData, email: e.target.value })}
                    placeholder="john@ss40.network"
                    className="w-full px-3 py-2 rounded-xl light-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Department</label>
                  <select
                    value={newEmpData.departmentId}
                    onChange={(e) => setNewEmpData({ ...newEmpData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl light-input text-xs"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Designation</label>
                  <input
                    type="text"
                    value={newEmpData.designation}
                    onChange={(e) => setNewEmpData({ ...newEmpData, designation: e.target.value })}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full px-3 py-2 rounded-xl light-input text-xs"
                    required
                  />
                </div>
              </div>

              {/* Physical ID Card Barcode Scan Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800">Physical ID Card Barcode</span>
                  </div>

                  <button
                    type="button"
                    onClick={isScannerActive ? stopAdminBarcodeScanner : startAdminBarcodeScanner}
                    className="py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 flex items-center space-x-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isScannerActive ? 'Close Camera' : 'Scan Physical Card'}</span>
                  </button>
                </div>

                {isScannerActive && (
                  <div className="space-y-2">
                    <div
                      id="admin-qr-reader"
                      ref={scannerRef}
                      className="w-full h-56 rounded-xl overflow-hidden border-2 border-blue-500 bg-slate-900"
                    />
                    <p className="text-[11px] text-slate-500 text-center">
                      Point camera at the employee's physical ID card barcode
                    </p>
                  </div>
                )}

                {scannerError && (
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-800 text-[11px] border border-amber-200">
                    {scannerError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 text-[11px] font-medium mb-1">
                    Barcode / ID Card Token (Scanned or Type Manually)
                  </label>
                  <input
                    type="text"
                    value={newEmpData.barcodeValue}
                    onChange={(e) =>
                      setNewEmpData({ ...newEmpData, barcodeValue: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. SS40-EMP-8F73K2 (or leave empty to auto-generate)"
                    className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-mono border border-slate-300"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: Scanning physical ID badge guarantees 1:1 hardware card matching.
                  </p>
                </div>
              </div>

              {/* Security PIN */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  4-Digit Security PIN
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={newEmpData.pin}
                  onChange={(e) => setNewEmpData({ ...newEmpData, pin: e.target.value })}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 rounded-xl light-input text-xs font-mono text-center tracking-widest text-sm"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Employee will use this PIN to log in their morning shift.
                </p>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    stopAdminBarcodeScanner();
                    setAddEmpModalOpen(false);
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE ID BADGE */}
      {idCardModalEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Printable Employee Badge</h3>
              <button
                onClick={() => setIdCardModalEmp(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Printable ID Badge */}
            <div
              id="printable-badge"
              className="bg-white border-2 border-slate-300 rounded-2xl p-6 text-center text-slate-900 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-extrabold text-xs tracking-wider text-blue-600">
                  SS40 NETWORK
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">
                  {idCardModalEmp.employee.employeeCode}
                </span>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-800 mx-auto flex items-center justify-center text-xl font-bold">
                {idCardModalEmp.employee.name.charAt(0)}
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">{idCardModalEmp.employee.name}</h4>
                <p className="text-xs text-slate-600">{idCardModalEmp.employee.designation}</p>
                <span className="text-[11px] text-blue-600 font-semibold">
                  {idCardModalEmp.departmentName}
                </span>
              </div>

              {/* Scannable Barcode & QR Code Section */}
              <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-3">
                {/* 1D Code 128 Barcode */}
                <div className="space-y-1">
                  <div
                    className="h-12 flex justify-center items-center overflow-hidden"
                    dangerouslySetInnerHTML={{
                      __html: generateCode128SVG(idCardModalEmp.employee.barcodeValue, 48, 1.8),
                    }}
                  />
                  <p className="text-[11px] font-mono font-bold tracking-widest text-slate-900">
                    {idCardModalEmp.employee.barcodeValue}
                  </p>
                </div>

                {/* 2D QR Code as Instant Alternative */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-center space-x-3">
                  <img
                    src={getBadgeQRCodeUrl(idCardModalEmp.employee.barcodeValue)}
                    alt="Badge QR Code"
                    className="w-20 h-20 rounded-lg border border-slate-200 p-1 bg-white"
                  />
                  <div className="text-left text-[10px] text-slate-500">
                    <p className="font-semibold text-slate-700">Dual-Format Badge</p>
                    <p>Scannable via 1D Barcode laser or 2D camera QR scan.</p>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 pt-0.5">
                Official Workplace ID Card • Scan to mark attendance
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
