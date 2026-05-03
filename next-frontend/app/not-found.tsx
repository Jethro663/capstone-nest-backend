'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Home, LayoutDashboard, LogIn, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicSessionProbe } from '@/hooks/usePublicSessionProbe';
import { useAuth } from '@/providers/AuthProvider';

const RECOVERY_STEPS = [
  'Your account data is still safe.',
  'Try the dashboard or head back to the main landing page.',
  'If you followed an old class link, refresh from the latest menu.',
];

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  usePublicSessionProbe();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_30%),linear-gradient(180deg,_#fff7f5_0%,_#fffdf8_52%,_#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-8 overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/90 p-6 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur md:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
        <div className="relative flex flex-col justify-center">
          <div className="pointer-events-none absolute -left-16 top-0 h-36 w-36 rounded-full bg-rose-100/70 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-rose-600">
              <MapPinned className="h-3.5 w-3.5" />
              Lost In Nexora
            </div>

            <div className="mt-5 flex items-end gap-4">
              <p className="text-7xl font-black leading-none text-slate-950 sm:text-8xl">404</p>
              <div className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                JA checked this hallway already.
              </div>
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              This page wandered off the map.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              The link you opened does not point to an active Nexora page anymore. Nothing from your account was
              changed, and you can jump back to a safe starting point below.
            </p>

            <ul className="mt-6 space-y-3">
              {RECOVERY_STEPS.map((step) => (
                <li
                  key={step}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Button asChild size="lg" className="rounded-2xl px-6">
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    Go to dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="rounded-2xl px-6">
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-slate-300 bg-white px-6">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Back to home
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-6 rounded-[2rem] border border-dashed border-rose-200/80" />
          <div className="absolute left-8 top-8 h-20 w-20 rounded-full bg-rose-100/80 blur-sm" />
          <div className="absolute bottom-12 right-10 h-24 w-24 rounded-full bg-amber-100/90 blur-sm" />

          <div className="relative w-full rounded-[2rem] border border-rose-100 bg-gradient-to-br from-white via-rose-50/55 to-amber-50/85 p-6 shadow-inner sm:p-8">
            <div className="rounded-[1.6rem] border border-white/80 bg-white/80 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.55)] backdrop-blur">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                <span>Route recovery in progress</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                  No match
                </span>
              </div>

              <div className="relative mt-4 overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_top,_rgba(253,164,175,0.28),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.94)_0%,_rgba(255,247,237,0.98)_100%)] px-6 pb-5 pt-8">
                <div className="absolute inset-x-10 top-5 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
                <div className="relative mx-auto max-w-[360px]">
                  <Image
                    src="/images/errors/ja-wrench-oops.png"
                    alt="JA looking dizzy while helping recover a missing page"
                    width={420}
                    height={420}
                    priority
                    className="mx-auto h-auto w-full object-contain drop-shadow-[0_24px_28px_rgba(15,23,42,0.18)]"
                    sizes="(max-width: 1024px) 70vw, 420px"
                  />
                </div>

                <div className="absolute bottom-5 left-5 max-w-[220px] rounded-2xl border border-white/80 bg-white/92 px-4 py-3 shadow-lg">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">JA update</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                    The page is missing, but your classes and saved progress are still in place.
                  </p>
                </div>

                <div className="absolute -bottom-2 right-4 hidden rounded-[1.4rem] border border-amber-100 bg-white/90 p-3 shadow-lg sm:block">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-amber-50">
                    <Image
                      src="/images/JA/ja_wave.png"
                      alt="JA waving toward the safe return links"
                      fill
                      sizes="80px"
                      className="object-contain p-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
