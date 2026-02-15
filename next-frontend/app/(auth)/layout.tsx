/**
 * Auth Layout
 * 
 * Layout for all authentication pages:
 * - Login, Signup, Email Verification, Password Reset, etc.
 * 
 * Features:
 * - Centered card layout
 * - No navigation sidebar
 * - Nexora branding/logo at top
 */

import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Nexora Branding */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">Nexora</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Learning Experience Platform
          </p>
        </div>

        {/* Content Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-md">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>&copy; 2026 Nexora. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
