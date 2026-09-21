import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SS40 Network — Employee Attendance Register',
  description:
    'Workplace attendance management system with GPS Geofencing, Barcode/QR scanning, Device Binding, and Real-time Operations Monitoring.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
