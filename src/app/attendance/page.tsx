'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Lock,
  Coffee,
  Utensils,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Camera,
  ArrowLeft,
  Clock,
  Zap,
  Navigation,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceEventType, AttendanceStatus } from '@/types';
import { decodeBarcodeFromFile } from '@/lib/scanner';

export default function AttendanceMobilePage() {
  // Device & Location State
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [deviceModel, setDeviceModel] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<{
    checked: boolean;
    isInside: boolean;
    distanceMeters: number;
    allowedRadius: number;
    officeName: string;
    loading: boolean;
    error: string | null;
  }>({
    checked: false,
    isInside: false,
    distanceMeters: 0,
    allowedRadius: 100,
    officeName: 'SS40 Main Office',
    loading: true,
    error: null,
  });

  // Scanner & Employee State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [employeeData, setEmployeeData] = useState<{
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    designation: string;
    barcodeValue: string;
    deviceBound: boolean;
  } | null>(null);

  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('NOT_STARTED');
  const [allowedActions, setAllowedActions] = useState<AttendanceEventType[]>(['LOGIN']);
  const [sessionData, setSessionData] = useState<{
    loginAt: string | null;
    logoutAt: string | null;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
    totalLunchMinutes: number;
    isLate: boolean;
  } | null>(null);

  // PIN Pad Modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: AttendanceEventType | null;
    title: string;
    description: string;
  }>({
    open: false,
    action: null,
    title: '',
    description: '',
  });

  // Action Loading & Feedback
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Live Timer
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Scanner container ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [isScanningFile, setIsScanningFile] = useState(false);

  // 1. Initialize Device UUID & Clock
  useEffect(() => {
    let token = localStorage.getItem('ss40_device_uuid');
    if (!token) {
      token = 'dev-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now().toString(36);
      localStorage.setItem('ss40_device_uuid', token);
    }
    setDeviceToken(token);

    const ua = navigator.userAgent;
    let model = 'Mobile Device';
    if (ua.includes('iPhone')) model = 'Apple iPhone';
    else if (ua.includes('Android')) model = 'Android Smartphone';
    else if (ua.includes('Windows')) model = 'Windows PC';
    else if (ua.includes('Macintosh')) model = 'Mac Device';
    setDeviceModel(model);

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 2. High-Speed Location Request & Backend Verification
  const verifyLocationWithServer = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch('/api/attendance/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify location');

      setLocationStatus({
        checked: true,
        isInside: data.isInside,
        distanceMeters: data.distanceMeters,
        allowedRadius: data.allowedRadiusMeters,
        officeName: data.office.name,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setLocationStatus((prev) => ({
        ...prev,
        loading: false,
        checked: true,
        error: err.message || 'Geofence verification failed',
      }));
    }
  }, []);

  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus((prev) => ({
        ...prev,
        loading: false,
        checked: true,
        error: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    // Check for insecure context on mobile (HTTP on LAN IP blocks GPS in Chrome/Safari)
    const isSecure = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;

    setLocationStatus((prev) => ({ ...prev, loading: true, error: null }));

    // High-speed location request with fast timeout (2.5s)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy });
        verifyLocationWithServer(latitude, longitude);
      },
      (err) => {
        // Fallback to standard accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setCoords({ lat: latitude, lng: longitude, accuracy });
            verifyLocationWithServer(latitude, longitude);
          },
          (fallbackErr) => {
            console.warn('GPS location error:', fallbackErr.message);
            const errDetail = !isSecure
              ? 'Local network HTTP detected. Tap "Verify Location" below to proceed, or deploy to Vercel (HTTPS) for native GPS prompts.'
              : 'Please allow location permission in your browser or tap "Turn On GPS" to retry.';
            setLocationStatus((prev) => ({
              ...prev,
              loading: false,
              checked: true,
              error: errDetail,
            }));
          },
          { enableHighAccuracy: false, timeout: 2500, maximumAge: 120000 }
        );
      },
      { enableHighAccuracy: true, timeout: 2000, maximumAge: 60000 }
    );
  }, [verifyLocationWithServer]);

  const isManualSimulateRef = useRef(false);

  useEffect(() => {
    requestGPS();

    // Auto-listen for location updates (triggers when user moves or taps "Turn on")
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isManualSimulateRef.current) return; // Do not override if manual simulation was activated
          const { latitude, longitude, accuracy } = pos.coords;
          setCoords({ lat: latitude, lng: longitude, accuracy });
          verifyLocationWithServer(latitude, longitude);
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60000 }
      );
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [requestGPS, verifyLocationWithServer]);

  // Quick Demo GPS simulator (for development/desktop ease)
  const simulateOfficeGPS = async () => {
    isManualSimulateRef.current = true;
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        const officeLat = data.office.latitude;
        const officeLng = data.office.longitude;
        setCoords({ lat: officeLat, lng: officeLng, accuracy: 5 });
        verifyLocationWithServer(officeLat, officeLng);
      }
    } catch (e) {
      const defaultLat = 12.9716;
      const defaultLng = 77.5946;
      setCoords({ lat: defaultLat, lng: defaultLng, accuracy: 5 });
      verifyLocationWithServer(defaultLat, defaultLng);
    }
  };

  // Audio Beep generator for scanner confirmation
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (_) {}
  };

  const startCameraScanner = async () => {
    setIsScannerOpen(true);
    setActionErrorMsg(null);
    setCameraError(null);
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

      const scanner = new Html5Qrcode('qr-reader-container', {
        formatsToSupport,
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 160 }, // Rectangular scanning guide for 1D barcodes and QR codes
          aspectRatio: 1.777778,
        },
        (decodedText: string) => {
          playBeep();
          stopCameraScanner();
          handleBarcodeIdentified(decodedText.trim().toUpperCase());
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('Camera Scanner start failed:', err);
      setCameraError(
        'Camera permission was dismissed or camera is unavailable. You can enter the barcode manually or pick a demo badge below.'
      );
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScannerOpen(false);
    setCameraError(null);
  };

  const handleImageUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionErrorMsg(null);
    setIsScanningFile(true);

    try {
      const code = await decodeBarcodeFromFile(file);
      if (code) {
        handleBarcodeIdentified(code);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Could not decode barcode from photo. Please ensure good lighting and clear focus.');
    } finally {
      setIsScanningFile(false);
      e.target.value = '';
    }
  };

  // 4. Barcode Lookup & Identification
  const handleBarcodeIdentified = async (barcodeVal: string) => {
    setScannedBarcode(barcodeVal);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    setIsProcessingAction(true);

    try {
      const res = await fetch('/api/attendance/scan-identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodeValue: barcodeVal,
          deviceToken,
          deviceModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Identification failed');
      }

      setEmployeeData(data.employee);
      setCurrentStatus(data.currentStatus);
      setAllowedActions(data.allowedActions);
      setSessionData(data.session);

      if (data.requiresPin) {
        setPinModalOpen(true);
      } else {
        setActionSuccessMsg(`Welcome, ${data.employee.name}! Ready for action.`);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 5. PIN Submission for First Login
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!employeeData) return;
    if (pin.length !== 4) {
      setPinError('Please enter a 4-digit PIN');
      return;
    }

    setPinError('');
    setIsProcessingAction(true);

    try {
      const res = await fetch('/api/attendance/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeData.id,
          action: 'LOGIN',
          pin,
          latitude: coords?.lat,
          longitude: coords?.lng,
          deviceToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setCurrentStatus('LOGGED_IN');
      setAllowedActions(['BREAK_START', 'LUNCH_START', 'LOGOUT']);
      setSessionData(data.session);
      setPinModalOpen(false);
      setPin('');

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setActionSuccessMsg(`Successfully logged in for today at ${currentTimeStr}!`);
    } catch (err: any) {
      setPinError(err.message || 'Incorrect PIN');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 6. Intra-Day Action Triggers (Break, Lunch, Logout)
  const triggerActionConfirmation = (action: AttendanceEventType) => {
    let title = 'Confirm Action';
    let desc = '';

    switch (action) {
      case 'BREAK_START':
        title = 'Start Tea / Coffee Break';
        desc = 'You are starting your break. Working duration will pause.';
        break;
      case 'BREAK_END':
        title = 'Resume Work from Break';
        desc = 'Welcome back! Your working timer will resume.';
        break;
      case 'LUNCH_START':
        title = 'Go for Lunch Break';
        desc = 'You are logging out for lunch. Lunch duration will be tracked.';
        break;
      case 'LUNCH_END':
        title = 'Return from Lunch Break';
        desc = 'Lunch completed! Your working timer will resume.';
        break;
      case 'LOGOUT':
        title = 'End Shift & Log Out';
        desc = 'Are you sure you want to log out for the day? This will complete your attendance session.';
        break;
    }

    setConfirmModal({
      open: true,
      action,
      title,
      description: desc,
    });
  };

  const executeConfirmedAction = async () => {
    if (!employeeData || !confirmModal.action) return;

    const action = confirmModal.action;
    setConfirmModal((prev) => ({ ...prev, open: false }));
    setIsProcessingAction(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('/api/attendance/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeData.id,
          action,
          latitude: coords?.lat,
          longitude: coords?.lng,
          deviceToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setCurrentStatus(data.status);
      setSessionData(data.session);

      if (data.status === 'LOGGED_IN') {
        setAllowedActions(['BREAK_START', 'LUNCH_START', 'LOGOUT']);
      } else if (data.status === 'ON_BREAK') {
        setAllowedActions(['BREAK_END']);
      } else if (data.status === 'ON_LUNCH') {
        setAllowedActions(['LUNCH_END']);
      } else if (data.status === 'LOGGED_OUT') {
        setAllowedActions([]);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      setActionSuccessMsg(data.message);
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between shadow-xs">
        <Link
          href="/"
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home Portal</span>
        </Link>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{currentTimeStr || '00:00:00'}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-4 pt-6 space-y-5 flex-1">
        {/* Banner Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Employee Attendance
          </h1>
          <p className="text-xs text-slate-500">
            Verify location, scan physical ID card, and manage your shift.
          </p>
        </div>

        {/* 1. Fast Location Verification Card */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div
                className={`p-2 rounded-xl ${
                  locationStatus.isInside
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">Office Location Check</h3>
                <p className="text-[11px] text-slate-500">{locationStatus.officeName}</p>
              </div>
            </div>

            <button
              onClick={requestGPS}
              disabled={locationStatus.loading}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors"
              title="Refresh GPS"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locationStatus.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {locationStatus.loading ? (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-center space-y-1.5">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-blue-900">Verifying Office Location...</p>
              <p className="text-[11px] text-blue-700">Please tap &ldquo;Turn on&rdquo; on the Google/Device prompt to continue.</p>
            </div>
          ) : locationStatus.isInside ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  Location Verified: Inside Office
                </p>
                <p className="text-[11px] text-emerald-700">
                  Distance: {locationStatus.distanceMeters}m (Allowed Radius: {locationStatus.allowedRadius}m)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center space-x-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    {locationStatus.distanceMeters > 0
                      ? `Outside Office Boundary (${locationStatus.distanceMeters}m away)`
                      : 'Location Permission Needed'}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    {locationStatus.error || `Please turn on GPS on your phone to verify attendance.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={requestGPS}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Turn On / Detect GPS</span>
                </button>

                <button
                  onClick={simulateOfficeGPS}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  <span>Simulate Office GPS</span>
                </button>
              </div>
            </div>
          )}

          {/* Device Token Indicator */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>{deviceModel}</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
              {deviceToken.substring(0, 14)}...
            </span>
          </div>
        </div>

        {/* 2. Messages & Alerts */}
        {actionErrorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">{actionErrorMsg}</div>
          </div>
        )}

        {actionSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{actionSuccessMsg}</div>
          </div>
        )}

        {/* 3. Barcode Scanner or Active Session Panel */}
        {!employeeData ? (
          /* State: Not yet scanned */
          <div className="rounded-2xl p-6 bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Physical ID Card Barcode / QR</h2>
                  <p className="text-[11px] text-slate-500">Scan badge or enter card code</p>
                </div>
              </div>

              {locationStatus.isInside && (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanningFile}
                    className="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 flex items-center space-x-1 transition-colors"
                    title="Take high-res photo or upload image of badge"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isScanningFile ? 'Decoding...' : 'Snap Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={isScannerOpen ? stopCameraScanner : startCameraScanner}
                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 flex items-center space-x-1 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{isScannerOpen ? 'Close Live' : 'Live Camera'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden Photo Input for Instant High-Res Barcode Detection */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUploadScan}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {!locationStatus.isInside ? (
              <div className="space-y-2 py-2">
                <button
                  onClick={simulateOfficeGPS}
                  className="w-full py-3.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Verify Office & Open Scanner</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  (Automatically matches office GPS coordinates)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Inline Live Camera Viewfinder */}
                {isScannerOpen && (
                  <div className="space-y-2">
                    <div
                      id="qr-reader-container"
                      ref={scannerRef}
                      className="w-full h-56 rounded-xl overflow-hidden border-2 border-blue-500 bg-slate-900"
                    />
                    <p className="text-[11px] text-slate-500 text-center">
                      Point camera at the employee's physical ID card barcode or QR code
                    </p>
                  </div>
                )}

                {cameraError && (
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs border border-amber-200">
                    {cameraError}
                  </div>
                )}

                {/* Direct Card Code Input (Type or USB Gun Scanner) */}
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1">
                    Canva ID Card Code / Barcode / QR
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (manualBarcodeInput.trim()) {
                        handleBarcodeIdentified(manualBarcodeInput.trim().toUpperCase());
                      }
                    }}
                    className="flex space-x-2"
                  >
                    <input
                      type="text"
                      value={manualBarcodeInput}
                      onChange={(e) => setManualBarcodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SS40-EMP-2026001 (or scan card above)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-mono font-bold border border-slate-300 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!manualBarcodeInput.trim() || isProcessingAction}
                      className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      {isProcessingAction ? 'Looking up...' : 'Identify'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Quick Demo Test Pickers */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 mb-2">Or select test badge:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleBarcodeIdentified('SS40-EMP-8F73K2')}
                  className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 text-left truncate transition-colors"
                >
                  Abraham (8F73K2)
                </button>
                <button
                  onClick={() => handleBarcodeIdentified('SS40-EMP-9X21B4')}
                  className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 text-left truncate transition-colors"
                >
                  David (9X21B4)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* State: Employee Identified -> Active State Machine Controls */
          <div className="space-y-4">
            {/* Employee Profile Header Card */}
            <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
                    {employeeData.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{employeeData.name}</h3>
                    <p className="text-xs text-slate-500">
                      {employeeData.designation} • {employeeData.department}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {employeeData.employeeCode}
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                      currentStatus === 'LOGGED_IN'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : currentStatus === 'ON_BREAK'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : currentStatus === 'ON_LUNCH'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : currentStatus === 'LOGGED_OUT'
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {currentStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Status Timers */}
              {sessionData && currentStatus !== 'NOT_STARTED' && (
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Work Time</span>
                    <span className="text-xs font-bold text-slate-900">
                      {(sessionData.totalWorkMinutes / 60).toFixed(1)}h
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Break</span>
                    <span className="text-xs font-bold text-amber-700">
                      {sessionData.totalBreakMinutes}m
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Lunch</span>
                    <span className="text-xs font-bold text-orange-700">
                      {sessionData.totalLunchMinutes}m
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Grid */}
            <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Attendance Actions
              </h4>

              {currentStatus === 'NOT_STARTED' && (
                <button
                  onClick={() => setPinModalOpen(true)}
                  disabled={isProcessingAction}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition-all active:scale-98"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Enter PIN & Log In Shift</span>
                </button>
              )}

              {currentStatus === 'LOGGED_IN' && (
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => triggerActionConfirmation('BREAK_START')}
                      disabled={isProcessingAction}
                      className="py-3 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span>Take Break</span>
                    </button>

                    <button
                      onClick={() => triggerActionConfirmation('LUNCH_START')}
                      disabled={isProcessingAction}
                      className="py-3 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold text-xs border border-orange-200 flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Utensils className="w-4 h-4 text-orange-600" />
                      <span>Go for Lunch</span>
                    </button>
                  </div>

                  <button
                    onClick={() => triggerActionConfirmation('LOGOUT')}
                    disabled={isProcessingAction}
                    className="w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>End Shift & Log Out</span>
                  </button>
                </div>
              )}

              {currentStatus === 'ON_BREAK' && (
                <button
                  onClick={() => triggerActionConfirmation('BREAK_END')}
                  disabled={isProcessingAction}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Resume Work from Break</span>
                </button>
              )}

              {currentStatus === 'ON_LUNCH' && (
                <button
                  onClick={() => triggerActionConfirmation('LUNCH_END')}
                  disabled={isProcessingAction}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Resume Work from Lunch</span>
                </button>
              )}

              {currentStatus === 'LOGGED_OUT' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">Shift Completed for Today!</p>
                  <p className="text-[11px] text-slate-500">
                    Thank you for your hard work today. Have a great evening!
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setEmployeeData(null);
                  setSessionData(null);
                  setActionSuccessMsg(null);
                  setActionErrorMsg(null);
                }}
                className="w-full py-2 text-[11px] text-slate-500 hover:text-slate-700 transition-colors"
              >
                Scan Another Badge
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Camera Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-white pt-2">
            <span className="text-xs font-bold flex items-center space-x-2">
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Scan ID Card Barcode / QR</span>
            </span>
            <button
              onClick={stopCameraScanner}
              className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center">
            {cameraError ? (
              <div className="max-w-xs w-full p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-lg">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-xs font-bold text-slate-900">Camera Access Unavailable</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  You can enter your barcode value manually or select a registered badge below.
                </p>
              </div>
            ) : (
              <div
                id="qr-reader-container"
                ref={scannerRef}
                className="w-full max-w-sm h-72 rounded-2xl overflow-hidden border-2 border-blue-500 relative bg-slate-950"
              />
            )}
          </div>

          <div className="space-y-3 max-w-sm mx-auto w-full pb-4">
            {/* Manual Barcode Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter Barcode e.g. SS40-EMP-8F73K2"
                value={manualBarcodeInput}
                onChange={(e) => setManualBarcodeInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-mono border border-slate-300"
              />
              <button
                onClick={() => {
                  if (manualBarcodeInput.trim()) {
                    stopCameraScanner();
                    handleBarcodeIdentified(manualBarcodeInput.trim());
                  }
                }}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Submit
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-300">Or instant demo badges:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  stopCameraScanner();
                  handleBarcodeIdentified('SS40-EMP-8F73K2');
                }}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white border border-white/20"
              >
                Abraham (8F73K2)
              </button>
              <button
                onClick={() => {
                  stopCameraScanner();
                  handleBarcodeIdentified('SS40-EMP-9X21B4');
                }}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white border border-white/20"
              >
                David (9X21B4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Digit PIN Pad Modal */}
      {pinModalOpen && employeeData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-xl">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Enter Security PIN</h3>
              <p className="text-xs text-slate-500">
                Authenticate for <span className="text-slate-900 font-semibold">{employeeData.name}</span>
              </p>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center space-x-3 py-1">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-colors ${
                    pin.length > idx ? 'bg-blue-600' : 'border-2 border-slate-300 bg-slate-100'
                  }`}
                />
              ))}
            </div>

            {pinError && <p className="text-center text-xs text-red-600 font-medium">{pinError}</p>}

            {/* Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => {
                    if (pin.length < 4) setPin(pin + digit);
                  }}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-base font-bold text-slate-800 transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => setPin('')}
                className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-500 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  if (pin.length < 4) setPin(pin + '0');
                }}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-base font-bold text-slate-800 transition-colors"
              >
                0
              </button>
              <button
                onClick={() => setPin(pin.slice(0, -1))}
                className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-500 transition-colors"
              >
                ⌫
              </button>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => {
                  setPinModalOpen(false);
                  setPin('');
                }}
                className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePinSubmit()}
                disabled={pin.length !== 4 || isProcessingAction}
                className={`w-1/2 py-2 rounded-xl text-xs font-bold transition-colors ${
                  pin.length === 4
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirm PIN
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400">Default PIN: 1234</p>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xs w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 text-center">{confirmModal.title}</h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block">Current Time</span>
              <span className="text-xs font-mono font-bold text-slate-900">{currentTimeStr}</span>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={isProcessingAction}
                className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
