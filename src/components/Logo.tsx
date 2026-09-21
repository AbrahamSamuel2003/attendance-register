'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export default function Logo({
  className = '',
  size = 36,
  showText = false,
  subtitle = 'Attendance Register',
}: LogoProps) {
  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Iconic Attendance ID Badge + Clock + Verified Punch Checkmark SVG */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-white border border-[#e8dfd2] shadow-2xs overflow-hidden"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Subtle Cream Badge Background */}
          <rect x="8" y="8" width="84" height="84" rx="18" fill="#fdfbf7" />

          {/* ID Badge Outer Frame in Attractive Royal Blue */}
          <rect
            x="20"
            y="14"
            width="60"
            height="72"
            rx="12"
            stroke="#2563eb"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Badge Lanyard Slot */}
          <rect x="42" y="21" width="16" height="5" rx="2.5" fill="#2563eb" />

          {/* Circular Shift Clock Dial */}
          <circle
            cx="50"
            cy="56"
            r="22"
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth="5"
          />

          {/* Clock Hour Ticks */}
          <circle cx="50" cy="38" r="2" fill="#2563eb" />
          <circle cx="68" cy="56" r="2" fill="#2563eb" />
          <circle cx="50" cy="74" r="2" fill="#2563eb" />
          <circle cx="32" cy="56" r="2" fill="#2563eb" />

          {/* Verified Emerald Green Checkmark Punch */}
          <path
            d="M38 56L47 65L74 34"
            stroke="#059669"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="min-w-0">
          <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight block leading-tight truncate">
            SS40 NETWORK
          </span>
          <p className="text-[10px] sm:text-[11px] text-[#786b59] font-medium truncate leading-tight">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
