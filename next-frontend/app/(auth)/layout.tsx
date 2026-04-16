import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell relative min-h-screen overflow-hidden px-4 py-8 sm:px-6">
      <div className="auth-shell-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="auth-shell-orb auth-shell-orb-primary pointer-events-none absolute -left-16 top-12 h-64 w-64 rounded-full" />
      <div className="auth-shell-orb auth-shell-orb-secondary pointer-events-none absolute right-0 top-10 h-72 w-72 rounded-full" />

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="auth-brand-wrap">
          <Link href="/" className="auth-brand">
            <span className="auth-brand-logo">
              <Image
                src="/taguigpic.png"
                alt="GABHS seal"
                width={52}
                height={52}
                className="rounded-xl"
                priority
              />
            </span>
            <span className="min-w-0">
              <span className="auth-brand-kicker">GABHS digital campus</span>
              <span className="auth-brand-title">Nexora Portal</span>
            </span>
          </Link>
        </div>

        <div className="auth-panel mt-6 rounded-[1.75rem] p-6 sm:p-8">
          <div className="auth-panel-topline" />
          <div className="relative">{children}</div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          <p>&copy; 2026 Nexora. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
