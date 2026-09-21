'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Smartphone,
  Lock,
  ArrowRight,
  Camera,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              <Image
                src="/logo.avif"
                alt="SS40 Network Logo"
                width={40}
                height={40}
                className="object-contain w-full h-full p-0.5"
              />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight block">
                SS40 NETWORK
              </span>
              <p className="text-xs text-slate-500 font-normal">Attendance Portal</p>
            </div>
          </div>

          {/* Navbar Admin Link (Direct & 100% Mobile Compatible) */}
          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Simplified Main Hero & Attendance Launch */}
      <div className="max-w-2xl mx-auto px-4 py-16 flex-1 flex flex-col justify-center items-center w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Employee Attendance
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Scan your physical ID card barcode to mark your daily office attendance.
          </p>
        </div>

        {/* Simplified Single Action Card */}
        <div className="w-full">
          <Link
            href="/attendance"
            className="group block rounded-2xl p-8 bg-white border border-slate-200 light-card-hover text-center space-y-5 shadow-xs"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 mx-auto flex items-center justify-center text-blue-600 transition-transform group-hover:scale-105">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Mark Attendance
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Open camera scanner to punch Login, Break, Lunch, or Logout.
              </p>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors w-full sm:w-auto">
                <Smartphone className="w-4 h-4" />
                <span>Open Scanner</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 SS40 NETWORK. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <span>Timezone: Asia/Kolkata (IST)</span>
            <span>•</span>
            <span>Workplace Attendance</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
