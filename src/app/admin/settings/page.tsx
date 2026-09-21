'use client';

import React, { useState, useEffect } from 'react';
import { Settings, KeyRound, MapPin, Moon, Check, AlertCircle, Navigation, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Office } from '@/types';

export default function AdminSettingsPage() {
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    address: '',
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 100,
  });
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Change Password State
  const [changePassForm, setChangePassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changePassMsg, setChangePassMsg] = useState<string | null>(null);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Midnight simulation state
  const [isMidnightRunning, setIsMidnightRunning] = useState(false);
  const [midnightMsg, setMidnightMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettingsForm({
            name: data.office.name,
            address: data.office.address,
            latitude: data.office.latitude,
            longitude: data.office.longitude,
            radiusMeters: data.office.radiusMeters,
          });
        }
      })
      .catch(console.error);
  }, []);

  // Admin One-Tap Capture Current Location
  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setSettingsSaveMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const updatedLat = parseFloat(latitude.toFixed(6));
        const updatedLng = parseFloat(longitude.toFixed(6));

        setSettingsForm((prev) => ({
          ...prev,
          latitude: updatedLat,
          longitude: updatedLng,
        }));
        setGpsAccuracy(Math.round(accuracy));
        setGpsLoading(false);

        // Auto-save captured location
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...settingsForm,
              latitude: updatedLat,
              longitude: updatedLng,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setSettingsSaveMsg(
              `Office location successfully locked to current GPS (${updatedLat}, ${updatedLng}) with ±${Math.round(accuracy)}m accuracy!`
            );
          }
        } catch (err) {
          console.error('Auto-save error:', err);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.message?.includes('secure origins') || !window.isSecureContext) {
          setGpsError(
            'Google Chrome blocks live GPS on local Wi-Fi HTTP (http://192.168.x.x). Once deployed to Vercel (HTTPS), Chrome will allow live GPS immediately. For now, you can enter the coordinates below manually or test from your PC on http://localhost:3001.'
          );
        } else {
          setGpsError(`Could not retrieve location: ${err.message}. Please allow location access in your browser.`);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaveMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettingsSaveMsg('Office location & geofence settings updated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassMsg(null);

    if (changePassForm.newPassword !== changePassForm.confirmPassword) {
      setChangePassError('New passwords do not match. Please re-enter.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: changePassForm.currentPassword,
          newPassword: changePassForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setChangePassMsg('Admin password updated successfully!');
      setChangePassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setChangePassError(err.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSimulateMidnight = async () => {
    setIsMidnightRunning(true);
    setMidnightMsg(null);
    try {
      const res = await fetch('/api/attendance/cron-midnight', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMidnightMsg(data.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMidnightRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">System Settings & Security</h1>
        <p className="text-xs text-slate-500">
          Capture office GPS location, manage administrator credentials, and configure shift rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Office Location & Geofence Card */}
        <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Office Location & GPS Geofence</h3>
              <p className="text-xs text-slate-500">
                Set company physical coordinates for employee attendance verification.
              </p>
            </div>
          </div>

          {/* One-Tap Capture Current Location Button */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">One-Tap Office Location Lock</h4>
                <p className="text-[11px] text-slate-500">
                  Stand in the office and click below to store current GPS coordinates automatically.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCaptureCurrentLocation}
              disabled={gpsLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors"
            >
              {gpsLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Locking High-Accuracy GPS Satellite Fix...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Use My Current Location as Office Location</span>
                </>
              )}
            </button>

            {gpsError && (
              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-[11px] border border-red-200 flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {settingsSaveMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{settingsSaveMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Office Name</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl light-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Office Address</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl light-input text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={settingsForm.latitude}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, latitude: parseFloat(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl light-input text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={settingsForm.longitude}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, longitude: parseFloat(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl light-input text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Allowed Attendance Radius (Meters)
              </label>
              <input
                type="number"
                value={settingsForm.radiusMeters}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, radiusMeters: parseInt(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl light-input text-xs font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Employees must be within this radius of the office to mark attendance. Default: 100 meters.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              Save Geofence Settings
            </button>
          </form>
        </div>

        {/* Change Admin Password Card */}
        <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Change Admin Password</h3>
              <p className="text-xs text-slate-500">
                Enter your current password to set a new administrator password.
              </p>
            </div>
          </div>

          {changePassMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{changePassMsg}</span>
            </div>
          )}

          {changePassError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{changePassError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={changePassForm.currentPassword}
                  onChange={(e) =>
                    setChangePassForm({ ...changePassForm, currentPassword: e.target.value })
                  }
                  placeholder="Enter current password (default: 654321)"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl light-input text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={changePassForm.newPassword}
                  onChange={(e) =>
                    setChangePassForm({ ...changePassForm, newPassword: e.target.value })
                  }
                  placeholder="Enter new password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl light-input text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={changePassForm.confirmPassword}
                  onChange={(e) =>
                    setChangePassForm({ ...changePassForm, confirmPassword: e.target.value })
                  }
                  placeholder="Re-enter new password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl light-input text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              {isChangingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Midnight Reconciler Card */}
        <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Midnight 12:00 AM Reconciler</h3>
              <p className="text-xs text-slate-500">
                Automatically reconciles and flags unclosed employee shifts as MISSED_LOGOUT.
              </p>
            </div>
          </div>

          {midnightMsg && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs">
              {midnightMsg}
            </div>
          )}

          <button
            onClick={handleSimulateMidnight}
            disabled={isMidnightRunning}
            className="py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs border border-purple-200 transition-colors flex items-center justify-center space-x-2"
          >
            <Moon className="w-4 h-4 text-purple-600" />
            <span>
              {isMidnightRunning
                ? 'Running Reconciler...'
                : 'Simulate 12:00 AM Auto-Close Now'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
